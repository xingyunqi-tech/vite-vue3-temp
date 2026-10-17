/**
 * Orval 自定义 Mutator
 *
 * 让 Orval 生成的代码使用 PolymasApi 实例发起请求
 * 支持多实例切换和请求去重
 */

import type { AxiosRequestConfig } from 'axios';
import { instances } from './request';
import type { ApiResponse, CustomAxiosRequestConfig, ExtractResult, RequestOptions } from './types';

/**
 * 请求去重管理器
 * 防止短时间内发起相同的请求
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>();

  /**
   * 去重 key
   *
   * 凡是会改变「响应长什么样」的入参都要进 key。responseType 尤其关键：同一个 URL，
   * 一处按 JSON 取、一处按 blob 下载，两次并发只算同一个 key 的话后到的那方会拿到
   * 完全错误的类型。headers 同理（Accept、自定义业务头都会改变返回内容）。
   *
   * 少算字段的方向是危险的（把不同请求错并成一个），多算只是少一次去重，所以宁可写细。
   */
  private generateKey(config: AxiosRequestConfig, instanceName: string): string {
    const { method = 'get', url, params, data, responseType = '', headers } = config;
    if (!url) return '';

    let paramsStr = '';
    if (params) paramsStr = JSON.stringify(params);

    let dataStr = '';
    if (data) {
      if (data instanceof FormData) {
        const parts: string[] = [];
        data.forEach((value, key) => {
          if (value instanceof File) {
            parts.push(`${key}:File(${value.name},${value.size})`);
          } else {
            parts.push(`${key}:${String(value)}`);
          }
        });
        dataStr = parts.join('&');
      } else {
        dataStr = JSON.stringify(data);
      }
    }

    const headersStr = headers ? JSON.stringify(headers) : '';

    return `${instanceName}-${method.toUpperCase()}-${url}-${paramsStr}-${dataStr}-${responseType}-${headersStr}`;
  }

  has(config: AxiosRequestConfig, instanceName: string): boolean {
    return this.pendingRequests.has(this.generateKey(config, instanceName));
  }

  get(config: AxiosRequestConfig, instanceName: string): Promise<unknown> | undefined {
    return this.pendingRequests.get(this.generateKey(config, instanceName));
  }

  /**
   * 登记在途请求，落定后自动摘除
   *
   * 清理用 `then(cleanup, cleanup)` 而非 `finally`：finally 派生的新 Promise 在拒绝时无人接住，
   * 会额外触发一次全局 unhandledrejection。
   */
  set(config: AxiosRequestConfig, instanceName: string, promise: Promise<unknown>): void {
    const key = this.generateKey(config, instanceName);
    this.pendingRequests.set(key, promise);
    const cleanup = () => {
      this.pendingRequests.delete(key);
    };
    promise.then(cleanup, cleanup);
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

const deduplicator = new RequestDeduplicator();

/** 二进制响应：原样返回，不提取业务数据 */
const BINARY_RESPONSE_TYPES = new Set(['blob', 'arraybuffer', 'stream']);

/**
 * Orval 自定义 Mutator
 *
 * 类型说明：
 * - Orval 生成的函数指定 T = ApiResponse<Data>
 * - mutator 自动提取 data 字段并返回 Data 类型
 * - 通过 ExtractResult<T> 类型工具实现类型转换
 *
 * ErrorModule 已确保 code === successfulCode 才走到 resolve 分支，
 * 非成功码已被 reject，因此此处可安全提取 data 字段。
 *
 * 第二个参数让 Orval 给每个生成函数加上可选的最后一个参数，见 RequestOptions。
 */
export const customMutator = async <T>(
  baseConfig: CustomAxiosRequestConfig,
  options?: RequestOptions,
): Promise<ExtractResult<T>> => {
  const config: CustomAxiosRequestConfig = { ...baseConfig, ...options };
  if (baseConfig.headers && options?.headers) config.headers = { ...baseConfig.headers, ...options.headers };
  const {
    method = 'get',
    url,
    data,
    params,
    instance: instanceName = 'default',
    disableDedup = false,
    enableDedup = false,
    ...restConfig
  } = config;

  const requestConfig: AxiosRequestConfig = {
    method,
    url,
    data,
    params,
    ...restConfig,
  };

  // 请求去重：只对幂等的 GET/HEAD 生效。
  // 写方法不去重——两次内容相同的提交往往是用户有意为之（连点、批量循环），
  // 合并掉第二次会静默丢请求；确有需要时由调用方显式传 enableDedup。
  // 带 signal 的请求不参与：共享的在途请求被一方取消，另一方会一起失败
  const isIdempotent = ['get', 'head'].includes(method.toLowerCase());
  const shouldDedup = !disableDedup && !config.signal && (enableDedup || isIdempotent);

  if (shouldDedup && deduplicator.has(requestConfig, instanceName)) {
    const existingRequest = deduplicator.get(requestConfig, instanceName);
    if (existingRequest) {
      return existingRequest as Promise<ExtractResult<T>>;
    }
  }

  // 选择实例
  const api = instances[instanceName];

  if (!api) {
    throw new Error(`HTTP instance "${instanceName}" not found. Available: ${Object.keys(instances).join(', ')}`);
  }

  // 创建请求 Promise
  const requestPromise = (async () => {
    // PolymasApi 继承自 Axios，直接调用 request 方法
    const response = await api.request({
      method: method.toUpperCase(),
      url,
      data,
      params,
      ...restConfig,
    });

    // 按实际响应类型判断：任何 blob 实例都原样返回，不依赖实例名
    if (BINARY_RESPONSE_TYPES.has(response.config?.responseType ?? '')) {
      return response.data as unknown as ExtractResult<T>;
    }

    // ErrorModule 已处理非 200 的情况（reject）
    // 默认实例返回 { code, data, message } 格式，提取 data 字段
    const responseData = (response.data as ApiResponse<any>).data;
    return responseData as ExtractResult<T>;
  })();

  // 添加到去重队列
  if (shouldDedup) {
    deduplicator.set(requestConfig, instanceName, requestPromise);
  }

  return requestPromise;
};

/**
 * 清空所有待处理的请求
 */
export const clearPendingRequests = () => {
  deduplicator.clear();
};

export default customMutator;
