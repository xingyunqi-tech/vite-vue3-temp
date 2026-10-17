import { reactive, readonly, provide, inject, type DeepReadonly, type InjectionKey } from 'vue';
import logoUrl from '@/assets/images/common/logo.png';

// 布局可见性类型
export interface LayoutVisible {
  nav: boolean;
  /** 顶部 header：无侧边栏的页面靠它承载 Logo 与设置入口 */
  header: boolean;
}

// 头部组件可见性类型
export interface HeaderVisible {
  logoIcon: boolean;
  logoTitle: boolean;
  themeSwitch: boolean;
  localeSwitch: boolean;
  setting: boolean;
  avatar: boolean;
}

// Logo配置类型
export interface LogoConfig {
  icon?: string;
  title?: string | null;
}

// 默认布局可见性
const defaultLayoutConfig: LayoutVisible = {
  nav: true,
  header: false,
};

// 默认头部组件可见性
const defaultHeaderConfig: HeaderVisible = {
  logoIcon: true,
  logoTitle: true,
  themeSwitch: true,
  localeSwitch: true,
  setting: true,
  avatar: true,
};

// 默认Logo配置
// icon 默认用仓库内置 logo；siteConfig.basic.logoUrl 或路由 meta.layout.logoConfig 有值时会覆盖它
const defaultLogoConfig: LogoConfig = {
  icon: logoUrl,
  title: undefined,
};

// 布局上下文类型
export interface LayoutContextType {
  layoutVisible: DeepReadonly<LayoutVisible>;
  headerVisible: DeepReadonly<HeaderVisible>;
  logoConfig: DeepReadonly<LogoConfig>;
  setLayoutVisible: (visible: Partial<LayoutVisible>) => void;
  setHeaderVisible: (visible: Partial<HeaderVisible>) => void;
  setLogoConfig: (config: Partial<LogoConfig>) => void;
  resetLayout: () => void;
  resetHeader: () => void;
  resetLogo: () => void;
  resetAll: () => void;
}

// 创建注入键
export const LayoutContextKey: InjectionKey<LayoutContextType> = Symbol('LayoutContext');

/**
 * 创建布局上下文
 */
export function createLayoutContext(): LayoutContextType {
  // 使用reactive创建响应式状态
  const state = reactive({
    layoutVisible: { ...defaultLayoutConfig },
    headerVisible: { ...defaultHeaderConfig },
    logoConfig: { ...defaultLogoConfig },
  });

  const setLayoutVisible = (visible: Partial<LayoutVisible>) => {
    Object.assign(state.layoutVisible, visible);
  };

  const setHeaderVisible = (visible: Partial<HeaderVisible>) => {
    Object.assign(state.headerVisible, visible);
  };

  const setLogoConfig = (config: Partial<LogoConfig>) => {
    Object.assign(state.logoConfig, config);
  };

  const resetLayout = () => {
    Object.assign(state.layoutVisible, defaultLayoutConfig);
  };

  const resetHeader = () => {
    Object.assign(state.headerVisible, defaultHeaderConfig);
  };

  const resetLogo = () => {
    Object.assign(state.logoConfig, defaultLogoConfig);
  };

  const resetAll = () => {
    resetLayout();
    resetHeader();
    resetLogo();
  };

  return {
    layoutVisible: readonly(state.layoutVisible),
    headerVisible: readonly(state.headerVisible),
    logoConfig: readonly(state.logoConfig),
    setLayoutVisible,
    setHeaderVisible,
    setLogoConfig,
    resetLayout,
    resetHeader,
    resetLogo,
    resetAll,
  };
}

/**
 * 提供布局上下文
 */
export function provideLayoutContext(): LayoutContextType {
  const context = createLayoutContext();
  provide(LayoutContextKey, context);
  return context;
}

/**
 * 使用Layout上下文的组合式函数
 */
export function useLayout(): LayoutContextType {
  const context = inject(LayoutContextKey);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
