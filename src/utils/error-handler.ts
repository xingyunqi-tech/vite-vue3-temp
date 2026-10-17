/**
 * 全局错误处理器
 *
 * 统一处理应用中的各类错误，提供用户友好的错误提示
 */

import type { AxiosError } from 'axios';
import { ElMessage, ElNotification } from 'element-plus';
import { jumpToLogin, removeToken } from './auth';

/**
 * 错误类型
 */
export enum ErrorType {
  /** 网络错误 */
  NETWORK = 'network',
  /** 请求配置错误 */
  REQUEST = 'request',
  /** 业务错误 */
  BUSINESS = 'business',
  /** 认证错误 */
  AUTH = 'auth',
  /** 权限错误 */
  PERMISSION = 'permission',
  /** 服务器错误 */
  SERVER = 'server',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 错误配置
 */
interface ErrorConfig {
  /** 是否显示错误提示 */
  showMessage?: boolean;
  /** 错误类型 */
  type?: ErrorType;
  /** 自定义错误消息 */
  message?: string;
  /** 是否使用通知而非消息 */
  useNotification?: boolean;
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  401: '未登录或登录已过期',
  403: '没有权限访问',
  404: '请求的资源不存在',
  408: '请求超时',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂时不可用',
  504: '网关超时',
};

/**
 * 把传输层的原始错误文案翻译成面向用户的中文提示
 *
 * 适用于只拿得到字符串、拿不到 error 对象的场合——典型是请求层拦截器的错误提示，
 * 它在 HTTP / 网络失败分支交出的是 axios 的 `error.message`（形如
 * `Request failed with status code 500` / `timeout of 120000ms exceeded` / `Network Error`）。
 * 这里按固定句式还原出状态码，复用同一张 ERROR_MESSAGES 表，避免文案表分叉成两份。
 *
 * 认不出来的一律原样返回：业务错误走的是后端 `data.message`，本身就是给用户看的中文，
 * 不能被兜底文案覆盖掉。
 */
export function toFriendlyMessage(raw: string): string {
  if (!raw) return raw;

  const status = /status code (\d{3})/i.exec(raw);
  if (status) {
    const code = Number(status[1]);
    return ERROR_MESSAGES[code] ?? `请求失败 (${code})`;
  }

  if (/^timeout of|timeout exceeded|ECONNABORTED/i.test(raw)) return '请求超时，请稍后重试';
  if (/^Network Error$|ERR_NETWORK/i.test(raw)) return '网络连接失败，请检查网络';

  return raw;
}

/**
 * 判断错误类型
 */
function detectErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // Axios 错误
  if (error.isAxiosError) {
    const axiosError = error as AxiosError;

    if (!axiosError.response) {
      return ErrorType.NETWORK;
    }

    const status = axiosError.response.status;

    if (status === 401) return ErrorType.AUTH;
    if (status === 403) return ErrorType.PERMISSION;
    if (status >= 500) return ErrorType.SERVER;
    if (status >= 400) return ErrorType.BUSINESS;
  }

  // 业务错误（有 code 字段）
  if (error.code !== undefined) {
    return ErrorType.BUSINESS;
  }

  return ErrorType.UNKNOWN;
}

/**
 * 获取错误消息
 */
function getErrorMessage(error: any): string {
  if (error == null) return '未知错误';

  // 自定义消息（仅非 Axios 错误，避免 AxiosError 的英文 message 短路掉下方的中文友好提示）
  if (!error.isAxiosError && error.message) return error.message;

  // Axios 错误
  if (error.isAxiosError) {
    const axiosError = error as AxiosError;

    // 网络错误
    if (!axiosError.response) {
      return '网络连接失败，请检查网络';
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data as any;

    // 服务器返回的错误消息
    if (data?.message) return data.message;

    // 标准 HTTP 错误消息
    if (ERROR_MESSAGES[status]) {
      return ERROR_MESSAGES[status];
    }

    return `请求失败 (${status})`;
  }

  // 默认消息
  return '操作失败，请稍后重试';
}

/**
 * 显示错误消息
 */
function showError(message: string, type: ErrorType, useNotification = false) {
  const config = {
    message,
    duration: 3000,
  };

  if (useNotification) {
    ElNotification({
      title: '错误',
      message,
      type: 'error',
      duration: 5000,
    });
  } else {
    ElMessage.error(config);
  }

  // 记录错误日志
  console.error(`[ErrorHandler] ${type}:`, message);
}

/**
 * 处理错误
 *
 * @param error 错误对象
 * @param config 错误配置
 * @returns 错误类型
 *
 * @example
 * ```typescript
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export function handleError(error: any, config: ErrorConfig = {}): ErrorType {
  const { showMessage = true, type: customType, message: customMessage, useNotification = false } = config;

  const errorType = customType || detectErrorType(error);
  const errorMessage = customMessage || getErrorMessage(error);

  // 是否显示错误提示
  if (showMessage) {
    // 服务器错误使用通知，其他使用消息
    const shouldUseNotification = useNotification || errorType === ErrorType.SERVER;
    showError(errorMessage, errorType, shouldUseNotification);
  }

  // 特殊处理：认证错误
  if (errorType === ErrorType.AUTH) {
    handleAuthError();
  }

  return errorType;
}

let isRedirectingToLogin = false;

/**
 * 清除 token 并跳转登录页（回跳当前页），并发只跳一次
 *
 * 401 有两条来路（请求层拦截器、本文件的 handleError），去重标志位必须共用，否则并发 401 会各跳各的。
 * 跳转是整页刷新，标志位随页面重建复位。
 *
 * @param delay 延迟毫秒数，用于先让用户看到错误提示
 */
export function redirectToLoginOnce(delay = 0): void {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  removeToken();

  if (delay > 0) {
    setTimeout(() => jumpToLogin(), delay);
    return;
  }
  jumpToLogin();
}

/** 处理认证错误 - 跳转登录页（回跳地址由 jumpToLogin 统一过滤） */
function handleAuthError() {
  redirectToLoginOnce(1500);
}

/**
 * 静默处理错误（不显示提示）
 */
export function handleErrorSilently(error: any): ErrorType {
  return handleError(error, { showMessage: false });
}

/**
 * 创建错误处理装饰器
 * 用于包装函数，自动处理错误
 */
export function withErrorHandler<T extends (...args: any[]) => any>(fn: T, config?: ErrorConfig): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, config);
      throw error;
    }
  }) as T;
}

