import { createRouter, createWebHistory, type RouteRecordRaw, type Router } from 'vue-router';
import { setupRouterGuard } from './guards';
import { routerBase } from './redirect';
import { staticRoutes } from './routes';
import { setupRouterTitle } from './title';
// #if overrides
import { customRoutes } from '@/overrides';
import { routerManager } from '@/plugins/override';
// #endif

// #if overrides
routerManager.register(customRoutes);
// #endif

/**
 * 工厂而非模块级单例：被宿主嵌入时 base 在 mount(props) 才注入，且反复 mount/unmount 需要全新历史栈
 */
export function createAppRouter(): Router {
  const routes: RouteRecordRaw[] = [...staticRoutes];
  // #if overrides
  // 就地替换而非 let 重赋值：条件块被裁掉后 let 会触发 prefer-const
  routes.splice(0, routes.length, ...routerManager.applyOverrides(routes));
  // #endif

  const router = createRouter({
    history: createWebHistory(routerBase()),
    scrollBehavior: () => ({ top: 0 }),
    routes,
  });

  // #if overrides
  routerManager.addCustomRoutes(router);
  // #endif

  setupRouterGuard(router);
  setupRouterTitle(router);
  return router;
}
