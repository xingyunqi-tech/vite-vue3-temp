import 'vue-router';
import type { Component } from 'vue';
import type { LayoutVisible, HeaderVisible, LogoConfig } from '@/layout/useLayoutContext';

/**
 * Layout 配置类型
 */
export interface LayoutConfig {
  /** 布局区域显隐（如侧边栏 nav） */
  layoutVisible?: Partial<LayoutVisible>;
  /** 头部组件显隐（Logo 图标/标题、主题/语言切换、设置、头像） */
  headerVisible?: Partial<HeaderVisible>;
  /** Logo 配置（图标、标题） */
  logoConfig?: Partial<LogoConfig>;
}

/**
 * 扩展 Vue Router 的 RouteMeta
 *
 * 为路由元信息添加类型定义，支持：
 * - 页面标题、角色权限、认证要求
 * - Layout 配置（控制布局、头部、Logo 等）
 * - 菜单相关（图标、隐藏、外链、激活菜单）
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string;
    /** 角色权限 */
    roles?: string[];
    /** 是否需要认证 */
    requiresAuth?: boolean;
    /** Layout 配置 */
    layout?: LayoutConfig;
    /** 菜单图标 */
    icon?: Component;
    /** 是否在菜单中隐藏 */
    hidden?: boolean;
    /** 外链地址 */
    link?: string;
    /** 激活菜单的路径（用于子页面高亮父菜单） */
    activeMenu?: string;
  }
}

export {};
