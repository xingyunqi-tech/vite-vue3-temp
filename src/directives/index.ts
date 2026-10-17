import type { App } from 'vue';
import { role } from './role';

/**
 * 注册全局指令
 */
export function setupDirectives(app: App) {
  app.directive('role', role);
}
