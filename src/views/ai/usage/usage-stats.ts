import type { AiUsageItemDto, AiUsageTotalDto } from '@/api';
import dayjs from '@/plugins/dayjs';
import { businessToday, DATE_FORMAT } from '@/utils/business-date';

export const DEFAULT_RANGE_DAYS = 7;

export type UsageRange = [string, string];
export type UsageDimension = 'date' | 'model' | 'kind';

export interface UsageRow extends AiUsageTotalDto {
  key: string;
  /** 失败数 / 请求数，无请求时为 0 */
  failureRate: number;
}

export const AI_USAGE_KIND_LABEL: Record<string, string> = {
  chat: '讲题对话',
  grading: '主观题批改',
};

export const usageKindLabel = (kind: string) => AI_USAGE_KIND_LABEL[kind] ?? kind;

/** 日期（按本地日历日）是否晚于北京时间今天 */
export const isAfterBusinessToday = (date: Date, now: Date = new Date()) =>
  dayjs(date).format(DATE_FORMAT) > businessToday(now);

/** 截至业务日今天（含）的最近 days 天 */
export function defaultUsageRange(now: Date = new Date(), days = DEFAULT_RANGE_DAYS): UsageRange {
  const today = dayjs(businessToday(now));
  return [today.subtract(days - 1, 'day').format(DATE_FORMAT), today.format(DATE_FORMAT)];
}

/** 成本保留 6 位小数，消除浮点累加误差 */
const roundCost = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const emptyTotal = (): AiUsageTotalDto => ({
  requests: 0,
  failures: 0,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  cost: 0,
});

const toRow = (key: string, total: AiUsageTotalDto): UsageRow => ({
  key,
  ...total,
  cost: roundCost(total.cost),
  failureRate: total.requests > 0 ? total.failures / total.requests : 0,
});

function accumulate(target: AiUsageTotalDto, item: AiUsageTotalDto) {
  target.requests += item.requests;
  target.failures += item.failures;
  target.inputTokens += item.inputTokens;
  target.cachedInputTokens += item.cachedInputTokens;
  target.outputTokens += item.outputTokens;
  target.cost += item.cost;
}

export function sumUsage(items: AiUsageTotalDto[]): UsageRow {
  const total = emptyTotal();
  items.forEach(item => accumulate(total, item));
  return toRow('total', total);
}

/** 区间内每一天，降序 */
export function enumerateDates([from, to]: UsageRange): string[] {
  const dates: string[] = [];
  const start = dayjs(from);
  for (let day = dayjs(to); !day.isBefore(start, 'day'); day = day.subtract(1, 'day')) {
    dates.push(day.format(DATE_FORMAT));
  }
  return dates;
}

/**
 * 按维度汇总：按日补齐区间内无调用的日期并按日期降序；按模型、类型按成本降序
 */
export function groupUsage(items: AiUsageItemDto[], dimension: UsageDimension, range?: UsageRange): UsageRow[] {
  const groups = new Map<string, AiUsageTotalDto>();
  if (dimension === 'date' && range) enumerateDates(range).forEach(date => groups.set(date, emptyTotal()));

  items.forEach(item => {
    const key = item[dimension];
    let group = groups.get(key);
    if (!group) {
      group = emptyTotal();
      groups.set(key, group);
    }
    accumulate(group, item);
  });

  const rows = [...groups].map(([key, total]) => toRow(key, total));
  return dimension === 'date'
    ? rows.sort((a, b) => b.key.localeCompare(a.key))
    : rows.sort((a, b) => b.cost - a.cost || a.key.localeCompare(b.key));
}

const integerFormatter = new Intl.NumberFormat('zh-CN');

export const formatCount = (value: number) => integerFormatter.format(value);

const MIN_DISPLAY_COST = 0.0001;

export const formatCost = (value: number) =>
  value > 0 && value < MIN_DISPLAY_COST ? `<¥${MIN_DISPLAY_COST}` : `¥${value.toFixed(4)}`;

export const formatRate = (value: number) => `${(value * 100).toFixed(1)}%`;
