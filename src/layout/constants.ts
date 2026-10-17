import BlankLayout from '@/layout/BlankLayout.vue';
import Layout from '@/layout/index.vue';

/**
 * 是否启用整体布局（侧边栏 + 头部 + 水印/背景外壳）
 *
 * 关闭后路由使用 BlankLayout 直接透传页面内容
 */
export const ENABLE_LAYOUT: boolean = true;

/**
 * 路由使用的布局容器组件
 *
 * 在路由定义中统一以 `component: AppLayout` 引用，避免硬编码 Layout。
 */
export const AppLayout = ENABLE_LAYOUT ? Layout : BlankLayout;
