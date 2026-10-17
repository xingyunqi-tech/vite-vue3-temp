/**
 * 登录与当前用户接口
 *
 * 路径与字段为约定形态，接入真实后端时按接口文档调整。
 */

import { get, post } from '../core/request';
import type { RoleType } from '@/constants';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
}

/** 当前登录用户资料 */
export interface CurrentUser {
  id: number;
  username: string;
  realName: string;
  avatar: string;
  email: string;
  phone: string;
  /** 系统角色，取值见 @/constants 的 ROLES */
  role: RoleType;
}

/** 账号密码登录 */
export const login = (params: LoginParams) => post<LoginResult>('/api/auth/login', params, { skipAuthRedirect: true });

/** 退出登录 */
export const logout = () => post<void>('/api/auth/logout', undefined, { isIgnoreToast: true, skipAuthRedirect: true });

/** 获取当前登录用户 */
export const getUserInfo = () => get<CurrentUser>('/api/auth/current-user');
