import PolymasApi, { AuthModule, ErrorModule, LoadingModule } from '@zhs/agent-course-kit/services/base-request';
import { getToken, getZHSUserId } from '@zhs/agent-course-kit/utils/auth';
import { ElMessage } from 'element-plus';
import type { ApiResponse, HttpInstanceType } from './types';
import { API_CODE } from '@/constants';
import { redirectToLoginOnce, toFriendlyMessage } from '@/utils/error-handler';

const baseURL = import.meta.env.VITE_BASEURL || window.location.origin;

/**
 * 请求失败时的统一提示
 *
 * ErrorModule 有两条调用路径，交出来的 msg 语义不同：
 * - 业务码不匹配：msg 是后端 `data.message`，本身就是中文，原样透出；
 * - HTTP / 网络失败：msg 是 axios 的原始英文文案，交给 toFriendlyMessage 翻译。
 * 两种情况都可能为空（后端没给 message），空串不弹提示，避免一个空白的红条。
 */
const showRequestError = (msg: string) => {
  const text = toFriendlyMessage(msg);
  if (text) ElMessage.error(text);
};

/** 401：整体跳 SSO。不传回跳地址，由 jumpToLogin 统一过滤（停在 /403 上时会改取 query.redirect） */
const handleUnauth = () => {
  redirectToLoginOnce();
};

/**
 * 下载接口以 JSON 返回业务错误时，把 Blob 解析成 `{ code, message }` 交给 ErrorModule 校验
 *
 * 只认带 code 且非成功码的 JSON，导出 .json 文件这类正常下载原样放行。
 */
function JsonErrorBlobModule(this: PolymasApi): PolymasApi {
  this.interceptors.response.use(async response => {
    const { data } = response;
    if (!(data instanceof Blob) || !data.type.includes('application/json')) return response;
    try {
      const parsed = JSON.parse(await data.text());
      if (
        parsed &&
        typeof parsed === 'object' &&
        'code' in parsed &&
        String(parsed.code) !== String(API_CODE.SUCCESS)
      ) {
        response.data = parsed;
      }
    } catch {
      // 不是合法 JSON，按文件处理
    }
    return response;
  });
  return this;
}

/**
 * 默认 API 实例
 * - AuthModule：自动注入 token，未认证跳转 SSO
 * - LoadingModule：加载状态管理
 * - JsonErrorBlobModule：调用方传 responseType: 'blob' 时识别 JSON 业务错误
 * - ErrorModule：业务码校验 + 错误提示（必须最后注册）
 *
 * 请求去重统一由 Orval mutator 内的 RequestDeduplicator 负责（GET/HEAD 默认去重，按
 * method+url+params+data 复用在途 Promise，见 core/mutator.ts）。此处不再注册拦截器级去重，
 * 避免两套机制 key 粒度不一致导致「同 url 不同参数的合法并发请求被误取消」。
 */
export const polymasApi = PolymasApi.create({
  baseURL,
  timeout: 120000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
})
  .use(AuthModule, {
    token: () => getToken(),
    unAuthHandler: handleUnauth,
    ZHSUserId: () => getZHSUserId(),
  })
  .use(LoadingModule)
  .use(JsonErrorBlobModule)
  .use(ErrorModule, {
    successfulCode: API_CODE.SUCCESS,
    unauthorizedHandler: handleUnauth,
    toastHandler: showRequestError,
  });

/**
 * 下载专用实例
 * - 120s 超时（与默认实例一致；大文件场景不够时在此调大）
 * - responseType: blob
 * - 配置 AuthModule + JsonErrorBlobModule + ErrorModule
 */
export const downloadApi = PolymasApi.create({
  baseURL,
  timeout: 120000,
  withCredentials: true,
  responseType: 'blob',
})
  .use(AuthModule, {
    token: () => getToken(),
    unAuthHandler: handleUnauth,
    ZHSUserId: () => getZHSUserId(),
  })
  .use(JsonErrorBlobModule)
  .use(ErrorModule, {
    successfulCode: API_CODE.SUCCESS,
    unauthorizedHandler: handleUnauth,
    // 与 polymasApi 共用同一个提示函数，两个实例的文案口径不会漂
    toastHandler: showRequestError,
  });

/**
 * 实例注册表
 * mutator 按 CustomAxiosRequestConfig.instance 的名称从这里取实例
 */
export const instances: Record<HttpInstanceType, any> = {
  default: polymasApi,
  download: downloadApi,
};

// ==================== 便捷函数 ====================
// 绕过 Orval 直接调用时使用，自动提取内层业务数据（与 Orval mutator 的提取语义保持一致）
// 注意：ErrorModule 成功时返回完整 axios response，故 res.data 是 { code, data, message } 包络，
//       业务数据在 res.data.data；这些函数不经过 Orval 类型生成，调用时应显式传入泛型 T

export async function post<T>(url: string, data?: unknown, config = {}): Promise<T> {
  return polymasApi.post(url, data, config).then((res: { data: ApiResponse<T> }) => res.data.data as T);
}

export async function get<T>(url: string, params?: unknown, config = {}): Promise<T> {
  return polymasApi.get(url, { params, ...config }).then((res: { data: ApiResponse<T> }) => res.data.data as T);
}

export async function put<T>(url: string, data?: unknown, config = {}): Promise<T> {
  return polymasApi.put(url, data, config).then((res: { data: ApiResponse<T> }) => res.data.data as T);
}

export async function del<T>(url: string, params?: unknown, config = {}): Promise<T> {
  return polymasApi.delete(url, { params, ...config }).then((res: { data: ApiResponse<T> }) => res.data.data as T);
}
