import { computed, ref } from 'vue';
import { canStartErrata } from '../shared/errata';
import {
  createErrataDraft,
  errataChanges,
  toCreateErrataDto,
  validateErrataDraft,
  type ErrataDraft,
} from '../shared/errata-form';
import { LINKABLE_LIST_LIMIT } from '../shared/feedback-constants';
import { mergeFileUrls, toQuestionForm, type QuestionForm } from '../shared/question-form';
import { requestErrorKey, requestErrorMessage } from '../shared/request-error';
import { adminCreateErrata, adminGetQuestion, adminGetQuestionReports } from '@/api';
import type { AdminQuestionDto, AdminQuestionReportDto, AdminQuestionReportDtoStatus, Errata } from '@/api';

const LINKABLE_REPORT_STATUSES: ReadonlySet<AdminQuestionReportDtoStatus> = new Set(['pending', 'processing']);

export interface ErrataSubmitError {
  message: string;
  inProgress: boolean;
}

/** 勘误表单：基于题目当前版本，只改答案与解析 */
export function useErrataForm() {
  const question = ref<AdminQuestionDto | null>(null);
  const original = ref<QuestionForm | null>(null);
  const draft = ref<ErrataDraft | null>(null);
  const reports = ref<AdminQuestionReportDto[]>([]);
  const loading = ref(false);
  const submitting = ref(false);
  const errors = ref<string[]>([]);
  const submitError = ref<ErrataSubmitError | null>(null);
  const loadError = ref('');
  let requestSeq = 0;

  const allowed = computed(() => !!question.value && canStartErrata(question.value));
  const fileUrls = computed(() => mergeFileUrls(question.value?.fileUrls));
  const changes = computed(() =>
    original.value && draft.value
      ? errataChanges(original.value, draft.value.form)
      : { answer: false, analysis: false },
  );

  const loadReports = async (questionId: string, selected: number[], seq: number) => {
    const page = await adminGetQuestionReports(
      { questionId, type: 'question_error', limit: LINKABLE_LIST_LIMIT },
      { disableDedup: true },
    ).catch(() => null);
    if (seq !== requestSeq) return;
    reports.value = (page?.list ?? []).filter(
      report => selected.includes(report.id) || (!report.errataId && LINKABLE_REPORT_STATUSES.has(report.status)),
    );
  };

  const load = async (questionId: string, reportIds: number[] = []) => {
    const seq = ++requestSeq;
    loading.value = true;
    loadError.value = '';
    errors.value = [];
    submitError.value = null;
    question.value = null;
    original.value = null;
    draft.value = null;
    reports.value = [];
    try {
      const result = await adminGetQuestion(questionId, { disableDedup: true });
      if (seq !== requestSeq) return;
      question.value = result;
      original.value = toQuestionForm(result);
      draft.value = createErrataDraft(result, reportIds);
      await loadReports(questionId, reportIds, seq);
    } catch (error) {
      if (seq === requestSeq) loadError.value = requestErrorMessage(error, '题目加载失败');
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  const submit = async (): Promise<Errata | null> => {
    if (!question.value || !original.value || !draft.value) return null;
    errors.value = validateErrataDraft(original.value, draft.value);
    submitError.value = null;
    if (errors.value.length) return null;
    submitting.value = true;
    try {
      return await adminCreateErrata(
        question.value.id,
        toCreateErrataDto(question.value, original.value, draft.value),
        {
          isIgnoreToast: true,
        },
      );
    } catch (error) {
      submitError.value = {
        message: requestErrorMessage(error, '勘误提交失败'),
        inProgress: requestErrorKey(error) === 'errataInProgress',
      };
      return null;
    } finally {
      submitting.value = false;
    }
  };

  return {
    question,
    original,
    draft,
    reports,
    loading,
    submitting,
    errors,
    submitError,
    loadError,
    allowed,
    fileUrls,
    changes,
    load,
    submit,
  };
}
