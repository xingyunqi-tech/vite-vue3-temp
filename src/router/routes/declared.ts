import type { RouteRecordRaw } from 'vue-router';
import { asyncRoutes } from './async';

/**
 * 产品声明过的异步路由全量表，尚未按角色过滤
 *
 * 守卫拿它按角色过滤后注册，兜底页拿它区分 403 与 404，两处同源。
 */
export function resolveDeclaredRoutes(): RouteRecordRaw[] {
  return asyncRoutes;
}
