/**
 * ==================== API 模块统一导出 ====================
 *
 * 本文件仅导出公共 API，内部实现细节不对外暴露
 *
 * 导出内容：
 * - API 调用函数：postAuthLogin, getAuthUserInfo 等
 * - 自定义工具函数：uploadWithProgress, downloadFile 等
 * - 公共类型定义：LoginRequest, LoginResponse, UserInfo
 *
 * 使用指南：
 * - API 函数：import { postAuthLogin } from '@/api'
 * - 类型定义：import type { LoginRequest } from '@/api'
 */

/**
 * ==================== 导出策略 ====================
 *
 * 1. 优先导出 model 中的类型定义 (接口、枚举等)
 * 2. 导出各模块的 API 函数 (只导出函数,不导出 *Result 类型别名)
 * 3. 导出自定义扩展和工具函数
 *
 * 为什么这样做：
 * - model 中的接口 (如 UploadCertificateResult) 是后端返回的数据结构
 * - API 模块中的类型别名 (如 UploadCertificateResult) 是整个响应的类型
 * - 两者同名但不同,会导致 TypeScript 报错,因此只导出函数
 */

// 1. HTTP 客户端与便捷请求函数
// 绕过 Orval 直接发请求时从这里取，消费方无需知道 core/ 的内部结构
export * from './core';

// 3. 自定义工具函数 (自动扫描 modules 目录)
export * from './modules/platform';
export * from './modules/override';
