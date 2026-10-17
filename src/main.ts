import 'virtual:uno.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'virtual:svg-icons-register';
import { renderApp, type AppSetupHooks } from './app/render';
import { setupSentry } from './plugins/sentry';

// iconfont 图标：用本地副本，换图标即替换 src/assets/iconfont/ 目录
import './assets/iconfont/iconfont.js';

/**
 * 应用级扩展钩子：beforeRouter 在 router 安装前执行，beforeMount 在所有插件 use() 之后、mount 之前执行
 *
 * 需要在 mount 前注册的全局插件/指令都挂在这里。
 */
const appHooks: AppSetupHooks = {
  beforeMount: (_app, _store, router) => {
    void setupSentry(router);
  },
};

void renderApp(appHooks);
