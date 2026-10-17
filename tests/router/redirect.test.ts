import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readSafeRedirect, resolveLoginReturnPath, FORBIDDEN_PATH } from '@/router/redirect';

const ORIGIN = 'https://app.test';

function stubLocation(href: string): void {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      href: url.href,
      origin: url.origin,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    },
  });
}

beforeEach(() => {
  stubLocation(`${ORIGIN}/`);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readSafeRedirect · 只接受站内相对路径', () => {
  it('接受单斜杠开头的站内路径', () => {
    expect(readSafeRedirect({ redirect: '/setting/frontend' })).toBe('/setting/frontend');
    expect(readSafeRedirect({ redirect: '/home?tab=1' })).toBe('/home?tab=1');
  });

  it('拒绝协议相对地址', () => {
    expect(readSafeRedirect({ redirect: '//evil.com' })).toBeUndefined();
  });

  it('拒绝反斜杠变体', () => {
    expect(readSafeRedirect({ redirect: '/\\evil.com' })).toBeUndefined();
  });

  it('拒绝夹带 tab / CR / LF 的变体', () => {
    expect(readSafeRedirect({ redirect: '/\t/evil.com' })).toBeUndefined();
    expect(readSafeRedirect({ redirect: '/\n/evil.com' })).toBeUndefined();
    expect(readSafeRedirect({ redirect: '/\r/evil.com' })).toBeUndefined();
  });

  it('拒绝绝对地址', () => {
    expect(readSafeRedirect({ redirect: 'https://evil.com' })).toBeUndefined();
    expect(readSafeRedirect({ redirect: 'javascript:alert(1)' })).toBeUndefined();
  });

  it('拒绝不以 / 开头的相对路径', () => {
    expect(readSafeRedirect({ redirect: 'home' })).toBeUndefined();
  });

  it('缺失或非字符串时返回 undefined', () => {
    expect(readSafeRedirect({})).toBeUndefined();
    expect(readSafeRedirect({ redirect: null })).toBeUndefined();
    expect(readSafeRedirect({ redirect: ['/a', '/b'] })).toBeUndefined();
  });
});

describe('resolveLoginReturnPath · 登录回跳路径', () => {
  it('缺省取当前页面，保留 query 与 hash', () => {
    stubLocation(`${ORIGIN}/home?tab=1#top`);
    expect(resolveLoginReturnPath()).toBe('/home?tab=1#top');
  });

  it('非根路径部署时当前页面去掉 router base', () => {
    vi.stubEnv('VITE_BASE_PATH', '/admin/');
    stubLocation(`${ORIGIN}/admin/home?tab=1`);
    expect(resolveLoginReturnPath()).toBe('/home?tab=1');
    stubLocation(`${ORIGIN}/admin`);
    expect(resolveLoginReturnPath()).toBe('/');
  });

  it('显式传入的站内路径原样作为回跳目标', () => {
    stubLocation(`${ORIGIN}/portal`);
    expect(resolveLoginReturnPath('/setting/frontend?tab=1')).toBe('/setting/frontend?tab=1');
  });

  it('外站与非法地址回落首页', () => {
    expect(resolveLoginReturnPath('https://evil.com/steal')).toBe('/');
    expect(resolveLoginReturnPath('//evil.com')).toBe('/');
    expect(resolveLoginReturnPath('/\\evil.com')).toBe('/');
    expect(resolveLoginReturnPath('/\t/evil.com')).toBe('/');
  });

  it('登录页自身回落首页', () => {
    expect(resolveLoginReturnPath('/login?redirect=%2Fhome')).toBe('/');
  });

  it('停在 403 时改用 query.redirect', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2Fsetting%2Ffrontend&reason=no-role`);
    expect(resolveLoginReturnPath()).toBe('/setting/frontend');
  });

  it('403 上没有合法 redirect 时回首页', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}`);
    expect(resolveLoginReturnPath()).toBe('/');
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2F%09%2Fevil.com`);
    expect(resolveLoginReturnPath()).toBe('/');
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=https%3A%2F%2Fevil.com`);
    expect(resolveLoginReturnPath()).toBe('/');
  });

  it('403 带的 redirect 又指向 403 时回首页', () => {
    expect(resolveLoginReturnPath(`${FORBIDDEN_PATH}?redirect=%2F403%3Fredirect%3D%252Fhome`)).toBe('/');
  });

  it('路径末尾多余斜杠不影响 403 判定', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}/?redirect=%2Fhome`);
    expect(resolveLoginReturnPath()).toBe('/home');
  });

  it('关掉继承时 403 回首页，普通页面照样回原地', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2Fsetting%2Ffrontend`);
    expect(resolveLoginReturnPath(undefined, { inheritExceptionTarget: false })).toBe('/');

    stubLocation(`${ORIGIN}/home?tab=1`);
    expect(resolveLoginReturnPath(undefined, { inheritExceptionTarget: false })).toBe('/home?tab=1');
  });

  it('只认完整路径，以 /403 结尾的业务路由按普通页面处理', () => {
    expect(resolveLoginReturnPath(`/task${FORBIDDEN_PATH}?redirect=%2Fsetting`)).toBe(
      `/task${FORBIDDEN_PATH}?redirect=%2Fsetting`,
    );
  });
});