/**
 * 处理请求配置错误
 * 专门用于请求拦截器中的错误处理
 */
export function handleRequestError(error: any): never {
  let errorMessage = '请求配置错误';
  let errorType = ErrorType.REQUEST;

  // 请求超时
  if (error.code === 'ECONNABORTED') {
    errorMessage = '请求超时，请检查网络连接';
    errorType = ErrorType.NETWORK;
  }
  // 网络错误
  else if (error.code === 'ERR_NETWORK') {
    errorMessage = '网络错误，请检查网络连接';
    errorType = ErrorType.NETWORK;
  }
  // 取消请求
  else if (error.code === 'ERR_CANCELED') {
    errorMessage = '请求已取消';
    errorType = ErrorType.REQUEST;
  }
  // 其他错误
  else if (error.message) {
    errorMessage = error.message;
  }

  console.error('[Request Error]:', errorMessage, error);

  // 网络错误需要显示提示，配置错误通常是代码问题不需要显示
  const showMessage = errorType === ErrorType.NETWORK;

  handleError(new Error(errorMessage), {
    type: errorType,
    showMessage,
  });

  throw new Error(errorMessage);
}

/**
 * 未捕获错误的来源
 *
 * - unhandledrejection / error：window 层的游离 Promise 与脚本错误
 * - vue：Vue 组件错误（渲染、生命周期、事件处理器、watcher），来自 app.config.errorHandler
 *   与 ErrorBoundary 接管整页时的主动上报
 */
export type GlobalErrorSource = 'unhandledrejection' | 'error' | 'vue';

/**
 * 全局兜底通知的固定文案
 *
 * 未捕获错误的原始 message 多是堆栈片段、第三方脚本报错或英文异常，对用户没有可操作性，
 * 还可能带出内部实现细节；原始内容只进 console 与 onError 上报钩子。
 */
const GLOBAL_ERROR_NOTICE = '页面出现异常，请刷新重试';

/**
 * 全局错误处理器配置
 */
export interface GlobalErrorHandlerOptions {
  /**
   * 是否向用户弹出通知。默认 false。
   *
   * 全局兜底主要用于「记录/上报」未捕获错误（多为程序 bug、第三方脚本、游离 Promise，用户无法处理）；
   * 业务/HTTP 错误的用户提示已由请求层拦截器负责，全局层默认静默以免重复弹窗与通知风暴。
   * 确有需要时可显式置 true 开启通知。
   */
  notify?: boolean;
  /** 错误上报钩子（接入监控时使用），在 console 记录后调用 */
  onError?: (error: unknown, source: GlobalErrorSource) => void;
}

/** 全局错误处理器（用于未捕获的错误），监听器只注册一次 */
let errorHandlerInstalled = false;
let globalErrorOptions: GlobalErrorHandlerOptions = {};

/**
 * 记录并上报一个未被业务处理的错误：console 记录 + onError 上报钩子，默认不打扰用户
 * （开了 notify 也只弹固定文案，原始 message 不外泄）
 *
 * 所有未捕获错误（window 层、Vue 组件层）的唯一出口，接监控时只需在
 * setupGlobalErrorHandler 里传一次 onError，无需在各处埋点。
 *
 * @param context 补充上下文，如 Vue 提供的 errorInfo（'render function' / 'setup function' 等）
 */
export function reportGlobalError(error: unknown, source: GlobalErrorSource, context?: string): void {
  console.error(`[GlobalError] ${source}${context ? ` (${context})` : ''}:`, error);
  globalErrorOptions.onError?.(error, source);
  if (globalErrorOptions.notify) {
    handleError(error, { useNotification: true, message: GLOBAL_ERROR_NOTICE });
  }
}

const handleRejection = (event: PromiseRejectionEvent) => {
  reportGlobalError(event.reason, 'unhandledrejection');
  event.preventDefault();
};

const handleWindowError = (event: ErrorEvent) => {
  if (event.error == null) return;
  reportGlobalError(event.error, 'error');
  event.preventDefault();
};

export function setupGlobalErrorHandler(options: GlobalErrorHandlerOptions = {}) {
  // 选项可在重复调用时更新（最近一次为准），但监听器只注册一次
  globalErrorOptions = options;
  if (errorHandlerInstalled) return;
  errorHandlerInstalled = true;
  window.addEventListener('unhandledrejection', handleRejection);
  window.addEventListener('error', handleWindowError);
}
