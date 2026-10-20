import { ref } from 'vue';
import { createAlertFilters, toAlertQuery, type AlertFilters } from './alert-query';
import { acknowledgeMonitorAlert, getMonitorAlerts, getMonitorQueues } from '@/api';
import type { AdminAlert, QueuesOverviewDto } from '@/api';
import { usePagedList } from '@/composables/usePagedList';

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
  const list = usePagedList<AlertFilters, AdminAlert>({
    createFilters: createAlertFilters,
    fetchPage: (filters, page, limit) => getMonitorAlerts(toAlertQuery(filters, page, limit), { disableDedup: true }),
  });

  /** 确认成功后刷新当前页，刷新失败不影响确认结果 */
  const acknowledge = async (id: number) => {
    await acknowledgeMonitorAlert(id);
    await list.refresh().catch(() => undefined);
  };

  return { ...list, acknowledge };
}
