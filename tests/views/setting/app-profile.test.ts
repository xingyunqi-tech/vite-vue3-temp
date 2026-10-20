import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, it, expect } from 'vitest';
import {
  APP_PROFILE_FIELD_SECTIONS,
  isUnknownProfilePath,
  normalizeEditorValue,
  toAppProfilePayload,
  toEditorValue,
  toFieldIssues,
  validateAppProfile,
  type AppProfileEditorValue,
  type AppProfileField,
} from '@/views/setting/mini-program/app-profile';
import { appProfileSchema } from '@/views/setting/mini-program/schema';

const editorValueWith = (field: AppProfileField, value: unknown): AppProfileEditorValue => {
  const editor = toEditorValue(null);
  editor[APP_PROFILE_FIELD_SECTIONS[field]][field] = value;
  return editor;
};

const issuesOf = (field: AppProfileField, value: unknown) => validateAppProfile(editorValueWith(field, value));

function axiosError(status: number, data: unknown): AxiosError {
  const response = {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  } as AxiosResponse;
  const error = new AxiosError('failed', 'ERR_BAD_REQUEST', response.config, null, response);
  const body = data as { data?: Record<string, unknown> | null };
  error.errorData = body?.data ?? null;
  return error;
}

describe('小程序配置 schema', () => {
  it('按基础、主体、客服信息分组', () => {
    expect(Object.values(appProfileSchema).map(section => [section.title, Object.keys(section.properties)])).toEqual([
      ['基础信息', ['appName', 'slogan', 'shareTitle']],
      ['主体信息', ['companyName', 'copyright', 'icpLicense']],
      ['客服信息', ['servicePhone', 'serviceHours', 'serviceEmail']],
    ]);
  });

  it('每个字段默认值为空字符串，说明中注明留空使用小程序默认值', () => {
    for (const section of Object.values(appProfileSchema)) {
      for (const field of Object.values(section.properties)) {
        expect(field.defaultValue).toBe('');
        expect(field.description).toMatch(/留空使用小程序默认值：.+/);
      }
    }
    expect(appProfileSchema.basic.properties.appName.description).toContain('备考刷题');
  });

  it.each([
    ['appName', 20],
    ['slogan', 40],
    ['shareTitle', 40],
    ['companyName', 60],
    ['copyright', 100],
    ['icpLicense', 50],
    ['serviceHours', 40],
  ] as const)('%s 最多 %i 个字，按去除首尾空白后计算', (field, max) => {
    expect(issuesOf(field, ` ${'字'.repeat(max)} `)).toEqual([]);
    expect(issuesOf(field, '字'.repeat(max + 1))).toEqual([
      { path: `${APP_PROFILE_FIELD_SECTIONS[field]}.${field}`, message: `不能超过 ${max} 个字` },
    ]);
  });

  it('长度按字符计算，emoji 计为 1 个字', () => {
    expect(issuesOf('appName', '😀'.repeat(20))).toEqual([]);
    expect(issuesOf('appName', '😀'.repeat(21))).toHaveLength(1);
  });

  it('客服电话只允许数字、-、+ 和空格，至少含一位数字，最多 20 个字符', () => {
    expect(issuesOf('servicePhone', '+86 400-123-4567')).toEqual([]);
    expect(issuesOf('servicePhone', '1'.repeat(20))).toEqual([]);
    for (const invalid of ['400#123', '---', '+ -', '1'.repeat(21)]) {
      expect(issuesOf('servicePhone', invalid).map(issue => issue.path)).toEqual(['service.servicePhone']);
    }
  });

  it('客服邮箱需为合法邮箱，顶级域至少 2 个字母，最多 100 个字符', () => {
    expect(issuesOf('serviceEmail', 'service@example.com')).toEqual([]);
    expect(issuesOf('serviceEmail', 'a.b+c@mail.example.cn')).toEqual([]);
    const local = 'a'.repeat(100 - '@example.com'.length);
    expect(issuesOf('serviceEmail', `${local}@example.com`)).toEqual([]);
    for (const invalid of [
      'service@',
      'service@example',
      'service@example.c',
      'a b@example.com',
      `a${local}@example.com`,
    ]) {
      expect(issuesOf('serviceEmail', invalid).map(issue => issue.path)).toEqual(['service.serviceEmail']);
    }
  });

  it('空字符串与空白字符串均合法', () => {
    expect(issuesOf('serviceEmail', '   ')).toEqual([]);
    expect(issuesOf('servicePhone', '')).toEqual([]);
  });

  it('非字符串值与未知字段记为问题', () => {
    expect(issuesOf('appName', null).map(issue => issue.path)).toEqual(['basic.appName']);
    const value = toEditorValue(null);
    value.basic.unknown = 'x';
    expect(validateAppProfile(value).map(issue => issue.path)).toEqual(['basic.unknown']);
  });
});

describe('接口与编辑器值的转换', () => {
  it('平铺对象转为分组对象，null 转为空字符串', () => {
    expect(toEditorValue({ appName: '备考', slogan: null, servicePhone: '400-100' })).toEqual({
      basic: { appName: '备考', slogan: '', shareTitle: '' },
      entity: { companyName: '', copyright: '', icpLicense: '' },
      service: { servicePhone: '400-100', serviceHours: '', serviceEmail: '' },
    });
    expect(toEditorValue(null)).toEqual(toEditorValue({}));
  });

  it('提交时去除首尾空白，空字符串与空白字符串提交 null', () => {
    const value = toEditorValue({ appName: ' 备考 ', slogan: '   ', serviceEmail: 'a@b.cn ' });

    expect(toAppProfilePayload(value)).toEqual({
      appName: '备考',
      slogan: null,
      shareTitle: null,
      companyName: null,
      copyright: null,
      icpLicense: null,
      servicePhone: null,
      serviceHours: null,
      serviceEmail: 'a@b.cn',
    });
  });

  it('归一化只去除字符串首尾空白', () => {
    expect(normalizeEditorValue({ basic: { appName: ' a ', slogan: 1 } })).toEqual({
      basic: { appName: 'a', slogan: 1 },
    });
  });
});

describe('后端字段错误映射', () => {
  it('422 字段错误映射到「分组.字段」路径', () => {
    const error = axiosError(422, {
      code: 422,
      message: '参数错误',
      data: { servicePhone: '客服电话格式不正确', serviceEmail: '邮箱格式不正确', unknown: 'x' },
    });

    expect(toFieldIssues(error)).toEqual([
      { path: 'service.servicePhone', message: '客服电话格式不正确' },
      { path: 'service.serviceEmail', message: '邮箱格式不正确' },
    ]);
  });

  it('非 422 错误或非 axios 错误不映射', () => {
    expect(toFieldIssues(axiosError(500, { code: 500, data: { appName: 'x' } }))).toEqual([]);
    expect(toFieldIssues(axiosError(422, { code: 422, data: null }))).toEqual([]);
    expect(toFieldIssues(new Error('network'))).toEqual([]);
  });
});

describe('未知配置路径', () => {
  it('未知分组与未知字段可忽略，已知字段与分组本身的问题不可忽略', () => {
    expect(isUnknownProfilePath('extra')).toBe(true);
    expect(isUnknownProfilePath('basic.unknown')).toBe(true);
    expect(isUnknownProfilePath('basic.appName')).toBe(false);
    expect(isUnknownProfilePath('basic')).toBe(false);
    expect(isUnknownProfilePath('')).toBe(false);
  });
});
