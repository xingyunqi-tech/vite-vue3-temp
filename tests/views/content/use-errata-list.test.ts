import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { errata, page } from './feedback-fixtures';
import { adminGetErrataList, adminRetryErrata } from '@/api';
import { toErrataQuery, useErrataList } from '@/views/content/errata/useErrataList';
import { ERRATA_POLL_INTERVAL } from '@/views/content/shared/errata';

vi.mock('@/api', () => ({
  adminGetErrataList: vi.fn(),
  adminRetryErrata: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useErrataList', () => {
  it('按状态与题目筛选', () => {
    expect(toErrataQuery({ status: '', questionId: '' }, 1, 20)).toEqual({ page: 1, limit: 20 });
    expect(toErrataQuery({ status: 'FAILED', questionId: ' q1 ' }, 2, 50)).toEqual({
      page: 2,
      limit: 50,
      status: 'FAILED',
      questionId: 'q1',
    });
  });

  it('有排队或执行中的任务时静默刷新，全部结束后停止', async () => {
    vi.mocked(adminGetErrataList)
      .mockResolvedValueOnce(page([errata({ status: 'RUNNING' }), errata({ id: 'e2', status: 'DONE' })]))
      .mockResolvedValueOnce(page([errata({ status: 'DONE' }), errata({ id: 'e2', status: 'DONE' })]));
    const scope = effectScope();
    const list = scope.run(() => useErrataList())!;

    await list.search();
    await nextTick();
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    await nextTick();
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 3);

    expect(adminGetErrataList).toHaveBeenCalledTimes(2);
    expect(vi.mocked(adminGetErrataList).mock.calls[0][1]).toEqual({ disableDedup: true, isIgnoreToast: false });
    expect(vi.mocked(adminGetErrataList).mock.calls[1][1]).toEqual({ disableDedup: true, isIgnoreToast: true });
    expect(list.list.value[0].status).toBe('DONE');
    scope.stop();
  });

  it('轮询刷新期间 loading 保持不变', async () => {
    vi.mocked(adminGetErrataList).mockResolvedValueOnce(page([errata({ status: 'RUNNING' })]));
    const scope = effectScope();
    const list = scope.run(() => useErrataList())!;
    await list.search();
    await nextTick();
    let resolvePoll!: (value: ReturnType<typeof page<ReturnType<typeof errata>>>) => void;
    vi.mocked(adminGetErrataList).mockReturnValueOnce(
      new Promise(resolve => {
        resolvePoll = resolve;
      }),
    );

    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    expect(adminGetErrataList).toHaveBeenCalledTimes(2);
    expect(list.loading.value).toBe(false);
    resolvePoll(page([errata({ status: 'DONE' })]));
    await vi.advanceTimersByTimeAsync(0);

    expect(list.loading.value).toBe(false);
    expect(list.list.value[0].status).toBe('DONE');
    scope.stop();
  });

  it('作用域销毁后停止轮询', async () => {
    vi.mocked(adminGetErrataList).mockResolvedValue(page([errata({ status: 'PENDING' })]));
    const scope = effectScope();
    const list = scope.run(() => useErrataList())!;

    await list.search();
    await nextTick();
    scope.stop();
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 3);

    expect(adminGetErrataList).toHaveBeenCalledTimes(1);
  });

  it('重试后刷新列表', async () => {
    vi.mocked(adminGetErrataList).mockResolvedValue(page([errata({ status: 'FAILED' })]));
    vi.mocked(adminRetryErrata).mockResolvedValue(errata({ status: 'PENDING' }));
    const scope = effectScope();
    const list = scope.run(() => useErrataList())!;
    await list.search();

    await list.retry(errata({ status: 'FAILED' }));

    expect(adminRetryErrata).toHaveBeenCalledWith('e1');
    expect(adminGetErrataList).toHaveBeenCalledTimes(2);
    scope.stop();
  });
});
