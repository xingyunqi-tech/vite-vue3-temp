import { computed, reactive, ref, watch } from 'vue';
import { leafIds, type KnowledgeNode } from '../shared/knowledge-tree';
import {
  createQuestionForm,
  diffQuestionPayload,
  isAnswerLocked,
  mergeFileUrls,
  toQuestionForm,
  toQuestionPayload,
  validateQuestionForm,
  type QuestionForm,
  type QuestionPayload,
} from '../shared/question-form';
import {
  adminCreateQuestion,
  adminDeleteQuestion,
  adminGetQuestion,
  adminSubmitQuestion,
  adminUpdateQuestion,
} from '@/api';
import type { AdminQuestionDto, FileType, QuestionType } from '@/api';

export class QuestionValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('；'));
  }
}

export type SaveResult = { kind: 'created' | 'updated' | 'unchanged'; question: AdminQuestionDto | null };

/** 上传过的文件 ID 与地址，用于预览 `file:{fileId}` 引用 */
export function useFileUrls() {
  const fileUrls = reactive<Record<string, string>>({});
  const register = (file: FileType) => {
    fileUrls[file.id.toLowerCase()] = file.path;
  };
  const registerQuestion = (question: AdminQuestionDto) => {
    [question, ...(question.children ?? [])].forEach(item => {
      Object.assign(fileUrls, mergeFileUrls(item.fileUrls));
      if (item.audioFileId && item.audioUrl) fileUrls[item.audioFileId.toLowerCase()] = item.audioUrl;
    });
  };
  return { fileUrls, register, registerQuestion };
}

export function useQuestionDraft(options: { isSubQuestion?: boolean } = {}) {
  const form = ref<QuestionForm>(createQuestionForm());
  const original = ref<QuestionPayload | null>(null);
  const baseline = ref<QuestionPayload>(toQuestionPayload(form.value));
  const source = ref<AdminQuestionDto | null>(null);
  const knowledgeTree = ref<KnowledgeNode[]>([]);

  const answerLocked = computed(() => isAnswerLocked(source.value));
  const payload = computed(() => toQuestionPayload(form.value));
  const patch = computed(() => (original.value ? diffQuestionPayload(original.value, payload.value) : null));
  const dirty = computed(() => !original.value || Object.keys(patch.value ?? {}).length > 0);
  const hasUnsavedChanges = computed(() => Object.keys(diffQuestionPayload(baseline.value, payload.value)).length > 0);

  const reset = (question: AdminQuestionDto | null, type: QuestionType = 'SINGLE') => {
    source.value = question;
    form.value = question ? toQuestionForm(question) : createQuestionForm(type);
    original.value = question ? toQuestionPayload(form.value) : null;
    baseline.value = toQuestionPayload(form.value);
  };

  const validate = () =>
    validateQuestionForm(form.value, {
      isSubQuestion: options.isSubQuestion,
      leafIds: knowledgeTree.value.length ? leafIds(knowledgeTree.value) : undefined,
    });

  const setKnowledgeTree = (tree: KnowledgeNode[]) => {
    knowledgeTree.value = tree;
  };

  /** 新建传 subjectId（小题再传 parentId），编辑只提交改动的字段 */
  const save = async (target: { subjectId: string; parentId?: string }): Promise<SaveResult> => {
    const errors = validate();
    if (errors.length) throw new QuestionValidationError(errors);
    if (!source.value) {
      const created = await adminCreateQuestion({ ...payload.value, ...target });
      return { kind: 'created', question: created };
    }
    if (!dirty.value) return { kind: 'unchanged', question: source.value };
    const updated = await adminUpdateQuestion(source.value.id, patch.value!);
    return { kind: 'updated', question: updated };
  };

  return {
    form,
    source,
    answerLocked,
    payload,
    dirty,
    hasUnsavedChanges,
    knowledgeTree,
    reset,
    validate,
    save,
    setKnowledgeTree,
  };
}

export function useQuestionEditor() {
  const draft = useQuestionDraft();
  const { fileUrls, register, registerQuestion } = useFileUrls();
  const question = draft.source;
  const subjectId = ref('');
  const loading = ref(false);
  const saving = ref(false);

  const editable = computed(() => question.value?.status !== 'REVIEWING');
  const children = computed(() => question.value?.children ?? []);

  const load = async (id: string) => {
    loading.value = true;
    try {
      const result = await adminGetQuestion(id, { disableDedup: true });
      registerQuestion(result);
      draft.reset(result);
      subjectId.value = result.subjectId;
    } finally {
      loading.value = false;
    }
  };

  const startCreate = (type: QuestionType, initialSubjectId = '') => {
    draft.reset(null, type);
    subjectId.value = initialSubjectId;
  };

  watch(subjectId, () => {
    if (!question.value) draft.form.value.knowledgePointIds = [];
  });

  const save = async (): Promise<SaveResult> => {
    if (!subjectId.value) throw new QuestionValidationError(['请选择科目']);
    saving.value = true;
    try {
      const result = await draft.save({ subjectId: subjectId.value });
      if (result.kind === 'updated' && question.value) await load(question.value.id);
      return result;
    } finally {
      saving.value = false;
    }
  };

  const submitForReview = async () => {
    if (!question.value) return;
    if (draft.dirty.value) await save();
    await adminSubmitQuestion(question.value.id);
    await load(question.value.id);
  };

  const reloadCurrent = async () => {
    if (question.value) await load(question.value.id);
  };

  const removeChild = async (child: AdminQuestionDto) => {
    await adminDeleteQuestion(child.id);
    await reloadCurrent();
  };

  return {
    ...draft,
    fileUrls,
    register,
    question,
    subjectId,
    loading,
    saving,
    editable,
    children,
    load,
    startCreate,
    save,
    submitForReview,
    reloadCurrent,
    removeChild,
  };
}
