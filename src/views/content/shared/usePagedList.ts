import { reactive, ref, type Ref, type UnwrapRef } from 'vue';
import { DEFAULT_PAGE_SIZE } from './constants';

export interface PageData<T> {
  list: T[];
  total: number;
}

export interface PagedListOptions<F extends object, T> {
  createFilters: () => F;
  fetchPage: (filters: F, page: number, limit: number) => Promise<PageData<T>>;
  pageSize?: number;
}

/** 点「查询」时生效的筛选条件，翻页沿用它；过期的响应被丢弃 */
export function usePagedList<F extends object, T>(options: PagedListOptions<F, T>) {
  const filters = reactive(options.createFilters()) as F;
  const page = ref(1);
  const limit = ref(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const total = ref(0);
  const list = ref([]) as Ref<UnwrapRef<T>[]>;
  const loading = ref(false);

  let applied: F = options.createFilters();
  let requestSeq = 0;
  let loadScheduled = false;

  const load = async () => {
    const seq = ++requestSeq;
    loading.value = true;
    try {
      const res = await options.fetchPage(applied, page.value, limit.value);
      if (seq !== requestSeq) return;
      list.value = (res?.list ?? []) as UnwrapRef<T>[];
      total.value = res?.total ?? 0;
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  const scheduleLoad = () => {
    if (loadScheduled) return;
    loadScheduled = true;
    queueMicrotask(() => {
      loadScheduled = false;
      load().catch(() => undefined);
    });
  };

  const changePage = (value: number) => {
    if (value === page.value) return;
    page.value = value;
    scheduleLoad();
  };

  const changeSize = (value: number) => {
    if (value === limit.value) return;
    limit.value = value;
    page.value = 1;
    scheduleLoad();
  };

  const search = () => {
    applied = { ...filters };
    page.value = 1;
    return load();
  };

  const reset = () => {
    Object.assign(filters, options.createFilters());
    return search();
  };

  /** 操作后刷新当前页；当前页变空时回退一页 */
  const refresh = async () => {
    await load();
    if (list.value.length === 0 && page.value > 1) {
      page.value -= 1;
      await load();
    }
  };

  return { filters, page, limit, total, list, loading, load, search, reset, refresh, changePage, changeSize };
}
