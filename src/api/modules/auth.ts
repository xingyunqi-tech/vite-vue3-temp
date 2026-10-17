/**
 * 管理员登录与当前用户接口
 */

import { isAxiosError } from 'axios';
import { Md5 } from 'ts-md5';
import { refreshAccessToken } from '../core/request';
import { getCurrentUser, loginWithEmail, logout as generatedLogout } from '../generated/auth/auth';
import type { User } from '../generated/model';
import { BACKEND_ROLE_ID, ROLES } from '@/constants';
import type { RoleType } from '@/constants';

export interface LoginParams {
  email: string;
  password: string;
}

/** 当前登录用户资料 */
export interface CurrentUser {
  id: number;
  username: string;
  realName: string;
  avatar: string;
  email: string;
  phone: string;
  /** 后端角色为管理员时为 ROLES.ADMIN，其余角色为空 */
  role: RoleType | '';
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: CurrentUser;
}

export function toCurrentUser(user: User | null | undefined): CurrentUser {
  const email = user?.email ?? '';
  const phone = user?.phone ?? '';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  return {
    id: user?.id ?? 0,
    username: email || phone,
    realName: user?.nickname || fullName || email || phone,
    avatar: user?.photo?.path ?? '',
    email,
    phone,
    role: user?.role?.id === BACKEND_ROLE_ID.ADMIN ? ROLES.ADMIN : '',
  };
}

/** 邮箱密码登录，密码按后端约定以 MD5 传输 */
export const login = async ({ email, password }: LoginParams): Promise<LoginResult> => {
  const res = await loginWithEmail(
    { email: email.trim(), password: Md5.hashStr(password) },
    { skipAuthRedirect: true },
  );
  return { token: res?.token ?? '', refreshToken: res?.refreshToken ?? '', user: toCurrentUser(res?.user) };
};

const silent = { isIgnoreToast: true, skipAuthRedirect: true };

const isUnauthorizedError = (error: unknown) =>
  isAxiosError(error) && String(error.response?.data?.code ?? error.response?.status) === '401';

/**
 * 退出登录：当前 token 已过期时先刷新一次再注销，刷新失败时抛出 RefreshTokenError
 *
 * @param token 要注销的会话 token，缺省为当前登录 token
 */
export const logout = async (token?: string): Promise<void> => {
  if (token) return generatedLogout({ ...silent, headers: { Authorization: `Bearer ${token}` } });
  try {
    await generatedLogout(silent);
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;
    const freshToken = await refreshAccessToken();
    await generatedLogout({ ...silent, headers: { Authorization: `Bearer ${freshToken}` } });
  }
};

/** 获取当前登录用户 */
export const getUserInfo = async (): Promise<CurrentUser> => toCurrentUser(await getCurrentUser());
