import type { RouteRecordRaw } from 'vue-router';
import { asyncRoutes } from './async';
// #if overrides
import { routerManager } from '@/plugins/override';
// #endif

let declaredRoutes: RouteRecordRaw[] | undefined;

/**
 * 产品声明过的异步路由全量表：已应用租户覆盖，尚未按角色过滤
 *
 * 守卫拿它按角色过滤后注册，兜底页拿它区分 403 与 404，两处同源。
 * 覆盖必须先于过滤：租户放宽的 meta.roles 才能生效，租户追加的 children 也才受角色约束。
 *
 * 惰性求值：routerManager 的注册发生在 router/index.ts 模块体，晚于本模块加载。
 */
export function resolveDeclaredRoutes(): RouteRecordRaw[] {
  if (!declaredRoutes) {
    const declared: RouteRecordRaw[] = [...asyncRoutes];
    // #if overrides
    // 就地替换而非 let 重赋值：条件块被裁掉后 let 会触发 prefer-const
    declared.splice(0, declared.length, ...routerManager.applyOverrides(declared));
    // #endif
    declaredRoutes = declared;
  }
  return declaredRoutes;
}
