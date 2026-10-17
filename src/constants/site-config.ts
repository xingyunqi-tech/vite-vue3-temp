/**
 * 站点配置项定义
 * 新增/修改配置只需编辑此文件
 */
import { DEFAULT_THEME_STYLE } from '@/constants';
import { DEFAULT_PAGE } from '@/constants/system';
import type { SiteSchema } from '@/plugins/site-config/types';

export const siteConfigSchema = {
  basic: {
    type: 'object',
    title: '基本配置',
    description: '系统基本信息配置',
    properties: {
      systemTitle: {
        type: 'string',
        title: '系统标题',
        inputType: 'text',
        required: true,
        defaultValue: '备考刷题运营后台',
        span: 12,
      },
      defaultPage: {
        type: 'string',
        title: '默认页面',
        description: '登录后跳转的默认页面路径',
        inputType: 'text',
        required: true,
        // (?!/) 挡住 `//evil.com`：它能过 `^/`，但 vue-router 会当成协议相对 URL，
        pattern: '^/(?!/)',
        patternMessage: '应为以单个 / 开头的站内路径',
        defaultValue: DEFAULT_PAGE,
        span: 12,
      },
      logoUrl: {
        type: 'string',
        title: 'Logo',
        description: '系统 Logo 图片，支持上传或输入 URL',
        inputType: 'image',
        // 未接 uploader 时图片会以 base64 内联进配置，务必卡住体积
        maxSize: 200 * 1024,
        defaultValue: '',
        span: 24,
      },
    },
  },
  theme: {
    type: 'object',
    title: '主题配置',
    description: '站点级主题声明；用户自己切换的明暗模式是会话态偏好，存在 globalStore，不受这里影响',
    properties: {
      defaultMode: {
        type: 'string',
        title: '默认主题',
        description: '用户首次访问时的明暗模式，之后以用户自己的切换为准',
        enumType: ['light', 'dark'] as const,
        enumLabels: { light: '浅色', dark: '深色' },
        defaultValue: DEFAULT_THEME_STYLE,
        span: 12,
      },
    },
  },
  watermark: {
    type: 'object',
    title: '水印配置',
    description: '页面水印显示配置',
    properties: {
      enabled: {
        type: 'boolean',
        title: '启用水印',
        defaultValue: false,
        span: 24,
      },
      content: {
        type: 'string',
        title: '水印内容',
        inputType: 'text',
        required: true,
        defaultValue: 'admin',
        span: 12,
      },
      color: {
        type: 'string',
        title: '水印颜色',
        description: '支持透明度，可通过颜色选择器调整',
        inputType: 'color',
        alpha: true,
        defaultValue: 'rgba(0,0,0,0.15)',
        span: 12,
      },
      fontSize: {
        type: 'number',
        title: '字体大小',
        inputType: 'input',
        min: 12,
        max: 48,
        defaultValue: 16,
        span: 12,
      },
      fontWeight: {
        type: 'string',
        title: '字体粗细',
        enumType: ['normal', 'bold', '300', '400', '500', '600', '700'] as const,
        defaultValue: 'normal',
        span: 12,
      },
      rotate: {
        type: 'number',
        title: '旋转角度',
        inputType: 'slider',
        min: -90,
        max: 90,
        defaultValue: -22,
        span: 24,
      },
      gapX: {
        type: 'number',
        title: '水平间距',
        inputType: 'input',
        min: 50,
        max: 500,
        defaultValue: 200,
        span: 12,
      },
      gapY: {
        type: 'number',
        title: '垂直间距',
        inputType: 'input',
        min: 50,
        max: 500,
        defaultValue: 150,
        span: 12,
      },
    },
  },
} as const satisfies SiteSchema;
