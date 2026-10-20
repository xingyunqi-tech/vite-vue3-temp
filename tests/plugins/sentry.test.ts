import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const scope = vi.hoisted(() => ({ setTag: vi.fn(), setContext: vi.fn() }));

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  withScope: vi.fn((callback: (s: typeof scope) => void) => callback(scope)),
  captureException: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  feedbackIntegration: vi.fn(() => ({ name: 'Feedback' })),
}));

vi.mock('@sentry/vue', () => sdk);

const createTestRouter = () => createRouter({ history: createMemoryHistory(), routes: [] });

/** 首次编译依赖较慢，预先在钩子中完成，用例内重新 import 只需求值 */
beforeAll(async () => {
  await import('@/plugins/sentry');
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('未配置 DSN', () => {
  it('不加载也不初始化 SDK', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { setupSentry } = await import('@/plugins/sentry');
    const router = createTestRouter();
    const onError = vi.spyOn(router, 'onError');

    await setupSentry(router);

    expect(sdk.init).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('配置了 DSN', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.test/1');
  });

  it('按配置初始化，去掉 SDK 自带的全局监听与 Vue 集成', async () => {
    const { setupSentry } = await import('@/plugins/sentry');
    const router = createTestRouter();

    await setupSentry(router);

    const options = sdk.init.mock.calls[0][0];
    expect(options.dsn).toBe('https://key@sentry.test/1');
    expect(options.release).toBe(__APP_VERSION__);
    expect(options.app).toBeUndefined();
    const integrations = options.integrations([{ name: 'GlobalHandlers' }, { name: 'Vue' }, { name: 'Dedupe' }]);
    expect(integrations.map((item: { name: string }) => item.name)).toEqual([
      'Dedupe',
      'BrowserTracing',
      'Replay',
      'Feedback',
    ]);
    expect(sdk.browserTracingIntegration).toHaveBeenCalledWith({ router });
  });

  it('未捕获错误以未处理状态上报一次，带上来源与 Vue 上下文', async () => {
    const { setupSentry } = await import('@/plugins/sentry');
    const { reportGlobalError } = await import('@/utils/error-handler');
    await setupSentry(createTestRouter());

    const error = new Error('boom');
    reportGlobalError(error, 'vue', 'render function');

    expect(sdk.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      mechanism: { handled: false, type: 'auto.app.vue' },
    });
    expect(scope.setTag).toHaveBeenCalledWith('source', 'vue');
    expect(scope.setContext).toHaveBeenCalledWith('vue', { info: 'render function' });
  });

  it('路由错误经全局错误处理上报', async () => {
    const { setupSentry } = await import('@/plugins/sentry');
    const router = createTestRouter();
    router.addRoute({ path: '/broken', component: () => Promise.reject(new Error('chunk failed')) });
    await setupSentry(router);

    await router.push('/broken').catch(() => {});

    expect(sdk.captureException).toHaveBeenCalledTimes(1);
    expect(scope.setTag).toHaveBeenCalledWith('source', 'router');
  });

  it('登录用户同步到 Sentry 上下文，退出后清空', async () => {
    const { setupSentry } = await import('@/plugins/sentry');
    const { useUserInfoStore } = await import('@/store/modules/user-info');
    await setupSentry(createTestRouter());
    expect(sdk.setUser).toHaveBeenLastCalledWith(null);

    const userStore = useUserInfoStore();
    userStore.setUserInfo({ id: 7, username: 'editor', role: 'EDITOR' });
    await Promise.resolve();
    expect(sdk.setUser).toHaveBeenLastCalledWith({ id: '7', username: 'editor' });
    expect(sdk.setTag).toHaveBeenLastCalledWith('user.role', 'EDITOR');

    userStore.resetUserInfo();
    await Promise.resolve();
    expect(sdk.setUser).toHaveBeenLastCalledWith(null);
  });

  it('SDK 加载失败时不初始化也不抛错', async () => {
    vi.doMock('@sentry/vue', () => {
      throw new Error('load failed');
    });
    const { setupSentry } = await import('@/plugins/sentry');

    await expect(setupSentry(createTestRouter())).resolves.toBeUndefined();
    expect(sdk.init).not.toHaveBeenCalled();
    vi.doUnmock('@sentry/vue');
  });
});
