import type { Component } from 'vue';
import type { LayoutVisible, HeaderVisible, LogoConfig } from '@/layout/useLayoutContext';

/** Layout 区域插槽名称 */
type LayoutSlot = 'menu' | 'main' | 'header';

export interface CustomLayoutConfig {
  /** 替换整个 Layout 组件 */
  layout?: Component;
  /** 替换 Layout 内部区域组件 */
  components?: Partial<Record<LayoutSlot, Component>>;
  /** 覆盖默认配置值 */
  defaultConfig?: {
    layoutVisible?: Partial<LayoutVisible>;
    headerVisible?: Partial<HeaderVisible>;
    logoConfig?: Partial<LogoConfig>;
  };
}

/**
 * Layout 覆盖管理器
 * 支持替换整个 Layout 或内部区域组件，以及覆盖默认配置
 */
class LayoutManager {
  private config: CustomLayoutConfig | null = null;

  /** 注册 Layout 覆盖配置 */
  register(config: CustomLayoutConfig): void {
    this.config = config;
  }

  /** 获取自定义 Layout 组件，无配置时返回 fallback */
  getLayoutComponent(fallback: Component | null): Component | null {
    return this.config?.layout ?? fallback;
  }

  /** 获取指定区域的覆盖组件，未配置则返回 fallback */
  getSlotComponent(slot: LayoutSlot, fallback: Component): Component {
    return this.config?.components?.[slot] ?? fallback;
  }

  /** 获取覆盖后的默认配置 */
  getDefaultConfig(): CustomLayoutConfig['defaultConfig'] {
    return this.config?.defaultConfig;
  }
}

export const layoutManager = new LayoutManager();
