/**
 * 认证相关工具函数
 */

import Cookies from 'js-cookie';
import { LOGIN_PATH, TOKEN_KEY } from '@/constants';
import { resolveLoginReturnPath, routerBase } from '@/router/redirect';

/** 读取登录 token，未登录时为空串 */
export function getToken(): string {
  return Cookies.get(TOKEN_KEY) ?? '';
}

/** 写入登录 token（当前域名下的 host-only Cookie） */
export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { path: '/' });
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY, { path: '/' });
}

/** 登录页完整地址（含 router base） */
function loginUrl(redirect?: string): string {
  const url = `${routerBase()}${LOGIN_PATH}`;
  return redirect && redirect !== '/' ? `${url}?redirect=${encodeURIComponent(redirect)}` : url;
}

/**
 * 整页跳转登录页
 *
 * 整页跳转让动态路由、各 Store 与跳转去重标志随页面重建一并复位。
 * 回跳地址一律过 resolveLoginReturnPath()：站外地址、登录页、异常页都会被换成站内目标。
 *
 * @param redirect 登录成功后的回跳站内路径，缺省取当前页面
 */
export function jumpToLogin(redirect?: string): void {
  window.location.assign(loginUrl(resolveLoginReturnPath(redirect)));
}

/**
 * 清除 token 并整页跳转登录页，重新登录后回到 redirect
 *
 * 关掉 inheritExceptionTarget：「退出登录」常摆在异常页上，异常页与它带的原目标都不该成为下一个账号的落点。
 *
 * @param redirect 重新登录后的回跳站内路径，缺省取当前页面
 */
export function jumpToLogout(redirect?: string): void {
  removeToken();
  window.location.assign(loginUrl(resolveLoginReturnPath(redirect, { inheritExceptionTarget: false })));
}
