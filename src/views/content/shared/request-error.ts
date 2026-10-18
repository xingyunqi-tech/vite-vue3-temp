import { isAxiosError } from 'axios';
import { toFriendlyMessage } from '@/utils/error-handler';

const ERROR_TEXT: Record<string, string> = {
  errataInProgress: '该题已有进行中的勘误',
  errataUnchanged: '答案与解析没有变化',
  errataMaterialNotAllowed: '材料不能勘误，请对小题勘误',
  errataQuestionNotPublished: '题目未发布过，请直接编辑',
  errataNotRetryable: '只能继续执行失败或超过 10 分钟未进展的勘误任务',
  errataNotLinkable: '只能关联同一题目的勘误任务',
  errataNotFound: '勘误任务不存在',
  questionReportNotFound: '纠错单不存在或不属于该题目',
  invalidQuestionAnswer: '答案格式不正确',
};

interface ErrorBody {
  message?: unknown;
  data?: Record<string, unknown> | null;
}

const bodyOf = (error: unknown): ErrorBody | null => {
  if (!isAxiosError(error)) return null;
  const body = error.response?.data;
  return body && typeof body === 'object' ? (body as ErrorBody) : null;
};

const textOf = (value: unknown) => (typeof value === 'string' && value ? (ERROR_TEXT[value] ?? value) : '');

/** 业务错误键：`data.errorKey`，或字段错误里的已知错误键 */
export function requestErrorKey(error: unknown): string {
  const data = bodyOf(error)?.data;
  if (!data) return '';
  if (typeof data.errorKey === 'string') return data.errorKey;
  const known = Object.values(data).find(value => typeof value === 'string' && value in ERROR_TEXT);
  return typeof known === 'string' ? known : '';
}

/** 后端返回的错误说明：业务错误取 message，字段错误取首个字段的说明 */
export function requestErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  const body = bodyOf(error);
  if (!body) {
    if (isAxiosError(error)) return toFriendlyMessage(error.message) || fallback;
    return error instanceof Error && error.message ? error.message : fallback;
  }
  const data = body.data ?? {};
  if (typeof data.errorKey === 'string') return textOf(body.message) || textOf(data.errorKey) || fallback;
  const detail = Object.values(data).map(textOf).find(Boolean);
  return detail || textOf(body.message) || fallback;
}
