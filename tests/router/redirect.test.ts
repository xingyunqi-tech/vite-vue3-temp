import { describe, it, expect, beforeEach } from 'vitest';
import { readSafeRedirect, resolveLoginReturnUrl, toAbsoluteUrl, FORBIDDEN_PATH } from '@/router/redirect';

const ORIGIN = 'https://admin.polymas.com';

function stubLocation(href: string): void {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search },
  });
}

beforeEach(() => {
  stubLocation(`${ORIGIN}/`);
});

describe('readSafeRedirect · 只接受站内相对路径', () => {
  it('接受单斜杠开头的站内路径', () => {
    expect(readSafeRedirect({ redirect: '/setting/frontend' })).toBe('/setting/frontend');
    expect(readSafeRedirect({ redirect: '/home?tab=1' })).toBe('/home?tab=1');
  });

  // 下面几条决定了「登录后回跳」会不会变成开放重定向
  it('拒绝协议相对地址', () => {
    expect(readSafeRedirect({ redirect: '//evil.com' })).toBeUndefined();
  });

  it('拒绝反斜杠变体', () => {
    expect(readSafeRedirect({ redirect: '/\\evil.com' })).toBeUndefined();
  });

  it('拒绝夹带 tab / CR / LF 的变体', () => {
    // URL 解析会先剥掉这些字符，`/<TAB>/evil.com` 落地是 `//evil.com`，即外站
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
    // 同名参数出现多次时 vue-router 给的是数组，同样不接受
    expect(readSafeRedirect({ redirect: ['/a', '/b'] })).toBeUndefined();
  });
});

describe('toAbsoluteUrl · 站内路径 → 绝对地址', () => {
  it('站内路径拼成同源绝对地址', () => {
    expect(toAbsoluteUrl('/setting/frontend')).toBe(`${ORIGIN}/setting/frontend`);
  });

  it('保留 query，登录后能回到原来的上下文', () => {
    expect(toAbsoluteUrl('/home?tab=1')).toBe(`${ORIGIN}/home?tab=1`);
  });

  it('协议相对地址被判为外站，回落首页', () => {
    expect(toAbsoluteUrl('//evil.com')).toBe(`${ORIGIN}/`);
  });

  it('反斜杠变体同样回落首页', () => {
    expect(toAbsoluteUrl('/\\evil.com')).toBe(`${ORIGIN}/`);
  });

  it('解析不出来的路径回落首页', () => {
    expect(toAbsoluteUrl('http://[::1')).toBe(`${ORIGIN}/`);
  });

  it('剥掉残留的 auth', () => {
    expect(toAbsoluteUrl('/home?auth=stale-token')).toBe(`${ORIGIN}/home`);
  });

  it('非根路径部署时带上 base', () => {
    expect(toAbsoluteUrl('/setting', '/admin')).toBe(`${ORIGIN}/admin/setting`);
  });
});

describe('resolveLoginReturnUrl · SSO 回跳地址', () => {
  it('缺省取当前页面', () => {
    stubLocation(`${ORIGIN}/home?tab=1`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/home?tab=1`);
  });

  it('显式传入的目标地址原样作为回跳目标', () => {
    stubLocation(`${ORIGIN}/portal`);
    expect(resolveLoginReturnUrl(`${ORIGIN}/home`)).toBe(`${ORIGIN}/home`);
  });

  it('站外地址回落首页，不做开放重定向', () => {
    stubLocation(`${ORIGIN}/home`);
    expect(resolveLoginReturnUrl('https://evil.com/steal')).toBe(`${ORIGIN}/`);
  });

  it('解析不出来的地址回落首页', () => {
    stubLocation(`${ORIGIN}/home`);
    expect(resolveLoginReturnUrl('http://[::1')).toBe(`${ORIGIN}/`);
  });

  it('停在 403 时改用 query.redirect，避免登录后原地落回异常页', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2Fsetting%2Ffrontend&reason=no-role`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/setting/frontend`);
  });

  it('403 上没有合法 redirect 时回首页', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/`);
  });

  it('403 上夹带 tab 的 redirect 回首页，不越出本站', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2F%09%2Fevil.com`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/`);
  });

  it('403 上的 redirect 指向外站时回首页', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=https%3A%2F%2Fevil.com`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/`);
  });

  it('路径末尾多余斜杠不影响判定', () => {
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}/?redirect=%2Fhome`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/home`);
  });

  it('显式传入 403 地址时同样换成它带的原目标', () => {
    stubLocation(`${ORIGIN}/home`);
    expect(resolveLoginReturnUrl(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2Fsetting`)).toBe(`${ORIGIN}/setting`);
  });

  it('回跳地址剥掉残留的 auth，避免登录后拿到旧 token', () => {
    // SSO 把新 auth 追加在 service 后面，而消费方取的是第一个值
    stubLocation(`${ORIGIN}/home?auth=stale-token`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/home`);
  });

  it('站内路径也能作为回跳目标', () => {
    stubLocation(`${ORIGIN}/portal`);
    expect(resolveLoginReturnUrl('/setting/frontend?tab=1')).toBe(`${ORIGIN}/setting/frontend?tab=1`);
  });

  it('站内路径的外站变体仍回落首页', () => {
    // 反斜杠会被 WHATWG URL 规范化成 `/`，`/\\evil.com` 落地就是协议相对地址
    stubLocation(`${ORIGIN}/portal`);
    expect(resolveLoginReturnUrl('/\\evil.com')).toBe(`${ORIGIN}/`);
    expect(resolveLoginReturnUrl('//evil.com')).toBe(`${ORIGIN}/`);
  });

  it('登出侧不沿用异常页的原目标，回落站内首页', () => {
    // 换账号场景：上一个账号的目标页不该交给下一个账号
    stubLocation(`${ORIGIN}${FORBIDDEN_PATH}?redirect=%2Fsetting%2Ffrontend`);

    expect(resolveLoginReturnUrl(undefined, { inheritExceptionTarget: false })).toBe(`${ORIGIN}/`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/setting/frontend`);
  });

  it('关掉继承只影响异常页，普通页面照样回原地', () => {
    stubLocation(`${ORIGIN}/home?tab=1`);

    expect(resolveLoginReturnUrl(undefined, { inheritExceptionTarget: false })).toBe(`${ORIGIN}/home?tab=1`);
  });

  it('只认完整路径，以 /403 结尾的业务路由按普通页面处理', () => {
    // 用后缀匹配的话，/task/403 这类路由上触发 401 会被当成「正停在异常页」，
    // 于是回跳地址取 query.redirect 而不是当前页，登录后落回首页
    stubLocation(`${ORIGIN}/task${FORBIDDEN_PATH}?redirect=%2Fsetting`);
    expect(resolveLoginReturnUrl()).toBe(`${ORIGIN}/task${FORBIDDEN_PATH}?redirect=%2Fsetting`);
  });
});
