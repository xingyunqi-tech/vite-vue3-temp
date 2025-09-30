import { reactive, readonly, provide, inject, InjectionKey } from 'vue';

// 布局可见性类型
export interface LayoutVisible {
  header: boolean;
  nav: boolean;
}

// 头部组件可见性类型
export interface HeaderVisible {
  logoIcon: boolean;
  logoTitle: boolean;
  nav: boolean;
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

// 菜单项类型
export interface IMenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: IMenuItem[];
}

// 默认布局可见性
const defaultLayoutConfig: LayoutVisible = {
  header: true,
  nav: true,
};

// 默认头部组件可见性
const defaultHeaderConfig: HeaderVisible = {
  logoIcon: true,
  logoTitle: true,
  nav: true,
  themeSwitch: true,
  localeSwitch: true,
  setting: true,
  avatar: true,
};

// 默认Logo配置
const defaultLogoConfig: LogoConfig = {
  icon: undefined,
  title: undefined,
};

// 隐藏布局可见性
const hiddenLayoutConfig: LayoutVisible = {
  header: false,
  nav: false,
};

// 隐藏头部组件可见性
const hiddenHeaderConfig: HeaderVisible = {
  logoIcon: false,
  logoTitle: false,
  nav: false,
  themeSwitch: false,
  localeSwitch: false,
  setting: false,
  avatar: false,
};

// 布局上下文类型
export interface LayoutContextType {
  layoutVisible: LayoutVisible;
  headerVisible: HeaderVisible;
  logoConfig: LogoConfig;
  customMenuList: IMenuItem[];
  setLayoutVisible: (visible: Partial<LayoutVisible>) => void;
  setHeaderVisible: (visible: Partial<HeaderVisible>) => void;
  setLogoConfig: (config: Partial<LogoConfig>) => void;
  setCustomMenuList: (menuList: IMenuItem[]) => void;
  hideLayout: () => void;
  showLayout: () => void;
  hideHeader: () => void;
  showHeader: () => void;
  resetCustomMenuList: () => void;
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
    // 使用空数组作为初始值，避免null值
    customMenuList: [] as IMenuItem[],
  });

  /**
   * 设置布局可见性
   */
  const setLayoutVisible = (visible: Partial<LayoutVisible>) => {
    Object.assign(state.layoutVisible, visible);
  };

  /**
   * 设置头部组件可见性
   */
  const setHeaderVisible = (visible: Partial<HeaderVisible>) => {
    Object.assign(state.headerVisible, visible);
  };

  /**
   * 设置Logo配置
   */
  const setLogoConfig = (config: Partial<LogoConfig>) => {
    Object.assign(state.logoConfig, config);
  };

  /**
   * 设置自定义菜单列表
   */
  const setCustomMenuList = (menuList: IMenuItem[]) => {
    state.customMenuList = menuList;
  };

  /**
   * 隐藏布局
   */
  const hideLayout = () => {
    Object.assign(state.layoutVisible, hiddenLayoutConfig);
  };

  /**
   * 显示布局
   */
  const showLayout = () => {
    Object.assign(state.layoutVisible, defaultLayoutConfig);
  };

  /**
   * 隐藏头部所有组件
   */
  const hideHeader = () => {
    Object.assign(state.headerVisible, hiddenHeaderConfig);
  };

  /**
   * 显示头部所有组件
   */
  const showHeader = () => {
    Object.assign(state.headerVisible, defaultHeaderConfig);
  };

  /**
   * 重置自定义菜单列表
   */
  const resetCustomMenuList = () => {
    state.customMenuList = [];
  };

  // 返回上下文对象
  return {
    // 只读状态，防止直接修改
    layoutVisible: readonly(state.layoutVisible) as LayoutVisible,
    headerVisible: readonly(state.headerVisible) as HeaderVisible,
    logoConfig: readonly(state.logoConfig) as LogoConfig,
    // 使用readonly包装数组
    customMenuList: readonly(state.customMenuList) as IMenuItem[],
    // 方法
    setLayoutVisible,
    setHeaderVisible,
    setLogoConfig,
    setCustomMenuList,
    hideLayout,
    showLayout,
    hideHeader,
    showHeader,
    resetCustomMenuList,
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

/**
 * 控制头部组件显隐的组合式函数
 */
export function useHeaderControl() {
  const { headerVisible, setHeaderVisible, hideHeader, showHeader } = useLayout();
  return { headerVisible, setHeaderVisible, hideHeader, showHeader };
}

/**
 * 控制布局显隐的组合式函数
 */
export function useLayoutControl() {
  const { layoutVisible, setLayoutVisible, hideLayout, showLayout } = useLayout();
  return { layoutVisible, setLayoutVisible, hideLayout, showLayout };
}

/**
 * 控制Logo配置的组合式函数
 */
export function useLogoConfig() {
  const { logoConfig, setLogoConfig } = useLayout();
  return { logoConfig, setLogoConfig };
}

/**
 * 控制自定义菜单列表的组合式函数
 */
export function useCustomMenuList() {
  const { customMenuList, setCustomMenuList, resetCustomMenuList } = useLayout();
  return { customMenuList, setCustomMenuList, resetCustomMenuList };
}
