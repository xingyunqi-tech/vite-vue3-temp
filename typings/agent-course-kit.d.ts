// ==================== 主入口 ====================
declare module '@zhs/agent-course-kit' {
  // ---------- Auth 相关 ----------
  interface JumpToSsoLoginOptions {
    redirect?: string;
    polymasHost?: string;
  }

  interface JumpToSsoLogoutOptions {
    redirect?: string;
    gotoLogin?: boolean;
    cleanCookies?: string;
    polymasHost?: string;
    clearAuthDataOptions?: ClearAuthDataOptions;
  }

  interface ClearAuthDataOptions {
    domain?: string;
    includeTokens?: boolean;
    includeUserInfo?: boolean;
    includeConfig?: boolean;
    includeLocalStorage?: boolean;
    includeSessionStorage?: boolean;
    extraCookies?: string[];
    extraLocalStorageKeys?: string[];
    preserveLocalStorageKeys?: string[];
  }

  export function getToken(): string;
  export function getZHSUserId(): string;
  export function jumpToLogin(): void;
  export function jumpToSsoLogin(options?: JumpToSsoLoginOptions): void;
  export function jumpToSsoLogout(options?: JumpToSsoLogoutOptions): void;
  export function clearAuthData(options?: ClearAuthDataOptions): void;
  export const removeAllCookie: typeof clearAuthData;

  // ---------- PolymasApi ----------
  export { PolymasApi } from '@zhs/agent-course-kit/services/base-request';
  export { AuthModule, ErrorModule, LoadingModule } from '@zhs/agent-course-kit/services/base-request';

  // ---------- Qiankun Navigate ----------
  export function useNavigate(): any;

  // ---------- Stream ----------
  export { postStream } from '@zhs/agent-course-kit/services/base-request/stream';
}

// ==================== services/base-request ====================
declare module '@zhs/agent-course-kit/services/base-request' {
  import type { AxiosInstance, AxiosRequestConfig } from 'axios';

  // eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
  interface PolymasApi extends AxiosInstance {}

  // eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
  class PolymasApi {
    constructor(config?: AxiosRequestConfig);
    use(module: (this: PolymasApi, options?: any) => PolymasApi, options?: any): this;
    $get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    $post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    $put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    static create(config?: AxiosRequestConfig): PolymasApi;
  }

  // ---------- AuthModule ----------
  interface AuthModuleOptions {
    /** 认证令牌（支持函数动态获取） */
    token: string | (() => string);
    /** 白名单 URL（不注入 token） */
    whiteList?: string[];
    /** 未认证处理函数 */
    unAuthHandler?: (() => void) | null;
    /** ZHS 用户 ID（支持函数动态获取） */
    ZHSUserId?: string | (() => string);
  }

  function AuthModule(this: PolymasApi, options: AuthModuleOptions): PolymasApi;

  // ---------- ErrorModule ----------
  interface ErrorModuleOptions {
    /** 响应中的 code 字段名（默认 "code"） */
    codeKey?: string;
    /** 响应中的 message 字段名（默认 "message"） */
    messageKey?: string;
    /** 成功业务码（默认 0） */
    successfulCode?: number;
    /** 未授权业务码（默认 401） */
    unauthorizedCode?: number;
    /** 禁止业务码（默认 403） */
    forbiddenCode?: number;
    /** 401 处理函数 */
    unauthorizedHandler?: (() => Promise<any> | void) | null;
    /** 403 处理函数 */
    forbiddenHandler?: (() => Promise<any> | void) | null;
    /** 业务错误处理函数 */
    serviceErrorHandler?: (() => Promise<any> | void) | null;
    /** HTTP 状态错误处理函数 */
    statusErrorHandler?: (() => Promise<any> | void) | null;
    /** 消息提示处理函数 */
    toastHandler?: ((msg: string) => void) | null;
  }

  function ErrorModule(this: PolymasApi, options?: ErrorModuleOptions): PolymasApi;

