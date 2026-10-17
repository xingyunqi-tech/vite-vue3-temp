/**
 * Sentry 配置：只含常量与纯函数，可静态导入而不把 SDK 拉进首屏包
 */

/** Sentry 初始化配置 */
export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  debug: boolean;
  /** 性能追踪采样率 (0-1) */
  tracesSampleRate: number;
  /** 会话重放采样率 (0-1) */
  replaysSessionSampleRate: number;
  /** 出错时会话重放采样率 (0-1) */
  replaysOnErrorSampleRate: number;
  enableReplay: boolean;
  enableFeedback: boolean;
  enablePerformance: boolean;
  sendDefaultPii: boolean;
  maxBreadcrumbs: number;
  ignoreErrors: (string | RegExp)[];
  allowUrls: (string | RegExp)[];
  denyUrls: (string | RegExp)[];
}

const SAMPLE_RATES = {
  development: { tracesSampleRate: 1.0, replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1.0 },
  production: { tracesSampleRate: 0.1, replaysSessionSampleRate: 0.01, replaysOnErrorSampleRate: 1.0 },
} as const;

/** DSN 由 VITE_SENTRY_DSN 提供，留空则不启用 */
export const isSentryEnabled = (): boolean => !!import.meta.env.VITE_SENTRY_DSN;

export const getSentryConfig = (): SentryConfig => ({
  dsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  environment: import.meta.env.MODE,
  release: __APP_VERSION__,
  debug: false,
  ...(import.meta.env.PROD ? SAMPLE_RATES.production : SAMPLE_RATES.development),
  enableReplay: true,
  enableFeedback: true,
  enablePerformance: true,
  sendDefaultPii: false,
  maxBreadcrumbs: 100,
  ignoreErrors: ['Non-Error promise rejection captured', 'ResizeObserver loop limit exceeded', 'Script error'],
  allowUrls: [window.location.origin],
  denyUrls: [/extensions\//i, /^chrome:\/\//i, /^chrome-extension:\/\//i, /^moz-extension:\/\//i],
});
