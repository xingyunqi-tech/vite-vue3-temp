/**
 * 常量统一导出文件
 *
 * 消费方统一从 @/constants 导入，不直接从子模块导入。
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

export const ROLES = DEFAULT_ROLES;
export const menuList = DEFAULT_MENU_LIST;
export const API_CODE = DEFAULT_API_CODE;
export const PROXY_URI = DEFAULT_PROXY_URI;
export const URI = { LOCAL_V1: `${PROXY_URI.LOCAL}/local/v1` };
export const APP_TITLE = DEFAULT_APP_TITLE;
export const DEFAULT_LOCALE = DEFAULT_LOCALE_VALUE;
export const DEFAULT_THEME_STYLE = DEFAULT_THEME_STYLE_VALUE;

export { LOCALE_TYPE, LOGIN_PATH, TOKEN_KEY } from './system';
export type { RoleType } from './roles';
export type { MenuItem } from './menu';
