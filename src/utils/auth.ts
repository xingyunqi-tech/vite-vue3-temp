/**
 * 认证相关工具函数
 */

import { HIKE_POLYMAS_USER, TOKEN_AI_POLY } from '@zhs/agent-course-kit/constants';
// 走子路径而非包主入口：主入口重导出了 utils/qiankun，会把它内联的 qiankun + single-spa +
// import-html-entry 运行时一并拖进首屏包（约 200KB），而本项目只用得到这里的几个 SSO 函数
import { jumpToSsoLogin, jumpToSsoLogout } from '@zhs/agent-course-kit/utils/auth';
import Cookies from 'js-cookie';
import { resolveLoginReturnUrl } from '@/router/redirect';

/**
 * 已知的 SSO 域名家族（顶级域）
 *
 * 同时用于两处：
 * ① 判断 SSO token Cookie 的共享域（见 resolveCookieDomain）；
 * ② 拼出对应的登录跳转 host（见 resolveSsoLoginHost），统一遵循 login.<顶级域> 的约定
 *    （如 login.polymas.com、login.zhihuishu.com——均已向后端确认）。
 * 命中不到时两处都保持包内默认行为（Cookie 落当前域；登录跳 SSO_CONFIG.POLYMAS_HOST）。
 * 新增已知顶级域时在此追加即可。
 */
const KNOWN_SSO_DOMAINS = ['polymas.com', 'zhihuishu.com'];

