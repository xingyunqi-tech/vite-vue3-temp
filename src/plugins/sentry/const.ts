/**
 * Sentry 配置模块
 * 这个模块只包含配置和工具函数，不包含动态导入
 * 可以被静态导入而不会影响代码分割
 */

/**
 * Sentry 配置常量
 */
export const SENTRY_CONFIG = {
  // 基础配置
  ENABLED: true,
  DSN: 'https://857344c2ec1086fd0f81e65297f369a5@o4506822939508736.ingest.us.sentry.io/4510032619962368',
  ENVIRONMENT: import.meta.env.MODE || 'development',
  RELEASE: '1.0.0',

  // 开发/生产环境差异化配置
  DEVELOPMENT: {
    debug: false,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  },

  PRODUCTION: {
    debug: false,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  },
} as const;

/**
 * 检查是否启用 Sentry
 * 这个函数不依赖于 Sentry SDK，可以安全地被静态导入
 */
export const isSentryEnabled = (): boolean => {
  return SENTRY_CONFIG.ENABLED && !!SENTRY_CONFIG.DSN;
};

/**
 * 功能开关配置
 */
export const SENTRY_FEATURE_CONFIG = {
  enableReplay: true,
  enableFeedback: true,
  enablePerformance: true,
  enableRouterTracking: true,
  enableStateTracking: true,
} as const;

/**
 * 安全和隐私配置
 */
export const SENTRY_SECURITY_CONFIG = {
  sendDefaultPii: false,
  maxBreadcrumbs: 100,
  ignoreErrors: [
    // 浏览器扩展错误
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    // 网络错误
    'Network request failed',
    'Failed to fetch',
    // 脚本加载错误
    'Loading chunk',
    'Loading CSS chunk',
    // 其他常见的非关键错误
    'Script error',
    'UnhandledPromiseRejectionWarning',
  ] as (string | RegExp)[],
  allowUrls: [
    // 只允许来自当前域名的错误
    window.location.origin,
  ] as (string | RegExp)[],
  denyUrls: [
    // 阻止来自浏览器扩展的错误
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ] as (string | RegExp)[],
};

/**
 * Sentry配置接口
 */
export interface SentryConfig {
  /** Sentry DSN */
  dsn?: string;
  /** 环境名称 */
  environment?: string;
  /** 应用版本 */
  release?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 跟踪采样率 (0-1) */
  tracesSampleRate?: number;
  /** 会话重放采样率 (0-1) */
  replaysSessionSampleRate?: number;
  /** 错误时重放采样率 (0-1) */
  replaysOnErrorSampleRate?: number;
  /** 是否发送默认PII信息 */
  sendDefaultPii?: boolean;
  /** 最大面包屑数量 */
  maxBreadcrumbs?: number;
  /** 是否启用会话重放 */
  enableReplay?: boolean;
  /** 是否启用用户反馈 */
  enableFeedback?: boolean;
  /** 是否启用性能监控 */
  enablePerformance?: boolean;
  /** 是否启用路由追踪 */
  enableRouterTracking?: boolean;
  /** 是否启用状态管理追踪 */
  enableStateTracking?: boolean;
  /** 忽略的错误 */
  ignoreErrors?: (string | RegExp)[];
  /** 允许的URLs */
  allowUrls?: (string | RegExp)[];
  /** 阻止的URLs */
  denyUrls?: (string | RegExp)[];
}

/**
 * 默认Sentry配置
 */
export const getDefaultSentryConfig = (): Required<SentryConfig> => ({
  dsn: SENTRY_CONFIG.DSN,
  environment: SENTRY_CONFIG.ENVIRONMENT,
  release: SENTRY_CONFIG.RELEASE,
  ...(import.meta.env.PROD ? SENTRY_CONFIG.PRODUCTION : SENTRY_CONFIG.DEVELOPMENT),
  ...SENTRY_FEATURE_CONFIG,
  ...SENTRY_SECURITY_CONFIG,
});

/**
 * 获取当前 Sentry 配置
 */
export const getSentryConfig = (): Required<SentryConfig> => getDefaultSentryConfig();

/**
 * 获取当前环境的 Sentry 配置摘要
 */
export const getSentryConfigSummary = () => {
  const config = getSentryConfig();
  return {
    environment: config.environment,
    release: config.release,
    debug: config.debug,
    tracesSampleRate: config.tracesSampleRate,
    enabledFeatures: {
      performance: config.enablePerformance,
      replay: config.enableReplay,
      feedback: config.enableFeedback,
      routerTracking: config.enableRouterTracking,
      stateTracking: config.enableStateTracking,
    },
  };
};
