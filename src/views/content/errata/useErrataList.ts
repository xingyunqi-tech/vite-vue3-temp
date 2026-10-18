import { ref, watch } from 'vue';
import { ERRATA_POLL_INTERVAL, isErrataActive } from '../shared/errata';
import { usePagedList } from '../shared/usePagedList';
import { usePolling } from '../shared/usePolling';
import { adminGetErrataList, adminRetryErrata } from '@/api';
import type { AdminGetErrataListParams, Errata, ErrataStatus } from '@/api';

export interface ErrataFilters {
  status: ErrataStatus | '';
  questionId: string;
}

export const createErrataFilters = (): ErrataFilters => ({ status: '', questionId: '' });

export function toErrataQuery(filters: ErrataFilters, page: number, limit: number): AdminGetErrataListParams {
  const query: AdminGetErrataListParams = { page, limit };
  if (filters.status) query.status = filters.status;
  const questionId = filters.questionId.trim();
  if (questionId) query.questionId = questionId;
  return query;
}

/** 勘误任务列表；有排队或执行中的任务时定时刷新 */
export function useErrataList() {
  const now = ref(Date.now());
  let silent = false;

  const list = usePagedList<ErrataFilters, Errata>({
    createFilters: createErrataFilters,
    fetchPage: async (filters, page, limit) => {
      const result = await adminGetErrataList(toErrataQuery(filters, page, limit), {
        disableDedup: true,
        isIgnoreToast: silent,
      });
      now.value = Date.now();
      return result;
    },
  });

  const polling = usePolling({
    interval: ERRATA_POLL_INTERVAL,
    active: () => list.list.value.some(isErrataActive),
    run: async () => {
      silent = true;
      try {
        await list.load({ silent: true });
      } finally {
        silent = false;
      }
    },
  });

  watch(list.list, () => {
    if (!polling.polling()) polling.schedule();
  });

  const retry = async (errata: Errata) => {
    await adminRetryErrata(errata.id, { isIgnoreToast: true });
    await list.load();
  };

  return { ...list, now, retry, dispose: polling.dispose };
}
