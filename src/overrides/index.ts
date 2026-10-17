import type { Pinia } from 'pinia';
import type { App } from 'vue';
import type { Router } from 'vue-router';
import { getSchoolCode } from './registry';
// #if i18n
import { i18n } from '@/plugins/locale';
// #endif
import { initOverrides, initStoreOverrides } from '@/plugins/override';
import type {
  CustomRouteConfig,
  InitOverridesOptions,
  OverrideConfig,
  RuntimeOverrideConfig,
} from '@/plugins/override';

/**
 * Override 系统 - 运行时维度与 router 维度的入口
 *
 * 三层架构：标准产品（src/） + 部署级覆盖（deployment.ts） + 学校定制（overrides/{schoolCode}/）
 * 根据 Cookie 中的 schoolNid 自动加载对应学校的配置，匹配不到时全部回落标准产品行为。
 *
 * 常量维度有独立入口 `./constants.ts`（原因见该文件）；本文件及其加载的租户 index.ts 可以自由引用 `@/constants`。
 *
 * 装配函数 `setupOverrides()` 也放在这里而不是 main.ts：locale 维度需要 i18n 实例，而 i18n 是可独立
 * 关闭的模版特性，main.ts 里 `#if overrides` 与 `#if i18n` 不能嵌套；本文件随 overrides 特性整体裁剪，
 * `#if i18n` 在这里是顶层块，两个特性可以自由组合。
 */

/** 租户模块（`overrides/{学校代码}/index.ts` 的默认导出） */
type SchoolModule = { default: OverrideConfig };

/**
 * 自动扫描所有学校配置模块
 * 使用 eager 加载（配置代码小，页面组件由学校 router 中 lazy import）
 */
const schoolModules = import.meta.glob<SchoolModule>('./*/index.ts', { eager: true });

/**
 * 租户常量入口的路径表，只用来判断目录是否存在
 *
 * 不加 eager：常量维度由 ./constants.ts 自己 eager 加载，这里只要 key。
 */
const schoolConstantsPaths = import.meta.glob('./*/constants.ts');

/**
 * 加载指定学校的覆盖配置，匹配不到时返回 null；参数默认值即生产链路，显式传参供测试注入
 *
 * 识别出了学校代码却在该目录下什么都找不到，只有两种来路：VITE_BUILD_SCHOOL_CODE 拼错，或
 * SCHOOL_MAP/USER_MAP 的某一行指向了不存在的目录。两者都会静默回落标准产品 ——
 * 定向包尤其难查（构建期同时把其余学校全裁了，产物里一份定制都不剩），故出声提示。
 * 不限 DEV：这类错配正是要在定向包的产物里能看见。
 *
 * 判定要连常量维度一起看：它不经过本文件（见 ./constants.ts），只写 constants.ts 的租户是
 * 合法配置，此时返回 null 只表示「没有运行时维度」，不是错配。
 */
export function loadSchoolConfig(
  code: string | null = getSchoolCode(),
  modules: Record<string, SchoolModule> = schoolModules,
  constantsPaths: Record<string, unknown> = schoolConstantsPaths,
): OverrideConfig | null {
  if (!code) return null;

  const module = modules[`./${code}/index.ts`];
  if (!module) {
    if (!(`./${code}/constants.ts` in constantsPaths)) {
      console.warn(
        `[overrides] 识别到学校代码「${code}」，但 src/overrides/${code}/ 下既没有 index.ts 也没有 constants.ts，` +
          `已回落标准产品。请检查 VITE_BUILD_SCHOOL_CODE 与 registry.ts 的映射值是否与目录名一致。`,
      );
    }
    return null;
  }
  return module.default ?? null;
}

const school = loadSchoolConfig();

// ── 运行时维度 → setupOverrides() → initOverrides() ──
const overrideConfig: RuntimeOverrideConfig = {
  components: school?.components,
  store: school?.store,
  locale: school?.locale,
  api: school?.api,
  layout: school?.layout,
  directives: school?.directives,
  plugins: school?.plugins,
};

export default overrideConfig;

// ── 静态维度 → 各消费方在模块加载时直接导入 ──

/** 学校路由覆盖配置 → router/index.ts */
export const customRoutes: CustomRouteConfig = school?.router ?? {};

// ── 装配 ──

/**
 * i18n 宿主：默认是 mergeLocaleMessage 空实现。
 * 启用 i18n 特性时替换为真实实例；关闭时 locale 维度自然降级为 no-op，其余维度不受影响。
 */
const localeHost: InitOverridesOptions['i18n'] = { global: { mergeLocaleMessage: () => {} } };
// #if i18n
localeHost.global = i18n.global;
// #endif

/** 装配 Override 系统所需的运行时上下文 */
export interface SetupOverridesContext {
  app: App;
  pinia: Pinia;
  router: Router;
}

/** 注册 Store 覆盖维度，由 main.ts 挂在 renderApp 的 beforeRouter 钩子上 */
export function setupStoreOverrides(pinia: Pinia): void {
  initStoreOverrides({ pinia, config: overrideConfig });
}

/**
 * 注册 Store 以外的运行时覆盖维度，由 main.ts 挂在 renderApp 的 beforeMount 钩子上
 *
 * 静态维度不走这里：路由 `customRoutes` 由 router/index.ts 消费，
 * 常量由 constants/index.ts 调 `./constants` 的 `applyConstantsOverrides()`，两者都发生在模块加载时。
 */
export function setupOverrides({ app, pinia, router }: SetupOverridesContext): void {
  initOverrides({ pinia, i18n: localeHost, config: overrideConfig, app, router });
}
