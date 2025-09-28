/// <reference types="vite/client" />

/**
 * 为 TypeScript 编译器提供环境变量相关的类型定义
 */
interface ImportMetaEnv {
  /*
   * sentry
   */
  readonly VITE_SENTRY_ORG: string;
  readonly VITE_SENTRY_PROJECT: string;
  readonly VITE_SENTRY_AUTH_TOKEN: string;
  /**
   * 接口地址
   */
  readonly VITE_BASEURL: string;
  /**
   * 是否开启分析器
   */
  readonly VITE_ENABLE_ANALYZER: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
