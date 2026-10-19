import { describe, it, expect } from 'vitest';
import { REMOTE_CONFIG_DEFINITIONS, type RemoteConfigDefinition } from '@/constants/remote-config';
import { formatConfigValue, parseDraft, toDraft } from '@/views/system/config/config-value';

const definition = (overrides: Partial<RemoteConfigDefinition>): RemoteConfigDefinition => ({
  key: 'k',
  type: 'number',
  isPublic: false,
  description: '',
  ...overrides,
});

describe('配置项登记表', () => {
  it('列出通用配置接口可读写的全部配置项且 key 不重复，专用接口管理的 app.profile 不在其中', () => {
    const keys = REMOTE_CONFIG_DEFINITIONS.map(item => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      'ai.enabled',
      'ai.dailyBudget',
      'ai.quota.chat',
      'ai.quota.grading',
      'ai.ratePerMinute',
      'ai.paperGradingLimit',
      'ai.model',
      'wrongBook.masterThreshold',
      'practice.offlineSyncWindowMin',
      'practice.dailySetSize',
      'practice.trialSize',
      'paper.generateDailyLimit',
      'consent.privacyPolicyVersion',
      'consent.userAgreementVersion',
      'consent.aiServiceVersion',
      'agreement.userAgreement',
      'agreement.privacyPolicy',
      'agreement.aiService',
      'alert.thresholds',
    ]);
    expect(keys).not.toContain('app.profile');
  });

  it('协议正文配置项指向协议管理页', () => {
    const managed = REMOTE_CONFIG_DEFINITIONS.filter(item => item.managedPath).map(item => item.key);
    expect(managed).toEqual(['agreement.userAgreement', 'agreement.privacyPolicy', 'agreement.aiService']);
    expect(new Set(REMOTE_CONFIG_DEFINITIONS.map(item => item.managedPath).filter(Boolean))).toEqual(
      new Set(['/system/agreement']),
    );
  });
});

describe('formatConfigValue', () => {
  it('按类型展示', () => {
    expect(formatConfigValue('boolean', true)).toBe('开启');
    expect(formatConfigValue('boolean', false)).toBe('关闭');
    expect(formatConfigValue('number', 0)).toBe('0');
    expect(formatConfigValue('string', 'v1')).toBe('v1');
    expect(formatConfigValue('json', { a: 1 })).toBe('{"a":1}');
  });

  it('无值时展示占位符', () => {
    expect(formatConfigValue('number', undefined)).toBe('—');
    expect(formatConfigValue('json', null)).toBe('—');
  });
});

describe('toDraft', () => {
  it('有值时用当前值，无值时回落默认值', () => {
    expect(toDraft(definition({ defaultValue: 3 }), 5)).toBe(5);
    expect(toDraft(definition({ defaultValue: 3 }), undefined)).toBe(3);
    expect(toDraft(definition({ type: 'boolean', defaultValue: true }), undefined)).toBe(true);
  });

  it('无值也无默认值时给出类型空值', () => {
    expect(toDraft(definition({ type: 'number' }), undefined)).toBeUndefined();
    expect(toDraft(definition({ type: 'string' }), undefined)).toBe('');
    expect(toDraft(definition({ type: 'boolean' }), undefined)).toBe(false);
    expect(toDraft(definition({ type: 'json' }), undefined)).toBe('{}');
  });

  it('json 转为格式化文本', () => {
    expect(toDraft(definition({ type: 'json' }), { a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('parseDraft', () => {
  it('合法草稿转为配置值', () => {
    expect(parseDraft('boolean', false)).toEqual({ ok: true, value: false });
    expect(parseDraft('number', 0)).toEqual({ ok: true, value: 0 });
    expect(parseDraft('string', '  v2 ')).toEqual({ ok: true, value: 'v2' });
    expect(parseDraft('json', '{"queue":{"backlog":100}}')).toEqual({ ok: true, value: { queue: { backlog: 100 } } });
  });

  it('非法草稿给出提示', () => {
    expect(parseDraft('number', undefined)).toEqual({ ok: false, message: '请输入数字' });
    expect(parseDraft('number', null)).toEqual({ ok: false, message: '请输入数字' });
    expect(parseDraft('string', '  ')).toEqual({ ok: false, message: '请输入内容' });
    expect(parseDraft('json', '{a:1}')).toEqual({ ok: false, message: 'JSON 格式不正确' });
    expect(parseDraft('json', '')).toEqual({ ok: false, message: '请输入 JSON' });
    expect(parseDraft('json', '[1]')).toEqual({ ok: false, message: 'JSON 须为对象' });
    expect(parseDraft('json', 'null')).toEqual({ ok: false, message: 'JSON 须为对象' });
    expect(parseDraft('json', '3')).toEqual({ ok: false, message: 'JSON 须为对象' });
  });
});
