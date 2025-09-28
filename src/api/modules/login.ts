import { PROXY_URI } from '@/constants';
import type { IResponse } from '@/interface';
import AxiosInstance from '../instance';

const Dict = {
  login: `${PROXY_URI.API}/admin/login`,
  logout: `${PROXY_URI.API}/admin/logout`,
} as const;

/**
 * 登录参数接口
 * 用于管理员登录身份验证
 */
export interface LoginParams {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 登录响应接口
 * 返回登录成功后的令牌信息
 */
export interface LoginResponse extends IResponse {
  /** 访问令牌 */
  token: string;
}

const LoginService = {
  /**
   * 用户登录
   */
  login(username: string, password: string) {
    return AxiosInstance.post<LoginResponse>(Dict.login, {
      username,
      password,
    });
  },

  /**
   * 用户登出
   */
  logout() {
    return AxiosInstance.post<IResponse>(Dict.logout);
  },
};

export default LoginService;
