import { ref } from 'vue';
import type { KnowledgeNode } from '../shared/knowledge-tree';
import { invalidateKnowledgeTree } from '../shared/knowledge-tree-cache';
import {
  adminCreateKnowledgePoint,
  adminDeleteKnowledgePoint,
  adminGetSubjectKnowledgePoints,
  adminMigrateKnowledgePointQuestions,
  adminMoveKnowledgePoint,
  adminUpdateKnowledgePoint,
} from '@/api';
import type { MigrateKnowledgePointQuestionsResultDto } from '@/api';

export interface KnowledgePointDraft {
  name: string;
  sort: number;
}

export function useKnowledgeTree() {
  const tree = ref<KnowledgeNode[]>([]);
  const loading = ref(false);
  let subjectId = '';
  let requestSeq = 0;

  const load = async (id: string = subjectId) => {
    subjectId = id;
    const seq = ++requestSeq;
    if (!id) {
      tree.value = [];
      return;
    }
    loading.value = true;
    try {
      const result = await adminGetSubjectKnowledgePoints(id, { disableDedup: true });
      if (seq === requestSeq) tree.value = result ?? [];
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  const create = async (parentId: string | null, draft: KnowledgePointDraft) => {
    await adminCreateKnowledgePoint({ subjectId, parentId, name: draft.name.trim(), sort: draft.sort });
    invalidateKnowledgeTree(subjectId);
    await load();
  };

  const update = async (id: string, draft: KnowledgePointDraft) => {
    await adminUpdateKnowledgePoint(id, { name: draft.name.trim(), sort: draft.sort });
    invalidateKnowledgeTree(subjectId);
    await load();
  };

  const move = async (id: string, parentId: string | null) => {
    await adminMoveKnowledgePoint(id, { parentId });
    invalidateKnowledgeTree(subjectId);
    await load();
  };

  const migrate = async (id: string, targetId: string): Promise<MigrateKnowledgePointQuestionsResultDto> => {
    const result = await adminMigrateKnowledgePointQuestions(id, { targetId });
    invalidateKnowledgeTree(subjectId);
    await load();
    return result;
  };

  const remove = async (id: string) => {
    await adminDeleteKnowledgePoint(id);
    invalidateKnowledgeTree(subjectId);
    await load();
  };

  return { tree, loading, load, create, update, move, migrate, remove };
}
