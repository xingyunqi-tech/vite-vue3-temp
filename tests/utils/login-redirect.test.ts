import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

/**
 * SSO 重新登录的去重与顶替
 *
 * jumpToLogin 会整体离开页面，测试里换成 spy；其余照真实模块跑。
 * 去重标志位是模块级状态，每例前 resetModules 拿一份干净的。
 */
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogin: vi.fn(),
}));

/** 假计时器必须在动态 import 之后启用：模块加载本身要用真实计时器，提前换掉会卡住 */
const loadModules = async () => {
  const { redirectToLoginOnce, setupGlobalErrorHandler, teardownGlobalErrorHandler } =
    await import('@/utils/error-handler');
  const { jumpToLogin } = await import('@/utils/auth');
  vi.useFakeTimers();
  return {
    redirectToLoginOnce,
    setupGlobalErrorHandler,
    teardownGlobalErrorHandler,
    jumpToLogin: vi.mocked(jumpToLogin),
  };
};

/** 首次加载要编译 element-plus 等整棵依赖，放到这里预热，免得冷启动吃掉首个用例的超时 */
beforeAll(async () => {
  await import('@/utils/error-handler');
}, 30_000);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('redirectToLoginOnce', () => {
  it('立即跳转并把回跳地址透传给 jumpToLogin', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce('https://app.test/chat');

    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith('https://app.test/chat');
  });

  it('并发的第二次调用不再跳转', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce('https://app.test/a');
    redirectToLoginOnce('https://app.test/b');

    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith('https://app.test/a');
  });

  it('带 delay 时先不跳，到期才跳', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce(undefined, 1500);
    expect(jumpToLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('排队期间带地址的调用顶掉排队那次，只跳一次且用新地址', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    // 401 先到，排的是「回当前页」（无地址）
    redirectToLoginOnce(undefined, 1500);
    // 守卫随后给出真正的目标路由
    redirectToLoginOnce('https://app.test/target');

    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith('https://app.test/target');

    // 排队的那次已被取消，计时器到点不会再跳一遍
    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledTimes(1);
  });

  it('排队期间不带地址的调用不顶替，到期仍按原计划跳', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce(undefined, 1500);
    redirectToLoginOnce(undefined);
    expect(jumpToLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('首次就带了地址时，排队期间的调用不顶替', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce('https://app.test/first', 1500);
    redirectToLoginOnce('https://app.test/second');
    expect(jumpToLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledExactlyOnceWith('https://app.test/first');
  });

  it('卸载全局错误处理后可以重新跳转', async () => {
    const { redirectToLoginOnce, setupGlobalErrorHandler, teardownGlobalErrorHandler, jumpToLogin } =
      await loadModules();

    setupGlobalErrorHandler();
    redirectToLoginOnce('https://app.test/before');
    teardownGlobalErrorHandler();
    redirectToLoginOnce('https://app.test/after');

    expect(jumpToLogin).toHaveBeenCalledTimes(2);
    expect(jumpToLogin).toHaveBeenLastCalledWith('https://app.test/after');
  });

  it('卸载时清掉排队中的跳转，计时器到点不再离开页面', async () => {
    const { redirectToLoginOnce, setupGlobalErrorHandler, teardownGlobalErrorHandler, jumpToLogin } =
      await loadModules();

    setupGlobalErrorHandler();
    redirectToLoginOnce('https://app.test/pending', 1500);
    teardownGlobalErrorHandler();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).not.toHaveBeenCalled();
  });
});
