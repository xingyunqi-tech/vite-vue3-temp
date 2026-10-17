import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { createRouterMatcher, START_LOCATION, type RouteMeta, type RouteRecordRaw } from 'vue-router';
import { menuList } from '@/constants';
import type { MenuItem } from '@/constants';
import { resolveFullPath, reviveRedirect } from '@/router/route-tree';

/**
 * 权限管理 Store
 */
export const usePermissionStore = defineStore('permission', () => {
  // 状态
  const routes = ref<RouteRecordRaw[]>([]);
  const accessMenus = ref<MenuItem[]>([]);
  const isRoutesGenerated = ref(false);

  /**
   * 按角色过滤后的路由匹配器，随 routes 重建
   *
   * 与 routes/fallback.ts 的 matchesDeclaredRoute 是同一套做法，只是数据源不同：
   * 那边问「产品声明过吗」，这边问「当前角色过滤后还留得住吗」。
   */
  const accessMatcher = computed(() => createRouterMatcher(routes.value, {}));

  /** 路径在过滤后的路由表中是否仍可匹配（带参数的动态路径同样适用） */
  const hasAccessibleRoute = (path: string): boolean =>
    accessMatcher.value.resolve({ path }, START_LOCATION).matched.length > 0;

  /**
   * 过滤菜单
   *
   * 内部菜单是否可见由对应路由能否访问决定；外链与禁用项没有路由，按自身 roles 判断。
   * 分组按子项过滤，子项全部被过滤时整组隐藏，避免留下点不动的空分组。
   */
  const filterMenus = (menus: MenuItem[], roles: string[], canAccessPath: (path: string) => boolean): MenuItem[] => {
    const result: MenuItem[] = [];

    menus.forEach(menu => {
      if (menu.hidden) return;

      if (menu.children && menu.children.length > 0) {
        const filteredChildren = filterMenus(menu.children, roles, canAccessPath);
        if (filteredChildren.length === 0) return;
        result.push({ ...menu, children: filteredChildren });
        return;
      }

      if (menu.link || menu.disabled) {
        if (!menu.roles?.length || roles.some(role => menu.roles!.includes(role))) result.push(menu);
        return;
      }

      if (import.meta.env.DEV && menu.roles?.length) {
        console.warn(`[permission] 菜单 "${menu.path}" 的 roles 不生效，可见性由对应路由的 meta.roles 决定`);
      }
      if (canAccessPath(menu.path)) result.push(menu);
    });

    return result;
  };

  /**
   * 根据角色过滤路由
   */
  const filterRoutesByRoles = (routes: RouteRecordRaw[], roles: string[], parentPath = ''): RouteRecordRaw[] => {
    const result: RouteRecordRaw[] = [];

    routes.forEach(route => {
      if (!hasRoutePermission(roles, route)) return;

      const routeCopy = { ...route };
      const fullPath = resolveFullPath(parentPath, route.path);

      const originalChildren = route.children;
      if (originalChildren && originalChildren.length > 0) {
        const filteredChildren = filterRoutesByRoles(originalChildren, roles, fullPath);
        // 父路由仅作为子路由容器：子路由被权限全部过滤后，其 redirect 也会指向已移除的子路由，
        // 保留只会产生 redirect 到不存在路径（落到兜底 404）的空壳路由，故整体跳过（与菜单层 children?.length 防护对齐）
        if (filteredChildren.length === 0) return;
        routeCopy.children = filteredChildren;
        routeCopy.redirect = reviveRedirect(route, originalChildren, filteredChildren, fullPath);
      }

      result.push(routeCopy);
    });

    return result;
  };

  /**
   * 检查是否有路由访问权限（路由配置与守卫里的 to.matched 记录通用）
   */
  const hasRoutePermission = (userRoles: string[], route: { meta?: RouteMeta }): boolean => {
    const routeRoles = route.meta?.roles;

    // 路由未配置 roles，任何人都可访问
    if (!routeRoles || routeRoles.length === 0) {
      return true;
    }

    // 检查用户是否拥有路由要求的任一角色
    return userRoles.some(role => routeRoles.includes(role));
  };

  /**
   * 生成可访问路由
   */
  const generateRoutes = (asyncRoutes: RouteRecordRaw[], roles: string[]): RouteRecordRaw[] => {
    const accessedRoutes = filterRoutesByRoles(asyncRoutes, roles);
    routes.value = accessedRoutes;
    isRoutesGenerated.value = true;
    return accessedRoutes;
  };

  /**
   * 生成可访问菜单，须在权限路由注册之后调用
   *
   * @param canAccessPath 路径能否访问，由路由层提供（见 @/router/guards 的 canAccess）
   */
  const generateMenus = (roles: string[], canAccessPath: (path: string) => boolean): void => {
    accessMenus.value = filterMenus(menuList, roles, canAccessPath);
  };

  /**
   * 重置权限状态
   */
  const resetPermission = () => {
    routes.value = [];
    accessMenus.value = [];
    isRoutesGenerated.value = false;
  };

  return {
    routes,
    accessMenus,
    isRoutesGenerated,
    hasAccessibleRoute,
    hasRoutePermission,
    generateRoutes,
    generateMenus,
    resetPermission,
  };
});
