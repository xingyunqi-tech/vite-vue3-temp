/**
 * 系统常量定义（纯默认值）
 */

/** 默认 API 响应状态码 */
export const DEFAULT_API_CODE = {
  /** 成功 */
  SUCCESS: 200,
} as const;

/**
 * 智慧树平台 API Host
 *
 * 开发环境由 VITE_PLATFORM_HOST 指向 /cloud 走 devServer 反代（见 config/devServer.ts），
 * 未配置时回落到线上域名。
 */
export const PLATFORM_HOST = (import.meta.env && import.meta.env.VITE_PLATFORM_HOST) || '//cloudapi.polymas.com';

/** 默认服务代理前缀 */
export const DEFAULT_PROXY_URI = {
  LOCAL: '/localService',
} as const;

/** 默认语言 */
export const DEFAULT_LOCALE_VALUE = 'zh-CN';

/** 浏览器默认标题，由 `@/constants` 导出为 APP_TITLE */
export const DEFAULT_APP_TITLE = 'Vite Vue3 App';

/** 默认主题 */
export const DEFAULT_THEME_STYLE_VALUE = 'light';

/**
 * 项目品牌主色（与 src/styles/theme.scss 的 --polymas-color-theme 对齐）
 *
 * 三处共用的唯一来源：`public/assets/theme.css` 的生成 seed（scripts/cssVars/genThemeCss.ts）、
 * 站点主题运行时派生的基准、设置页主题色的默认值。
 */
export const BRAND_PRIMARY = 'rgb(21 70 242)';

/**
 * 默认首页落点：读站点配置的 basic.defaultPage 解析不出可用路径时的内置落点
 */
export const DEFAULT_PAGE = '/home';

/**
 * 语言包选项
 */
export enum LOCALE_TYPE {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
}
