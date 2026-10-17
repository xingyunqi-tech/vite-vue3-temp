/**
 * API 层核心类型定义
 */

import type { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 失败时不弹错误提示（请求层拦截器读取），用于轮询、静默上报等 */
    isIgnoreToast?: boolean;
    /** 401 时不清 token、不跳登录页，用于登录接口本身 */
    skipAuthRedirect?: boolean;
    /** 已用刷新后的 token 重放过，再次 401 不再刷新 */
    authRetried?: boolean;
  }
}

/**
 * API 响应通用接口
 */
export interface ApiResponse<T = any> {
  /** 响应码，200 表示成功 */
  code: number;
  /** 响应数据 */
  data?: T;
  /** 响应消息 */
  message: string;
  /** 响应时间戳 */
  timestamp?: number;
}

/**
 * 提取响应对象中的 data 字段类型
 * - 如果 T 是 ApiResponse<R>，则返回 R
 * - 如果 T 有 data 属性，则返回 data 的类型
 * - 否则返回 T
 */
export type ExtractResult<T> = T extends ApiResponse<infer R> ? R : T extends { data?: infer D } ? D : T;

/**
 * 扩展的请求配置
 * 支持指定使用哪个实例和请求去重配置
 */
export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  /** 指定使用的实例名称 */
  instance?: HttpInstanceType;
  /** 禁用请求去重（GET/HEAD 默认启用去重，用此项关闭） */
  disableDedup?: boolean;
  /** 为写方法（POST/PUT/PATCH/DELETE）开启去重，默认关闭 */
  enableDedup?: boolean;
}

/**
 * 单次请求参数：Orval 生成函数的最后一个可选参数，合并进本次请求
 *
 * 不含 params / data：它们由生成函数的前几个参数给出，放在这里会把生成代码的那份整体覆盖掉。
 *
 * @example getUserList(params, { signal: controller.signal, isIgnoreToast: true })
 */
export type RequestOptions = Omit<CustomAxiosRequestConfig, 'url' | 'method' | 'params' | 'data'>;

/** 请求实例名称 */
export type HttpInstanceType = 'default' | 'download';
