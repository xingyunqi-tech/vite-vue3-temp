import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect } from 'vitest';
import { parseErrorBody, requestErrorKey, requestErrorMessage } from '@/api/core/error';

const httpError = (status: number, body: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: body,
  } as AxiosResponse);

describe('parseErrorBody', () => {
  it('业务错误优先取后端文案，保留错误键与原始 data', () => {
    const data = { errorKey: 'errataInProgress' };

    expect(parseErrorBody({ code: 409, message: '该题已有进行中的勘误', data })).toEqual({
      message: '该题已有进行中的勘误',
      errorKey: 'errataInProgress',
      data,
    });
  });

  it('后端文案缺失或等于错误键时用前端映射，未知错误键原样显示', () => {
    expect(parseErrorBody({ code: 409, message: '', data: { errorKey: 'errataInProgress' } }).message).toBe(
      '该题已有进行中的勘误',
    );
    expect(
      parseErrorBody({ code: 409, message: 'errataInProgress', data: { errorKey: 'errataInProgress' } }).message,
    ).toBe('该题已有进行中的勘误');
    expect(parseErrorBody({ code: 409, data: { errorKey: 'unknownKey' } }).message).toBe('unknownKey');
  });

  it('字段错误合并各字段文案并去重，不推断错误键', () => {
    const parsed = parseErrorBody({
      code: 422,
      message: '请求参数校验失败',
      data: { title: '标题不能为空', answer: '答案与解析没有变化', other: '标题不能为空', count: 3 },
    });

    expect(parsed.message).toBe('标题不能为空；答案与解析没有变化');
    expect(parsed.errorKey).toBe('');
  });

  it('嵌套字段错误递归收集叶子文案', () => {
    const parsed = parseErrorBody({
      code: 422,
      message: '请求参数校验失败',
      data: { sections: [{ title: '分区标题不能为空' }, { items: { 0: { score: '分值须为正数' } } }] },
    });

    expect(parsed.message).toBe('分区标题不能为空；分值须为正数');
  });

  it('message 为数组时合并显示', () => {
    expect(parseErrorBody({ code: 400, message: ['名称不能为空', '排序须为整数'], data: null }).message).toBe(
      '名称不能为空；排序须为整数',
    );
  });

  it('没有 data 时取 message，都没有时为空串', () => {
    expect(parseErrorBody({ code: 500, message: '服务器内部错误', data: null })).toEqual({
      message: '服务器内部错误',
      errorKey: '',
      data: null,
    });
    expect(parseErrorBody(undefined).message).toBe('');
    expect(parseErrorBody('<html>').message).toBe('');
  });
});

describe('requestErrorKey / requestErrorMessage', () => {
  it('从 HTTP 错误响应取错误键与后端文案', () => {
    const error = httpError(409, {
      code: 409,
      message: '该题已有进行中的勘误',
      data: { errorKey: 'errataInProgress' },
    });

    expect(requestErrorKey(error)).toBe('errataInProgress');
    expect(requestErrorMessage(error)).toBe('该题已有进行中的勘误');
  });

  it('优先使用请求层写在错误对象上的错误键', () => {
    const error = httpError(409, {});
    error.errorKey = 'errataInProgress';

    expect(requestErrorKey(error)).toBe('errataInProgress');
  });

  it('HTTP 401 使用通用文案，不用后端文案', () => {
    expect(requestErrorMessage(httpError(401, { code: 401, message: '未授权', data: null }))).toBe(
      '未登录或登录已过期',
    );
  });

  it('没有响应体时使用通用文案或兜底文案', () => {
    expect(requestErrorMessage(httpError(502, '<html>'))).toBe('网关错误');
    expect(requestErrorMessage(new AxiosError('Network Error'))).toBe('网络连接失败，请检查网络');
    expect(requestErrorMessage(new Error('本地错误'))).toBe('本地错误');
    expect(requestErrorMessage(null, '兜底')).toBe('兜底');
    expect(requestErrorKey(new Error('x'))).toBe('');
  });
});
