import { ref } from 'vue';
import { adminGetDailyQuestionSets, adminRegenerateDailyQuestionSet } from '@/api';
import type { AdminDailyQuestionSetDto, DailyQuestionSet } from '@/api';
import dayjs from '@/plugins/dayjs';
import { businessToday, DATE_FORMAT } from '@/utils/business-date';

const DEFAULT_PAST_DAYS = 6;
const DEFAULT_FUTURE_DAYS = 1;

export function defaultDateRange(now: Date = new Date()): [string, string] {
  const today = dayjs(businessToday(now));
  return [
    today.subtract(DEFAULT_PAST_DAYS, 'day').format(DATE_FORMAT),
    today.add(DEFAULT_FUTURE_DAYS, 'day').format(DATE_FORMAT),
  ];
}

/** 当日及以后的题组可重新生成 */
export const canRegenerate = (date: string, today: string = businessToday()) => date >= today;

export function useDailySets() {
  const sets = ref<AdminDailyQuestionSetDto[]>([]);
  const loading = ref(false);
  let query: { subjectId: string; range: [string, string] } | null = null;
  const queriedSubjectId = ref('');

  const load = async (subjectId: string, range: [string, string]) => {
    loading.value = true;
    try {
      const result = await adminGetDailyQuestionSets(
        subjectId,
        { from: range[0], to: range[1] },
        { disableDedup: true },
      );
      sets.value = [...(result ?? [])].sort((a, b) => b.date.localeCompare(a.date));
      query = { subjectId, range };
      queriedSubjectId.value = subjectId;
    } finally {
      loading.value = false;
    }
  };

  /** 生成成功后刷新列表，刷新失败不影响生成结果 */
  const regenerate = async (date: string): Promise<DailyQuestionSet | null> => {
    if (!query) return null;
    const result = await adminRegenerateDailyQuestionSet(query.subjectId, date);
    await load(query.subjectId, query.range).catch(() => undefined);
    return result;
  };

  return { sets, loading, queriedSubjectId, load, regenerate };
}
