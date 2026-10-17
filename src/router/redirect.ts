import { parseQuery, type LocationQuery } from 'vue-router';
import { LOGIN_PATH } from '@/constants';

/**
 * 登录回跳相关的纯函数。不依赖路由表：请求层经 error-handler → utils/auth 依赖到本文件，
 * 再引 routes 就会循环；也不依赖 `@/utils/auth`，依赖只能是 auth → redirect 单向。
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
  return typeof value === 'string' && isSafeInternalPath(value) ? value : undefined;
}

function isSafeInternalPath(value: string): boolean {
  return !/[\t\n\r]/.test(value) && /^\/(?![/\\])/.test(value);
}

/** 当前页面的站内路径（去掉 router base） */
function currentRoutePath(base: string): string {
  const { pathname, search, hash } = window.location;
  const inBase = base && (pathname === base || pathname.startsWith(`${base}/`));
  const path = inBase ? pathname.slice(base.length) || '/' : pathname;
  return `${path}${search}${hash}`;
}

export interface LoginReturnPathOptions {
  /**
   * 停在登录页或异常页时是否沿用它带的原目标（query.redirect）
   *
   * 401 后重新登录是同一个人，回原目标才对；登出是换账号，原目标不再沿用。
   */
  inheritExceptionTarget?: boolean;
}

/**
 * 计算安全的登录回跳路径（站内路径，不含 router base），所有登录/登出跳转的唯一出口
 *
 * - 站外地址、解析不出来的地址 → `/`，不做开放重定向；
 * - 登录页、全屏 403 → 按 inheritExceptionTarget 换成它带的原目标或 `/`，两者自身不作回跳目标。
 *
 * @param target 候选回跳路径（站内路径），缺省取当前页面
 */
export function resolveLoginReturnPath(
  target?: string,
  { inheritExceptionTarget = true }: LoginReturnPathOptions = {},
): string {
  const candidate = target ?? currentRoutePath(routerBase());
  if (!isSafeInternalPath(candidate)) return '/';

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return '/';

    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    if (pathname === LOGIN_PATH || pathname === FORBIDDEN_PATH) {
      if (!inheritExceptionTarget) return '/';
      const inherited = readSafeRedirect(parseQuery(url.search));
      return inherited ? resolveLoginReturnPath(inherited, { inheritExceptionTarget: false }) : '/';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
