import type { RouteLocationRaw } from 'vue-router';
import type { AdminQuestionDto, Errata } from '@/api';

export const ERRATA_POLL_INTERVAL = 3000;
export const ERRATA_STALE_MINUTES = 10;
export const ERRATA_STALE_MS = ERRATA_STALE_MINUTES * 60_000;
export const ERRATA_STALE_TOLERANCE_MS = 60_000;

export const isErrataActive = (errata: Pick<Errata, 'status'>) =>
  errata.status === 'PENDING' || errata.status === 'RUNNING';

export function errataProgress(errata: Pick<Errata, 'status' | 'affectedUsers' | 'processedUsers'>): number {
  if (errata.status === 'DONE') return 100;
  if (errata.affectedUsers <= 0) return 0;
  return Math.min(100, Math.floor((errata.processedUsers / errata.affectedUsers) * 100));
}

/** 排队或执行中的任务超过 ERRATA_STALE_MS 未更新，另留 ERRATA_STALE_TOLERANCE_MS 容差 */
export function isErrataStale(errata: Pick<Errata, 'status' | 'updatedAt'>, now = Date.now()): boolean {
  if (!isErrataActive(errata)) return false;
  const updatedAt = Date.parse(errata.updatedAt);
  return Number.isFinite(updatedAt) && now - updatedAt >= ERRATA_STALE_MS + ERRATA_STALE_TOLERANCE_MS;
}

export const canRetryErrata = (errata: Pick<Errata, 'status' | 'updatedAt'>, now = Date.now()) =>
  errata.status === 'FAILED' || isErrataStale(errata, now);

/** 材料不能勘误；从未发布过的题目直接编辑 */
export const canStartErrata = (question: Pick<AdminQuestionDto, 'type' | 'currentVersion'>) =>
  question.type !== 'MATERIAL' && question.currentVersion > 0;

export function errataCreateLocation(questionId: string, reportIds: number[] = []): RouteLocationRaw {
  return {
    path: '/feedback/errata/create',
    query: { questionId, ...(reportIds.length ? { reportIds: reportIds.join(',') } : {}) },
  };
}

export function parseReportIds(value: unknown): number[] {
  if (typeof value !== 'string') return [];
  const ids = value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(id => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}
