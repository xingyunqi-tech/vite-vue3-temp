import { parseQuery, type LocationQuery } from 'vue-router';

/**
 * 与 SSO 回跳相关的纯函数。刻意不依赖路由表：请求层经 error-handler → utils/auth 依赖到本文件，
 * 路由表一侧的模块一旦依赖请求层，再引 routes 就会循环。
 *
 * 也不反向依赖 `@/utils/auth`：那边的 jumpToLogin / jumpToLogout 要拿本文件的
 * resolveLoginReturnUrl 做回跳地址，依赖只能是 auth → redirect 单向。
 */

const stripTrailingSlash = (base: string) => base.replace(/\/+$/, '');

/** 路由 base，已归一（去尾斜杠，根路径为空串，与 router.options.history.base 一致） */
export function routerBase(): string {
  return stripTrailingSlash((import.meta.env.VITE_BASE_PATH as string) || '/');
}

export const FORBIDDEN_PATH = '/403';

/** 守卫跳 /403 的原因：no-role 只能换账号；fetch-failed 可重试 */
export const FORBIDDEN_REASON = {
  NO_ROLE: 'no-role',
  FETCH_FAILED: 'fetch-failed',
} as const;

export type ForbiddenReason = (typeof FORBIDDEN_REASON)[keyof typeof FORBIDDEN_REASON];

export const EXCEPTION_QUERY = {
  REASON: 'reason',
  REDIRECT: 'redirect',
} as const;

/**
 * 读取 query.redirect，只接受站内相对路径
 *
 * `//host` 与 `/\host` 都会被 URL 解析成外站，故开头第二个字符不接受斜杠与反斜杠。
 * tab / CR / LF 要单独排除：URL 解析会先把它们整个剥掉，`/<TAB>/evil.com` 落地就是
 * `//evil.com`，而它们在正则里只是普通字符，不排除就会被当成合法站内路径放行。
 */
export function readSafeRedirect(query: LocationQuery): string | undefined {
  const value = query[EXCEPTION_QUERY.REDIRECT];
  if (typeof value !== 'string' || /[\t\n\r]/.test(value)) return undefined;
  return /^\/(?![/\\])/.test(value) ? value : undefined;
}

/**
 * 把站内路由路径拼成完整的绝对地址（含 router base），供 SSO 登录/登出的回跳参数使用
 *
 * 同源校验收在这里：path 多来自 URL query，根路径部署时 base 是空串，
 * `new URL('//evil.com', origin)` 会被当成协议相对 URL 解析为 `https://evil.com/`；
 * 反斜杠同理——WHATWG URL 把 `/\evil.com` 里的 `\` 规范化成 `/`，结果一样是外站。
 * 因此解析后再比一次 origin，越出本站就回落到站内首页，宁可少跳一层也不做开放重定向。
 */
export function toAbsoluteUrl(path: string, base = routerBase()): string {
  const home = `${window.location.origin}${base}/`;
  try {
    const url = new URL(base + path, window.location.origin);
    if (url.origin !== window.location.origin) return home;
    // SSO 把新的 auth 追加在 service 后面，而消费方取的是第一个值
    url.searchParams.delete('auth');
    return url.href;
  } catch {
    // path 里含非法字符导致解析抛错时同样回落首页
    return home;
  }
}

export interface LoginReturnUrlOptions {
  /**
   * 停在异常页时是否沿用它带的原目标（query.redirect）
   *
   * 登录（401 后重新认证）是同一个人，回原目标才对；登出是换账号，上一个账号的目标页
   * 不该交给下一个账号，故登出侧传 false 一律回首页。
   */
  inheritExceptionTarget?: boolean;
}

/**
 * 计算安全的 SSO 回跳地址，所有登录/登出跳转的唯一出口（见 @/utils/auth 的 jumpToLogin / jumpToLogout）
 *
 * 收在一处而不是交给调用方：回跳地址的来路太杂（当前页、守卫的目标路由、异常页带的
 * query.redirect），散着写只要漏一处，就会把不能当目标的地址送给 SSO。
 *
 * 两类地址会被换掉：
 * - 站外地址与解析不出来的地址 → 站内首页，不做开放重定向；
 * - 全屏 403 → 按 inheritExceptionTarget 换成它带的原目标或站内首页。异常页自身不是回跳目标，
 *   否则重新登录后原地落回 403 成死胡同；「重试」走 router.replace，请求发出时地址栏仍是 403，
 *   所以原目标只能从 query 里取。
 *
 * @param target 候选回跳地址，绝对 URL 或站内路径（后者自动补上 router base），缺省取当前页面
 * @param options 见 LoginReturnUrlOptions
 */
export function resolveLoginReturnUrl(
  target: string = window.location.href,
  { inheritExceptionTarget = true }: LoginReturnUrlOptions = {},
): string {
  const base = routerBase();
  // 站内路径先补成绝对地址：直接交给 new URL 会按 origin 解析，把 base 丢掉，
  // /admin 这类非根路径部署下回跳就落到了应用外面
  const candidate = /^[a-z][a-z\d+\-.]*:|^\/\//i.test(target) ? target : toAbsoluteUrl(target, base);

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return toAbsoluteUrl('/', base);

    // 必须比完整路径而非后缀：业务侧完全可能有 /task/403 这类路由，
    // 用 endsWith 会把它误判成异常页，回跳目标被换成首页
    const pathname = url.pathname.replace(/\/+$/, '');
    if (pathname === `${base}${FORBIDDEN_PATH}`) {
      if (!inheritExceptionTarget) return toAbsoluteUrl('/', base);
      return toAbsoluteUrl(readSafeRedirect(parseQuery(url.search)) ?? '/', base);
    }

    // auth 是一份可直接登录的凭证，不能跟着回跳地址转一圈交给 SSO
    url.searchParams.delete('auth');
    return url.href;
  } catch {
    return toAbsoluteUrl('/', base);
  }
}
