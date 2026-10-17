import { createApp, type App as VueApp } from 'vue';
import App from './App.vue';
import { setupDirectives } from '@/directives';
import { i18n } from '@/plugins/locale';
import { createAppRouter } from '@/router';
import storePromise, { preloadPersistedData } from '@/store';
import { writeTokenFromAuthQuery } from '@/utils/auth';
import { reportGlobalError, setupGlobalErrorHandler } from '@/utils/error-handler';

/** 默认挂载点 ID */
const DEFAULT_MOUNT_ID = '#main-app';

type Store = Awaited<typeof storePromise>;

export interface AppSetupHooks {
  /** 在 pinia 安装之后、router 安装之前调用（router 安装即发起首次导航），用于注册须早于任何 store 创建的 Pinia 插件 */
  beforeRouter?: (app: VueApp, store: Store) => Promise<void> | void;
  /** 在所有插件 use() 之后、mount 之前调用，可用于注册应用级扩展（全局插件、指令等） */
  beforeMount?: (app: VueApp, store: Store, router: import('vue-router').Router) => Promise<void> | void;
}

/** 创建并挂载 Vue 应用 */
export async function renderApp(hooks: AppSetupHooks = {}): Promise<void> {
  // 必须在路由守卫挂载之前写入，避免守卫读不到 token 误判未登录
  writeTokenFromAuthQuery();

  // 全局错误兜底：默认静默（仅 console 记录）。如需用户通知或接入监控，传入 { notify: true } / { onError }
  setupGlobalErrorHandler();
  await preloadPersistedData();
  const store = await storePromise;

  const app = createApp(App);

  // 组件层未捕获错误的兜底，与 window 层共用 setupGlobalErrorHandler 的选项
  app.config.errorHandler = (error, _instance, info) => reportGlobalError(error, 'vue', info);

  setupDirectives(app);

  app.use(i18n);
  app.use(store);
  await hooks.beforeRouter?.(app, store);
  const router = createAppRouter();
  app.use(router);

  await hooks.beforeMount?.(app, store, router);

  const target = document.querySelector(DEFAULT_MOUNT_ID);
  if (!target) {
    console.error(`[app] mount target ${DEFAULT_MOUNT_ID} not found`);
    return;
  }

  app.mount(target);
}
