import 'virtual:uno.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'virtual:svg-icons-register';
import { renderApp } from './app/render';
import type { AppSetupHooks } from './app/render';

// iconfont 图标：用本地副本，换图标即替换 src/assets/iconfont/ 目录
import './assets/iconfont/iconfont.js';

/**
 * 应用级扩展钩子：beforeRouter 在 router 安装前执行，beforeMount 在所有插件 use() 之后、mount 之前执行
 *
 * 需要在 mount 前注册的全局插件/指令都挂在这里；不启用任何扩展时是个空对象。
 */
const appHooks: AppSetupHooks = {};

void renderApp(appHooks);
