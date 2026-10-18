import { describe, it, expect } from 'vitest';
import { errata, question } from './feedback-fixtures';
import {
  canRetryErrata,
  canStartErrata,
  ERRATA_STALE_MS,
  ERRATA_STALE_TOLERANCE_MS,
  errataCreateLocation,
  errataProgress,
  isErrataStale,
  parseReportIds,
} from '@/views/content/shared/errata';

const UPDATED_AT = Date.parse('2026-10-17T00:00:00.000Z');
const STALE_AT = ERRATA_STALE_MS + ERRATA_STALE_TOLERANCE_MS;

describe('勘误任务工具', () => {
  it('进度为已处理用户占比，完成时为 100，无受影响用户时为 0', () => {
    expect(errataProgress(errata({ affectedUsers: 8, processedUsers: 3 }))).toBe(37);
    expect(errataProgress(errata({ status: 'PENDING', affectedUsers: 0, processedUsers: 0 }))).toBe(0);
    expect(errataProgress(errata({ status: 'DONE', affectedUsers: 0, processedUsers: 0 }))).toBe(100);
  });

  it('排队或执行中且超过 10 分钟加 1 分钟容差未更新视为超时', () => {
    expect(isErrataStale(errata(), UPDATED_AT + ERRATA_STALE_MS)).toBe(false);
    expect(isErrataStale(errata(), UPDATED_AT + STALE_AT - 1)).toBe(false);
    expect(isErrataStale(errata(), UPDATED_AT + STALE_AT)).toBe(true);
    expect(isErrataStale(errata({ status: 'DONE' }), UPDATED_AT + STALE_AT * 2)).toBe(false);
  });

  it('失败或超时的任务可以重试', () => {
    expect(canRetryErrata(errata({ status: 'FAILED' }), UPDATED_AT)).toBe(true);
    expect(canRetryErrata(errata({ status: 'PENDING' }), UPDATED_AT + STALE_AT)).toBe(true);
    expect(canRetryErrata(errata(), UPDATED_AT + 1000)).toBe(false);
    expect(canRetryErrata(errata({ status: 'DONE' }), UPDATED_AT + STALE_AT)).toBe(false);
  });

  it('只有发布过的非材料题可以勘误', () => {
    expect(canStartErrata(question())).toBe(true);
    expect(canStartErrata(question({ currentVersion: 0 }))).toBe(false);
    expect(canStartErrata(question({ type: 'MATERIAL' }))).toBe(false);
  });

  it('勘误表单地址带题目与纠错单', () => {
    expect(errataCreateLocation('q1')).toEqual({ path: '/feedback/errata/create', query: { questionId: 'q1' } });
    expect(errataCreateLocation('q1', [3, 5])).toEqual({
      path: '/feedback/errata/create',
      query: { questionId: 'q1', reportIds: '3,5' },
    });
  });

  it('解析纠错单 ID 时去重并忽略非法值', () => {
    expect(parseReportIds('3, 5,x,0,3,-1,2.5')).toEqual([3, 5]);
    expect(parseReportIds(undefined)).toEqual([]);
    expect(parseReportIds(['3'])).toEqual([]);
  });
});
