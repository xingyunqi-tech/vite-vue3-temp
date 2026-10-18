import { AxiosError } from 'axios';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope } from 'vue';
import { errata, page, QUESTION_ID, question, report } from './feedback-fixtures';
import { adminGetErrata, adminGetQuestion, adminGetQuestionReports, adminRetryErrata } from '@/api';
import { useErrataProgress } from '@/views/content/errata-detail/useErrataProgress';
import { ERRATA_POLL_INTERVAL, ERRATA_STALE_MS, ERRATA_STALE_TOLERANCE_MS } from '@/views/content/shared/errata';

vi.mock('@/api', () => ({
  adminGetErrata: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionReports: vi.fn(),
  adminRetryErrata: vi.fn(),
}));

const UPDATED_AT = Date.parse('2026-10-17T00:00:00.000Z');

function setup() {
  const scope = effectScope();
  const progress = scope.run(() => useErrataProgress())!;
  return { scope, progress };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(UPDATED_AT + 1000);
  vi.mocked(adminGetQuestion).mockResolvedValue(question({ currentVersion: 3 }));
  vi.mocked(adminGetQuestionReports).mockResolvedValue(
    page([report({ id: 1, errataId: 'e1' }), report({ id: 2, errataId: null }), report({ id: 3, errataId: 'e0' })]),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useErrataProgress', () => {
  it('加载任务、题目与关联的纠错单', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'DONE', processedUsers: 10 }));
    const { scope, progress } = setup();

    await progress.load('e1');

    expect(adminGetErrata).toHaveBeenCalledWith('e1', { disableDedup: true, isIgnoreToast: false });
    expect(adminGetQuestion).toHaveBeenCalledWith(QUESTION_ID, { disableDedup: true });
    expect(adminGetQuestionReports).toHaveBeenCalledWith(
      { questionId: QUESTION_ID, type: 'question_error', limit: 50 },
      { disableDedup: true },
    );
    expect(progress.reports.value.map(item => item.id)).toEqual([1]);
    expect(progress.question.value?.currentVersion).toBe(3);
    expect(progress.active.value).toBe(false);
    scope.stop();
  });

  it('执行中时静默轮询，完成后停止，刷新关联纠错单并在一个轮询间隔后再补拉一次', async () => {
    vi.mocked(adminGetErrata)
      .mockResolvedValueOnce(errata({ status: 'PENDING', processedUsers: 0 }))
      .mockResolvedValueOnce(errata({ status: 'RUNNING', processedUsers: 6 }))
      .mockResolvedValueOnce(errata({ status: 'DONE', processedUsers: 10 }));
    const { scope, progress } = setup();

    await progress.load('e1');
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    expect(progress.errata.value?.processedUsers).toBe(6);
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    expect(progress.errata.value?.status).toBe('DONE');
    expect(adminGetQuestionReports).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 3);

    expect(adminGetErrata).toHaveBeenCalledTimes(3);
    expect(vi.mocked(adminGetErrata).mock.calls[1][1]).toEqual({ disableDedup: true, isIgnoreToast: true });
    expect(adminGetQuestionReports).toHaveBeenCalledTimes(3);
    scope.stop();
  });

  it('作用域销毁后不再补拉关联纠错单', async () => {
    vi.mocked(adminGetErrata)
      .mockResolvedValueOnce(errata({ status: 'RUNNING' }))
      .mockResolvedValueOnce(errata({ status: 'DONE', processedUsers: 10 }));
    const { scope, progress } = setup();

    await progress.load('e1');
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    expect(adminGetQuestionReports).toHaveBeenCalledTimes(2);
    scope.stop();
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 2);

    expect(adminGetQuestionReports).toHaveBeenCalledTimes(2);
  });

  it('作用域销毁后停止轮询', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata());
    const { scope, progress } = setup();

    await progress.load('e1');
    scope.stop();
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 3);

    expect(adminGetErrata).toHaveBeenCalledTimes(1);
  });

  it('失败的任务可重试，重试后恢复轮询', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'FAILED', failureReason: 'boom' }));
    vi.mocked(adminRetryErrata).mockResolvedValue(errata({ status: 'PENDING' }));
    const { scope, progress } = setup();

    await progress.load('e1');
    expect(progress.retryable.value).toBe(true);
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL * 2);
    expect(adminGetErrata).toHaveBeenCalledTimes(1);

    await progress.retry();
    expect(adminRetryErrata).toHaveBeenCalledWith('e1');
    expect(progress.retryable.value).toBe(false);
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'RUNNING' }));
    await vi.advanceTimersByTimeAsync(ERRATA_POLL_INTERVAL);
    expect(adminGetErrata).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('执行中超过 10 分钟加容差未进展时可重试', async () => {
    vi.setSystemTime(UPDATED_AT + ERRATA_STALE_MS + ERRATA_STALE_TOLERANCE_MS);
    vi.mocked(adminGetErrata).mockResolvedValue(errata());
    const { scope, progress } = setup();

    await progress.load('e1');

    expect(progress.stale.value).toBe(true);
    expect(progress.retryable.value).toBe(true);
    scope.stop();
  });

  it('重试失败时抛出请求错误', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'FAILED' }));
    vi.mocked(adminRetryErrata).mockRejectedValue(new AxiosError('x'));
    const { scope, progress } = setup();

    await progress.load('e1');

    await expect(progress.retry()).rejects.toBeInstanceOf(AxiosError);
    expect(progress.errata.value?.status).toBe('FAILED');
    scope.stop();
  });
});
