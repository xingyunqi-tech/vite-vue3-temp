import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadApi, get, httpApi, post } from '@/api/core/request';
import { removeToken, setToken } from '@/utils/auth';
import { redirectToLoginOnce } from '@/utils/error-handler';

vi.mock('@/utils/error-handler', () => ({
  redirectToLoginOnce: vi.fn(),
  toFriendlyMessage: (msg: string) => msg,
}));
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

const respond =
  (data: unknown, status = 200): AxiosAdapter =>
  async config => {
    const response = { data, status, statusText: '', headers: {}, config: config as InternalAxiosRequestConfig };
    if (status >= 400) {
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  removeToken();
  document.documentElement.removeAttribute('lang');
});

describe('请求头', () => {
  it('已登录时带上 token 与当前语言', async () => {
    setToken('token-a');
    document.documentElement.setAttribute('lang', 'en-US');
    let headers: Record<string, unknown> = {};
    await httpApi.get('/ping', {
      adapter: async config => {
        headers = { ...config.headers };
        return respond({ code: 200, data: null, message: '' })(config);
      },
    });

    expect(headers.Authorization).toBe('token-a');
    expect(headers['Accept-Language']).toBe('en-US');
  });

  it('未登录时不带 Authorization', async () => {
    let headers: Record<string, unknown> = {};
    await httpApi.get('/ping', {
      adapter: async config => {
        headers = { ...config.headers };
        return respond({ code: 200, data: null, message: '' })(config);
      },
    });

    expect(headers.Authorization).toBeUndefined();
  });
});

describe('业务码校验', () => {
  it('成功码返回完整响应', async () => {
    const res = await httpApi.get('/ok', { adapter: respond({ code: 200, data: { id: 1 }, message: '' }) });
    expect(res.data.data).toEqual({ id: 1 });
  });

  it('非成功码提示后端文案并 reject', async () => {
    await expect(httpApi.get('/fail', { adapter: respond({ code: 500, message: '保存失败' }) })).rejects.toMatchObject({
      code: 'ERR_ERROR_MODULE',
      message: '保存失败',
    });
    expect(ElMessage.error).toHaveBeenCalledWith('保存失败');
  });

  it('isIgnoreToast 时不弹提示', async () => {
    await expect(
      httpApi.get('/fail', { adapter: respond({ code: 500, message: '保存失败' }), isIgnoreToast: true }),
    ).rejects.toThrow('保存失败');
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('无 code 时按 status 字段判定', async () => {
    const res = await httpApi.get('/ok', { adapter: respond({ status: 200, data: 1 }) });
    expect(res.data.data).toBe(1);
  });

  it('字符串成功码同样视为成功', async () => {
    const res = await httpApi.get('/ok', { adapter: respond({ code: '200', data: 1 }) });
    expect(res.data.data).toBe(1);
  });

  it('业务码 401 跳转登录页', async () => {
    await expect(httpApi.get('/me', { adapter: respond({ code: 401, message: '登录已过期' }) })).rejects.toThrow();
    expect(redirectToLoginOnce).toHaveBeenCalledTimes(1);
  });
});

describe('跳过登录跳转', () => {
  it('skipAuthRedirect 时业务码与 HTTP 401 都不跳转', async () => {
    await expect(
      httpApi.get('/login', { adapter: respond({ code: 401, message: '账号或密码错误' }), skipAuthRedirect: true }),
    ).rejects.toThrow('账号或密码错误');
    await expect(httpApi.get('/login', { adapter: respond({}, 401), skipAuthRedirect: true })).rejects.toThrow();
    expect(redirectToLoginOnce).not.toHaveBeenCalled();
  });
});

describe('便捷函数', () => {
  it('get / post 返回 res.data.data', async () => {
    const adapter = respond({ code: 200, data: { id: 1 }, message: '' });
    await expect(get('/item', { id: 1 }, { adapter })).resolves.toEqual({ id: 1 });
    await expect(post('/item', { name: 'a' }, { adapter })).resolves.toEqual({ id: 1 });
  });
});

describe('HTTP 错误', () => {
  it('HTTP 401 跳转登录页', async () => {
    await expect(httpApi.get('/me', { adapter: respond({}, 401) })).rejects.toThrow();
    expect(redirectToLoginOnce).toHaveBeenCalledTimes(1);
  });

  it('其他 HTTP 错误只提示不跳转', async () => {
    await expect(httpApi.get('/boom', { adapter: respond({}, 500) })).rejects.toThrow();
    expect(redirectToLoginOnce).not.toHaveBeenCalled();
    expect(ElMessage.error).toHaveBeenCalledTimes(1);
  });

  it('取消的请求不提示', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(httpApi.get('/slow', { signal: controller.signal })).rejects.toThrow();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });
});

describe('下载实例', () => {
  it('返回 JSON 业务错误时 reject', async () => {
    const body = new Blob([JSON.stringify({ code: 500, message: '无权限导出' })], { type: 'application/json' });

    await expect(downloadApi.get('/export', { adapter: respond(body) })).rejects.toThrow('无权限导出');
  });

  it('下载 JSON 文件时正常返回 Blob', async () => {
    const body = new Blob([JSON.stringify({ name: 'config' })], { type: 'application/json' });

    const res = await downloadApi.get('/export', { adapter: respond(body) });
    expect(res.data).toBeInstanceOf(Blob);
  });

  it('下载普通文件时返回 Blob', async () => {
    const body = new Blob(['a,b'], { type: 'text/csv' });

    const res = await downloadApi.get('/export', { adapter: respond(body) });
    expect(res.data).toBeInstanceOf(Blob);
  });
});

describe('默认实例', () => {
  it('blob 请求返回 JSON 业务错误时 reject', async () => {
    const body = new Blob([JSON.stringify({ code: 500, message: '无权限导出' })], { type: 'application/json' });

    await expect(httpApi.get('/export', { responseType: 'blob', adapter: respond(body) })).rejects.toThrow(
      '无权限导出',
    );
  });
});
