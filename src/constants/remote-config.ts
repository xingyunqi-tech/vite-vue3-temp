import { AGREEMENT_MANAGE_PATH } from './agreement';

export type RemoteConfigType = 'boolean' | 'number' | 'string' | 'json';

export interface RemoteConfigDefinition {
  key: string;
  type: RemoteConfigType;
  /** undefined 表示无默认值 */
  defaultValue?: unknown;
  isPublic: boolean;
  description: string;
  /** number 类型允许的小数位数 */
  precision?: number;
  /** 在专用页面编辑的配置项，值为该页面路径 */
  managedPath?: string;
}

/** 远程配置项，与后端 config-definitions.ts 登记表一致 */
export const REMOTE_CONFIG_DEFINITIONS: readonly RemoteConfigDefinition[] = [
  { key: 'ai.enabled', type: 'boolean', defaultValue: true, isPublic: true, description: 'AI 功能总开关' },
  {
    key: 'ai.dailyBudget',
    type: 'number',
    isPublic: false,
    description: '全站每日成本上限（元），超过即熔断',
    precision: 2,
  },
  { key: 'ai.quota.chat', type: 'number', defaultValue: 20, isPublic: true, description: '用户每日讲题/对话次数' },
  { key: 'ai.quota.grading', type: 'number', defaultValue: 3, isPublic: true, description: '用户每日批改次数' },
  {
    key: 'ai.ratePerMinute',
    type: 'number',
    defaultValue: 10,
    isPublic: false,
    description: '每用户每分钟 AI 请求上限',
  },
  {
    key: 'ai.paperGradingLimit',
    type: 'number',
    defaultValue: 5,
    isPublic: false,
    description: '每份试卷自动批改主观题上限',
  },
  { key: 'ai.model', type: 'string', isPublic: false, description: '当前使用的模型标识' },
  {
    key: 'wrongBook.masterThreshold',
    type: 'number',
    defaultValue: 3,
    isPublic: true,
    description: '错题连续答对阈值',
  },
  {
    key: 'practice.offlineSyncWindowMin',
    type: 'number',
    defaultValue: 5,
    isPublic: false,
    description: '模考离线补交窗口（分钟）',
  },
  { key: 'practice.dailySetSize', type: 'number', defaultValue: 10, isPublic: false, description: '每日一练题量' },
  { key: 'practice.trialSize', type: 'number', defaultValue: 3, isPublic: true, description: '游客试做题数' },
  {
    key: 'paper.generateDailyLimit',
    type: 'number',
    defaultValue: 5,
    isPublic: true,
    description: '每用户每日按规则生成试卷次数',
  },
  { key: 'consent.privacyPolicyVersion', type: 'string', isPublic: true, description: '隐私政策当前版本' },
  { key: 'consent.userAgreementVersion', type: 'string', isPublic: true, description: '用户协议当前版本' },
  { key: 'consent.aiServiceVersion', type: 'string', isPublic: true, description: 'AI 服务声明当前版本' },
  {
    key: 'agreement.userAgreement',
    type: 'string',
    isPublic: true,
    description: '用户协议正文（HTML），未配置时小程序显示内置文本',
    managedPath: AGREEMENT_MANAGE_PATH,
  },
  {
    key: 'agreement.privacyPolicy',
    type: 'string',
    isPublic: true,
    description: '隐私政策正文（HTML），未配置时小程序显示内置文本',
    managedPath: AGREEMENT_MANAGE_PATH,
  },
  {
    key: 'agreement.aiService',
    type: 'string',
    isPublic: true,
    description: 'AI 服务声明正文（HTML），未配置时小程序显示内置文本',
    managedPath: AGREEMENT_MANAGE_PATH,
  },
  { key: 'alert.thresholds', type: 'json', isPublic: false, description: '各监控项告警阈值' },
];

export const REMOTE_CONFIG_TYPE_LABEL: Record<RemoteConfigType, string> = {
  boolean: '布尔',
  number: '数字',
  string: '文本',
  json: 'JSON',
};
