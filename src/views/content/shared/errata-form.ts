import { REPORT_REPLY_MAX } from './feedback-constants';
import {
  diffQuestionPayload,
  toQuestionForm,
  toQuestionPayload,
  validateQuestionForm,
  type QuestionForm,
} from './question-form';
import type { AdminQuestionDto, CreateErrataDto, CreateErrataDtoAnswer } from '@/api';

export interface ErrataDraft {
  form: QuestionForm;
  reply: string;
  reportIds: number[];
}

export function createErrataDraft(question: AdminQuestionDto, reportIds: number[] = []): ErrataDraft {
  return { form: toQuestionForm(question), reply: '', reportIds: [...reportIds] };
}

export function errataChanges(original: QuestionForm, form: QuestionForm): { answer: boolean; analysis: boolean } {
  const patch = diffQuestionPayload(toQuestionPayload(original), toQuestionPayload(form));
  return { answer: 'answer' in patch, analysis: 'analysis' in patch };
}

/** 勘误只改答案与解析：题型、选项与填空空数保持当前版本 */
export function validateErrataDraft(original: QuestionForm, draft: ErrataDraft): string[] {
  const { form } = draft;
  const errors = validateQuestionForm(form);
  if (form.type !== original.type) errors.push('勘误不能修改题型');
  const keys = (value: QuestionForm) => value.options.map(option => option.key).join(',');
  if (keys(form) !== keys(original)) errors.push('勘误不能修改选项');
  if (form.type === 'FILL' && form.blanks.length !== original.blanks.length) errors.push('勘误不能修改填空空数');
  if (draft.reply.trim().length > REPORT_REPLY_MAX) errors.push(`回复不能超过 ${REPORT_REPLY_MAX} 字`);
  const changes = errataChanges(original, form);
  if (!changes.answer && !changes.analysis) errors.push('答案与解析没有变化');
  return errors;
}

/** 答案未改动时提交题目当前答案原值 */
export function toCreateErrataDto(
  question: Pick<AdminQuestionDto, 'answer'>,
  original: QuestionForm,
  draft: ErrataDraft,
): CreateErrataDto {
  const payload = toQuestionPayload(draft.form);
  const changes = errataChanges(original, draft.form);
  const reply = draft.reply.trim();
  return {
    answer: (changes.answer ? payload.answer : question.answer) as CreateErrataDtoAnswer,
    ...(changes.analysis ? { analysis: payload.analysis } : {}),
    ...(reply ? { reply } : {}),
    ...(draft.reportIds.length ? { reportIds: [...draft.reportIds] } : {}),
  };
}
