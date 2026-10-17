import type { RouteRecordRaw } from 'vue-router';
import { matchesDeclaredRoute } from './fallback';
import { DEFAULT_PAGE } from '@/constants/system';
import { AppLayout } from '@/layout/constants';
import { usePermissionStore } from '@/store/modules/permission';
import { useSiteConfigStore } from '@/store/modules/site-config';

/**
 * 配置的默认页，当前角色是否够得着
 *
 * 只拦「产品声明过、却被角色过滤掉」这一种：静态路由与租户自定义路由都不在声明表里，
 * 一律放行以免误伤；权限路由尚未生成时无从判断，同样放行，交给守卫走完整流程。
 */
function canAccessDefaultPage(pathname: string): boolean {
  const permissionStore = usePermissionStore();
  if (!permissionStore.isRoutesGenerated) return true;
  if (!matchesDeclaredRoute(pathname)) return true;
  return permissionStore.hasAccessibleRoute(pathname);
}

/**
 * 根路径落点。写成函数惰性求值：本模块在 Pinia 安装前就被 import，且判定依赖运行时的登录角色
 *
 * 判定要剥掉 query / hash 后再比：`/?tab=1`、`/#top` 都能通过 schema 的 `^/(?!/)`，
 * 但解析回的仍是根路由，原样返回会让 redirect 指向自己，push('/') 直接栈溢出。
 *
 * 落点无权访问时回内置首页：schema 只校验路径形状，管不住「管理员把默认页设成了受限路由」。
 * 不回落的话，无权限角色每次点「返回首页」都会被送回异常页，那个按钮就成了摆设。
 */
function resolveDefaultPage(): string {
  const target = useSiteConfigStore().savedConfig.basic.defaultPage;
  if (!target) return DEFAULT_PAGE;

  const pathname = target.split(/[?#]/)[0].replace(/\/+$/, '');
  if (pathname === '') return DEFAULT_PAGE;
  return canAccessDefaultPage(pathname) ? target : DEFAULT_PAGE;
}

/** 静态路由：初始注册，无需动态权限。404 不在这里，由守卫注册的 fallbackRoute 承担 */
export const staticRoutes: RouteRecordRaw[] = [
  // 全屏 403：守卫在拿不到权限时的落点，须在 guards.ts 的 WHITE_LIST 内
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/exception/Forbidden.vue'),
    meta: { title: '无访问权限' },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: resolveDefaultPage,
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/home/index.vue'),
        meta: {
          title: '首页',
        },
      },
    ],
  },
];
