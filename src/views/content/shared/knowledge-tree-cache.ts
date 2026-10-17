import type { KnowledgeNode } from './knowledge-tree';
import { adminGetSubjectKnowledgePoints } from '@/api';

const cache = new Map<string, Promise<KnowledgeNode[]>>();

/** 同一科目共享请求与结果，失败时不缓存 */
export function fetchKnowledgeTree(subjectId: string): Promise<KnowledgeNode[]> {
  const cached = cache.get(subjectId);
  if (cached) return cached;
  const request = adminGetSubjectKnowledgePoints(subjectId, { disableDedup: true }).then(tree => tree ?? []);
  cache.set(subjectId, request);
  request.catch(() => cache.delete(subjectId));
  return request;
}

export function invalidateKnowledgeTree(subjectId?: string): void {
  if (subjectId) cache.delete(subjectId);
  else cache.clear();
}
