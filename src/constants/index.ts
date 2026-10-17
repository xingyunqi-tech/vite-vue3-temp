/**
 * 常量统一导出文件（唯一合并点）
 *
 * 各常量模块只定义纯默认值，覆盖合并统一在此处完成。
 * 消费方统一从 @/constants 导入，不直接从子模块导入。
 *
 * 新增常量只需 2 步：
 * 1. 在定义文件（roles/menu/system.ts）中添加默认值
 * 2. 在下方 DEFAULTS 中添加映射 + 底部补一行 export
 *
 * 启用了多租户定制体系时，还要在它的常量覆盖接口里补上同名字段——
 * 下方合并处的 satisfies 会校验两边字段完整对齐，漏一个直接编译失败。
 * 该特性未启用时合并块被整体裁掉，merged 即 DEFAULTS 本身，对外导出面完全一致。
 */
import { DEFAULT_MENU_LIST } from './menu';
import { DEFAULT_ROLES } from './roles';
import {
  DEFAULT_API_CODE,
  DEFAULT_APP_TITLE,
  DEFAULT_PROXY_URI,
  DEFAULT_LOCALE_VALUE,
  DEFAULT_THEME_STYLE_VALUE,
} from './system';
// #if overrides
import { applyConstantsOverrides } from '@/overrides/constants';
import type { ConstantsOverride } from '@/plugins/override';
// #endif

// ==================== 默认值映射 ====================

const DEFAULTS = {
  roles: DEFAULT_ROLES,
  menuList: DEFAULT_MENU_LIST,
  apiCode: DEFAULT_API_CODE,
  proxyUri: DEFAULT_PROXY_URI,
  uri: {} as Record<string, string>,
  appTitle: DEFAULT_APP_TITLE,
  defaultLocale: DEFAULT_LOCALE_VALUE,
  defaultThemeStyle: DEFAULT_THEME_STYLE_VALUE,
};

// ==================== 统一合并 ====================

const merged = { ...DEFAULTS };
// #if overrides
// 内联 satisfies：既校验 DEFAULTS 覆盖了 ConstantsOverride 的每个字段，
// 又把对该类型的引用限制在本块内，特性关闭时不留下悬空 import。
// 覆盖优先级（默认值 < 部署级 < 学校级）由 applyConstantsOverrides 内部保证。
Object.assign(merged, applyConstantsOverrides(DEFAULTS satisfies Required<ConstantsOverride>));
// #endif

// ==================== 导出 ====================

export const ROLES = merged.roles;
export const menuList = merged.menuList;
export const API_CODE = merged.apiCode;
export const PROXY_URI = merged.proxyUri;
export const URI = { LOCAL_V1: `${PROXY_URI.LOCAL}/local/v1`, ...merged.uri };
// 空串 / 纯空格视为租户没配，回落标准标题：拼接式标题里入口标题为空会渲染成「-路由标题」
export const APP_TITLE = merged.appTitle.trim() || DEFAULT_APP_TITLE;
export const DEFAULT_LOCALE = merged.defaultLocale;
export const DEFAULT_THEME_STYLE = merged.defaultThemeStyle;

// 直接透传（无需覆盖）
export { LOCALE_TYPE, PLATFORM_HOST } from './system';
export { IDENTITY_ROLE_TYPE, mapIdentityToRole, resolveIdentityTypes } from './roles';
export type { RoleType, UserIdentityItem } from './roles';
export type { MenuItem } from './menu';
