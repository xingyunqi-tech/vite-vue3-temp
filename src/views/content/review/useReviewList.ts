import { ref } from 'vue';
import { usePagedList } from '../shared/usePagedList';
import { adminBatchPublishQuestions, adminGetQuestions, adminPublishQuestion, adminRejectQuestion } from '@/api';
import type { AdminGetQuestionsParams, AdminQuestionDto, QuestionType } from '@/api';

export interface ReviewFilters {
  subjectId: string;
  type: QuestionType | '';
  keyword: string;
}

export const createReviewFilters = (): ReviewFilters => ({ subjectId: '', type: '', keyword: '' });

export function toReviewQuery(filters: ReviewFilters, page: number, limit: number): AdminGetQuestionsParams {
  const query: AdminGetQuestionsParams = { page, limit, status: 'REVIEWING', topLevel: true };
  const keyword = filters.keyword.trim();
  if (keyword) query.keyword = keyword;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;
  return query;
}

export function useReviewList() {
  const list = usePagedList<ReviewFilters, AdminQuestionDto>({
    createFilters: createReviewFilters,
    fetchPage: (filters, page, limit) => adminGetQuestions(toReviewQuery(filters, page, limit), { disableDedup: true }),
  });
  const selectedIds = ref<string[]>([]);

  const afterChange = async () => {
    selectedIds.value = [];
    await list.refresh();
  };

  const publish = async (question: AdminQuestionDto) => {
    await adminPublishQuestion(question.id);
    await afterChange();
  };

  const reject = async (question: AdminQuestionDto) => {
    await adminRejectQuestion(question.id);
    await afterChange();
  };

  /** 返回变为已发布的题目数（含材料小题） */
  const batchPublish = async (): Promise<number> => {
    if (selectedIds.value.length === 0) return 0;
    const result = await adminBatchPublishQuestions({ ids: [...selectedIds.value] });
    await afterChange();
    return result.count;
  };

  return { ...list, selectedIds, publish, reject, batchPublish };
}
