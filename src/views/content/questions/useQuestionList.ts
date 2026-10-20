import {
  adminDeleteQuestion,
  adminGetQuestions,
  adminOfflineQuestion,
  adminPublishQuestion,
  adminSubmitQuestion,
} from '@/api';
import type { AdminGetQuestionsParams, AdminQuestionDto, QuestionSource, QuestionStatus, QuestionType } from '@/api';
import { usePagedList } from '@/composables/usePagedList';

export interface QuestionFilters {
  subjectId: string;
  knowledgePointId: string;
  type: QuestionType | '';
  status: QuestionStatus | '';
  source: QuestionSource | '';
  keyword: string;
}

export const createQuestionFilters = (): QuestionFilters => ({
  subjectId: '',
  knowledgePointId: '',
  type: '',
  status: '',
  source: '',
  keyword: '',
});

/** 列表只含独立题与材料；按知识点筛选时含其下级知识点 */
export function toQuestionQuery(filters: QuestionFilters, page: number, limit: number): AdminGetQuestionsParams {
  const query: AdminGetQuestionsParams = { page, limit, topLevel: true };
  const keyword = filters.keyword.trim();
  if (keyword) query.keyword = keyword;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.subjectId && filters.knowledgePointId) query.knowledgePointId = filters.knowledgePointId;
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.source) query.source = filters.source;
  return query;
}

export const canEditQuestion = (question: AdminQuestionDto) => question.status !== 'REVIEWING';
export const canSubmitQuestion = (question: AdminQuestionDto) => question.status === 'DRAFT';
export const canOfflineQuestion = (question: AdminQuestionDto) => question.status === 'PUBLISHED';
export const canRepublishQuestion = (question: AdminQuestionDto) => question.status === 'OFFLINE';
export const canDeleteQuestion = (question: AdminQuestionDto) =>
  question.status === 'DRAFT' && question.currentVersion === 0;

export function useQuestionList() {
  const list = usePagedList<QuestionFilters, AdminQuestionDto>({
    createFilters: createQuestionFilters,
    fetchPage: (filters, page, limit) =>
      adminGetQuestions(toQuestionQuery(filters, page, limit), { disableDedup: true }),
  });

  const submit = async (question: AdminQuestionDto) => {
    await adminSubmitQuestion(question.id);
    await list.load();
  };

  const offline = async (question: AdminQuestionDto) => {
    await adminOfflineQuestion(question.id);
    await list.load();
  };

  const republish = async (question: AdminQuestionDto) => {
    await adminPublishQuestion(question.id);
    await list.load();
  };

  const remove = async (question: AdminQuestionDto) => {
    await adminDeleteQuestion(question.id);
    await list.refresh();
  };

  return { ...list, submit, offline, republish, remove };
}
