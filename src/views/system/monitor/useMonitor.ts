import { reactive, ref } from 'vue';
import { createAlertFilters, toAlertQuery, type AlertFilters } from './alert-query';
import { acknowledgeMonitorAlert, getMonitorAlerts, getMonitorQueues } from '@/api';
import type { AdminAlert, QueuesOverviewDto } from '@/api';

export const DEFAULT_ALERT_PAGE_SIZE = 20;

export function useQueueStats() {
  const overview = ref<QueuesOverviewDto | null>(null);
  const loading = ref(false);

  const load = async () => {
    loading.value = true;
    try {
      overview.value = await getMonitorQueues({ disableDedup: true });
    } finally {
      loading.value = false;
    }
  };

  return { overview, loading, load };
}

export function useAlertList() {
  const filters = reactive(createAlertFilters());
  const page = ref(1);
  const limit = ref(DEFAULT_ALERT_PAGE_SIZE);
  const total = ref(0);
  const list = ref<AdminAlert[]>([]);
  const loading = ref(false);

  /** 点「查询」时生效的筛选条件，翻页沿用它 */
  let applied: AlertFilters = createAlertFilters();
  let requestSeq = 0;
  let loadScheduled = false;

  const load = async () => {
    const seq = ++requestSeq;
    loading.value = true;
    try {
      const res = await getMonitorAlerts(toAlertQuery(applied, page.value, limit.value), { disableDedup: true });
      if (seq !== requestSeq) return;
      list.value = res?.list ?? [];
      total.value = res?.total ?? 0;
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  /** 同一轮事件里的翻页与改页大小合并为一次请求 */
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
    Object.assign(filters, createAlertFilters());
    return search();
  };

  /** 确认告警后刷新当前页；当前页因筛选变空时回退一页 */
  const acknowledge = async (id: number) => {
    await acknowledgeMonitorAlert(id);
    await load();
    if (list.value.length === 0 && page.value > 1) {
      page.value -= 1;
      await load();
    }
  };

  return { filters, page, limit, total, list, loading, load, changePage, changeSize, search, reset, acknowledge };
}
