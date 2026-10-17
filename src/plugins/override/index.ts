import type { Pinia } from 'pinia';
import type { App, Component, Directive, Plugin } from 'vue';
import type { Composer } from 'vue-i18n';
import type { Router } from 'vue-router';
import type { CustomApiConfig } from './override-api';
import { applyApiOverrides } from './override-api';
import { componentManager } from './override-component';
import { applyDirectiveOverrides } from './override-directives';
import { layoutManager } from './override-layout';
import type { CustomLayoutConfig } from './override-layout';
import type { CustomRouteConfig } from './override-router';
import { storeManager } from './override-store';
import type { StoreModuleConfig } from './override-store';
import { instances } from '@/api/core/request';

/** 语言包类型：locale → messages */
export type LocaleMessages = Record<string, Record<string, unknown>>;

/** Override 系统运行时配置，由 initOverrides 在 mount 前逐维度注册 */
export interface RuntimeOverrideConfig {
  /**
   * 替换预埋组件（key 为组件名，如 'WelcomeCard'）——预留扩展入口
   *
   * 仅注册不会自动生效，需在预埋组件渲染处用 componentManager.getComponent(name, fallback)
   * 按名解析后以 <component :is> 渲染（详见 override-component.ts）。
   */
  components?: Record<string, Component>;
  /** 包装已有 Store 的 action */
  store?: StoreModuleConfig;
  /** 覆盖/扩展国际化文本 */
  locale?: LocaleMessages;
  /** API 实例和模块配置 */
  api?: CustomApiConfig;
  /** Layout 组件和区域替换 */
  layout?: CustomLayoutConfig;
  /** 新增或替换全局指令，key 为指令名（不含 v- 前缀），同名覆盖内置指令 */
  directives?: Record<string, Directive>;
  /** 注册额外的 Vue 插件，接收运行时上下文并返回插件列表，按顺序调用 app.use() */
  plugins?: (context: { router: Router; pinia: Pinia; i18n: I18nLike }) => Plugin[];
}

/**
 * 租户 `overrides/{学校代码}/index.ts` 的默认导出：运行时维度 + 静态的 router 维度
 *
 * 所有字段可选，只写需要定制的维度。常量维度不在这里，由同目录 `constants.ts`
 * 默认导出一个 `ConstantsOverride`（它处在 `@/constants` 的同步加载链上，必须与本文件分开加载）。
 *
 * @example
 * ```ts
 * // overrides/sysu/index.ts
 * import type { OverrideConfig } from '@/plugins/override';
 *
 * const config: OverrideConfig = {
 *   router: { customRoutes: [...] },
 * };
 * export default config;
 * ```
 */
export interface OverrideConfig extends RuntimeOverrideConfig {
  /** 路由覆盖、新增、禁用（模块加载时由 router/index.ts 消费） */
  router?: CustomRouteConfig;
}

/** i18n 实例最小接口 */
interface I18nLike {
  global: { mergeLocaleMessage: Composer['mergeLocaleMessage'] };
}

/** initOverrides 参数 */
export interface InitOverridesOptions {
  pinia: Pinia;
  i18n: I18nLike;
  config: RuntimeOverrideConfig;
  /** Vue 应用实例，用于注册指令等需要 app 的覆盖 */
  app: App;
  /** 路由实例，传给 plugins 工厂函数 */
  router: Router;
}

/**
 * 作用在模块级单例（pinia、api instances、i18n）上的维度只注册一次：
 * initStoreOverrides / initOverrides 随每次 renderApp 执行，而这些单例跨 destroyApp 存活。
 * 作用在 app 上的维度（components / layout / directives / plugins）每个新 app 都要重新注册，不设守卫。
 */
let storeRegistered = false;
let localeMerged = false;
let apiApplied = false;

/** 注册 Store 覆盖（Pinia 插件），须在任何 store 创建前调用，见 AppSetupHooks.beforeRouter */
export function initStoreOverrides({ pinia, config }: Pick<InitOverridesOptions, 'pinia' | 'config'>): void {
  if (config.store?.overrides && !storeRegistered) {
    storeManager.register(config.store);
    pinia.use(storeManager.createPlugin());
    storeRegistered = true;
  }
}

/**
 * 初始化 Override 系统
 * 按顺序注册各模块覆盖配置
 *
 * 注意：路由覆盖在 router/index.ts 的 createAppRouter() 里单独注册，Store 覆盖由 initStoreOverrides
 * 提前注册，均不经过此函数
 */
export function initOverrides({ pinia, i18n, config, app, router }: InitOverridesOptions): void {
  // 1. 注册预埋组件覆盖（预留入口；渲染处通过 componentManager.getComponent 按名解析后生效）
  if (config.components) {
    componentManager.register(config.components);
  }

  // 2. 注册 Layout 覆盖（含整体 Layout 替换与 menu/main 区域插槽替换）
  if (config.layout) {
    layoutManager.register(config.layout);
  }

  // 3. 合并语言包
  if (config.locale && !localeMerged) {
    for (const [locale, messages] of Object.entries(config.locale)) {
      i18n.global.mergeLocaleMessage(locale, messages);
    }
    localeMerged = true;
  }

  // 4. 应用 API 覆盖
  if (config.api && !apiApplied) {
    applyApiOverrides(config.api, instances);
    apiApplied = true;
  }

  // 5. 注册定制指令（同名覆盖内置指令，内置指令由 setupDirectives 独立注册）
  if (config.directives) {
    applyDirectiveOverrides(app, config.directives);
  }

  // 6. 注册额外的 Vue 插件
  if (config.plugins) {
    for (const plugin of config.plugins({ router, pinia, i18n })) {
      app.use(plugin);
    }
  }
}

// 导出管理器
export { componentManager } from './override-component';
export { routerManager } from './override-router';
export { storeManager } from './override-store';
export { applyApiOverrides } from './override-api';
export { layoutManager } from './override-layout';
export { applyDirectiveOverrides } from './override-directives';
export { mergeConstants } from './override-constants';

// 导出类型
export type { CustomRouteConfig } from './override-router';
export type { StoreModuleConfig, StoreOverrideFn } from './override-store';
export type { CustomApiConfig } from './override-api';
export type { CustomLayoutConfig } from './override-layout';
export type { ConstantsOverride } from './override-constants';
