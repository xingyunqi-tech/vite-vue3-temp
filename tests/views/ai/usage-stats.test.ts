import { describe, it, expect } from 'vitest';
import type { AiUsageItemDto } from '@/api';
import {
  defaultUsageRange,
  enumerateDates,
  formatCost,
  formatCount,
  formatRate,
  isAfterBusinessToday,
  groupUsage,
  sumUsage,
  usageKindLabel,
  validateUsageRange,
} from '@/views/ai/usage/usage-stats';

const item = (overrides: Partial<AiUsageItemDto> = {}): AiUsageItemDto => ({
  date: '2026-10-17',
  model: 'deepseek-chat',
  kind: 'chat',
  requests: 10,
  failures: 1,
  inputTokens: 1000,
  cachedInputTokens: 400,
  outputTokens: 500,
  cost: 0.1,
  ...overrides,
});

describe('AI 用量日期区间', () => {
  it('默认区间为截至北京时间今天的最近 7 天', () => {
    expect(defaultUsageRange(new Date('2026-10-18T03:00:00Z'))).toEqual(['2026-10-12', '2026-10-18']);
    expect(defaultUsageRange(new Date('2026-10-17T17:00:00Z'))).toEqual(['2026-10-12', '2026-10-18']);
  });

  it('可指定天数', () => {
    expect(defaultUsageRange(new Date('2026-10-18T03:00:00Z'), 30)).toEqual(['2026-09-19', '2026-10-18']);
  });

  it('结束日期不能早于开始日期，跨度不超过 366 天', () => {
    expect(validateUsageRange(['2026-10-12', '2026-10-18'])).toBeNull();
    expect(validateUsageRange(['2025-10-18', '2026-10-18'])).toBeNull();
    expect(validateUsageRange(['2026-10-18', '2026-10-12'])).toBe('结束日期不能早于开始日期');
    expect(validateUsageRange(['2025-10-17', '2026-10-18'])).toBe('日期范围不能超过 366 天');
  });

  it('晚于北京时间今天的日期不可选', () => {
    const now = new Date('2026-10-17T17:00:00Z');

    expect(isAfterBusinessToday(new Date(2026, 9, 18), now)).toBe(false);
    expect(isAfterBusinessToday(new Date(2026, 9, 19), now)).toBe(true);
  });

  it('按日期降序列出区间内每一天', () => {
    expect(enumerateDates(['2026-10-16', '2026-10-18'])).toEqual(['2026-10-18', '2026-10-17', '2026-10-16']);
    expect(enumerateDates(['2026-10-18', '2026-10-18'])).toEqual(['2026-10-18']);
  });
});

describe('AI 用量汇总', () => {
  it('合计请求、失败、token 与成本，并算出失败率', () => {
    const total = sumUsage([
      item(),
      item({ requests: 30, failures: 3, inputTokens: 2000, cachedInputTokens: 600, outputTokens: 1500, cost: 0.2 }),
    ]);

    expect(total).toEqual({
      key: 'total',
      requests: 40,
      failures: 4,
      inputTokens: 3000,
      cachedInputTokens: 1000,
      outputTokens: 2000,
      cost: 0.3,
      failureRate: 0.1,
    });
  });

  it('无请求时各项为 0，失败率为 0', () => {
    expect(sumUsage([])).toMatchObject({ requests: 0, failures: 0, cost: 0, failureRate: 0 });
  });

  it('按日汇总时补齐无调用的日期并按日期降序', () => {
    const rows = groupUsage(
      [
        item({ date: '2026-10-16' }),
        item({ date: '2026-10-16', model: 'qwen', cost: 0.05 }),
        item({ date: '2026-10-18' }),
      ],
      'date',
      ['2026-10-16', '2026-10-18'],
    );

    expect(rows.map(row => row.key)).toEqual(['2026-10-18', '2026-10-17', '2026-10-16']);
    expect(rows[1]).toMatchObject({ requests: 0, cost: 0 });
    expect(rows[2]).toMatchObject({ requests: 20, failures: 2, inputTokens: 2000, cachedInputTokens: 800, cost: 0.15 });
  });

  it('按模型与类型汇总时按成本降序', () => {
    const items = [
      item({ model: 'qwen', kind: 'grading', cost: 0.05 }),
      item({ model: 'deepseek-chat', cost: 0.2 }),
      item({ model: 'deepseek-chat', date: '2026-10-18', cost: 0.3 }),
    ];

    expect(groupUsage(items, 'model').map(row => [row.key, row.cost, row.requests])).toEqual([
      ['deepseek-chat', 0.5, 20],
      ['qwen', 0.05, 10],
    ]);
    expect(groupUsage(items, 'kind').map(row => row.key)).toEqual(['chat', 'grading']);
  });
});

describe('AI 用量展示格式', () => {
  it('类型、数量、成本与失败率', () => {
    expect(usageKindLabel('chat')).toBe('讲题对话');
    expect(usageKindLabel('grading')).toBe('主观题批改');
    expect(usageKindLabel('other')).toBe('other');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCost(0.123456)).toBe('¥0.1235');
    expect(formatCost(0)).toBe('¥0.0000');
    expect(formatCost(0.00004)).toBe('<¥0.0001');
    expect(formatCost(0.0001)).toBe('¥0.0001');
    expect(formatRate(0.1234)).toBe('12.3%');
  });
});
