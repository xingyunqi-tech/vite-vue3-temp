import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUserInfo, login, logout } from '@/api/modules/auth';
import { NO_BACKOFFICE_ACCESS_MESSAGE, useUserInfoStore } from '@/store/modules/user-info';
import { removePersistedStore } from '@/store/plugins/persist';
import { getRefreshToken, getToken, jumpToLogout, removeToken, setToken } from '@/utils/auth';

vi.mock('@/api/modules/auth', () => ({
  login: vi.fn(async () => ({ token: 'token-a', refreshToken: 'refresh-a', user: { role: 'ADMIN' } })),
  logout: vi.fn(async () => undefined),
  getUserInfo: vi.fn(async () => ({
    id: 1,
    username: 'reviewer',
    realName: '审核员',
    avatar: '',
    email: '',
    phone: '',
    role: 'REVIEWER',
  })),
}));
vi.mock('@/store/plugins/persist', () => ({ removePersistedStore: vi.fn(async () => {}) }));
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogout: vi.fn(),
}));

const jwt = (payload: Record<string, unknown>) => `header.${btoa(JSON.stringify(payload))}.signature`;

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  removeToken();
});

describe('登录', () => {
  it('管理员登录写入 token 与刷新 token 并同步登录态', async () => {
    const store = useUserInfoStore();
    expect(store.isLoggedIn).toBe(false);

    await store.loginAction({ email: 'admin@example.com', password: 'Abcd1234' });

    expect(login).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'Abcd1234' });
    expect(getToken()).toBe('token-a');
    expect(getRefreshToken()).toBe('refresh-a');
    expect(store.token).toBe('token-a');
    expect(store.isLoggedIn).toBe(true);
  });

  it('非后台角色登录时注销本次会话、不写入 token 并提示无权限', async () => {
    vi.mocked(login).mockResolvedValueOnce({
      token: 'token-u',
      refreshToken: 'refresh-u',
      user: { role: '' },
    } as never);
    const store = useUserInfoStore();

    await expect(store.loginAction({ email: 'user@example.com', password: 'p' })).rejects.toThrow(
      NO_BACKOFFICE_ACCESS_MESSAGE,
    );

    expect(logout).toHaveBeenCalledWith('token-u');
    expect(getToken()).toBe('');
    expect(getRefreshToken()).toBe('');
    expect(store.isLoggedIn).toBe(false);
  });
});

describe('后台角色', () => {
  it.each(['EDITOR', 'REVIEWER'])('%s 角色可以登录', async role => {
    vi.mocked(login).mockResolvedValueOnce({ token: 'token-r', refreshToken: 'refresh-r', user: { role } } as never);
    const store = useUserInfoStore();

    await store.loginAction({ email: 'staff@example.com', password: 'p' });

    expect(logout).not.toHaveBeenCalled();
    expect(getToken()).toBe('token-r');
  });

  it.each([
    ['ADMIN', true],
    ['REVIEWER', true],
    ['EDITOR', false],
    ['', false],
  ] as const)('%s 角色的 canReview 为 %s', (role, expected) => {
    const store = useUserInfoStore();
    store.setUserInfo({ role });

    expect(store.canReview).toBe(expected);
  });
});

describe('登录凭证校验', () => {
  it('登录响应缺少 token 时抛错且不写入 Cookie', async () => {
    vi.mocked(login).mockResolvedValueOnce({} as never);
    const store = useUserInfoStore();

    await expect(store.loginAction({ email: 'u@example.com', password: 'p' })).rejects.toThrow('未获取到登录凭证');
    expect(getToken()).toBe('');
  });
});

describe('用户信息', () => {
  it('getInfoAction 以接口返回覆盖本地资料与角色', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'ADMIN', realName: '旧账号' });

    await store.getInfoAction();

    expect(getUserInfo).toHaveBeenCalledTimes(1);
    expect(store.info.realName).toBe('审核员');
    expect(store.info.role).toBe('REVIEWER');
    expect(store.canReview).toBe(true);
  });

  it('接口返回未定义的角色时角色留空', async () => {
    vi.mocked(getUserInfo).mockResolvedValueOnce({
      id: 3,
      username: 'u',
      realName: '',
      avatar: '',
      email: '',
      phone: '',
      role: 'editor',
    } as never);
    const store = useUserInfoStore();

    await store.getInfoAction();

    expect(store.info.role).toBe('');
  });

  it('接口未返回角色时角色留空', async () => {
    vi.mocked(getUserInfo).mockResolvedValueOnce({
      id: 2,
      username: 'u',
      realName: '',
      avatar: '',
      email: '',
      phone: '',
    } as never);
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'ADMIN' });

    await store.getInfoAction();

    expect(store.info.role).toBe('');
  });
});

describe('换账号检测', () => {
  it('Cookie 里的 token 与加载用户信息时不同时判定为换了账号', async () => {
    setToken('token-a');
    const store = useUserInfoStore();
    await store.getInfoAction();
    expect(store.isAccountSwitched()).toBe(false);

    setToken('token-b');
    expect(store.isAccountSwitched()).toBe(true);
  });

  it('同一会话刷新 token 后不判定为换了账号', async () => {
    setToken(jwt({ sessionId: 7, hash: 'a' }));
    const store = useUserInfoStore();
    await store.getInfoAction();

    setToken(jwt({ sessionId: 7, hash: 'b' }));
    expect(store.isAccountSwitched()).toBe(false);

    setToken(jwt({ sessionId: 8, hash: 'c' }));
    expect(store.isAccountSwitched()).toBe(true);
  });

  it('尚未加载用户信息或 token 已清空时不判定', async () => {
    setToken('token-b');
    const store = useUserInfoStore();
    expect(store.isAccountSwitched()).toBe(false);

    await store.getInfoAction();
    removeToken();
    expect(store.isAccountSwitched()).toBe(false);
  });
});

describe('退出登录', () => {
  it('通知后端、清理本地用户数据后跳转登录页', async () => {
    setToken('token-a');
    const store = useUserInfoStore();
    await store.getInfoAction();

    await store.logoutAction('/home');

    expect(logout).toHaveBeenCalledTimes(1);
    expect(store.info.role).toBe('');
    expect(store.token).toBe('');
    expect(removePersistedStore).toHaveBeenCalledWith('user');
    expect(jumpToLogout).toHaveBeenCalledWith('/home');
  });

  it('退出接口失败时仍完成退出', async () => {
    vi.mocked(logout).mockRejectedValueOnce(new Error('network'));
    const store = useUserInfoStore();

    await store.logoutAction();

    expect(jumpToLogout).toHaveBeenCalledTimes(1);
  });
});
