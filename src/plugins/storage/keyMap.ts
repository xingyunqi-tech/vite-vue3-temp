/**
 * cookie的key集合
 */
export const cookieKey = [
  'session_id', // session_id
  'currentLanguage', // 当前语言
] as const;

// 定义动态key前缀
export const SHORTCUT_PREFIX = 'SHORTCUT_DATA_';

/**
 * sessionStorage的key集合
 *
 * 注意：除了这里列出的key外，还支持以下动态key:
 * - SHORTCUT_DATA_${string}: 用于ShortcutActions组件存储临时数据
 */
export const sessionStorageKey = [
  'session_id', // 登录态
] as const;

/**
 * localStorage的key集合
 */
export const localStorageKey = [
  'locale', // 语言
  'theme', // 主题
  'token', // 登录态
] as const;

/**
 * IndexedDB的key集合
 */
export const indexedDBNameKey = [
  'db_name', // 数据库名称
] as const;

/**
 * IndexedDB的表名称集合
 */
export const indexedDBTableNameKey = [
  'db_table_name', // 表名称
] as const;
