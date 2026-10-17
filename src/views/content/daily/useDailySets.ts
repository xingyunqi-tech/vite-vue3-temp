import { ref } from 'vue';
import { adminGetDailyQuestionSets, adminRegenerateDailyQuestionSet } from '@/api';
import type { AdminDailyQuestionSetDto, DailyQuestionSet } from '@/api';
import dayjs from '@/plugins/dayjs';

const DATE_FORMAT = 'YYYY-MM-DD';
/** 业务日期按北京时间 */
const BUSINESS_UTC_OFFSET_MINUTES = 480;
export const MAX_RANGE_DAYS = 366;
const DEFAULT_PAST_DAYS = 6;
const DEFAULT_FUTURE_DAYS = 1;

export function businessToday(now: Date = new Date()): string {
  return dayjs(now).utcOffset(BUSINESS_UTC_OFFSET_MINUTES).format(DATE_FORMAT);
}

export function defaultDateRange(now: Date = new Date()): [string, string] {
  const today = dayjs(businessToday(now));
  return [
    today.subtract(DEFAULT_PAST_DAYS, 'day').format(DATE_FORMAT),
    today.add(DEFAULT_FUTURE_DAYS, 'day').format(DATE_FORMAT),
  ];
}

export function validateDateRange([from, to]: [string, string]): string | null {
  const days = dayjs(to).diff(dayjs(from), 'day');
  if (days < 0) return '结束日期不能早于开始日期';
  if (days >= MAX_RANGE_DAYS) return `日期范围不能超过 ${MAX_RANGE_DAYS} 天`;
  return null;
}

/** 当日及以后的题组可重新生成 */
export const canRegenerate = (date: string, today: string = businessToday()) => date >= today;

export function useDailySets() {
  const sets = ref<AdminDailyQuestionSetDto[]>([]);
  const loading = ref(false);
  let query: { subjectId: string; range: [string, string] } | null = null;

  const load = async (subjectId: string, range: [string, string]) => {
    query = { subjectId, range };
    loading.value = true;
    try {
      const result = await adminGetDailyQuestionSets(
        subjectId,
        { from: range[0], to: range[1] },
        { disableDedup: true },
      );
      sets.value = [...(result ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    } finally {
      loading.value = false;
    }
  };

  const regenerate = async (date: string): Promise<DailyQuestionSet | null> => {
    if (!query) return null;
    const result = await adminRegenerateDailyQuestionSet(query.subjectId, date);
    await load(query.subjectId, query.range);
    return result;
  };

  return { sets, loading, load, regenerate };
}
