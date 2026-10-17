import type { FrameworkConfiguration, ObjectType } from 'qiankun';

/** 微应用配置 */
export interface MicroAppConfig {
  /** 应用唯一名称（必须与子应用 VITE_APP_NAME 保持一致） */
  name: string;
  /** 子应用入口 URL（HTML 入口） */
  entry: string;
  /** 容器选择器，例如 '#micro-container'，留空则由 MicroAppContainer 自动生成 */
  container?: string;
  /**
   * 子应用路由 base（与子应用在主应用中的挂载路径对齐，如 '/sub-app'）
   * 由 manager 自动注入到 mount(props.routerBase)；子应用通过 resolveRouterBase 读取
   */
  routerBase?: string;
  /** 透传给子应用 mount(props) 的数据 */
  props?: ObjectType;
  /** 单实例覆盖 qiankun 框架配置 */
  configuration?: FrameworkConfiguration;
}

/** wrapper 层（Container/composable）暴露给业务的状态机 */
export type MicroAppStatus = 'idle' | 'loading' | 'mounted' | 'unmounted' | 'error';

/** 应用渲染器：被 micro 入口在合适时机调用 */
export type AppRenderer = (props?: { container?: HTMLElement; [key: string]: unknown }) => Promise<void> | void;

/** 应用销毁器 */
export type AppDestroyer = (props?: { container?: HTMLElement; [key: string]: unknown }) => Promise<void> | void;
