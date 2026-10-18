import type { RouteRecordRaw } from 'vue-router';
import { resolveLandingPath } from '../landing';
import { menuList } from '@/constants';
import { LOGIN_PATH } from '@/constants/system';
import { usePermissionStore } from '@/store/modules/permission';
import { useSiteConfigStore } from '@/store/modules/site-config';

/** 根路径落点。惰性求值：本模块在 Pinia 安装前就被 import，且判定依赖运行时的登录角色 */
function resolveDefaultPage(): string {
  const permissionStore = usePermissionStore();
  return resolveLandingPath(useSiteConfigStore().savedConfig.basic.defaultPage, {
    routesReady: permissionStore.isRoutesGenerated,
    canAccess: permissionStore.hasAccessibleRoute,
    menus: menuList,
  });
}

/** 静态路由：初始注册，无需动态权限。404 不在这里，由守卫注册的 fallbackRoute 承担 */
export const staticRoutes: RouteRecordRaw[] = [
  // 登录页：须在 guards.ts 的 WHITE_LIST 内
  {
    path: LOGIN_PATH,
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  // 全屏 403：守卫在拿不到权限时的落点，须在 guards.ts 的 WHITE_LIST 内
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/exception/Forbidden.vue'),
    meta: { title: '无访问权限' },
  },
  {
    path: '/',
    redirect: resolveDefaultPage,
  },
];
