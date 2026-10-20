import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminGetDailyQuestionSets, adminRegenerateDailyQuestionSet, type AdminDailyQuestionSetDto } from '@/api';
import { canRegenerate, defaultDateRange, useDailySets } from '@/views/content/daily/useDailySets';

vi.mock('@/api', () => ({
  adminGetDailyQuestionSets: vi.fn(),
  adminRegenerateDailyQuestionSet: vi.fn(),
}));

const set = (date: string, questionIds: string[] = ['q1', 'q2']): AdminDailyQuestionSetDto => ({
  id: date,
  subjectId: 's1',
  date,
  questionIds,
  createdAt: '',
  updatedAt: '',
  questions: questionIds.map(id => ({ id, parentId: null, type: 'SINGLE', stem: `题目${id}`, fileUrls: {} })),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('每日一练日期', () => {
  it('默认查询最近 7 天到明天', () => {
    expect(defaultDateRange(new Date('2026-10-17T04:00:00.000Z'))).toEqual(['2026-10-11', '2026-10-18']);
  });

  it('当日及以后可重新生成', () => {
    expect(canRegenerate('2026-10-17', '2026-10-17')).toBe(true);
    expect(canRegenerate('2026-10-18', '2026-10-17')).toBe(true);
    expect(canRegenerate('2026-10-16', '2026-10-17')).toBe(false);
  });
});

describe('useDailySets', () => {
  it('按日期倒序列出题组', async () => {
    vi.mocked(adminGetDailyQuestionSets).mockResolvedValue([set('2026-10-15'), set('2026-10-17')]);
    const daily = useDailySets();

    await daily.load('s1', ['2026-10-11', '2026-10-18']);

    expect(adminGetDailyQuestionSets).toHaveBeenCalledWith(
      's1',
      { from: '2026-10-11', to: '2026-10-18' },
      { disableDedup: true },
    );
    expect(daily.sets.value.map(item => item.date)).toEqual(['2026-10-17', '2026-10-15']);
  });

  it('重新生成后按原条件刷新', async () => {
    vi.mocked(adminGetDailyQuestionSets).mockResolvedValue([]);
    vi.mocked(adminRegenerateDailyQuestionSet).mockResolvedValue(set('2026-10-18', ['q3']));
    const daily = useDailySets();
    await daily.load('s1', ['2026-10-11', '2026-10-18']);

    const result = await daily.regenerate('2026-10-18');

    expect(adminRegenerateDailyQuestionSet).toHaveBeenCalledWith('s1', '2026-10-18');
    expect(result?.questionIds).toEqual(['q3']);
    expect(adminGetDailyQuestionSets).toHaveBeenCalledTimes(2);
  });

  it('重新生成成功但刷新失败时仍返回生成结果', async () => {
    vi.mocked(adminGetDailyQuestionSets).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('network'));
    vi.mocked(adminRegenerateDailyQuestionSet).mockResolvedValue(set('2026-10-18', ['q3']));
    const daily = useDailySets();
    await daily.load('s1', ['2026-10-11', '2026-10-18']);

    const result = await daily.regenerate('2026-10-18');

    expect(result?.questionIds).toEqual(['q3']);
  });

  it('未查询前不能重新生成', async () => {
    expect(await useDailySets().regenerate('2026-10-18')).toBeNull();
    expect(adminRegenerateDailyQuestionSet).not.toHaveBeenCalled();
  });
});
