/**
 * ==================== 覆盖生成 API 示例 ====================
 *
 * 场景：需要在 Orval 生成的 API 基础上添加额外的业务逻辑
 *
 * 使用场景：
 * - 登录成功后需要额外处理（如存储 Token、跳转页面）
 * - 在生成的 API 基础上添加缓存、重试、日志等
 *
 * ⚠️ 注意：
 * - 覆盖时保持函数名和生成的 API 一致
 * - src/api/index.ts 会优先导出 modules 中的覆盖版本
 *
 * 本文件当前是空示例，跑过 pnpm orval 后按下面的形状填。
 */

// 示例：如果需要覆盖某个 API，可以这样做：
//
// import { someApi as generatedSomeApi } from '../generated/some-module/some-module';
// import type { SomeRequest, SomeResponse } from '../generated/model';
//
// export const someApi = async (data: SomeRequest): Promise<SomeResponse> => {
//   const response = await generatedSomeApi(data);
//   // 添加额外的业务逻辑
//   return response;
// };
