import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { refreshAccessToken } from '@/api/core/request';
import { getCurrentUser, loginWithEmail, logout as generatedLogout } from '@/api/generated/auth/auth';
import type { User } from '@/api/generated/model';
import { getUserInfo, login, logout, toCurrentUser } from '@/api/modules/auth';

vi.mock('@/api/core/request', () => ({ refreshAccessToken: vi.fn() }));

const unauthorized = () =>
  new AxiosError('Unauthorized', 'ERR', undefined, null, { status: 401, data: { code: 401 } } as AxiosResponse);

vi.mock('@/api/generated/auth/auth', () => ({
  loginWithEmail: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(async () => undefined),
}));

const backendUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    email: 'admin@example.com',
    phone: '13800000000',
    firstName: 'Super',
    lastName: 'Admin',
    nickname: '',
    photo: { id: 'f1', path: 'https://cdn.test/a.png' },
    role: { id: 1, name: 'Admin' },
    ...overrides,
  }) as User;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toCurrentUser', () => {
  it('后端管理员角色映射为 ADMIN', () => {
    expect(toCurrentUser(backendUser())).toEqual({
      id: 1,
      username: 'admin@example.com',
      realName: 'Super Admin',
      avatar: 'https://cdn.test/a.png',
      email: 'admin@example.com',
      phone: '13800000000',
      role: 'ADMIN',
    });
  });

  it('后端编辑与审核员角色分别映射为 EDITOR 与 REVIEWER', () => {
    expect(toCurrentUser(backendUser({ role: { id: 3, name: 'Editor' } })).role).toBe('EDITOR');
    expect(toCurrentUser(backendUser({ role: { id: 4, name: 'Reviewer' } })).role).toBe('REVIEWER');
  });

  it('非后台角色映射为空', () => {
    expect(toCurrentUser(backendUser({ role: { id: 2, name: 'User' } })).role).toBe('');
    expect(toCurrentUser(backendUser({ role: null as never })).role).toBe('');
  });

  it('昵称优先作为显示名', () => {
    expect(toCurrentUser(backendUser({ nickname: '运营' })).realName).toBe('运营');
  });

  it('空用户返回空资料', () => {
    expect(toCurrentUser(undefined)).toMatchObject({ id: 0, username: '', role: '' });
  });
});

describe('login', () => {
  it('密码以 MD5 传输，401 不跳登录页', async () => {
    vi.mocked(loginWithEmail).mockResolvedValueOnce({
      token: 't',
      refreshToken: 'r',
      tokenExpires: 0,
      user: backendUser(),
    });

    const result = await login({ email: ' admin@example.com ', password: 'Secret00' });

    expect(loginWithEmail).toHaveBeenCalledWith(
      { email: 'admin@example.com', password: '1ea87b5f0f0aedab6ddb118c167efd6d' },
      { skipAuthRedirect: true },
    );
    expect(result).toMatchObject({ token: 't', refreshToken: 'r', user: { role: 'ADMIN' } });
  });
});

describe('logout', () => {
  it('指定 token 时以该 token 注销', async () => {
    await logout('t-1');
    expect(generatedLogout).toHaveBeenCalledWith({
      isIgnoreToast: true,
      skipAuthRedirect: true,
      headers: { Authorization: 'Bearer t-1' },
    });
  });

  it('缺省时使用当前登录 token', async () => {
    await logout();
    expect(generatedLogout).toHaveBeenCalledWith({ isIgnoreToast: true, skipAuthRedirect: true });
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('当前 token 401 时刷新一次后用新 token 注销', async () => {
    vi.mocked(generatedLogout).mockRejectedValueOnce(unauthorized());
    vi.mocked(refreshAccessToken).mockResolvedValueOnce('t-new');

    await logout();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(generatedLogout).toHaveBeenLastCalledWith({
      isIgnoreToast: true,
      skipAuthRedirect: true,
      headers: { Authorization: 'Bearer t-new' },
    });
  });

  it('刷新失败时抛出且不再调用注销', async () => {
    vi.mocked(generatedLogout).mockRejectedValueOnce(unauthorized());
    vi.mocked(refreshAccessToken).mockRejectedValueOnce(new Error('expired'));

    await expect(logout()).rejects.toThrow('expired');
    expect(generatedLogout).toHaveBeenCalledTimes(1);
  });

  it('非 401 错误不刷新', async () => {
    vi.mocked(generatedLogout).mockRejectedValueOnce(
      new AxiosError('boom', 'ERR', undefined, null, {
        status: 500,
        data: { code: 500 },
      } as AxiosResponse),
    );

    await expect(logout()).rejects.toThrow('boom');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});

describe('getUserInfo', () => {
  it('返回映射后的当前用户', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(backendUser({ role: { id: 2, name: 'User' } }));
    await expect(getUserInfo()).resolves.toMatchObject({ id: 1, role: '' });
  });
});
