import { ref } from 'vue';
import {
  adminBatchDeleteQuestions,
  adminBatchOfflineQuestions,
  adminBatchRejectQuestions,
  adminBatchSubmitQuestions,
  adminBatchUpdateQuestions,
  adminDeleteQuestion,
  adminGetQuestions,
  adminOfflineQuestion,
  adminPublishQuestion,
  adminSubmitQuestion,
} from '@/api';
import type {
  AdminGetQuestionsParams,
  AdminQuestionDto,
  BatchQuestionsResultDto,
  BatchUpdateQuestionsDto,
  KnowledgePointUpdateMode,
  QuestionSource,
  QuestionStatus,
  QuestionType,
} from '@/api';
import { usePagedList } from '@/composables/usePagedList';
import { markdownSummary } from '@/utils/markdown';

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

export type BatchQuestionChanges = Omit<BatchUpdateQuestionsDto, 'ids'>;

export interface BatchUpdateForm {
  knowledgePointIds: string[];
  mode: KnowledgePointUpdateMode;
  difficulty?: number | null;
  source?: QuestionSource | '' | null;
  isFree?: boolean | null;
}

const isBlank = (value: unknown) => value === undefined || value === null || value === '';

/** 只带出填写了的字段，一项都没填时返回 null */
export function toBatchQuestionChanges(form: BatchUpdateForm): BatchQuestionChanges | null {
  const changes: BatchQuestionChanges = {};
  if (form.knowledgePointIds.length > 0) {
    changes.knowledgePointIds = [...form.knowledgePointIds];
    changes.mode = form.mode;
  }
  if (!isBlank(form.difficulty)) changes.difficulty = form.difficulty!;
  if (!isBlank(form.source)) changes.source = form.source as QuestionSource;
  if (!isBlank(form.isFree)) changes.isFree = form.isFree!;
  return Object.keys(changes).length > 0 ? changes : null;
}

export const questionSummary = (question: AdminQuestionDto) =>
  markdownSummary(question.type === 'MATERIAL' ? question.material : question.stem);

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

  const selected = ref<AdminQuestionDto[]>([]);
  const clearSelected = () => {
    selected.value = [];
  };
  const selectedIds = () => selected.value.map(question => question.id);

  const changePage = (value: number) => {
    clearSelected();
    list.changePage(value);
  };

  const changeSize = (value: number) => {
    clearSelected();
    list.changeSize(value);
  };

  const search = () => {
    clearSelected();
    return list.search();
  };

  const reset = () => {
    clearSelected();
    return list.reset();
  };

  /** 批量操作后清空勾选并刷新当前页 */
  const refreshAfterBatch = () => {
    clearSelected();
    return list.refresh();
  };

  const batchSubmit = (): Promise<BatchQuestionsResultDto> => adminBatchSubmitQuestions({ ids: selectedIds() });
  const batchReject = (reason: string): Promise<BatchQuestionsResultDto> =>
    adminBatchRejectQuestions({ ids: selectedIds(), reason: reason.trim() });
  const batchOffline = (): Promise<BatchQuestionsResultDto> => adminBatchOfflineQuestions({ ids: selectedIds() });
  const batchRemove = (): Promise<BatchQuestionsResultDto> => adminBatchDeleteQuestions({ ids: selectedIds() });
  const batchUpdate = (changes: BatchQuestionChanges): Promise<BatchQuestionsResultDto> =>
    adminBatchUpdateQuestions({ ...changes, ids: selectedIds() });

  return {
    ...list,
    changePage,
    changeSize,
    search,
    reset,
    submit,
    offline,
    republish,
    remove,
    selected,
    clearSelected,
    refreshAfterBatch,
    batchSubmit,
    batchReject,
    batchOffline,
    batchRemove,
    batchUpdate,
  };
}
