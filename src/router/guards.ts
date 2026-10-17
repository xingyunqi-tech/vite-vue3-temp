import type { RouteLocationNormalized, RouteRecordRaw, Router } from 'vue-router';
import {
  EXCEPTION_QUERY,
  FORBIDDEN_PATH,
  FORBIDDEN_REASON,
  readSafeRedirect,
  resolveLoginReturnPath,
  type ForbiddenReason,
} from './redirect';
import { fallbackRoute, resolveDeclaredRoutes } from './routes';
import { LOGIN_PATH } from '@/constants';
import { usePermissionStore } from '@/store/modules/permission';
import { useUserInfoStore } from '@/store/modules/user-info';

/** 免登录路径：登录页，以及「token 有效但拿不到权限」时的落点全屏 403 */
const WHITE_LIST = [LOGIN_PATH, FORBIDDEN_PATH];

function isWhiteListed(path: string): boolean {
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return WHITE_LIST.includes(normalized);
}

/** 带上原因与原目标：异常页据 reason 决定动作，据 redirect 决定之后回到哪里，而不是原地落回 /403 */
function toForbidden(reason: ForbiddenReason, to: RouteLocationNormalized) {
  return {
    path: FORBIDDEN_PATH,
    query: { [EXCEPTION_QUERY.REASON]: reason, [EXCEPTION_QUERY.REDIRECT]: to.fullPath },
    replace: true,
  };
}

/** 已注册路由但角色不够：落到布局内异常页，地址栏保留原路径 */
function toException(to: RouteLocationNormalized) {
  return {
    name: 'Exception',
    params: { pathMatch: to.path.split('/').slice(1).map(decodeURIComponent) },
    query: to.query,
    hash: to.hash,
  };
}

/**
 * 路径对给定角色是否可访问：命中已注册的真实路由（不是兜底），且每一层 meta.roles 都满足
 *
 * 菜单与设置页导航按它决定是否显示，权限只在路由上声明一处。
 */
export function canAccess(router: Router, path: string, roles: string[]): boolean {
  const { matched } = router.resolve(path);
  if (matched.length === 0 || matched[0].name === fallbackRoute.name) return false;
  const { hasRoutePermission } = usePermissionStore();
  return matched.every(record => hasRoutePermission(roles, record));
}

/**
 * 同步登录态 → 登录页 → 白名单 → 未登录跳登录页 → 权限路由已生成 → 首次生成（拉用户信息 → 过滤 → addRoute → 兜底 → 重导航）
 */
export function setupRouterGuard(router: Router) {
  router.beforeEach(async to => {
    const userStore = useUserInfoStore();
    const permissionStore = usePermissionStore();

    // 登录态真源是 Cookie，每次导航重新读取并同步到 store：白名单路径也要同步，
    // 全屏 403 之类的免登录页同样会读 store 里的登录态镜像
    const hasToken = userStore.refreshToken();

    // 已登录访问登录页：回到它带的目标页
    if (to.path === LOGIN_PATH && hasToken) return resolveLoginReturnPath(readSafeRedirect(to.query) ?? '/');

    if (isWhiteListed(to.path)) return true;

    if (!hasToken) {
      // 经过 redirect 的取原地址：默认页要等登录后按角色判定
      const redirect = resolveLoginReturnPath(to.redirectedFrom?.fullPath ?? to.fullPath);
      return { path: LOGIN_PATH, query: redirect === '/' ? {} : { [EXCEPTION_QUERY.REDIRECT]: redirect } };
    }

    if (permissionStore.isRoutesGenerated) {
      // 菜单、路由与各 Store 都属于旧账号，逐项清理容易漏，整页刷新按新账号重新初始化
      if (userStore.isAccountSwitched()) {
        window.location.reload();
        return false;
      }
      // 静态路由不经 generateRoutes 过滤，meta.roles 在这里逐层校验
      const roles = [userStore.info.role];
      return to.matched.every(record => permissionStore.hasRoutePermission(roles, record)) || toException(to);
    }

    try {
      await userStore.getInfoAction();
      const role = userStore.info.role;
      if (!role) {
        console.warn('[guard] 无法确定用户角色，跳转 403');
        return toForbidden(FORBIDDEN_REASON.NO_ROLE, to);
      }

      const accessRoutes: RouteRecordRaw[] = permissionStore.generateRoutes(resolveDeclaredRoutes(), [role]);
      accessRoutes.forEach(route => router.addRoute(route));
      // 兜底最后注册：无权限与不存在的路径都落到布局内异常页
      router.addRoute(fallbackRoute);
      permissionStore.generateMenus([role], path => canAccess(router, path, [role]));

      // replace 避免后退回到路由未生成的状态；展开 to 保留 query/params。
      // 经过 redirect 的从原地址重走：redirect 函数要在路由生成后才能按角色判定落点
      const origin = to.redirectedFrom;
      if (origin) return { path: origin.path, query: origin.query, hash: origin.hash, replace: true };
      return { ...to, replace: true };
    } catch (error) {
      console.error('获取权限失败:', error);
      // 重置生成标记，异常页「重试」时会重新走本流程
      permissionStore.resetPermission();
      return toForbidden(FORBIDDEN_REASON.FETCH_FAILED, to);
    }
  });
}
