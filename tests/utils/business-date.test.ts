import { describe, it, expect } from 'vitest';
import { businessToday, validateDateRange } from '@/utils/business-date';

describe('业务日期', () => {
  it('按北京时间取当天', () => {
    expect(businessToday(new Date('2026-10-17T16:30:00.000Z'))).toBe('2026-10-18');
    expect(businessToday(new Date('2026-10-17T15:59:00.000Z'))).toBe('2026-10-17');
  });

  it('结束日期不能早于开始日期，跨度不超过 366 天', () => {
    expect(validateDateRange(['2026-10-12', '2026-10-18'])).toBeNull();
    expect(validateDateRange(['2025-10-18', '2026-10-18'])).toBeNull();
    expect(validateDateRange(['2026-10-18', '2026-10-12'])).toBe('结束日期不能早于开始日期');
    expect(validateDateRange(['2025-10-17', '2026-10-18'])).toBe('日期范围不能超过 366 天');
  });
});
