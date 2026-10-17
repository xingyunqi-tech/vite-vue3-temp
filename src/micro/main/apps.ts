import type { MicroAppConfig } from '../shared/types';

/**
 * 主应用静态注册的子应用列表
 * 业务侧也可以运行时通过 registerMicroApp() 动态追加
 */
const microApps: MicroAppConfig[] = [
  // 示例：
  // {
  //   name: 'example',
  //   entry: import.meta.env.DEV ? '//localhost:3001/' : '/sub-apps/example/',
  //   routerBase: '/example',
  // },
];

const registry = new Map<string, MicroAppConfig>(microApps.map(app => [app.name, app]));

/** 注册（或覆盖）一个子应用配置 */
export function registerMicroApp(config: MicroAppConfig): void {
  registry.set(config.name, config);
}

/** 取消注册 */
export function unregisterMicroApp(name: string): void {
  registry.delete(name);
}

/** 获取子应用配置 */
export function getMicroAppConfig(name: string): MicroAppConfig | undefined {
  return registry.get(name);
}

/** 获取全部已注册子应用 */
export function listMicroApps(): MicroAppConfig[] {
  return Array.from(registry.values());
}
