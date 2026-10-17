import Cookies from 'js-cookie';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { REFRESH_TOKEN_KEY, TOKEN_KEY } from '@/constants';
import {
  getRefreshToken,
  getToken,
  getTokenSession,
  jumpToLogin,
  jumpToLogout,
  removeToken,
  setRefreshToken,
  setToken,
} from '@/utils/auth';

const assign = vi.fn();

function stubLocation(href: string): void {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash, assign },
  });
}

beforeEach(() => {
  assign.mockClear();
  stubLocation('https://app.test/home?tab=1');
});

afterEach(() => {
  removeToken();
  vi.unstubAllEnvs();
});

describe('token 读写', () => {
  it('写入后可读取，移除后为空串', () => {
    expect(getToken()).toBe('');
    setToken('token-a');
    expect(getToken()).toBe('token-a');
    removeToken();
    expect(getToken()).toBe('');
  });
});

describe('刷新 token', () => {
  it('存于 localStorage 而非 Cookie，removeToken 一并清除', () => {
    setToken('token-a');
    setRefreshToken('refresh-a');
    expect(getRefreshToken()).toBe('refresh-a');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-a');
    expect(document.cookie).not.toContain('refresh-a');
    removeToken();
    expect(getToken()).toBe('');
    expect(getRefreshToken()).toBe('');
  });

  it('localStorage 不可用时读取为空串且写入不抛错', () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => setRefreshToken('refresh-a')).not.toThrow();
    expect(getRefreshToken()).toBe('');

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('登录 token Cookie', () => {
  it('以 SameSite=Strict 写入', () => {
    const set = vi.spyOn(Cookies, 'set');
    setToken('token-a');
    expect(set).toHaveBeenCalledWith(TOKEN_KEY, 'token-a', { path: '/', sameSite: 'strict', secure: false });
    set.mockRestore();
  });
});

describe('getTokenSession', () => {
  const jwt = (payload: Record<string, unknown>) =>
    `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;

  it('返回 JWT 载荷中的 sessionId', () => {
    expect(getTokenSession(jwt({ id: 1, sessionId: 42, hash: '?>?' }))).toBe('42');
  });

  it('解析不出 sessionId 时返回 token 本身', () => {
    expect(getTokenSession('plain-token')).toBe('plain-token');
    expect(getTokenSession('h.not-base64!.s')).toBe('h.not-base64!.s');
    expect(getTokenSession(jwt({ id: 1 }))).toBe(jwt({ id: 1 }));
  });
});

describe('jumpToLogin', () => {
  it('缺省带上当前页面作为回跳路径', () => {
    jumpToLogin();
    expect(assign).toHaveBeenCalledExactlyOnceWith('/login?redirect=%2Fhome%3Ftab%3D1');
  });

  it('回跳到首页时不带 redirect', () => {
    jumpToLogin('/');
    expect(assign).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('外站地址回落首页', () => {
    jumpToLogin('//evil.com');
    expect(assign).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('非根路径部署时带上 router base', () => {
    vi.stubEnv('VITE_BASE_PATH', '/admin/');
    stubLocation('https://app.test/admin/setting');
    jumpToLogin();
    expect(assign).toHaveBeenCalledExactlyOnceWith('/admin/login?redirect=%2Fsetting');
  });
});

describe('jumpToLogout', () => {
  it('清除 token 并跳转登录页', () => {
    setToken('token-a');
    jumpToLogout();
    expect(getToken()).toBe('');
    expect(assign).toHaveBeenCalledExactlyOnceWith('/login?redirect=%2Fhome%3Ftab%3D1');
  });

  it('停在 403 时不沿用它带的原目标', () => {
    stubLocation('https://app.test/403?redirect=%2Fsetting');
    jumpToLogout();
    expect(assign).toHaveBeenCalledExactlyOnceWith('/login');
  });
});
