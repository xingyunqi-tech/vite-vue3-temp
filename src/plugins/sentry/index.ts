/**
 * Sentry 接入：上报只走 setupGlobalErrorHandler 的 onError
 */
import { watch } from 'vue';
import type { Router } from 'vue-router';
import { getSentryConfig, isSentryEnabled } from './config';
import { useUserInfoStore } from '@/store/modules/user-info';
import { reportGlobalError, setupGlobalErrorHandler } from '@/utils/error-handler';

type SentrySDK = typeof import('@sentry/vue');

/** 错误捕获统一走 onError；Vue 集成需在 mount 前初始化，异步初始化时不启用 */
const DISABLED_INTEGRATIONS = new Set(['GlobalHandlers', 'Vue']);

/** 当前登录用户同步到 Sentry 上下文 */
function syncUser(Sentry: SentrySDK): void {
  const userStore = useUserInfoStore();
  watch(
    () => [userStore.info.id, userStore.info.username, userStore.info.role] as const,
    ([id, username, role]) => {
      Sentry.setUser(id === undefined ? null : { id: String(id), username });
      Sentry.setTag('user.role', role || 'unknown');
    },
    { immediate: true },
  );
}

/**
 * 初始化 Sentry（未配置 DSN 时不做任何事）
 *
 * SDK 异步加载，不阻塞挂载；加载完成前发生的错误只记录到 console。
 */
export async function setupSentry(router: Router): Promise<void> {
  if (!isSentryEnabled()) return;
  router.onError(error => reportGlobalError(error, 'router'));

  const Sentry = await import('@sentry/vue').catch(error => {
    console.warn('Sentry 加载失败:', error);
    return null;
  });
  if (!Sentry) return;

  const config = getSentryConfig();
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    debug: config.debug,
    integrations: defaults => [
      ...defaults.filter(integration => !DISABLED_INTEGRATIONS.has(integration.name)),
      ...(config.enablePerformance ? [Sentry.browserTracingIntegration({ router })] : []),
      ...(config.enableReplay
        ? [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })]
        : []),
      ...(config.enableFeedback
        ? [
            Sentry.feedbackIntegration({
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
    ],
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
    sendDefaultPii: config.sendDefaultPii,
    maxBreadcrumbs: config.maxBreadcrumbs,
    ignoreErrors: config.ignoreErrors,
    allowUrls: config.allowUrls,
    denyUrls: config.denyUrls,
  });

  setupGlobalErrorHandler({
    onError: (error, source, context) =>
      Sentry.withScope(scope => {
        scope.setTag('source', source);
        if (context) scope.setContext('vue', { info: context });
        Sentry.captureException(error, { mechanism: { handled: false, type: `auto.app.${source}` } });
      }),
  });
  syncUser(Sentry);
}
