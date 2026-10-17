import type { RouteRecordRaw, Router } from 'vue-router';
import { reviveRedirect } from '@/router/route-tree';

type RouteComponent = RouteRecordRaw['component'];

/** 路由覆盖值：可以是组件（向后兼容）或部分路由配置 */
type RouteOverride = RouteComponent | Partial<RouteRecordRaw>;

export interface CustomRouteConfig {
  /** 新增路由（通过 router.addRoute 注册；配了 meta.roles 由路由守卫校验） */
  customRoutes?: RouteRecordRaw[];
  /**
   * 追加到路由白名单的路径（无需登录即可访问）
   * 适用于定制项目新增的免登录页面
   */
  whiteList?: string[];
  /**
   * 路径 → 组件或部分路由配置，替换/合并已有路由
   *
   * **必须使用全路径**（如 `/home`、`/setting/account`）
   *
   * 值类型：
   * - 组件：仅替换该路由的 component（如 `() => import('./MyPage.vue')`）
   * - 部分路由配置：浅合并到原路由（如 `{ component, meta: { title: '新标题' } }`）
   *   其中 children 为追加模式，不会覆盖原有子路由；meta 逐 key 合并，
   *   只写 title 的覆盖不会连带抹掉 `meta.roles`
   */
  overrideRoutes?: Record<string, RouteOverride>;
  /**
   * 按路径禁用路由（匹配的路由将被过滤）
   *
   * 必须使用全路径（如 `/setting/theme`）
   * 禁用父路由会同时移除其所有子路由
   */
  disabledRoutes?: string[];
}

/**
 * 拼接父路径和子路径，生成完整路径
 */
function resolveFullPath(parentPath: string, childPath: string): string {
  if (childPath.startsWith('/')) return childPath;
  if (!parentPath || parentPath === '/') return `/${childPath}`;
  return childPath ? `${parentPath}/${childPath}` : parentPath;
}

/** 组件对象的特征键：SFC 编译产物 / 手写组件选项一定命中其中之一 */
const COMPONENT_KEYS = ['setup', 'render', 'template', '__name', '__file'];

/** 路由配置对象的特征键：RouteRecordRaw 的全部字段 */
const ROUTE_KEYS = [
  'path',
  'name',
  'component',
  'components',
  'redirect',
  'children',
  'meta',
  'alias',
  'beforeEnter',
  'props',
  'end',
  'sensitive',
  'strict',
];

/**
 * 判断值是否为组件
 *
 * - 函数 → 懒加载组件（() => import(...)）或函数式组件
 * - 对象含组件特征键 → 组件选项对象（含直接导入的 SFC）
 */
function isComponentValue(value: RouteOverride): boolean {
  if (typeof value === 'function') return true;
  if (typeof value !== 'object' || value === null) return false;
  return COMPONENT_KEYS.some(key => key in value);
}

/**
 * 判断值是否为路由配置对象（Partial<RouteRecordRaw>）
 *
 * 先排除组件再看路由特征键：`name` 同时是路由字段和组件字段（`defineOptions({ name })` 会编译进产物）。
 */
function isRouteConfig(value: RouteOverride): value is Partial<RouteRecordRaw> {
  if (typeof value !== 'object' || value === null) return false;
  if (isComponentValue(value)) return false;
  return ROUTE_KEYS.some(key => key in value);
}

/**
 * DEV：覆盖把 meta.roles 从「有」变成「无 / 空数组」时提示一次
 *
 * 失去角色约束的路由对所有已登录用户开放，提示用于确认这是有意放宽而非误伤。
 */
function warnRolesCleared(fullPath: string, before: unknown, after: unknown): void {
  const hadRoles = Array.isArray(before) && before.length > 0;
  const hasRoles = Array.isArray(after) && after.length > 0;
  if (!hadRoles || hasRoles) return;
  console.warn(`[Override] 路由 "${fullPath}" 的覆盖清空了 meta.roles，该路由将对任何已登录用户开放。`);
}

/**
 * 路由覆盖管理器
 * 支持新增路由、替换已有路由的组件/属性、禁用路由
 */
