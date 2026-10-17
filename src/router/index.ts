import { createRouter, createWebHistory, type Router } from 'vue-router';
import { setupRouterGuard } from './guards';
import { routerBase } from './redirect';
import { staticRoutes } from './routes';
import { setupRouterTitle } from './title';

/** 创建应用路由：静态路由 + 守卫 + 标题 */
export function createAppRouter(): Router {
  const router = createRouter({
    history: createWebHistory(routerBase()),
    scrollBehavior: () => ({ top: 0 }),
    routes: [...staticRoutes],
  });

  setupRouterGuard(router);
  setupRouterTitle(router);
  return router;
}
