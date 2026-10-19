import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminUpdateAppProfile, getAppProfile } from '@/api';
import type { AppProfile } from '@/api';
import ConfigEditor from '@/components/ConfigEditor/index.vue';
import MiniProgramPage from '@/views/setting/mini-program/index.vue';

const { leaveGuards } = vi.hoisted(() => ({ leaveGuards: [] as Array<() => Promise<boolean> | boolean> }));

vi.mock('@/api', () => ({ getAppProfile: vi.fn(), adminUpdateAppProfile: vi.fn() }));
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: (guard: () => Promise<boolean> | boolean) => leaveGuards.push(guard),
}));

const EMPTY_PROFILE: AppProfile = {
  appName: null,
  slogan: null,
  companyName: null,
  copyright: null,
  icpLicense: null,
  servicePhone: null,
  serviceHours: null,
  serviceEmail: null,
  shareTitle: null,
};

let wrapper: VueWrapper | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  leaveGuards.length = 0;
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
  vi.mocked(getAppProfile).mockResolvedValue({ ...EMPTY_PROFILE, appName: '备考刷题Pro', servicePhone: '400-100' });
  vi.mocked(adminUpdateAppProfile).mockImplementation(async dto => ({ ...EMPTY_PROFILE, ...dto }) as AppProfile);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

async function mountPage() {
  wrapper = mount(MiniProgramPage, { attachTo: document.body });
  await flushPromises();
  return wrapper;
}

const formItem = (page: VueWrapper, title: string) => {
  const item = page
    .findAllComponents({ name: 'ElFormItem' })
    .find(candidate => candidate.find('.el-form-item__label').text().trim() === title);
  if (!item) throw new Error(`未找到字段：${title}`);
  return item;
};

const input = (page: VueWrapper, title: string) => formItem(page, title).find('input');

const inputValue = (page: VueWrapper, title: string) => (input(page, title).element as HTMLInputElement).value;

const fieldError = (page: VueWrapper, title: string): string | undefined => {
  const item = formItem(page, title);
  return item.classes().includes('is-error') ? (item.props('error') as string) : undefined;
};

const saveButton = (page: VueWrapper) => page.find('.mini-program-setting__save');

async function clickSave(page: VueWrapper) {
  await saveButton(page).trigger('click');
  await flushPromises();
}

function unprocessable(data: Record<string, string>): AxiosError {
  const response = {
    status: 422,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { code: 422, message: '参数错误', data },
  } as AxiosResponse;
  const error = new AxiosError('参数错误', 'ERR_BAD_REQUEST', response.config, null, response);
  error.errorData = data;
  return error;
}

