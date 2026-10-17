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
import type { ApiResponse, HttpInstanceType } from './types';
import { API_CODE } from '@/constants';
import { useGlobalStore } from '@/store/modules/global';
import { getToken } from '@/utils/auth';
import { redirectToLoginOnce, toFriendlyMessage } from '@/utils/error-handler';

const baseURL = import.meta.env.VITE_BASEURL || window.location.origin;

/** 业务码与 HTTP 状态码共用的未认证码 */
const UNAUTHORIZED_CODE = 401;

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

/** 注入 token 与界面语言 */
function attachHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getToken();
  if (token) config.headers.Authorization = token;
  const locale = currentLocale();
  if (locale) config.headers['Accept-Language'] = locale;
  return config;
}

const isUnauthorized = (code: unknown, config: AxiosRequestConfig | undefined) =>
  String(code) === String(UNAUTHORIZED_CODE) && !config?.skipAuthRedirect;

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

/** 业务码校验：成功原样返回完整响应，失败提示并 reject；401 先清 token 再跳登录 */
async function checkBusinessCode(response: AxiosResponse): Promise<AxiosResponse> {
  await unwrapJsonErrorBlob(response);
  const { data, config, request } = response;
  if (data instanceof Blob) return response;

  const code = data?.code ?? data?.status;
  if (isSuccessCode(code)) return response;

  const message: string = data?.message ?? '';
  if (isUnauthorized(code, config)) redirectToLoginOnce();
  showRequestError(config, message);
  return Promise.reject(new AxiosError(message, 'ERR_ERROR_MODULE', config, request, response));
}

/** HTTP / 网络错误：取消请求直接放行，401 跳登录，其余提示后 reject */
function handleResponseError(error: AxiosError): Promise<never> {
  if (isCancel(error)) return Promise.reject(error);
  if (isUnauthorized(error.response?.status, error.config)) redirectToLoginOnce();
  showRequestError(error.config, error.message);
  return Promise.reject(error);
}

function createInstance(config: CreateAxiosDefaults): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 120000, withCredentials: true, ...config });
  instance.interceptors.request.use(attachHeaders);
  instance.interceptors.response.use(checkBusinessCode, handleResponseError);
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