class RouterManager {
  private customRoutes: RouteRecordRaw[] = [];
  private overrideRoutes = new Map<string, RouteOverride>();
  private disabledRoutes = new Set<string>();
  private extraWhiteList: string[] = [];
  /** DEV: 记录已匹配的覆盖路径，用于 warnUnmatched 检测 */
  private consumedPaths = import.meta.env.DEV ? new Set<string>() : null;

  /** 注册路由配置 */
  register(config: CustomRouteConfig): void {
    if (config.customRoutes) {
      this.customRoutes.push(...config.customRoutes);
    }
    if (config.whiteList) {
      this.extraWhiteList.push(...config.whiteList);
    }
    if (config.overrideRoutes) {
      Object.entries(config.overrideRoutes).forEach(([path, override]) => {
        this.overrideRoutes.set(path, override);
      });
    }
    if (config.disabledRoutes) {
      config.disabledRoutes.forEach(path => this.disabledRoutes.add(path));
    }
  }

  /** 获取定制项目追加的白名单路径 */
  getWhiteList(): string[] {
    return this.extraWhiteList;
  }

  /** 递归替换路由组件/属性，使用全路径匹配（不修改原始路由对象） */
  applyOverrides(routes: RouteRecordRaw[], parentPath = ''): RouteRecordRaw[] {
    return routes
      .filter(route => {
        const fullPath = resolveFullPath(parentPath, route.path);
        return !this.disabledRoutes.has(fullPath);
      })
      .map(route => {
        const fullPath = resolveFullPath(parentPath, route.path);
        // 空 path 的子路由与父路由全路径相同，覆盖只作用于外层那条
        const override = route.path === '' ? undefined : this.overrideRoutes.get(fullPath);

        // 始终浅拷贝，避免修改原始路由对象（HMR / 多次调用安全）
        const newRoute: RouteRecordRaw = { ...route };

        if (override) {
          this.consumedPaths?.add(fullPath);

          if (isRouteConfig(override)) {
            // 值为部分路由配置时，浅合并
            const { children: overrideChildren, meta: overrideMeta, ...rest } = override;
            Object.assign(newRoute, rest);
            // meta 逐 key 合并：整体替换会让只改 title 的覆盖把 meta.roles 一并抹掉，
            // 而缺少 roles 的路由对任何已登录用户开放（见 permission store 的 hasRoutePermission）
            if (overrideMeta) {
              newRoute.meta = { ...route.meta, ...overrideMeta };
              if (import.meta.env.DEV) warnRolesCleared(fullPath, route.meta?.roles, newRoute.meta.roles);
            }
            // 追加 override 的 children 到已有 children
            if (overrideChildren?.length) {
              newRoute.children = [...(route.children || []), ...overrideChildren] as RouteRecordRaw[];
            }
          } else {
            // 值为组件时，仅替换 component
            (newRoute as RouteRecordRaw & { component: RouteComponent }).component = override;
          }
        }

        if (newRoute.children?.length) {
          const originalChildren = newRoute.children;
          newRoute.children = this.applyOverrides(originalChildren, fullPath);
          // 子路由被禁用后 redirect 可能指向已不存在的路径
          if (newRoute.redirect) {
            newRoute.redirect = reviveRedirect(newRoute, originalChildren, newRoute.children, fullPath);
          }
        }

        return newRoute;
      });
  }

  /** 将自定义路由添加到 router */
  addCustomRoutes(router: Router): void {
    this.customRoutes.forEach(route => {
      // customRoutes 通过 addRoute 直接注册，不经过 filterRoutesByRoles 权限过滤。
      // 开发环境提醒：未配置 meta.roles 的自定义路由对任何已登录用户开放，
      // 定制项目如需限制访问，必须在 customRoutes 中显式配置 meta.roles。
      if (import.meta.env.DEV && !route.meta?.roles) {
        console.warn(
          `[Override] 自定义路由 "${String(route.path)}" 未配置 meta.roles，不受权限过滤，任何已登录用户均可访问。`,
        );
      }
      router.addRoute(route);
    });
  }

  /** 开发环境：警告未匹配的路由覆盖 */
  warnUnmatched(): void {
    if (!this.consumedPaths) return;
    for (const path of this.overrideRoutes.keys()) {
      if (!this.consumedPaths.has(path)) {
        console.warn(`[Override] Route override "${path}" did not match any route.`);
      }
    }
  }
}

export const routerManager = new RouterManager();
