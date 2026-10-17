import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

/**
 * 是否启用主应用能力（注册并加载子应用）
 * 不影响是否被作为子应用加载
 */
export const AS_HOST: boolean = import.meta.env.VITE_AS_HOST === 'true';

/**
 * 是否启用子应用能力（暴露 qiankun 生命周期，可被父级加载）
 * 不影响是否能加载下级
 */
export const AS_GUEST: boolean = import.meta.env.VITE_AS_GUEST === 'true';

/**
 * 是否独立运行（既不作主也不作子）
 */
export const IS_STANDALONE: boolean = !AS_HOST && !AS_GUEST;

/**
 * 当前应用对外名称（仅 guest 模式必需）
 */
export const APP_NAME: string = (import.meta.env.VITE_APP_NAME as string) || 'micro-app';

/**
 * 自定义注入键：主应用通过 mount(props) 传入的子应用路由 base
 * 与 qiankun 内置的 `__INJECTED_PUBLIC_PATH_BY_QIANKUN__`（资源 public path，可能含 host）区分，
 * 后者**不能**用作 vue-router 的 base。
 */
const ROUTER_BASE_KEY = '__INJECTED_ROUTER_BASE_BY_QIANKUN__';

type QiankunWindowEx = typeof qiankunWindow & Record<string, unknown>;

/**
 * 当前是否运行在 qiankun 容器中（运行时判定）
 */
export const isInQiankun = (): boolean => Boolean(qiankunWindow.__POWERED_BY_QIANKUN__);

/**
 * 主应用透传 routerBase 后，把值写入子应用 window，供 createAppRouter 读取
 * 必须在 createRouter 之前调用
 */
export function applyInjectedRouterBase(base: string | undefined | null): void {
  if (!base) return;
  (qiankunWindow as QiankunWindowEx)[ROUTER_BASE_KEY] = base;
}

/**
 * 解析路由 base
 * - qiankun 容器内：使用主应用通过 props 注入的 routerBase
 * - 否则：使用 env 配置 VITE_BASE_PATH
 */
export function resolveRouterBase(): string {
  if (isInQiankun()) {
    const injected = (qiankunWindow as QiankunWindowEx)[ROUTER_BASE_KEY];
    if (typeof injected === 'string' && injected) return injected;
  }
  return (import.meta.env.VITE_BASE_PATH as string) || '/';
}
