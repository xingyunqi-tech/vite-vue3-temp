import { createApp, type App as VueApp } from 'vue';
import App from './App.vue';
import { clearPendingRequests } from '@/api/core';
import { setupDirectives } from '@/directives';
// #if qiankun
import { AS_GUEST, applyInjectedRouterBase, isInQiankun } from '@/micro/shared/env';
// #endif
// #if i18n
import { i18n } from '@/plugins/locale';
// #endif
import { createAppRouter } from '@/router';
import storePromise, { preloadPersistedData } from '@/store';
import { usePermissionStore } from '@/store/modules/permission';
import { writeTokenFromAuthQuery } from '@/utils/auth';
import { reportGlobalError, setupGlobalErrorHandler, teardownGlobalErrorHandler } from '@/utils/error-handler';

/** 默认挂载点 ID */
const DEFAULT_MOUNT_ID = '#main-app';

let appInstance: VueApp<Element> | null = null;

/**
 * 渲染重入锁：appInstance 在 mount 完成后才置值，挡不住 await 挂起期间的并发重入——
 * 真源里 `#if qiankun` / `#else` 两分支都是活代码，bootstrapApp 的 standalone 分支
 * 与 main.ts 里 `#else` 的直调会先后各调一次 renderApp，没有这把锁会 createApp 两次、
 * 向同一个挂载点 mount 两个应用实例
 */
let renderPromise: Promise<void> | null = null;

interface RenderProps {
  /** 宿主应用注入的挂载容器；为空时用 document */
  container?: HTMLElement;
  /** 宿主应用透传的路由 base（与其激活规则对齐） */
  routerBase?: string;
  [key: string]: unknown;
}

type Store = Awaited<typeof storePromise>;

export interface AppSetupHooks {
  /** 在 pinia 安装之后、router 安装之前调用（router 安装即发起首次导航），用于注册须早于任何 store 创建的 Pinia 插件 */
  beforeRouter?: (app: VueApp, store: Store) => Promise<void> | void;
  /** 在所有插件 use() 之后、mount 之前调用，可用于注册应用级扩展（全局插件、指令等） */
  beforeMount?: (app: VueApp, store: Store, router: import('vue-router').Router) => Promise<void> | void;
}

function resolveMountTarget(container?: HTMLElement): Element | null {
  const root: ParentNode = container ?? document;
  return root.querySelector(DEFAULT_MOUNT_ID);
}

/** 创建并挂载 Vue 应用（独立运行与被宿主应用嵌入两种场景通用；并发/重复调用共享同一次渲染） */
export function renderApp(props: RenderProps = {}, hooks: AppSetupHooks = {}): Promise<void> {
  // #if qiankun
  // 闸门与 bootstrapApp 的分发条件对齐（AS_GUEST 且在容器内才走 qiankun 生命周期）：
  // 该形态下只接受 mount(props) 的带容器调用，入口的直调 renderApp({}) 没有 container 与 routerBase，
  // 不能让它抢先建锁。未启用 GUEST 能力的应用不暴露生命周期，容器内也只能自行渲染，不拦
  if (AS_GUEST && isInQiankun() && !props.container) return Promise.resolve();

  // #endif
  // 失败（含挂载点缺失的静默返回）时清锁，保住「失败可重试」的语义；
  // 成功后锁与 appInstance 一起活到 destroyApp
  renderPromise ??= doRenderApp(props, hooks).finally(() => {
    if (!appInstance) renderPromise = null;
  });
  return renderPromise;
}

async function doRenderApp(props: RenderProps, hooks: AppSetupHooks): Promise<void> {
  if (appInstance) return;

  // 必须在路由守卫挂载之前写入，避免守卫读不到 token 误判未登录
  writeTokenFromAuthQuery();

  // #if qiankun
  // 必须在 createAppRouter 之前写入，工厂内 resolveRouterBase 才能读到
  applyInjectedRouterBase(props.routerBase);

  // #endif
  // 全局错误兜底：默认静默（仅 console 记录）。如需用户通知或接入监控，传入 { notify: true } / { onError }
  setupGlobalErrorHandler();
  await preloadPersistedData();
  const store = await storePromise;

  const app = createApp(App);

  // 组件层未捕获错误的兜底，与 window 层共用 setupGlobalErrorHandler 的选项；随 app 实例一起销毁
  app.config.errorHandler = (error, _instance, info) => reportGlobalError(error, 'vue', info);

  setupDirectives(app);

  // #if i18n
  app.use(i18n);
  // #endif
  app.use(store);
  await hooks.beforeRouter?.(app, store);
  const router = createAppRouter();
  app.use(router);

  await hooks.beforeMount?.(app, store, router);

  const target = resolveMountTarget(props.container);
  if (!target) {
    console.error(`[app] mount target ${DEFAULT_MOUNT_ID} not found`);
    return;
  }

  app.mount(target);
  appInstance = app;
}

/** 卸载 Vue 应用（被宿主应用卸载时调用） */
export async function destroyApp(_props: RenderProps = {}): Promise<void> {
  if (!appInstance) return;
  // 下次 renderApp 会通过 createAppRouter() 重建 router 实例，
  // 而 permission store 的 isRoutesGenerated 标记保留在 pinia 单例上，
  // 不重置会让 guard 跳过 addRoute，新 router 缺失异步路由导致 404。
  usePermissionStore().resetPermission();
  appInstance.unmount();
  appInstance = null;
  // 在途请求表是模块单例，不清会把上一个实例的请求复用给下一次挂载
  clearPendingRequests();
  // 释放渲染锁，下次 mount 才能重新走完整渲染（qiankun 反复挂载场景）
  renderPromise = null;
  // 移除全局错误监听器，避免子应用反复挂载时监听器累积
  teardownGlobalErrorHandler();
}
