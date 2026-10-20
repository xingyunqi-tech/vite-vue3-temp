import { describe, it, expect } from 'vitest';
import { usePagedList } from '@/composables/usePagedList';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('usePagedList', () => {
  it('普通加载期间 loading 为真，静默加载不改动 loading', async () => {
    let pending = deferred<{ list: number[]; total: number }>();
    const paged = usePagedList<object, number>({ createFilters: () => ({}), fetchPage: () => pending.promise });

    const normal = paged.load();
    expect(paged.loading.value).toBe(true);
    pending.resolve({ list: [1], total: 1 });
    await normal;
    expect(paged.loading.value).toBe(false);

    pending = deferred();
    const silent = paged.load({ silent: true });
    expect(paged.loading.value).toBe(false);
    pending.resolve({ list: [2], total: 1 });
    await silent;
    expect(paged.loading.value).toBe(false);
    expect(paged.list.value).toEqual([2]);
  });

  it('静默加载覆盖进行中的普通加载时结束 loading', async () => {
    const first = deferred<{ list: number[]; total: number }>();
    const second = deferred<{ list: number[]; total: number }>();
    const queue = [first, second];
    const paged = usePagedList<object, number>({ createFilters: () => ({}), fetchPage: () => queue.shift()!.promise });

    const normal = paged.load();
    const silent = paged.load({ silent: true });
    second.resolve({ list: [2], total: 1 });
    await silent;
    first.resolve({ list: [1], total: 1 });
    await normal;

    expect(paged.loading.value).toBe(false);
    expect(paged.list.value).toEqual([2]);
  });
});
