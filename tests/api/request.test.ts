import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadApi, get, httpApi, post, REFRESH_TOKEN_URL } from '@/api/core/request';
import { getRefreshToken, getToken, removeToken, setRefreshToken, setToken } from '@/utils/auth';
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

    expect(headers.Authorization).toBe('Bearer token-a');
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

describe('显式 Authorization', () => {
  it('请求已指定 Authorization 时不被登录 token 覆盖', async () => {
    setToken('token-a');
    let headers: Record<string, unknown> = {};
    await httpApi.get('/ping', {
      headers: { Authorization: 'Bearer other' },
      adapter: async config => {
        headers = { ...config.headers };
        return respond({ code: 200, data: null, message: '' })(config);
      },
    });

    expect(headers.Authorization).toBe('Bearer other');
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

describe('token 刷新', () => {
  const originalAdapter = httpApi.defaults.adapter;
  type RefreshReply = 'ok' | 'unauthorized' | 'forbidden' | 'server-error' | 'network-error';

  /** 刷新接口按 reply 应答；业务接口只认 token-new，unauthorizedBy 决定 401 的形式 */
  function createServer(reply: RefreshReply = 'ok', unauthorizedBy: 'http' | 'code' = 'http') {
    const calls: string[] = [];
    httpApi.defaults.adapter = async config => {
      const auth = String(config.headers?.Authorization ?? '');
      calls.push(`${config.url} ${auth}`);
      if (config.url === REFRESH_TOKEN_URL) {
        if (reply === 'network-error') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
        if (reply === 'server-error') return respond({ code: 500, message: 'boom' }, 500)(config);
        if (reply === 'forbidden') return respond({ code: 403, message: 'Forbidden' }, 403)(config);
        if (reply === 'unauthorized' || auth !== 'Bearer refresh-old') {
          return respond({ code: 401, message: 'Unauthorized' }, 401)(config);
        }
        return respond({ code: 200, data: { token: 'token-new', refreshToken: 'refresh-new', tokenExpires: 0 } })(
          config,
        );
      }
      if (auth === 'Bearer token-new') return respond({ code: 200, data: { ok: true }, message: '' })(config);
      return unauthorizedBy === 'http'
        ? respond({ code: 401, message: 'Unauthorized' }, 401)(config)
        : respond({ code: 401, message: 'Unauthorized' })(config);
    };
    return calls;
  }

  beforeEach(() => {
    setToken('token-old');
    setRefreshToken('refresh-old');
  });

  afterEach(() => {
    httpApi.defaults.adapter = originalAdapter;
  });

  it('HTTP 401 时用刷新 token 换新 token 后重放原请求', async () => {
    const calls = createServer();

    await expect(get('/me')).resolves.toEqual({ ok: true });

    expect(calls).toEqual(['/me Bearer token-old', `${REFRESH_TOKEN_URL} Bearer refresh-old`, '/me Bearer token-new']);
    expect(getToken()).toBe('token-new');
    expect(getRefreshToken()).toBe('refresh-new');
    expect(redirectToLoginOnce).not.toHaveBeenCalled();
    expect(ElMessage.error).not.toHaveBeenCalled();
  });

  it('业务码 401 时同样刷新后重放', async () => {
    const calls = createServer('ok', 'code');

    await expect(get('/me')).resolves.toEqual({ ok: true });

    expect(calls).toHaveLength(3);
    expect(redirectToLoginOnce).not.toHaveBeenCalled();
  });

  it('并发 401 只刷新一次', async () => {
    const calls = createServer();

    await Promise.all([get('/a'), get('/b')]);

    expect(calls.filter(call => call.startsWith(REFRESH_TOKEN_URL))).toHaveLength(1);
  });

  it('刷新完成后迟到的旧 token 401 直接用当前 token 重放', async () => {
    const calls = createServer();
    await get('/a');
    calls.length = 0;

    await expect(get('/late', undefined, { headers: { Authorization: 'Bearer token-old' } })).resolves.toEqual({
      ok: true,
    });

    expect(calls).toEqual(['/late Bearer token-old', '/late Bearer token-new']);
  });

  it.each(['unauthorized', 'forbidden'] as const)('刷新接口返回 %s 时跳转登录页', async reply => {
    createServer(reply);

    await expect(get('/me')).rejects.toThrow();

    expect(redirectToLoginOnce).toHaveBeenCalledTimes(1);
  });

  it.each(['network-error', 'server-error'] as const)('刷新接口 %s 时只拒绝原请求并保留登录态', async reply => {
    createServer(reply);

    await expect(get('/me')).rejects.toThrow();

    expect(redirectToLoginOnce).not.toHaveBeenCalled();
    expect(getToken()).toBe('token-old');
    expect(getRefreshToken()).toBe('refresh-old');
    expect(ElMessage.error).toHaveBeenCalledTimes(1);
  });

  it('刷新 token 已被其他标签页轮换时用当前 token 重放', async () => {
    const calls: string[] = [];
    httpApi.defaults.adapter = async config => {
      const auth = String(config.headers?.Authorization ?? '');
      calls.push(`${config.url} ${auth}`);
      if (config.url === REFRESH_TOKEN_URL) {
        setToken('token-new');
        setRefreshToken('refresh-other-tab');
        return respond({ code: 401, message: 'Unauthorized' }, 401)(config);
      }
      return auth === 'Bearer token-new'
        ? respond({ code: 200, data: { ok: true }, message: '' })(config)
        : respond({ code: 401, message: 'Unauthorized' }, 401)(config);
    };

    await expect(get('/me')).resolves.toEqual({ ok: true });

    expect(calls.at(-1)).toBe('/me Bearer token-new');
    expect(redirectToLoginOnce).not.toHaveBeenCalled();
  });

  it('没有刷新 token 时直接跳转登录页', async () => {
    removeToken();
    setToken('token-old');
    const calls = createServer();

    await expect(get('/me')).rejects.toThrow();

    expect(calls).toEqual(['/me Bearer token-old']);
    expect(redirectToLoginOnce).toHaveBeenCalledTimes(1);
  });

  it('重放后仍为 401 时不再刷新', async () => {
    const calls: string[] = [];
    httpApi.defaults.adapter = async config => {
      calls.push(String(config.url));
      if (config.url === REFRESH_TOKEN_URL) {
        return respond({ code: 200, data: { token: 'token-new', refreshToken: 'refresh-new', tokenExpires: 0 } })(
          config,
        );
      }
      return respond({ code: 401, message: 'Unauthorized' }, 401)(config);
    };

    await expect(get('/me')).rejects.toThrow();

    expect(calls).toEqual(['/me', REFRESH_TOKEN_URL, '/me']);
    expect(redirectToLoginOnce).toHaveBeenCalledTimes(1);
  });
});
