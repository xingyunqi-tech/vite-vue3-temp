import { isAxiosError } from 'axios';
import { toFriendlyMessage } from '@/utils/error-handler';

/** 后台会遇到的业务错误键（`data.errorKey`）的中文文案，与后端 zh 文案一致，后端未返回 message 时使用 */
export const ERROR_KEY_TEXT: Record<string, string> = {
  errataInProgress: '该题已有进行中的勘误',
  answerChangeNotAllowed: '已发布题目不能修改答案、题型或选项',
  noQuestionsAvailable: '暂无可用题目',
  questionInMockInProgress: '该题正在模拟考试中，请先完成考试',
};

export const ERROR_KEY_FIELD = 'errorKey';

export interface ParsedErrorBody {
  /** 面向用户的文案，解析不出时为空串 */
  message: string;
  errorKey: string;
  data: Record<string, unknown> | null;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const keyText = (value: string) => ERROR_KEY_TEXT[value] ?? value;

const joinTexts = (texts: string[]) => [...new Set(texts.map(text => text.trim()).filter(Boolean))].join('；');

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  const record = asRecord(value);
  return record ? Object.values(record).flatMap(collectStrings) : [];
}

/** 解析 `{ code, message, data }`：业务错误取 message 或错误键文案，字段错误合并各叶子文案，其余取 message */
export function parseErrorBody(body: unknown): ParsedErrorBody {
  const record = asRecord(body);
  const data = asRecord(record?.data);
  const backendMessage = joinTexts(collectStrings(Array.isArray(record?.message) ? record.message : [record?.message]));
  const rawKey = data?.[ERROR_KEY_FIELD];

  if (typeof rawKey === 'string' && rawKey) {
    const message = backendMessage && backendMessage !== rawKey ? backendMessage : keyText(rawKey);
    return { message, errorKey: rawKey, data };
  }

  const fieldMessage = joinTexts(collectStrings(data));
  return { message: fieldMessage || backendMessage, errorKey: '', data };
}

/** 请求错误的业务错误键，没有时为空串 */
export function requestErrorKey(error: unknown): string {
  if (!isAxiosError(error)) return '';
  return error.errorKey ?? parseErrorBody(error.response?.data).errorKey;
}

/** 请求错误面向用户的文案：HTTP 401 用通用文案，其余后端文案优先，其次 HTTP / 网络错误的通用文案，最后 fallback */
export function requestErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (isAxiosError(error)) {
    const parsed = error.response?.status === 401 ? '' : parseErrorBody(error.response?.data).message;
    return parsed || toFriendlyMessage(error.message) || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
