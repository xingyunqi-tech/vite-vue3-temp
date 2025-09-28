/**
 * 为 TypeScript 编译器提供全局相关的类型定义
 */
declare global {
  interface Window {
    /**
     * 全局配置
     */
    CUSTOM_CONFIG: {
      [key: string]: any;
    };
  }

  interface Performance {
    memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};
