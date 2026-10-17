import axios, {
  AxiosError,
  isCancel,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ElMessage } from 'element-plus';
import { getActivePinia } from 'pinia';
import type { RefreshResponseDto } from '../generated/model';
import type { ApiResponse, HttpInstanceType } from './types';
import { API_CODE } from '@/constants';
import { useGlobalStore } from '@/store/modules/global';
import { getRefreshToken, getToken, setRefreshToken, setToken } from '@/utils/auth';
import { redirectToLoginOnce, toFriendlyMessage } from '@/utils/error-handler';

const baseURL = import.meta.env.VITE_BASEURL || window.location.origin;

/** 业务码与 HTTP 状态码共用的未认证码 */
const UNAUTHORIZED_CODE = 401;

export const REFRESH_TOKEN_URL = '/api/v1/auth/refresh';

const bearer = (token: string) => `Bearer ${token}`;

const isSuccessCode = (code: unknown) => String(code) === String(API_CODE.SUCCESS);

/**
 * 请求失败时的统一提示
 *
 * 业务码不匹配时 msg 是后端 `message`，原样透出；HTTP / 网络失败时是 axios 的英文文案，交给 toFriendlyMessage 翻译。
 * 空串不弹提示。
 */
const showRequestError = (config: AxiosRequestConfig | undefined, msg: string) => {
  if (config?.isIgnoreToast) return;
  const text = toFriendlyMessage(msg);
  if (text) ElMessage.error(text);
};

/** 当前界面语言：Pinia 已安装时取用户选择，否则取 html[lang] */
function currentLocale(): string | null {
  if (getActivePinia()) return useGlobalStore().currentLocale;
  return document.documentElement.getAttribute('lang');
}

/** 注入 token 与界面语言；已显式指定 Authorization 的请求保持不变 */
function attachHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = bearer(token);
  const locale = currentLocale();
  if (locale) config.headers['Accept-Language'] = locale;
  return config;
}

const isUnauthorized = (code: unknown, config: AxiosRequestConfig | undefined) =>
  String(code) === String(UNAUTHORIZED_CODE) && !config?.skipAuthRedirect;

let refreshing: Promise<string> | null = null;

/** 刷新登录 token 失败；expired 为 true 表示登录态已失效 */
export class RefreshTokenError extends Error {
  constructor(
    readonly expired: boolean,
    message = '登录凭证刷新失败',
  ) {
    super(message);
    this.name = 'RefreshTokenError';
  }
}

const isAuthRejected = (error: unknown) => {
  if (!(error instanceof AxiosError)) return false;
  const code = String(error.response?.data?.code ?? error.response?.status);
  return code === '401' || code === '403';
};

async function requestNewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new RefreshTokenError(true);
  try {
    const res = await httpApi.post<ApiResponse<RefreshResponseDto>>(REFRESH_TOKEN_URL, undefined, {
      headers: { Authorization: bearer(refreshToken) },
      skipAuthRedirect: true,
      isIgnoreToast: true,
    });
    const tokens = res.data.data;
    if (!tokens?.token) throw new RefreshTokenError(false);
    setToken(tokens.token);
    setRefreshToken(tokens.refreshToken);
    return tokens.token;
  } catch (error) {
    if (error instanceof RefreshTokenError) throw error;
    const current = getToken();
    const rotated = getRefreshToken();
    if (current && rotated && rotated !== refreshToken) return current;
    throw new RefreshTokenError(isAuthRejected(error), error instanceof Error ? error.message : undefined);
  }
}

