import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope } from 'vue';
import { usePolling } from '@/composables/usePolling';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePolling', () => {
  it('active 为真时按间隔执行，变为假后停止', async () => {
    let remaining = 2;
    const run = vi.fn(async () => {
      remaining -= 1;
    });
    const polling = usePolling({ interval: 1000, active: () => remaining > 0, run });

    polling.schedule();
    await vi.advanceTimersByTimeAsync(5000);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('执行失败后继续下一轮', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    const polling = usePolling({ interval: 1000, active: () => run.mock.calls.length < 2, run });

    polling.schedule();
    await vi.advanceTimersByTimeAsync(3000);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('active 为假时不启动，重复 schedule 只保留一个定时器', async () => {
    const run = vi.fn(async () => undefined);
    let active = false;
    const polling = usePolling({ interval: 1000, active: () => active, run });

    polling.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(run).not.toHaveBeenCalled();

    active = true;
    polling.schedule();
    polling.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(run).toHaveBeenCalledTimes(1);
    polling.stop();
  });

  it('作用域销毁后停止', async () => {
    const run = vi.fn(async () => undefined);
    const scope = effectScope();
    const polling = scope.run(() => usePolling({ interval: 1000, active: () => true, run }))!;

    polling.schedule();
    scope.stop();
    polling.schedule();
    await vi.advanceTimersByTimeAsync(3000);

    expect(run).not.toHaveBeenCalled();
  });
});