  // ---------- LoadingModule ----------
  interface LoadingModuleOptions {
    /** 是否显示加载状态 */
    isShowLoading?: boolean;
    /** 显示加载回调 */
    showLoadingHandler?: () => void;
    /** 隐藏加载回调 */
    hideLoadingHandler?: () => void;
  }

  function LoadingModule(this: PolymasApi, options?: LoadingModuleOptions): PolymasApi;

  export { PolymasApi, AuthModule, ErrorModule, LoadingModule };
  export type { AuthModuleOptions, ErrorModuleOptions, LoadingModuleOptions };
  export default PolymasApi;
}

// ==================== services/base-request/stream ====================
declare module '@zhs/agent-course-kit/services/base-request/stream' {
  interface StreamCallback {
    onData?: (data: string) => void;
    onError?: (error: Error) => void;
    onAborted?: () => void;
    onEnd?: () => void;
    abortController?: AbortController;
  }

  export function postStream(url: string, body: any, callback: StreamCallback): void;
}

// ==================== utils/qiankun ====================
declare module '@zhs/agent-course-kit/utils/qiankun' {
  import type { App } from 'vue';
  import type { Router } from 'vue-router';

  interface PolymasNavigateOptions {
    basePath?: string;
    isQiankun?: boolean;
    router?: Router;
  }

  interface NavigateParams {
    path: string;
    query?: Record<string, string | number>;
    params?: Record<string, string | number>;
    toBasePath?: string;
  }

  interface ReplaceParams {
    path?: string;
    query?: Record<string, string | number>;
    params?: Record<string, string | number>;
    toBasePath?: string;
  }

  interface OpenParams {
    path: string;
    query?: Record<string, string | number>;
    params?: Record<string, string | number>;
    toBasePath?: string;
  }

  class PolymasNavigate {
    basePath: string;
    isQiankun: boolean;
    router: Router | null;
    constructor(options?: PolymasNavigateOptions);
    install(app: App): void;
    parseUri(href: string): HTMLAnchorElement;
    getFullPath(path: string, query?: Record<string, string | number>, toBasePath?: string): string;
    getParamsPath(path: string, params?: Record<string, string | number>): string;
    open(params: OpenParams): Window | null;
    push(params: NavigateParams): void;
    replace(params?: ReplaceParams): void;
    go(stack: number): void;
    back(): void;
  }

  interface QiankunAction {
    onGlobalStateChange:
      ((callback: (state: Record<string, any>) => void, fireImmediately?: boolean) => () => void) | null;
    offGlobalStateChange: (() => void) | null;
    setGlobalState: ((state: Record<string, any>) => void) | null;
  }

  export const qiankunAction: QiankunAction;
  export { PolymasNavigate };
  export function useNavigate(): any;
  export function useNavigater(): PolymasNavigate;
}

// ==================== utils/auth ====================
declare module '@zhs/agent-course-kit/utils/auth' {
  export function getToken(): string;
  export function getZHSUserId(): string;
  export function jumpToLogin(): void;
  export function jumpToSsoLogin(options?: { redirect?: string; polymasHost?: string }): void;
  export function jumpToSsoLogout(options?: {
    redirect?: string;
    gotoLogin?: boolean;
    cleanCookies?: string;
    polymasHost?: string;
  }): void;
  export function clearAuthData(options?: Record<string, any>): void;
  export const removeAllCookie: typeof clearAuthData;
}

// ==================== constants ====================
declare module '@zhs/agent-course-kit/constants' {
  /** cookie 顶级域 */
  export const DOMAIN: string;
  /** 登录 token cookie 名 */
  export const TOKEN_AI_POLY: string;
  /** 智慧树用户 id cookie 名 */
  export const AIC_ZHS_U: string;
  /** SSO 写入的用户信息 cookie 名（值为 JSON，需自行 decodeURIComponent + JSON.parse） */
  export const HIKE_POLYMAS_USER: string;
}
