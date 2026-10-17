import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

/**
 * 跳转登录页的去重与顶替
 *
 * jumpToLogin / removeToken 换成 spy；去重标志位是模块级状态，每例前 resetModules 拿一份干净的。
 */
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogin: vi.fn(),
  removeToken: vi.fn(),
}));

/** 假计时器必须在动态 import 之后启用：模块加载本身要用真实计时器，提前换掉会卡住 */
const loadModules = async () => {
  const { redirectToLoginOnce } = await import('@/utils/error-handler');
  const { jumpToLogin, removeToken } = await import('@/utils/auth');
  vi.useFakeTimers();
  return { redirectToLoginOnce, jumpToLogin: vi.mocked(jumpToLogin), removeToken: vi.mocked(removeToken) };
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
  it('先清除 token，再立即跳转登录页', async () => {
    const { redirectToLoginOnce, jumpToLogin, removeToken } = await loadModules();

    redirectToLoginOnce();

    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(jumpToLogin).toHaveBeenCalledTimes(1);
    expect(removeToken.mock.invocationCallOrder[0]).toBeLessThan(jumpToLogin.mock.invocationCallOrder[0]);
  });

  it('并发的第二次调用不再跳转', async () => {
    const { redirectToLoginOnce, jumpToLogin, removeToken } = await loadModules();

    redirectToLoginOnce();
    redirectToLoginOnce();

    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(jumpToLogin).toHaveBeenCalledTimes(1);
  });

  it('带 delay 时 token 立即清除，到期才跳', async () => {
    const { redirectToLoginOnce, jumpToLogin, removeToken } = await loadModules();

    redirectToLoginOnce(1500);
    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(jumpToLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledTimes(1);
  });

  it('排队期间的再次调用不额外跳转', async () => {
    const { redirectToLoginOnce, jumpToLogin } = await loadModules();

    redirectToLoginOnce(1500);
    redirectToLoginOnce();
    expect(jumpToLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(jumpToLogin).toHaveBeenCalledTimes(1);
  });
});
