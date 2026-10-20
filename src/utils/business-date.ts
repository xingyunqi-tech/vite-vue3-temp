import dayjs from '@/plugins/dayjs';

export const DATE_FORMAT = 'YYYY-MM-DD';
/** 业务日期按北京时间 */
const BUSINESS_UTC_OFFSET_MINUTES = 480;
/** 查询日期范围上限（含首尾） */
export const MAX_RANGE_DAYS = 366;

export function businessToday(now: Date = new Date()): string {
  return dayjs(now).utcOffset(BUSINESS_UTC_OFFSET_MINUTES).format(DATE_FORMAT);
}

export function validateDateRange([from, to]: [string, string]): string | null {
  const days = dayjs(to).diff(dayjs(from), 'day');
  if (days < 0) return '结束日期不能早于开始日期';
  if (days >= MAX_RANGE_DAYS) return `日期范围不能超过 ${MAX_RANGE_DAYS} 天`;
  return null;
}