function matchKnownSsoDomain(): string | undefined {
  const { hostname } = window.location;
  return KNOWN_SSO_DOMAINS.find(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * 计算写入 SSO token Cookie 时使用的 domain
 *
 * 命中 KNOWN_SSO_DOMAINS 时按对应顶级域共享；否则视为自定义部署域名（如学校自有域名，
 * 常见 edu.cn 等多级公共后缀，不能简单截取后两段当作可共享域），返回 undefined 让 Cookie
 * 落在当前访问域名下（host-only），避免 domain 与实际访问域名不匹配导致浏览器静默丢弃该
 * Cookie（js-cookie 对 falsy 的 domain 会跳过该属性，等价于不传）。
 */
export function resolveCookieDomain(): string | undefined {
  const matched = matchKnownSsoDomain();
  return matched ? `.${matched}` : undefined;
}

/**
 * 计算登录页地址（login.<顶级域> 本身，不带任何路径）
 *
 * 命中已知域名时改跳对应的 login.<顶级域>；命中不到时返回 undefined，由调用方回退到
 * 包内默认行为。
 */
function resolveSsoLoginHost(): string | undefined {
  const matched = matchKnownSsoDomain();
  return matched ? `//login.${matched}` : undefined;
}

/**
 * 跳转 SSO 登录
 *
 * @zhs/agent-course-kit 导出的 jumpToSsoLogin() 内部写死会拼上 /oauth/login/checkLogin
 * 路径，这不是登录页地址——实测在 zhihuishu.com 部署下访问该地址不会展示登录框，会直接
 * 弹回原页面，导致「未登录 → 跳登录 → 秒回弹 → 仍未登录」的无限刷新循环。
 * 登录页就是 login.<顶级域> 本身，直接跳转并带上 ?service=<回跳地址> 作为登录成功后的回跳地址。
 * 命中不到已知域名时保留包内默认行为（jumpToSsoLogin() 的 SSO_CONFIG.POLYMAS_HOST 默认值）。
 *
 * 回跳地址一律过 resolveLoginReturnUrl()：站外地址、异常页都会被换成站内目标，调用方不必自己过滤。
 *
 * @param redirect 登录成功后的回跳绝对地址，缺省取当前页面。
 *   ⚠️ 路由守卫必须显式传目标路由：beforeEach 早于地址栏提交，站内跳转时当前地址还是出发页，
 *   用缺省值会让用户登录后落回出发页而不是目标页（路径拼绝对地址用 @/router/redirect 的 toAbsoluteUrl）。
 */
export const jumpToLogin = (redirect?: string) => {
  const service = resolveLoginReturnUrl(redirect);
  const loginHost = resolveSsoLoginHost();
  if (!loginHost) {
    jumpToSsoLogin({ redirect: service });
    return;
  }
  window.location.href = `${loginHost}/?service=${encodeURIComponent(service)}`;
};

/**
 * 跳转 SSO 登出，登出后由 SSO 引导重新登录
 *
 * 回跳地址同样过 resolveLoginReturnUrl()，并关掉 inheritExceptionTarget：「退出登录」常摆在
 * 异常页上，异常页本身与它带的原目标都不该成为下一个账号登录后的落点。
 *
 * ⚠️ 登出地址用的是包内默认 host（SSO_CONFIG.POLYMAS_HOST + /oauth/logout，即 cloudapi 域）。
 * 非 polymas 部署要先确认该域名下的登出端点是否有效，无效则把正确的端点作为 polymasHost 传给
 * jumpToSsoLogout —— 登录侧同款问题见上方 jumpToLogin 的处理。
 *
 * @param redirect 重新登录后的回跳地址，绝对 URL 或站内路径，缺省取当前页面
 */
export const jumpToLogout = (redirect?: string) => {
  jumpToSsoLogout({ redirect: resolveLoginReturnUrl(redirect, { inheritExceptionTarget: false }) });
};

/**
 * 写入 SSO token Cookie
 */
export function setAuthTokenCookie(token: string): void {
  Cookies.set(TOKEN_AI_POLY, token, { domain: resolveCookieDomain(), path: '/' });
}

/**
 * 若当前 URL 带有 SSO 回跳参数 `?auth=`，同步写入 token Cookie，并立刻把该参数从地址栏抹掉
 *
 * 只在 window.location（而非 vue-router 的 to.query）取值：需在 createAppRouter() 之前调用，
 * 此时还没有 router 实例可用。
 *
 * 为什么必须抹掉 auth 参数：它是一份可直接登录的凭证。留在地址栏意味着它会进浏览器历史、
 * 被带进后续请求的 Referer、被前端监控与服务端访问日志原样记录，而且「用户复制当前链接
 * 发给别人」就等于把账号交出去。用 replaceState 而非 pushState：不新增历史条目、不触发
 * 导航，router 随后按干净的 URL 创建，看不到这个参数。
 */
export function writeTokenFromAuthQuery(): void {
  const url = new URL(window.location.href);
  const auth = url.searchParams.get('auth');
  if (!auth) return;

  setAuthTokenCookie(auth);

  url.searchParams.delete('auth');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/**
 * SSO 登录后写入用户信息的 Cookie key 列表
 *
 * 不同部署环境写入的 key 不一致，需全部尝试。hike-polymas-user 使用
 * @zhs/agent-course-kit 导出的常量，其余 key 该包未导出对应常量，保持字面量。
 * 消费方（如 store/modules/user-info.ts）统一走 getUserInfoCookieRaw()，
 * 避免多处各写一份 key 列表导致其中一处漏配后静默失效。
 */
export const USER_INFO_COOKIE_KEYS = ['CASLOGC', 'OPENAPI-USER-INFO', HIKE_POLYMAS_USER, 'AI-POLY-UINFO'];

function parseCookieValue(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * 依次尝试 USER_INFO_COOKIE_KEYS 中的每个 key，返回第一个命中的原始 Cookie 值
 *
 * 返回值仍是 URI 编码后的 JSON 字符串，调用方需自行 decodeURIComponent + JSON.parse。
 */
export function getUserInfoCookieRaw(): string | null {
  for (const key of USER_INFO_COOKIE_KEYS) {
    const value = parseCookieValue(key);
    if (value) return value;
  }
  return null;
}

/** 用户唯一标识：用户信息 Cookie 里的 userNid，缺失时取 userId */
export function resolveUserNid(data: { userNid?: unknown; userId?: unknown }): string {
  return String(data.userNid || data.userId || '');
}

/** 当前用户信息 Cookie 对应的用户标识，Cookie 缺失或无法解析时返回空串 */
export function getCookieUserNid(): string {
  const raw = getUserInfoCookieRaw();
  if (!raw) return '';
  try {
    return resolveUserNid(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return '';
  }
}
