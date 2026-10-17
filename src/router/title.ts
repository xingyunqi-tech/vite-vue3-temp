import type { Router } from 'vue-router';
import { APP_TITLE } from '@/constants';
// #if qiankun
import { isInQiankun } from '@/micro/shared/env';
// #endif

/** 统一维护浏览器标题：入口标题-路由标题。 */
export function setupRouterTitle(router: Router): void {
  // #if qiankun
  // 子应用共享宿主 document，由主应用负责浏览器标题。
  if (isInQiankun()) return;

  // #endif
  // 首次导航可能被权限守卫取消，先设置入口标题。
  document.title = APP_TITLE;

  router.afterEach((to, _from, failure) => {
    if (failure) return;
    const routeTitle = to.meta.title?.trim();
    document.title = routeTitle ? `${APP_TITLE}-${routeTitle}` : APP_TITLE;
  });
}
