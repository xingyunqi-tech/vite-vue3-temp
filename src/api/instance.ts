import axios from 'axios';

const BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;
const TIMEOUT = 10 * 60 * 1000;

/**
 * axios拦截器实例
 */
const instance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  responseType: 'json',
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
});

/**
 * 请求拦截器
 */
instance.interceptors.request.use(
  request => {
    // 默认headers
    const defaultHeaders: any = {};

    // 设置新的参数
    request.headers = { ...request.headers, ...defaultHeaders };

    return request;
  },
  error => {
    return Promise.reject(error);
  },
);

/**
 * 响应拦截器
 */
instance.interceptors.response.use(
  response => {
    const errorCode = response?.data?.rtn;

    switch (errorCode) {
      default:
        break;
    }

    return response;
  },
  async error => {
    const response = error.response;

    // 根据返回的code值来做不同的处理(和后端约定)
    switch (response?.status) {
      case 401:
        // token失效
        break;
      case 403:
        // 没有权限
        break;
      case 404:
        // 地址错误
        break;
      case 500:
        // 服务端错误
        break;
      default:
        break;
    }

    /**
     * 超时重新请求
     */
    const errorConfig = error.config;

    // 再次请求次数,请求间隔时间
    const RETRY_COUNT = errorConfig?.headers?.retryCount ?? 0;
    const RETRY_DELAY = errorConfig?.headers?.retryDelay ?? 1000;

    if (errorConfig && RETRY_COUNT) {
      // 设置用于跟踪重试计数的变量
      errorConfig.retryCount = errorConfig.retryCount || 0;
      // 检查是否已经把重试的总数用完
      if (errorConfig.retryCount >= RETRY_COUNT) {
        return Promise.reject(response || { message: error.message });
      }
      // 增加重试计数
      errorConfig.retryCount++;
      // 创造新的Promise来处理指数后退
      const backOff = new Promise(resolve => {
        setTimeout(() => {
          resolve(null);
        }, RETRY_DELAY);
      });
      // instance重试请求的Promise
      return backOff.then(() => instance(errorConfig));
    }

    return Promise.reject(response || { message: error.message });
  },
);

export default instance;
