import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, h, onMounted } from 'vue';
import { fetchRemoteConfig, saveRemoteConfig } from '@/api';
import AgreementPage from '@/views/system/agreement/index.vue';

vi.mock('@/api', async () => {
  const { readRemoteConfigValue } = await import('@/api/modules/remote-config');
  return { fetchRemoteConfig: vi.fn(), saveRemoteConfig: vi.fn(), readRemoteConfigValue };
});

vi.mock('@/views/system/agreement/components/AgreementEditor.vue', () => ({
  default: defineComponent({
    props: { modelValue: { type: String, required: true } },
    emits: ['update:modelValue', 'normalized'],
    setup(props, { emit }) {
      onMounted(() => {
        const html = props.modelValue.replace(/<div>(.*?)<\/div>/g, '<p>$1</p>');
        emit('normalized', html);
        if (html !== props.modelValue) emit('update:modelValue', html);
      });
      return () =>
        h('textarea', {
          class: 'editor-stub',
          value: props.modelValue,
          onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
        });
    },
  }),
}));

const stored = (key: string, value: unknown, at = '2026-10-01T08:00:00.000Z') => ({
  key,
  value: { value },
  isPublic: true,
  createdAt: at,
  updatedAt: at,
});

const configured: Record<string, unknown> = {
  'agreement.userAgreement': '<p>用户协议条款</p>',
  'consent.userAgreementVersion': '1.0',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
  vi.mocked(fetchRemoteConfig).mockImplementation(async key =>
    key in configured ? stored(key, configured[key]) : null,
  );
  vi.mocked(saveRemoteConfig).mockImplementation(async (key, value) => stored(key, value, '2026-10-18T08:00:00.000Z'));
});

async function mountPage() {
  const wrapper = mount(AgreementPage, { attachTo: document.body });
  await flushPromises();
  return wrapper;
}

