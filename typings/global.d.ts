/**
 * 为 TypeScript 编译器提供全局相关的类型定义
 */
declare global {
  /** 应用版本号（package.json version），构建时注入 */
  const __APP_VERSION__: string;

  /**
   * Performance
   */
  interface Performance {
    memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  /**
   * AudioWorklet
   */
  namespace AudioWorklet {
    interface AudioParamDescriptor {
      name: string;
      defaultValue?: number;
      minValue?: number;
      maxValue?: number;
      automationRate?: 'a-rate' | 'k-rate';
    }
  }
}

export {};
