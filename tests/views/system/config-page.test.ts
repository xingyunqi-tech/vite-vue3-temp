import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchRemoteConfig, saveRemoteConfig } from '@/api';
import RemoteConfigPage from '@/views/system/config/index.vue';

vi.mock('@/api', async () => {
  const { readRemoteConfigValue } = await import('@/api/modules/remote-config');
  return { fetchRemoteConfig: vi.fn(), saveRemoteConfig: vi.fn(), readRemoteConfigValue };
});

const config = (key: string, value: unknown, at: string | null) => ({
  key,
  value: { value },
  isPublic: true,
  createdAt: at,
  updatedAt: at,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(fetchRemoteConfig).mockImplementation(async key =>
    key === 'wrongBook.masterThreshold' ? config(key, 3, null) : null,
  );
});

function findRow(wrapper: ReturnType<typeof mount>, key: string) {
  const row = wrapper.findAll('.el-table__body tr').find(tr => tr.text().includes(key));
  if (!row) throw new Error(`未找到配置行 ${key}`);
  return row;
}

describe('远程配置页', () => {
  it('列出全部配置项并展示默认值与是否公开', async () => {
    const wrapper = mount(RemoteConfigPage);
    await flushPromises();

    expect(fetchRemoteConfig).toHaveBeenCalledTimes(16);
    const row = findRow(wrapper, 'wrongBook.masterThreshold');
    expect(row.text()).toContain('错题连续答对阈值');
    expect(row.text()).toContain('默认值');
    expect(findRow(wrapper, 'ai.model').text()).toContain('未设置');
  });

  it('修改 wrongBook.masterThreshold 后保存并展示新值', async () => {
    vi.mocked(saveRemoteConfig).mockResolvedValueOnce(
      config('wrongBook.masterThreshold', 5, '2026-10-17T08:00:00.000Z'),
    );
    const wrapper = mount(RemoteConfigPage);
    await flushPromises();

    await findRow(wrapper, 'wrongBook.masterThreshold').find('button').trigger('click');
    await flushPromises();
    const input = wrapper.find('.config-dialog__number input');
    await input.setValue('5');
    await input.trigger('change');
    await wrapper.find('.config-dialog__submit').trigger('click');
    await flushPromises();

    expect(saveRemoteConfig).toHaveBeenCalledWith('wrongBook.masterThreshold', 5);
    const row = findRow(wrapper, 'wrongBook.masterThreshold');
    expect(row.find('.remote-config__value').text()).toBe('5');
    expect(row.text()).not.toContain('默认值');
    expect(ElMessage.success).toHaveBeenCalledWith('保存成功');
  });

  it('读取失败的配置项不可编辑', async () => {
    vi.mocked(fetchRemoteConfig).mockImplementation(async key => {
      if (key === 'ai.model') throw new Error('boom');
      return null;
    });
    const wrapper = mount(RemoteConfigPage);
    await flushPromises();

    const failed = findRow(wrapper, 'ai.model');
    expect(failed.text()).toContain('读取失败');
    expect(failed.find('button').attributes('disabled')).toBeDefined();
    expect(findRow(wrapper, 'ai.enabled').find('button').attributes('disabled')).toBeUndefined();
  });
});
