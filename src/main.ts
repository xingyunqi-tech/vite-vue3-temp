import 'virtual:uno.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'virtual:svg-icons-register';
import { renderApp } from './app/render';
// #if qiankun
// destroyApp 只有 qiankun 的 unmount 生命周期用得到，单独一条 import 才能随特性裁掉
import { destroyApp } from './app/render';
// #endif
import type { AppSetupHooks } from './app/render';
// #if qiankun
import { bootstrapApp } from './micro';
// #endif
// #if overrides
import { setupOverrides, setupStoreOverrides } from './overrides';
// #endif

// iconfont 图标：用本地副本，换图标即替换 src/assets/iconfont/ 目录
import './assets/iconfont/iconfont.js';

/**
 * 应用级扩展钩子：beforeRouter 在 router 安装前执行，beforeMount 在所有插件 use() 之后、mount 之前执行
 *
 * 需要在 mount 前注册的全局插件/指令都挂在这里；不启用任何扩展时是个空对象。
 */
const appHooks: AppSetupHooks = {};

// #if overrides
// 在 main.ts 注入 override 系统（核心代码不直接依赖 overrides 目录，见 eslint 架构规则）
appHooks.beforeRouter = (_app, store) => setupStoreOverrides(store);
appHooks.beforeMount = (app, store, router) => setupOverrides({ app, pinia: store, router });
// #endif

// #if qiankun
bootstrapApp({
  render: props => renderApp(props, appHooks),
  destroy: destroyApp,
});
// #else
void renderApp({}, appHooks);
// #endif
