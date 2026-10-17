export { staticRoutes } from './static';
// asyncRoutes 只经 declared.ts 消费（相对路径）：它是未应用租户覆盖的原始表，
// 直接拿去注册会绕开覆盖，故不从本入口对外导出
export { resolveDeclaredRoutes } from './declared';
export { fallbackRoute, matchesDeclaredRoute } from './fallback';