describe('小程序配置页', () => {
  it('以可视化编辑器按分组展示已配置的值，未配置的字段为空', async () => {
    const page = await mountPage();

    expect(getAppProfile).toHaveBeenCalledWith({ isIgnoreToast: true });
    expect(page.findAll('.section-title').map(title => title.text())).toEqual(['基础信息', '主体信息', '客服信息']);
    expect(inputValue(page, '产品名称')).toBe('备考刷题Pro');
    expect(inputValue(page, '客服电话')).toBe('400-100');
    expect(inputValue(page, '宣传语')).toBe('');
  });

  it('无改动时保存按钮禁用，仅首尾空白的改动也视为无改动', async () => {
    const page = await mountPage();
    expect(saveButton(page).attributes('disabled')).toBeDefined();

    await input(page, '产品名称').setValue(' 备考刷题Pro ');
    expect(saveButton(page).attributes('disabled')).toBeDefined();

    await input(page, '宣传语').setValue('新宣传语');
    expect(saveButton(page).attributes('disabled')).toBeUndefined();

    await input(page, '宣传语').setValue('');
    expect(saveButton(page).attributes('disabled')).toBeDefined();
  });

  it('保存经二次确认后提交，去除首尾空白，留空字段提交 null', async () => {
    const page = await mountPage();

    await input(page, '产品名称').setValue('  ');
    await input(page, '宣传语').setValue(' 新宣传语 ');
    await clickSave(page);

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(expect.any(String), '保存小程序配置', expect.anything());
    expect(adminUpdateAppProfile).toHaveBeenCalledWith(
      { ...EMPTY_PROFILE, slogan: '新宣传语', servicePhone: '400-100' },
      { isIgnoreToast: true },
    );
    expect(ElMessage.success).toHaveBeenCalledWith('配置已保存');
    expect(inputValue(page, '宣传语')).toBe('新宣传语');
    expect(inputValue(page, '产品名称')).toBe('');
    expect(saveButton(page).attributes('disabled')).toBeDefined();
  });

  it('取消确认时不保存', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel');
    const page = await mountPage();

    await input(page, '宣传语').setValue('新宣传语');
    await clickSave(page);

    expect(adminUpdateAppProfile).not.toHaveBeenCalled();
    expect(inputValue(page, '宣传语')).toBe('新宣传语');
  });

  it('校验问题挂到字段，保存时提示且不弹确认', async () => {
    const page = await mountPage();

    await input(page, '客服电话').setValue('400#123');
    await input(page, '客服邮箱').setValue('service@example');
    expect(fieldError(page, '客服电话')).toContain('只能包含数字');
    expect(fieldError(page, '客服邮箱')).toContain('请输入正确的邮箱地址');

    await clickSave(page);

    expect(ElMessage.error).toHaveBeenCalledWith('存在不合法的配置项，请修正后再保存');
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();
    expect(adminUpdateAppProfile).not.toHaveBeenCalled();
  });

  it('后端 422 字段错误挂到对应字段，修改该字段后提示消失', async () => {
    vi.mocked(adminUpdateAppProfile).mockRejectedValueOnce(unprocessable({ serviceHours: '服务时间不合法' }));
    const page = await mountPage();

    await input(page, '服务时间').setValue('全天');
    await clickSave(page);

    expect(ElMessage.error).toHaveBeenCalledWith('保存失败，请根据提示修正配置项');
    expect(fieldError(page, '服务时间')).toBe('服务时间不合法');
    expect(inputValue(page, '服务时间')).toBe('全天');

    await input(page, '服务时间').setValue('工作日');
    expect(fieldError(page, '服务时间')).toBeUndefined();
  });

  it('JSON 模式下 422 字段错误汇总展示', async () => {
    vi.mocked(adminUpdateAppProfile).mockRejectedValueOnce(unprocessable({ serviceHours: '服务时间不合法' }));
    const page = await mountPage();

    page.findComponent(ConfigEditor).vm.requestMode('code');
    await flushPromises();
    const textarea = page.find('.config-editor__textarea textarea');
    const value = JSON.parse((textarea.element as HTMLTextAreaElement).value);
    value.service.serviceHours = '全天';
    await textarea.setValue(JSON.stringify(value));
    await clickSave(page);

    expect(adminUpdateAppProfile).toHaveBeenCalledWith(
      expect.objectContaining({ serviceHours: '全天', appName: '备考刷题Pro' }),
      { isIgnoreToast: true },
    );
    expect(page.findAll('.config-editor__issues li').map(item => item.text())).toEqual([
      'service.serviceHours 服务时间不合法',
    ]);
  });

  it('保存失败时保留草稿并提示错误', async () => {
    vi.mocked(adminUpdateAppProfile).mockRejectedValueOnce(new Error('网络异常'));
    const page = await mountPage();

    await input(page, '宣传语').setValue('新宣传语');
    await clickSave(page);

    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(ElMessage.error).toHaveBeenCalledWith('网络异常');
    expect(inputValue(page, '宣传语')).toBe('新宣传语');
    expect(saveButton(page).classes()).not.toContain('is-loading');
    expect(saveButton(page).attributes('disabled')).toBeUndefined();
  });

  it('读取失败时展示重试，重试成功后展示编辑器', async () => {
    vi.mocked(getAppProfile).mockRejectedValueOnce(new Error('network'));
    const page = await mountPage();

    expect(page.text()).toContain('读取失败');
    expect(saveButton(page).exists()).toBe(false);

    await page.find('.mini-program-setting__retry').trigger('click');
    await flushPromises();

    expect(getAppProfile).toHaveBeenCalledTimes(2);
    expect(page.text()).not.toContain('读取失败');
    expect(inputValue(page, '产品名称')).toBe('备考刷题Pro');
  });

  it('有未保存的修改时离开页面需确认，取消则留在本页', async () => {
    const page = await mountPage();
    const [leave] = leaveGuards;

    expect(await leave()).toBe(true);
    expect(ElMessageBox.confirm).not.toHaveBeenCalled();

    await input(page, '宣传语').setValue('新宣传语');
    vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel');
    expect(await leave()).toBe(false);
    expect(ElMessageBox.confirm).toHaveBeenCalledWith('有未保存的修改，确定要离开吗？', '提示', expect.anything());

    expect(await leave()).toBe(true);
  });

  it('有未保存的修改时拦截关闭标签页', async () => {
    const page = await mountPage();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(unload()).toBe(false);
    await input(page, '宣传语').setValue('新宣传语');
    expect(unload()).toBe(true);
  });
});
