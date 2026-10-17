import { createRouterMatcher, START_LOCATION, type RouteRecordRaw, type RouterMatcher } from 'vue-router';
import { resolveDeclaredRoutes } from './declared';
import { AppLayout } from '@/layout/constants';

/**
 * 兜底路由：布局内渲染异常页并保留原 URL。
 * 不进 asyncRoutes、由守卫在权限路由之后单独注册：不参与角色过滤，登录前也不该存在。
 */
export const fallbackRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'Fallback',
  component: AppLayout,
  meta: { hidden: true },
  children: [
    {
      path: '',
      name: 'Exception',
      component: () => import('@/views/exception/index.vue'),
      meta: { title: '异常', hidden: true },
    },
  ],
};

let declaredMatcher: RouterMatcher | undefined;

/**
 * 路径是否命中产品声明过的异步路由：无权限的路由不会注册，落到兜底后需要靠未过滤的全量表
 * 区分「有页面但无权限」（403）与「不存在」（404）。数据源与守卫共用 resolveDeclaredRoutes()，保证两处同源。
 */
export function matchesDeclaredRoute(path: string): boolean {
  declaredMatcher ??= createRouterMatcher(resolveDeclaredRoutes(), {});
  return declaredMatcher.resolve({ path }, START_LOCATION).matched.length > 0;
}
