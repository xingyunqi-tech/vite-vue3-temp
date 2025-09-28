/**
 * 语言包枚举
 */
export enum LocaleList {
  'zh-CN',
  'en-US',
}
/**
 * 语言包类型
 */
export type LocaleKey = keyof typeof LocaleList;

/**
 * 主题样式枚举
 */
export enum ThemeStyleList {
  'light',
  'dark',
}
/**
 * 主题样式类型
 */
export type ThemeStyleKey = keyof typeof ThemeStyleList;
