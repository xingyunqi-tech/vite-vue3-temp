import type { RouteRecordRaw } from 'vue-router';

/** 子路由全路径：child.path 可能是绝对路径、相对路径或空串（index 子路由） */
export function resolveFullPath(parentPath: string, path: string): string {
  if (path.startsWith('/')) return path;
  if (!path) return parentPath;
  return `${parentPath.replace(/\/+$/, '')}/${path}`;
}

/** 子树中的全路径清单 */
function collectPaths(routes: RouteRecordRaw[], parentPath: string): string[] {
  return routes.flatMap(route => {
    const fullPath = resolveFullPath(parentPath, route.path);
    return [fullPath, ...collectPaths(route.children ?? [], fullPath)];
  });
}

/** 子树中的叶子路径：容器路由自身不算，它可能没有 component、redirect 过去是空白页 */
function collectLeafPaths(routes: RouteRecordRaw[], parentPath: string): string[] {
  return routes.flatMap(route => {
    const fullPath = resolveFullPath(parentPath, route.path);
    const children = route.children ?? [];
    return children.length > 0 ? collectLeafPaths(children, fullPath) : [fullPath];
  });
}

/** 取 redirect 的静态目标路径；具名与函数式 redirect 无法静态解析，返回 undefined 表示不介入 */
function staticRedirectPath(redirect: RouteRecordRaw['redirect']): string | undefined {
  if (typeof redirect === 'string') return redirect;
  if (redirect && typeof redirect === 'object' && 'path' in redirect && typeof redirect.path === 'string') {
    return redirect.path;
  }
  return undefined;
}

/**
 * redirect 指向的子路由被过滤（权限）或禁用（租户覆盖）后，改指向首个仍存活的叶子路径
 *
 * 只介入目标原本属于这棵子树、现已不存在的情况；子树外的目标原样保留。比对时去掉 query 与 hash。
 * 目标可能是孙辈（`/setting` → `/setting/frontend`），故按整棵子树比对而非只看直接子节点。
 * 候选只取叶子并排掉父路由自身：容器路由未必有 component，index 子路由（path 为空串）
 * 解析出来就是父路径、指回自己会形成死循环。带动态参数的路径也要排掉——`/x/:id` 会被
 * 当成字面路径，匹配不上任何路由。没有候选时去掉 redirect，由 index 子路由承接渲染。
 */
export function reviveRedirect(
  route: RouteRecordRaw,
  originalChildren: RouteRecordRaw[],
  children: RouteRecordRaw[],
  fullPath: string,
): RouteRecordRaw['redirect'] {
  const target = staticRedirectPath(route.redirect);
  if (target === undefined) return route.redirect;

  // 指向父路由自身的 redirect 一律改写：index 子路由会让 fullPath 出现在子树清单里，不排掉就会自指栈溢出
  const resolved = resolveFullPath(fullPath, target.replace(/[?#].*$/, ''));
  if (resolved !== fullPath) {
    if (!collectPaths(originalChildren, fullPath).includes(resolved)) return route.redirect;
    if (collectPaths(children, fullPath).includes(resolved)) return route.redirect;
  }

  return collectLeafPaths(children, fullPath).find(path => path !== fullPath && !path.includes(':'));
}
