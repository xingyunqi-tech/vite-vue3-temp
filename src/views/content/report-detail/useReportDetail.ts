import { reactive, ref } from 'vue';
import { REPORT_REPLY_MAX, type ReportStatus } from '../shared/feedback-constants';
import { adminGetErrataList, adminGetQuestion, adminGetQuestionReport, adminUpdateQuestionReport } from '@/api';
import type { AdminQuestionDto, AdminQuestionReportDetailDto, Errata, UpdateQuestionReportDto } from '@/api';

export interface ReportHandleForm {
  status: ReportStatus;
  reply: string;
}

export class ReportValidationError extends Error {}

export const toHandleForm = (report: Pick<AdminQuestionReportDetailDto, 'status' | 'reply'>): ReportHandleForm => ({
  status: report.status,
  reply: report.reply ?? '',
});

/** 只提交改动的状态与回复；回复不能清空 */
export function toReportPatch(
  report: Pick<AdminQuestionReportDetailDto, 'status' | 'reply'>,
  form: ReportHandleForm,
): UpdateQuestionReportDto {
  const patch: UpdateQuestionReportDto = {};
  if (form.status !== report.status) patch.status = form.status;
  const reply = form.reply.trim();
  if (reply.length > REPORT_REPLY_MAX) throw new ReportValidationError(`回复不能超过 ${REPORT_REPLY_MAX} 字`);
  if (!reply && report.reply) throw new ReportValidationError('回复不能清空');
  if (reply && reply !== (report.reply ?? '')) patch.reply = reply;
  return patch;
}

export function useReportDetail() {
  const report = ref<AdminQuestionReportDetailDto | null>(null);
  const question = ref<AdminQuestionDto | null>(null);
  const errataOptions = ref<Errata[]>([]);
  const form = reactive<ReportHandleForm>({ status: 'pending', reply: '' });
  const loading = ref(false);

  const apply = (detail: AdminQuestionReportDetailDto) => {
    report.value = detail;
    Object.assign(form, toHandleForm(detail));
  };

  const loadErrataOptions = async () => {
    const questionId = report.value?.questionId;
    if (!questionId || report.value?.type !== 'question_error') {
      errataOptions.value = [];
      return;
    }
    const result = await adminGetErrataList({ questionId, limit: 100 }, { disableDedup: true });
    errataOptions.value = result?.list ?? [];
  };

  const load = async (id: number) => {
    loading.value = true;
    try {
      const detail = await adminGetQuestionReport(id, { disableDedup: true });
      apply(detail);
      question.value = detail.questionId
        ? await adminGetQuestion(detail.questionId, { disableDedup: true }).catch(() => null)
        : null;
      await loadErrataOptions().catch(() => undefined);
    } finally {
      loading.value = false;
    }
  };

  const update = async (patch: UpdateQuestionReportDto) => {
    if (!report.value) return;
    apply(await adminUpdateQuestionReport(report.value.id, patch));
  };

  /** 返回是否有改动 */
  const save = async (): Promise<boolean> => {
    if (!report.value) return false;
    const patch = toReportPatch(report.value, form);
    if (Object.keys(patch).length === 0) return false;
    await update(patch);
    return true;
  };

  /** 保留处理表单中未保存的状态与回复 */
  const linkErrata = async (errataId: string | null) => {
    if (!report.value) return;
    const edited: Partial<ReportHandleForm> = {};
    if (form.status !== report.value.status) edited.status = form.status;
    if (form.reply !== (report.value.reply ?? '')) edited.reply = form.reply;
    apply(await adminUpdateQuestionReport(report.value.id, { errataId }));
    Object.assign(form, edited);
  };

  return { report, question, errataOptions, form, loading, load, save, linkErrata, loadErrataOptions };
}
