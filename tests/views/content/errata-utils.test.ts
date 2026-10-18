import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect } from 'vitest';
import { errata, question } from './feedback-fixtures';
import {
  canRetryErrata,
  canStartErrata,
  ERRATA_STALE_MS,
  ERRATA_STALE_TOLERANCE_MS,
  errataCreateLocation,
  errataProgress,
  isErrataStale,
  parseReportIds,
} from '@/views/content/shared/errata';
import { requestErrorKey, requestErrorMessage } from '@/views/content/shared/request-error';

const UPDATED_AT = Date.parse('2026-10-17T00:00:00.000Z');
const STALE_AT = ERRATA_STALE_MS + ERRATA_STALE_TOLERANCE_MS;

const httpError = (status: number, body: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: body,
  } as AxiosResponse);

describe('勘误任务工具', () => {
  it('进度为已处理用户占比，完成时为 100，无受影响用户时为 0', () => {
    expect(errataProgress(errata({ affectedUsers: 8, processedUsers: 3 }))).toBe(37);
    expect(errataProgress(errata({ status: 'PENDING', affectedUsers: 0, processedUsers: 0 }))).toBe(0);
    expect(errataProgress(errata({ status: 'DONE', affectedUsers: 0, processedUsers: 0 }))).toBe(100);
  });

  it('排队或执行中且超过 10 分钟加 1 分钟容差未更新视为超时', () => {
    expect(isErrataStale(errata(), UPDATED_AT + ERRATA_STALE_MS)).toBe(false);
    expect(isErrataStale(errata(), UPDATED_AT + STALE_AT - 1)).toBe(false);
    expect(isErrataStale(errata(), UPDATED_AT + STALE_AT)).toBe(true);
    expect(isErrataStale(errata({ status: 'DONE' }), UPDATED_AT + STALE_AT * 2)).toBe(false);
  });

  it('失败或超时的任务可以重试', () => {
    expect(canRetryErrata(errata({ status: 'FAILED' }), UPDATED_AT)).toBe(true);
    expect(canRetryErrata(errata({ status: 'PENDING' }), UPDATED_AT + STALE_AT)).toBe(true);
    expect(canRetryErrata(errata(), UPDATED_AT + 1000)).toBe(false);
    expect(canRetryErrata(errata({ status: 'DONE' }), UPDATED_AT + STALE_AT)).toBe(false);
  });

  it('只有发布过的非材料题可以勘误', () => {
    expect(canStartErrata(question())).toBe(true);
    expect(canStartErrata(question({ currentVersion: 0 }))).toBe(false);
    expect(canStartErrata(question({ type: 'MATERIAL' }))).toBe(false);
  });

  it('勘误表单地址带题目与纠错单', () => {
    expect(errataCreateLocation('q1')).toEqual({ path: '/feedback/errata/create', query: { questionId: 'q1' } });
    expect(errataCreateLocation('q1', [3, 5])).toEqual({
      path: '/feedback/errata/create',
      query: { questionId: 'q1', reportIds: '3,5' },
    });
  });

  it('解析纠错单 ID 时去重并忽略非法值', () => {
    expect(parseReportIds('3, 5,x,0,3,-1,2.5')).toEqual([3, 5]);
    expect(parseReportIds(undefined)).toEqual([]);
    expect(parseReportIds(['3'])).toEqual([]);
  });
});

describe('请求错误说明', () => {
  it('业务错误返回错误键与后端文案', () => {
    const error = httpError(409, {
      code: 409,
      message: '该题已有进行中的勘误',
      data: { errorKey: 'errataInProgress' },
    });

    expect(requestErrorKey(error)).toBe('errataInProgress');
    expect(requestErrorMessage(error)).toBe('该题已有进行中的勘误');
  });

  it('字段错误取首个字段说明，未翻译的错误键映射为中文', () => {
    const translated = httpError(422, {
      code: 422,
      message: 'Validation failed',
      data: { answer: '答案与解析没有变化' },
    });
    const raw = httpError(422, { code: 422, message: 'Validation failed', data: { status: 'errataNotRetryable' } });

    expect(requestErrorMessage(translated)).toBe('答案与解析没有变化');
    expect(requestErrorKey(raw)).toBe('errataNotRetryable');
    expect(requestErrorMessage(raw)).toBe('只能继续执行失败或超过 10 分钟未进展的勘误任务');
  });

  it('没有响应体时使用友好提示或兜底文案', () => {
    expect(requestErrorMessage(new AxiosError('Network Error'))).toBe('网络连接失败，请检查网络');
    expect(requestErrorMessage(new Error('本地错误'))).toBe('本地错误');
    expect(requestErrorMessage(null, '兜底')).toBe('兜底');
    expect(requestErrorKey(new Error('x'))).toBe('');
  });
});
