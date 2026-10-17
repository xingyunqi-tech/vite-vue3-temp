/**
 * API 核心模块统一导出
 *
 * 仅导出外部消费方需要的公共 API：
 * - PolymasApi 实例（供 Store/View/Custom API 使用）
 * - 便捷请求函数（post/get/put/del）
 * - 实例注册表（mutator 按 config.instance 名称取实例）
 *
 * 不导出的内部实现：
 * - customMutator（仅 Orval 通过文件路径引用）
 * - RequestDeduplicator
 * - ApiResponse、ExtractResult、CustomAxiosRequestConfig 等内部类型
 */

// 导出 PolymasApi 实例和实例注册表
export { polymasApi, downloadApi, instances } from './request';

// 导出便捷请求函数
export { post, get, put, del } from './request';

// 卸载应用时清空在途请求表，供 destroyApp 调用
export { clearPendingRequests } from './mutator';
