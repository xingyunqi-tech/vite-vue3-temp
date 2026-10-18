import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminGetAiUsage, type AiUsageDto } from '@/api';
import AiUsagePage from '@/views/ai/usage/index.vue';
import { useAiUsage } from '@/views/ai/usage/useAiUsage';

vi.mock('@/api', () => ({ adminGetAiUsage: vi.fn() }));

const usage = (requests = 12, cost = 0.25): AiUsageDto => ({
  items: [
    {
      date: '2026-10-17',
      model: 'deepseek-chat',
      kind: 'chat',
      requests,
      failures: 2,
      inputTokens: 34567,
      cachedInputTokens: 12345,
      outputTokens: 8901,
      cost,
    },
  ],
  total: { requests, failures: 2, inputTokens: 34567, cachedInputTokens: 12345, outputTokens: 8901, cost },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T03:00:00Z'));
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(adminGetAiUsage).mockResolvedValue(usage());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AI 用量页', () => {
  it('默认查询最近 7 天并展示区间合计与按日数据', async () => {
    const wrapper = mount(AiUsagePage);
    await flushPromises();

    expect(adminGetAiUsage).toHaveBeenCalledExactlyOnceWith(
      { from: '2026-10-12', to: '2026-10-18' },
      { disableDedup: true },
    );
    const summary = wrapper.find('.ai-usage__summary').text();
    expect(summary).toContain('缓存命中 token');
    expect(summary).toContain('12,345');
    expect(summary).toContain('34,567');
    expect(summary).toContain('8,901');
    expect(summary).toContain('¥0.2500');
    expect(summary).toContain('16.7%');
    expect(wrapper.text()).toContain('2026-10-17');
    expect(wrapper.text()).toContain('2026-10-12');
  });

  it('日期区间超过 366 天时提示且不发请求', async () => {
    const wrapper = mount(AiUsagePage);
    await flushPromises();
    vi.mocked(adminGetAiUsage).mockClear();

    const picker = wrapper.findComponent({ name: 'ElDatePicker' });
    picker.vm.$emit('update:modelValue', ['2025-01-01', '2026-10-18']);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(ElMessage.warning).toHaveBeenCalledWith('日期范围不能超过 366 天');
    expect(adminGetAiUsage).not.toHaveBeenCalled();
  });

  it('请求失败时显示加载失败与重试，不显示旧数据', async () => {
    const wrapper = mount(AiUsagePage);
    await flushPromises();
    expect(wrapper.text()).toContain('34,567');

    vi.mocked(adminGetAiUsage).mockRejectedValueOnce(new Error('network'));
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('加载失败');
    expect(wrapper.find('.ai-usage__summary').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('34,567');

    await wrapper
      .findAll('button')
      .find(button => button.text() === '重试')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('加载失败');
    expect(wrapper.text()).toContain('34,567');
  });
});

describe('useAiUsage', () => {
  it('丢弃先发后到的响应，loading 由最新请求复位', async () => {
    const first = deferred<AiUsageDto>();
    const second = deferred<AiUsageDto>();
    const third = deferred<AiUsageDto>();
    vi.mocked(adminGetAiUsage)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const state = useAiUsage();

    const firstLoad = state.load();
    const secondLoad = state.load();
    second.resolve(usage(5));
    await secondLoad;
    expect(state.loading.value).toBe(false);
    expect(state.total.value.requests).toBe(5);

    state.load().catch(() => undefined);
    expect(state.loading.value).toBe(true);
    first.resolve(usage(99));
    await firstLoad;

    expect(state.total.value.requests).toBe(5);
    expect(state.loading.value).toBe(true);
  });

  it('最新请求失败时清空结果并标记错误，过期请求失败不影响', async () => {
    const stale = deferred<AiUsageDto>();
    vi.mocked(adminGetAiUsage).mockReturnValueOnce(stale.promise).mockResolvedValueOnce(usage(5));
    const state = useAiUsage();

    const staleLoad = state.load();
    await state.load();
    stale.reject(new Error('timeout'));
    await staleLoad;
    expect(state.error.value).toBe(false);
    expect(state.total.value.requests).toBe(5);

    vi.mocked(adminGetAiUsage).mockRejectedValueOnce(new Error('network'));
    await expect(state.load()).rejects.toThrow('network');

    expect(state.error.value).toBe(true);
    expect(state.usage.value).toBeNull();
    expect(state.byDate.value).toEqual([]);
    expect(state.loading.value).toBe(false);
  });
});
