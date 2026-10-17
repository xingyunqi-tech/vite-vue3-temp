/// <reference types="vite/client" />

declare module 'virtual:svg-icons-register' {
  const component: void;
  export default component;
}

/**
 * 为 TypeScript 编译器提供环境变量相关的类型定义
 */
interface ImportMetaEnv {
  /**
   * api基础地址
   */
  readonly VITE_BASEURL: string;
  /**
   * 平台接口 Host
   */
  readonly VITE_PLATFORM_HOST?: string;
  /**
   * 是否开启构建分析器
   * - `'true'` 启用；其它值或未设置 = 禁用（运行时为字符串，需用 === 'true' 判断）
   */
  readonly VITE_ENABLE_ANALYZER?: 'true' | 'false';
  /**
   * 是否给 modern 包注入 core-js polyfill（仅构建期生效，见 vite.config.ts）
   * - `'true'` 启用；其它值或未设置 = 禁用
   */
  readonly VITE_LEGACY?: 'true' | 'false';
  /**
   * 是否开启https
   * - `'true'` 启用；其它值或未设置 = 禁用（运行时为字符串，需用 === 'true' 判断）
   */
  readonly VITE_ENABLE_HTTPS?: 'true' | 'false';
  /**
   * 路由 / 资源 base path，例如 `/sub-app/`，作为路由 base 使用
   */
  readonly VITE_BASE_PATH?: string;
  /** Sentry DSN，留空则不初始化 Sentry */
  readonly VITE_SENTRY_DSN?: string;
  /** Sentry 组织（上传 sourcemap 用） */
  readonly VITE_SENTRY_ORG?: string;
  /** Sentry 项目（上传 sourcemap 用） */
  readonly VITE_SENTRY_PROJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