describe('协议管理页', () => {
  it('展示用户协议正文、版本号与最后更新时间', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAll('.el-tabs__item').map(tab => tab.text())).toEqual(['用户协议', '隐私政策', 'AI 服务声明']);
    expect(wrapper.find('.agreement-panel__version').text()).toBe('当前版本：1.0');
    expect(wrapper.find('.agreement-panel__updated').text()).toContain('2026-10-01');
    expect((wrapper.find('.editor-stub').element as HTMLTextAreaElement).value).toBe('<p>用户协议条款</p>');
    expect(wrapper.find('.agreement-panel__unconfigured').exists()).toBe(false);
    wrapper.unmount();
  });

  it('未配置的协议编辑器为空并提示使用内置文本', async () => {
    const wrapper = await mountPage();

    await wrapper.findAll('.el-tabs__item')[1].trigger('click');
    await flushPromises();

    expect(fetchRemoteConfig).toHaveBeenCalledWith('agreement.privacyPolicy');
    expect(fetchRemoteConfig).toHaveBeenCalledWith('consent.privacyPolicyVersion');
    const panel = wrapper.findAll('.agreement-panel')[1];
    expect(panel.find('.agreement-panel__unconfigured').text()).toContain('未配置，小程序将显示内置文本');
    expect(panel.find('.agreement-panel__version').text()).toBe('当前版本：未设置');
    expect((panel.find('.editor-stub').element as HTMLTextAreaElement).value).toBe('');
    wrapper.unmount();
  });

  it('保存经二次确认后提交净化后的正文，版本号不变', async () => {
    const wrapper = await mountPage();

    await wrapper.find('.editor-stub').setValue('<p>新条款</p><script>alert(1)</script>');
    await wrapper.find('.agreement-panel__save').trigger('click');
    await flushPromises();

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      expect.stringContaining('版本号不变'),
      '保存用户协议',
      expect.anything(),
    );
    expect(saveRemoteConfig).toHaveBeenCalledTimes(1);
    expect(saveRemoteConfig).toHaveBeenCalledWith('agreement.userAgreement', '<p>新条款</p>');
    expect(ElMessage.success).toHaveBeenCalledWith('保存成功');
    expect(wrapper.find('.agreement-panel__updated').text()).toContain('2026-10-18');
    wrapper.unmount();
  });

  it('取消确认时不保存', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel');
    const wrapper = await mountPage();

    await wrapper.find('.agreement-panel__save').trigger('click');
    await flushPromises();

    expect(saveRemoteConfig).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('正文为空时提示且不弹确认', async () => {
    const wrapper = await mountPage();

    await wrapper.find('.editor-stub').setValue('<p><br></p>');
    await wrapper.find('.agreement-panel__save').trigger('click');
    await flushPromises();

    expect(ElMessage.warning).toHaveBeenCalledWith('请输入协议正文');
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    expect(saveRemoteConfig).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('保存并升级版本：建议递增版本号，确认后写入正文与新版本', async () => {
    let sameVersionCheck: unknown;
    const prompt = vi.spyOn(ElMessageBox, 'prompt').mockImplementation((async (
      _message: string,
      _title: string,
      options: { inputValidator: (value: string) => unknown },
    ) => {
      sameVersionCheck = options.inputValidator('1.0');
      return { value: '1.1', action: 'confirm' };
    }) as never);
    const wrapper = await mountPage();

    await wrapper.find('.agreement-panel__upgrade').trigger('click');
    await flushPromises();

    expect(prompt).toHaveBeenCalledWith(
      expect.stringContaining('所有用户需重新同意用户协议'),
      '保存并升级版本',
      expect.objectContaining({ inputValue: '1.1' }),
    );
    expect(sameVersionCheck).toBe('新版本号须与当前版本不同');
    expect(vi.mocked(saveRemoteConfig).mock.calls).toEqual([
      ['agreement.userAgreement', '<p>用户协议条款</p>'],
      ['consent.userAgreementVersion', '1.1'],
    ]);
    expect(wrapper.find('.agreement-panel__version').text()).toBe('当前版本：1.1');
    expect(ElMessage.success).toHaveBeenCalledWith('已保存并升级到 1.1');
    wrapper.unmount();
  });

  it('取消升级时不保存', async () => {
    vi.spyOn(ElMessageBox, 'prompt').mockRejectedValue('cancel');
    const wrapper = await mountPage();

    await wrapper.find('.agreement-panel__upgrade').trigger('click');
    await flushPromises();

    expect(saveRemoteConfig).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('预览展示净化后的正文', async () => {
    const wrapper = await mountPage();

    await wrapper
      .find('.editor-stub')
      .setValue('<h2>预览标题</h2><img src="x" onerror="alert(1)"><script>alert(1)</script>');
    await wrapper.find('.agreement-panel__preview').trigger('click');
    await flushPromises();

    const preview = document.body.querySelector('.agreement-preview__body');
    expect(preview?.innerHTML).toBe('<h2>预览标题</h2>');
    wrapper.unmount();
  });

  it('正文超过 250KB 时提示且不弹确认', async () => {
    const wrapper = await mountPage();

    await wrapper.find('.editor-stub').setValue(`<p>${'a'.repeat(250 * 1024)}</p>`);
    await wrapper.find('.agreement-panel__save').trigger('click');
    await flushPromises();

    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文超过 250KB，请精简后再保存');
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    expect(saveRemoteConfig).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('正文已保存但版本号写入失败时提示重新升级', async () => {
    vi.spyOn(ElMessageBox, 'prompt').mockResolvedValue({ value: '1.1', action: 'confirm' } as never);
    const alert = vi.spyOn(ElMessageBox, 'alert').mockResolvedValue('confirm' as never);
    vi.mocked(saveRemoteConfig)
      .mockImplementationOnce(async (key, value) => stored(key, value, '2026-10-18T08:00:00.000Z'))
      .mockRejectedValueOnce(new Error('denied'));
    const wrapper = await mountPage();

    await wrapper.find('.editor-stub').setValue('<p>新条款</p><img src="x">');
    await wrapper.find('.agreement-panel__upgrade').trigger('click');
    await flushPromises();

    expect(alert).toHaveBeenCalledWith(
      '正文已保存，但版本号未升级，用户暂不会被要求重新同意，请重新点击『保存并升级版本』',
      '版本号未升级',
      expect.objectContaining({ type: 'warning' }),
    );
    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(wrapper.find('.agreement-panel__version').text()).toBe('当前版本：1.0');
    expect(wrapper.find('.agreement-panel__updated').text()).toContain('2026-10-18');
    expect((wrapper.find('.editor-stub').element as HTMLTextAreaElement).value).toBe('<p>新条款</p>');
    wrapper.unmount();
  });

  it('载入后经编辑器规范化的正文不算未保存修改，编辑后算', async () => {
    vi.mocked(fetchRemoteConfig).mockImplementation(async key =>
      key === 'agreement.userAgreement' ? stored(key, '<div>旧版正文</div>') : null,
    );
    const wrapper = await mountPage();
    const beforeUnload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(beforeUnload()).toBe(false);

    await wrapper.find('.editor-stub').setValue('<p>新正文</p>');

    expect(beforeUnload()).toBe(true);
    wrapper.unmount();
  });
});
