import { PROXY_URI } from '@/constants';
import AxiosInstance from '../instance';

const Dict = {
  login: `${PROXY_URI.API}/login`,
  logout: `${PROXY_URI.API}/logout`,
  getUserInfo: `${PROXY_URI.API}/userinfo`,
} as const;

/**
 * 登录参数接口
 * 用于管理员登录身份验证
 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 登录响应接口
 * 返回登录成功后的令牌信息
 */
export interface LoginResponse {
  /** 访问令牌 */
  token: string;
}

const LoginService = {
  /**
   * 用户登录
   */
  login(data: LoginRequest) {
    return AxiosInstance.post<LoginResponse>(Dict.login, {
      username: data.username,
      password: data.password,
    });
  },

  /**
   * 用户登出
   */
  logout() {
    return AxiosInstance.post(Dict.logout);
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return AxiosInstance.get(Dict.getUserInfo);
  },
};

export default LoginService;
