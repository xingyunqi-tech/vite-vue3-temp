import type { MenuItem } from '@/constants';
import { DEFAULT_PAGE } from '@/constants/system';

export interface LandingOptions {
  /** 权限路由是否已生成；未生成时无从判断权限，由守卫生成后重走一次 */
  routesReady: boolean;
  /** 路径（不含 query / hash）在当前角色下是否可访问 */
  canAccess: (pathname: string) => boolean;
  /** 菜单配置，候选页都不可访问时按顺序取第一个可访问的菜单页 */
  menus: MenuItem[];
}

const toPathname = (target: string) => target.split(/[?#]/)[0].replace(/\/+$/, '');

/** 菜单中第一个可访问的页面路径，跳过隐藏、禁用与外链项 */
export function firstAccessibleMenuPath(
  menus: MenuItem[],
  canAccess: (pathname: string) => boolean,
): string | undefined {
  for (const menu of menus) {
    if (menu.hidden || menu.disabled || menu.link) continue;
    if (menu.children?.length) {
      const found = firstAccessibleMenuPath(menu.children, canAccess);
      if (found) return found;
    } else if (canAccess(menu.path)) {
      return menu.path;
    }
  }
  return undefined;
}

/**
 * 根路径落点：站点配置的默认页 → 内置默认页 → 第一个可访问的菜单页
 *
 * 根路径自身不作为落点，否则 redirect 指回自己。都不可访问时返回内置默认页，由兜底路由展示无权限。
 */
export function resolveLandingPath(configured: string | undefined, options: LandingOptions): string {
  const candidates = [configured, DEFAULT_PAGE].filter(
    (target): target is string => !!target && toPathname(target) !== '',
  );
  if (!options.routesReady) return candidates[0] ?? DEFAULT_PAGE;

  const accessible = candidates.find(target => options.canAccess(toPathname(target)));
  return accessible ?? firstAccessibleMenuPath(options.menus, options.canAccess) ?? DEFAULT_PAGE;
}
