import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import { canRetryErrata, ERRATA_POLL_INTERVAL, isErrataActive, isErrataStale } from '../shared/errata';
import { LINKABLE_LIST_LIMIT } from '../shared/feedback-constants';
import { adminGetErrata, adminGetQuestion, adminGetQuestionReports, adminRetryErrata } from '@/api';
import type { AdminQuestionDto, AdminQuestionReportDto, Errata } from '@/api';
import { usePolling } from '@/composables/usePolling';

/** 勘误任务进度：排队或执行中时定时刷新 */
export function useErrataProgress() {
  const errata = ref<Errata | null>(null);
  const question = ref<AdminQuestionDto | null>(null);
  const reports = ref<AdminQuestionReportDto[]>([]);
  const loading = ref(false);
  const now = ref(Date.now());
  let currentId = '';
  let relatedTimer: ReturnType<typeof setTimeout> | null = null;

  const active = computed(() => !!errata.value && isErrataActive(errata.value));
  const stale = computed(() => !!errata.value && isErrataStale(errata.value, now.value));
  const retryable = computed(() => !!errata.value && canRetryErrata(errata.value, now.value));

  const loadRelated = async (target: Errata) => {
    const [detail, page] = await Promise.all([
      adminGetQuestion(target.questionId, { disableDedup: true }).catch(() => null),
      adminGetQuestionReports(
        { questionId: target.questionId, type: 'question_error', limit: LINKABLE_LIST_LIMIT },
        { disableDedup: true },
      ).catch(() => null),
    ]);
    if (target.id !== currentId) return;
    question.value = detail;
    reports.value = (page?.list ?? []).filter(report => report.errataId === target.id);
  };

  const clearRelatedRefresh = () => {
    if (relatedTimer) clearTimeout(relatedTimer);
    relatedTimer = null;
  };

  const scheduleRelatedRefresh = (target: Errata) => {
    clearRelatedRefresh();
    relatedTimer = setTimeout(() => {
      relatedTimer = null;
      loadRelated(target).catch(() => undefined);
    }, ERRATA_POLL_INTERVAL);
  };

  const fetchErrata = async (id: string, silent: boolean) => {
    const result = await adminGetErrata(id, { disableDedup: true, isIgnoreToast: silent });
    if (id !== currentId) return;
    const finished = !!errata.value && isErrataActive(errata.value) && result.status === 'DONE';
    errata.value = result;
    now.value = Date.now();
    if (finished) {
      await loadRelated(result);
      scheduleRelatedRefresh(result);
    }
  };

  const polling = usePolling({
    interval: ERRATA_POLL_INTERVAL,
    active: () => active.value,
    run: () => fetchErrata(currentId, true),
  });

  const load = async (id: string) => {
    currentId = id;
    polling.stop();
    clearRelatedRefresh();
    errata.value = null;
    question.value = null;
    reports.value = [];
    loading.value = true;
    try {
      await fetchErrata(id, false);
      if (errata.value) await loadRelated(errata.value);
    } finally {
      if (id === currentId) loading.value = false;
      polling.schedule();
    }
  };

  const refresh = async () => {
    if (!currentId) return;
    await fetchErrata(currentId, false);
    polling.schedule();
  };

  const retry = async () => {
    if (!errata.value) return;
    errata.value = await adminRetryErrata(errata.value.id);
    now.value = Date.now();
    polling.schedule();
  };

  const dispose = () => {
    polling.dispose();
    clearRelatedRefresh();
  };

  if (getCurrentScope()) onScopeDispose(dispose);

  return {
    errata,
    question,
    reports,
    loading,
    now,
    active,
    stale,
    retryable,
    load,
    refresh,
    retry,
    dispose,
  };
}
