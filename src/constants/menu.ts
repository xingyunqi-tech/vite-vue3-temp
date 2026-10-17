import type { Component } from 'vue';

/**
 * 菜单项类型
 */
export interface MenuItem {
  /** 菜单标题 */
  title: string;
  /** 路由路径 */
  path: string;
  /** 图标：Vue 组件（Element Plus）| 字符串（SvgIcon 名称） */
  icon?: Component | string;
  /**
   * 权限角色（空=所有人可见），只对外链与禁用项生效
   *
   * 内部菜单是否可见由对应路由的 meta.roles 决定，这里不必也不应重复声明。
   */
  roles?: string[];
  /** 子菜单 */
  children?: MenuItem[];
  /** 外链地址 */
  link?: string;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否禁用（点击提示敬请期待） */
  disabled?: boolean;
  /** 后端菜单 ID（用于权限匹配） */
  menuId?: string;
}

/**
 * 默认菜单配置列表
 */
export const DEFAULT_MENU_LIST: MenuItem[] = [{ title: '首页', path: '/home', icon: 'common-menu-home' }];
