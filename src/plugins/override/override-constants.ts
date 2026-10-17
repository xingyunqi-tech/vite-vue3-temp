import type { MenuItem } from '@/constants/menu';

/**
 * 常量覆盖工具
 * 按策略合并常量：对象浅合并，原始值/数组整体替换
 *
 * 处于 `@/constants` 的同步加载链上，必须保持运行时零依赖（仅允许 type import），
 * 消费方直接从本文件导入，不要走会带上 api/core/request 的内核 barrel。
 */

/** 常量覆盖配置（静态合并，不经过 initOverrides，模块加载时生效） */
export interface ConstantsOverride {
  /** 覆盖角色常量 */
  roles?: Record<string, string>;
  /** 覆盖菜单列表（整体替换） */
  menuList?: MenuItem[];
  /** 覆盖 API 响应码 */
  apiCode?: Record<string, number>;
  /** 覆盖代理前缀 */
  proxyUri?: Record<string, string>;
  /** 覆盖基础 URI */
  uri?: Record<string, string>;
  /** 覆盖浏览器入口标题；配置路由 meta.title 时显示为「入口标题-路由标题」 */
  appTitle?: string;
  /** 覆盖默认语言 */
  defaultLocale?: string;
  /** 覆盖默认主题 */
  defaultThemeStyle?: string;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 合并常量覆盖配置到默认值
 *
 * 合并策略：
 * - 纯对象 → 浅合并（如 roles: { ADMIN: '1', ASSISTANT: '5' }）
 * - 原始值 / 数组 → 整体替换（如 menuList: [...]、defaultLocale: 'en-US'）
 */
export function mergeConstants<T extends Record<string, unknown>>(
  defaults: T,
  overrides: { [K in keyof T]?: unknown },
): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (val === undefined) continue;
    const def = defaults[key];
    if (isPlainObject(def) && isPlainObject(val)) {
      result[key] = { ...def, ...val } as T[keyof T];
    } else {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}