/** 用刷新 token 换取新的登录 token，并发请求共用同一次刷新；失败时抛出 RefreshTokenError */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= requestNewAccessToken().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** 401 时用当前或刷新后的 token 重放原请求，每个请求只重放一次 */
async function replayWithFreshToken(
  instance: AxiosInstance,
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> {
  if (config.authRetried) throw new RefreshTokenError(true);
  const current = getToken();
  const token = current && config.headers.Authorization !== bearer(current) ? current : await refreshAccessToken();
  config.authRetried = true;
  config.headers.Authorization = bearer(token);
  return instance.request(config);
}

async function handleUnauthorized(
  instance: AxiosInstance,
  config: InternalAxiosRequestConfig,
  message: string,
  error: unknown,
): Promise<AxiosResponse> {
  try {
    return await replayWithFreshToken(instance, config);
  } catch (refreshError) {
    if (!(refreshError instanceof RefreshTokenError)) throw refreshError;
    if (refreshError.expired) {
      redirectToLoginOnce();
      showRequestError(config, message);
    } else {
      showRequestError(config, refreshError.message);
    }
    throw error;
  }
}

/**
 * 下载请求以 JSON 返回业务错误时，把 Blob 解析成 `{ code, message }` 交给业务码校验
 *
 * 只认带 code 且非成功码的 JSON，导出 .json 文件这类正常下载原样放行。
 */
async function unwrapJsonErrorBlob(response: AxiosResponse): Promise<void> {
  const { data } = response;
  if (!(data instanceof Blob) || !data.type.includes('application/json')) return;
  try {
    const parsed = JSON.parse(await data.text());
    if (parsed && typeof parsed === 'object' && 'code' in parsed && !isSuccessCode(parsed.code)) {
      response.data = parsed;
    }
  } catch {
    // 不是合法 JSON，按文件处理
  }
}

/** 业务码校验，失败时提示并 reject */
async function checkBusinessCode(instance: AxiosInstance, response: AxiosResponse): Promise<AxiosResponse> {
  await unwrapJsonErrorBlob(response);
  const { data, config, request } = response;
  if (data instanceof Blob) return response;

  const code = data?.code ?? data?.status;
  if (isSuccessCode(code)) return response;

  const message: string = data?.message ?? '';
  const error = new AxiosError(message, 'ERR_ERROR_MODULE', config, request, response);
  if (isUnauthorized(code, config)) return handleUnauthorized(instance, config, message, error);
  showRequestError(config, message);
  return Promise.reject(error);
}

/** HTTP / 网络错误：取消请求直接放行，其余提示后 reject */
async function handleResponseError(instance: AxiosInstance, error: AxiosError): Promise<AxiosResponse> {
  if (isCancel(error)) return Promise.reject(error);
  if (error.config && isUnauthorized(error.response?.status, error.config)) {
    return handleUnauthorized(instance, error.config, error.message, error);
  }
  showRequestError(error.config, error.message);
  return Promise.reject(error);
}

function createInstance(config: CreateAxiosDefaults): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 120000, withCredentials: true, ...config });
  instance.interceptors.request.use(attachHeaders);
  instance.interceptors.response.use(
    response => checkBusinessCode(instance, response),
    error => handleResponseError(instance, error),
  );
  return instance;
}

/** 默认 API 实例：成功时返回完整 axios response，res.data 为 `{ code, data, message }` */
export const httpApi = createInstance({
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
});

/** 下载专用实例：responseType 为 blob */
export const downloadApi = createInstance({ responseType: 'blob' });

/**
 * 实例注册表
 * mutator 按 CustomAxiosRequestConfig.instance 的名称从这里取实例
 */
export const instances: Record<HttpInstanceType, AxiosInstance> = {
  default: httpApi,
  download: downloadApi,
};

// ==================== 便捷函数 ====================
// 绕过 Orval 直接调用时使用，返回 res.data.data（与 Orval mutator 的提取语义一致），调用时应显式传入泛型 T

export async function post<T>(url: string, data?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
  const res = await httpApi.post<ApiResponse<T>>(url, data, config);
  return res.data.data as T;
}

export async function get<T>(url: string, params?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
  const res = await httpApi.get<ApiResponse<T>>(url, { params, ...config });
  return res.data.data as T;
}

export async function put<T>(url: string, data?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
  const res = await httpApi.put<ApiResponse<T>>(url, data, config);
  return res.data.data as T;
}

export async function del<T>(url: string, params?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
  const res = await httpApi.delete<ApiResponse<T>>(url, { params, ...config });
  return res.data.data as T;
}
