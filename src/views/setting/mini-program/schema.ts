import type { IObjectSchema, IStringSchema, SiteSchema } from '@/plugins/site-config';

/** 不超过 max 个字符，代理对计为 1 个字符 */
const maxLengthPattern = (max: number) => `^(?:[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\s\\S]){0,${max}}$`;

const textField = (title: string, description: string, defaultText: string, max: number): IStringSchema => ({
  type: 'string',
  title,
  description: `${description}，最多 ${max} 个字。留空使用小程序默认值：${defaultText}`,
  pattern: maxLengthPattern(max),
  patternMessage: `不能超过 ${max} 个字`,
  defaultValue: '',
});

export const SERVICE_PHONE_MAX_LENGTH = 20;

export const SERVICE_EMAIL_MAX_LENGTH = 100;

export const SERVICE_PHONE_PATTERN = `^(?=.*\\d)[\\d\\-+ ]{1,${SERVICE_PHONE_MAX_LENGTH}}$`;

export const SERVICE_EMAIL_PATTERN = `^(?=.{1,${SERVICE_EMAIL_MAX_LENGTH}}$)[^\\s@]+@(?:[^\\s@.]+\\.)+[A-Za-z]{2,}$`;

const basic = {
  type: 'object',
  title: '基础信息',
  properties: {
    appName: textField('产品名称', '小程序内展示的产品名称', '备考刷题', 20),
    slogan: textField('宣传语', '产品的一句话介绍', '刷题、模考、错题本，一站式高效备考', 40),
    shareTitle: textField('分享标题', '用户转发小程序时的默认标题', '产品名称', 40),
  },
} satisfies IObjectSchema;

const entity = {
  type: 'object',
  title: '主体信息',
  properties: {
    companyName: textField('公司名称', '小程序运营主体的公司全称', '上海星芸启网络科技有限公司', 60),
    copyright: textField('版权信息', '页面中展示的版权声明', 'Copyright © 2026 上海星芸启网络科技有限公司', 100),
    icpLicense: textField('ICP 备案号', '小程序的 ICP 备案号', '沪ICP备2025155741号-1', 50),
  },
} satisfies IObjectSchema;

const service = {
  type: 'object',
  title: '客服信息',
  properties: {
    servicePhone: {
      type: 'string',
      title: '客服电话',
      description: `用户可拨打的客服电话，只能包含数字、-、+ 和空格，最多 ${SERVICE_PHONE_MAX_LENGTH} 个字符。留空使用小程序默认值：13818234979`,
      pattern: SERVICE_PHONE_PATTERN,
      patternMessage: `只能包含数字、-、+ 和空格，至少含一位数字，不能超过 ${SERVICE_PHONE_MAX_LENGTH} 个字符`,
      defaultValue: '',
    },
    serviceHours: textField('服务时间', '客服的服务时间段', '工作日 9:00-18:00', 40),
    serviceEmail: {
      type: 'string',
      title: '客服邮箱',
      description: `用户可联系的客服邮箱，最多 ${SERVICE_EMAIL_MAX_LENGTH} 个字符。留空使用小程序默认值：不展示`,
      pattern: SERVICE_EMAIL_PATTERN,
      patternMessage: `请输入正确的邮箱地址，不能超过 ${SERVICE_EMAIL_MAX_LENGTH} 个字符`,
      defaultValue: '',
    },
  },
} satisfies IObjectSchema;

/** 小程序配置的编辑器 schema，分组键与 AppProfile 字段的对应关系由 properties 给出 */
export const appProfileSchema = { basic, entity, service } satisfies SiteSchema;

export type AppProfileSectionKey = keyof typeof appProfileSchema;
