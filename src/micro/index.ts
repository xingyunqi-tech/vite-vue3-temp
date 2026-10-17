import { renderWithQiankun } from 'vite-plugin-qiankun/dist/helper';
import { AS_GUEST, isInQiankun } from './shared/env';
import type { AppDestroyer, AppRenderer } from './shared/types';

interface BootstrapOptions {
  /** 渲染 Vue 应用 */
  render: AppRenderer;
  /** 销毁 Vue 应用 */
  destroy: AppDestroyer;
}

/**
 * 应用启动分发器
 *
 * - GUEST 且处于 qiankun 容器：仅注册生命周期，等待父级调用 mount
 * - 其它情况：立即渲染（独立访问 / 独立部署）；容器内却没开 GUEST 属宿主误配，告警后仍按独立模式渲染
 *
 * HOST 能力通过直接 import manager API 使用，与本函数正交。
 */
export function bootstrapApp(options: BootstrapOptions): void {
  const { render, destroy } = options;

  if (AS_GUEST && isInQiankun()) {
    renderWithQiankun({
      bootstrap: async () => {
        // 一次性初始化（如有需要可在此注册全局插件）
      },
      mount: async props => {
        await render(props);
      },
      unmount: async props => {
        await destroy(props);
      },
      // qiankun 的 update 语义是"传新 props 但不卸载"，应由业务层自行响应。
      // 默认走 destroy+render 会破坏该契约；这里保留 no-op，
      // 需要重启子应用时使用 stopMicroApp + startMicroApp。
      update: async () => {},
    });
    return;
  }

  // 宿主把本应用当子应用加载了，但构建时没开 VITE_AS_GUEST：生命周期没暴露出去，
  // 宿主的 mount(props) 永远不会到达，只能按独立模式自渲染。告警指向真正的配置错误
  if (isInQiankun()) {
    console.warn('[micro] 运行在 qiankun 容器内但未启用 VITE_AS_GUEST，按独立模式渲染');
  }

  void render();
}

export * from './shared/env';
export * from './shared/state';
export * from './shared/types';
export { startMicroApp, stopMicroApp, stopAllMicroApps, getMicroAppStatus, getMicroAppInstance } from './main/manager';
export { registerMicroApp, unregisterMicroApp, getMicroAppConfig, listMicroApps } from './main/apps';
export { useMicroApp } from './main/useMicroApp';
export { default as MicroAppContainer } from './main/MicroAppContainer.vue';
