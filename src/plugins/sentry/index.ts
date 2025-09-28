import type { App } from 'vue';
import type { Router } from 'vue-router';
import { isSentryEnabled, getDefaultSentryConfig, type SentryConfig } from './const';

/**
 * 动态加载 Sentry
 */
export async function loadSentry() {
  if (!isSentryEnabled()) {
    return null;
  }

  try {
    const Sentry = await import('@sentry/vue');
    return Sentry;
  } catch (error) {
    console.warn('⚠️ Failed to load Sentry:', error);
    return null;
  }
}

/**
 * 初始化Sentry
 */
export async function initSentry(app: App | null, router: Router, config: Partial<SentryConfig> = {}) {
  // 检查是否启用
  if (!isSentryEnabled()) {
    return null;
  }

  // 动态加载 Sentry
  const Sentry = await loadSentry();
  if (!Sentry) {
    return null;
  }

  const finalConfig = { ...getDefaultSentryConfig(), ...config };

  // 如果没有DSN，在开发环境下给出警告，在生产环境下直接返回
  if (!finalConfig.dsn) {
    if (import.meta.env.DEV) {
      console.warn('Sentry DSN not configured. Sentry will not be initialized.');
    }
    return null;
  }

  // 构建集成配置
  const integrations: any[] = [
    // 浏览器追踪集成（性能监控和路由追踪）
    ...(finalConfig.enablePerformance || finalConfig.enableRouterTracking
      ? [
          Sentry.browserTracingIntegration({
            router,
            // 路由变化时自动创建事务
            enableLongTask: true,
          }),
        ]
      : []),

    // 会话重放集成
    ...(finalConfig.enableReplay
      ? [
          Sentry.replayIntegration({
            // 遮罩所有文本内容（保护隐私）
            maskAllText: true,
            // 遮罩所有输入
            maskAllInputs: true,
            // 阻止所有媒体
            blockAllMedia: true,
          }),
        ]
      : []),

    // 用户反馈集成
    ...(finalConfig.enableFeedback
      ? [
          Sentry.feedbackIntegration({
            // 自定义反馈按钮样式
            buttonLabel: '反馈问题',
            submitButtonLabel: '发送反馈',
            cancelButtonLabel: '取消',
            formTitle: '问题反馈',
            emailLabel: '邮箱地址',
            emailPlaceholder: '请输入您的邮箱',
            messageLabel: '问题描述',
            messagePlaceholder: '请详细描述您遇到的问题...',
            nameLabel: '联系人',
            namePlaceholder: '请输入您的姓名',
            successMessageText: '感谢您的反馈！我们会尽快处理。',
          }),
        ]
      : []),
  ];

  // 初始化Sentry
  Sentry.init({
    dsn: finalConfig.dsn,
    environment: finalConfig.environment,
    release: finalConfig.release,
    debug: finalConfig.debug,

    // Vue 应用实例（如果可用）
    ...(app ? { app } : {}),

    // 采样配置
    tracesSampleRate: finalConfig.tracesSampleRate,
    replaysSessionSampleRate: finalConfig.replaysSessionSampleRate,
    replaysOnErrorSampleRate: finalConfig.replaysOnErrorSampleRate,

    // 隐私配置
    sendDefaultPii: finalConfig.sendDefaultPii,

    // 面包屑配置
    maxBreadcrumbs: finalConfig.maxBreadcrumbs,

    // 集成配置
    integrations,

    // 错误过滤
    ignoreErrors: finalConfig.ignoreErrors,
    allowUrls: finalConfig.allowUrls,
    denyUrls: finalConfig.denyUrls,

    // 错误处理回调
    beforeSend(event, hint) {
      // 在开发环境下，同时在控制台输出错误
      if (import.meta.env.DEV) {
        console.group('🔴 Sentry Error Event');
        console.error('Original error:', hint.originalException);
        console.groupEnd();
      }

      // 过滤掉一些不重要的错误
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // 忽略网络相关错误
          if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
            return null;
          }

          // 忽略脚本加载错误
          if (error.message.includes('Loading chunk') || error.message.includes('Loading CSS chunk')) {
            return null;
          }
        }
      }

      return event;
    },

    // 面包屑过滤
    beforeBreadcrumb(breadcrumb) {
      // 过滤掉一些不重要的面包屑
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      // 过滤掉频繁的UI事件
      if (breadcrumb.category === 'ui.hover' || breadcrumb.category === 'ui.mousemove') {
        return null;
      }

      return breadcrumb;
    },
  });

  // 设置初始上下文
  Sentry.setContext('app', {
    name: 'Vite Vue3 Template',
    version: finalConfig.release,
    environment: finalConfig.environment,
    buildTime: new Date().toISOString(),
  });

  // 设置初始标签
  Sentry.setTag('component', 'root');
  if (app) {
    Sentry.setTag('vue.version', app.version);
  }

  // 添加初始化面包屑
  Sentry.addBreadcrumb({
    message: 'Sentry initialized',
    category: 'app.lifecycle',
    level: 'info',
    data: {
      environment: finalConfig.environment,
      debug: finalConfig.debug,
      enableReplay: finalConfig.enableReplay,
      enablePerformance: finalConfig.enablePerformance,
    },
  });

  // 设置路由监听（如果启用了路由追踪）
  if (finalConfig.enableRouterTracking && router) {
    router.beforeEach((to, from) => {
      // 为每个路由变化创建面包屑
      Sentry.addBreadcrumb({
        message: `Route change: ${from.path} → ${to.path}`,
        category: 'navigation',
        level: 'info',
        data: {
          from: {
            path: from.path,
            name: from.name?.toString(),
            params: from.params,
            query: from.query,
          },
          to: {
            path: to.path,
            name: to.name?.toString(),
            params: to.params,
            query: to.query,
          },
        },
      });

      // 设置当前页面标签
      Sentry.setTag('route.name', to.name?.toString() || 'unknown');
      Sentry.setTag('route.path', to.path);

      // 设置路由上下文
      Sentry.setContext('currentRoute', {
        path: to.path,
        name: to.name?.toString(),
        params: to.params,
        query: to.query,
        meta: to.meta,
      });
    });

    router.onError(error => {
      Sentry.captureException(error, {
        tags: {
          errorType: 'router',
        },
        contexts: {
          router: {
            currentRoute: router.currentRoute.value,
          },
        },
      });
    });
  }
}

