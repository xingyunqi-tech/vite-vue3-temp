import { initGlobalState, type MicroAppStateActions } from 'qiankun';

/** 全局共享状态结构（按需扩展） */
export interface GlobalState {
  user?: {
    id?: string | number;
    name?: string;
    roles?: string[];
  };
  token?: string;
  theme?: 'light' | 'dark';
  locale?: string;
  [key: string]: unknown;
}

let actions: MicroAppStateActions | null = null;

/**
 * 初始化主应用全局状态（仅主应用调用一次）
 */
export function setupGlobalState(initial: GlobalState = {}): MicroAppStateActions {
  if (!actions) {
    actions = initGlobalState(initial);
  }
  return actions;
}

/**
 * 获取已初始化的 actions（未初始化时返回 null）
 */
export function getGlobalActions(): MicroAppStateActions | null {
  return actions;
}

/** 主应用更新全局状态 */
export function setGlobalState(patch: Partial<GlobalState>): void {
  actions?.setGlobalState(patch);
}
