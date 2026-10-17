import { describe, it, expect } from 'vitest';
import { createAlertFilters, toAlertQuery } from '@/views/system/monitor/alert-query';

describe('toAlertQuery', () => {
  it('默认只查未确认告警', () => {
    expect(toAlertQuery(createAlertFilters(), 1, 20)).toEqual({ page: 1, limit: 20, acknowledged: false });
  });

  it('按状态、级别、类型组合筛选', () => {
    expect(toAlertQuery({ status: 'acknowledged', level: 'CRITICAL', type: ' auto-submit ' }, 2, 50)).toEqual({
      page: 2,
      limit: 50,
      acknowledged: true,
      level: 'CRITICAL',
      type: 'auto-submit',
    });
  });

  it('全部状态与空条件不传', () => {
    expect(toAlertQuery({ status: 'all', level: '', type: '  ' }, 1, 10)).toEqual({ page: 1, limit: 10 });
  });
});