/**
 * 手动捕获错误的工具函数（动态加载版本）
 */
export const createSentryUtils = (Sentry: any) => ({
  /**
   * 捕获异常
   */
  captureException: (error: Error, context?: Record<string, any>) => {
    if (!Sentry) return null;
    return Sentry.withScope((scope: any) => {
      if (context) {
        scope.setContext('customContext', context);
      }
      return Sentry.captureException(error);
    });
  },

  /**
   * 捕获消息
   */
  captureMessage: (message: string, level: any = 'info', context?: Record<string, any>) => {
    if (!Sentry) return null;
    return Sentry.withScope((scope: any) => {
      scope.setLevel(level);
      if (context) {
        scope.setContext('customContext', context);
      }
      return Sentry.captureMessage(message);
    });
  },

  /**
   * 设置用户信息
   */
  setUser: (user: any) => {
    if (!Sentry) return;
    Sentry.setUser(user);
  },

  /**
   * 设置标签
   */
  setTag: (key: string, value: string) => {
    if (!Sentry) return;
    Sentry.setTag(key, value);
  },

  /**
   * 设置上下文
   */
  setContext: (key: string, context: Record<string, any>) => {
    if (!Sentry) return;
    Sentry.setContext(key, context);
  },

  /**
   * 添加面包屑
   */
  addBreadcrumb: (breadcrumb: any) => {
    if (!Sentry) return;
    Sentry.addBreadcrumb(breadcrumb);
  },

  /**
   * 开始性能跨度
   */
  startSpan: (context: { name: string; op: string; description?: string }) => {
    if (!Sentry) return null;
    return Sentry.startSpan(context, (span: any) => span);
  },

  /**
   * 显示用户反馈对话框
   */
  showFeedback: (options?: any) => {
    if (!Sentry) return;
    Sentry.showReportDialog(options);
  },

  /**
   * 跟踪状态变化
   */
  trackStateChange: (storeName: string, action: string, before: any, after: any) => {
    if (!Sentry) return;
    Sentry.addBreadcrumb({
      message: `State change in ${storeName}: ${action}`,
      category: 'state',
      level: 'info',
      data: {
        store: storeName,
        action,
        before: typeof before === 'object' ? JSON.stringify(before) : before,
        after: typeof after === 'object' ? JSON.stringify(after) : after,
      },
    });
  },

  /**
   * 跟踪路由变化
   */
  trackRouteChange: (from: string, to: string, params?: any) => {
    if (!Sentry) return;
    Sentry.addBreadcrumb({
      message: `Route change: ${from} → ${to}`,
      category: 'navigation',
      level: 'info',
      data: {
        from,
        to,
        params,
      },
    });
  },
});

/**
 * 默认的空 sentryUtils（当 Sentry 未加载时使用）
 */
export const emptySentryUtils = createSentryUtils(null);

/**
 * 获取当前 Sentry 配置
 */
export const getSentryConfig = (): Required<SentryConfig> => getDefaultSentryConfig();

/**
 * 检查 Sentry 是否已初始化
 */
export const isSentryInitialized = async (): Promise<boolean> => {
  try {
    const Sentry = await loadSentry();
    return !!Sentry?.getClient();
  } catch {
    return false;
  }
};

// getSentryConfigSummary 移动到 sentryConfig.ts 中

/**
 * Vue插件形式的Sentry初始化（动态加载版本）
 */
export default {
  async install(app: App, options: { router: Router; config?: Partial<SentryConfig> } = {} as any) {
    if (!options.router) {
      throw new Error('Sentry plugin requires router option');
    }

    // 检查是否启用
    if (!isSentryEnabled()) {
      // 提供空的工具函数
      app.config.globalProperties.$sentry = emptySentryUtils;
      app.provide('sentry', emptySentryUtils);
      return;
    }

    // 动态加载Sentry
    const Sentry = await loadSentry();
    if (!Sentry) {
      console.warn('⚠️ Failed to load Sentry');
      app.config.globalProperties.$sentry = emptySentryUtils;
      app.provide('sentry', emptySentryUtils);
      return;
    }

    // 初始化 Sentry（在app.mount()之前）
    await initSentry(app, options.router, options.config);

    if (Sentry) {
      // 创建工具函数
      const sentryUtils = createSentryUtils(Sentry);

      // 将工具函数挂载到全局属性
      app.config.globalProperties.$sentry = sentryUtils;

      // 提供全局注入
      app.provide('sentry', sentryUtils);
    } else {
      // Sentry 加载失败，提供空的工具函数
      app.config.globalProperties.$sentry = emptySentryUtils;
      app.provide('sentry', emptySentryUtils);
    }
  },
};
