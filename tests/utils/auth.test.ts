import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getToken, jumpToLogin, jumpToLogout, removeToken, setToken } from '@/utils/auth';

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
