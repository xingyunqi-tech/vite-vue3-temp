import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRowAction } from '@/views/content/shared/actions';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
});

describe('useRowAction', () => {
  it('同一行执行中时忽略重复触发', async () => {
    const pending = deferred();
    const task = vi.fn(() => pending.promise);
    const { isActing, run } = useRowAction();

    const first = run('a', task, '已完成');
    expect(isActing('a')).toBe(true);
    expect(await run('a', task, '已完成')).toBe(false);

    pending.resolve();
    expect(await first).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
    expect(isActing('a')).toBe(false);
  });

  it('不同行可以同时执行', async () => {
    const pending = deferred();
    const other = vi.fn(async () => undefined);
    const { isActing, run } = useRowAction();

    const first = run('a', () => pending.promise, '已完成');

    expect(await run('b', other, '已完成')).toBe(true);
    expect(other).toHaveBeenCalledTimes(1);
    expect(isActing('a')).toBe(true);
    pending.resolve();
    await first;
  });
});
