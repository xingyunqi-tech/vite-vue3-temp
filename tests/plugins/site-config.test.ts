import { describe, it, expect } from 'vitest';
import { siteConfigSchema } from '@/constants/site-config';
import { defaultSiteConfig, diffConfig, mergeConfig, validateConfig, dataUrlByteSize } from '@/plugins/site-config';

const { fontSize } = siteConfigSchema.watermark.properties;
const { logoUrl } = siteConfigSchema.basic.properties;

/** 造一个超过内联上限的 data URL */
const oversizedDataUrl = (bytes: number) => `data:image/png;base64,${'A'.repeat(Math.ceil((bytes * 4) / 3))}`;

describe('mergeConfig', () => {
  it('缺省字段回落 schema 默认值', () => {
    const merged = mergeConfig({ basic: { systemTitle: '自定义' } });
    expect(merged.basic.systemTitle).toBe('自定义');
    expect(merged.basic.defaultPage).toBe(defaultSiteConfig.basic.defaultPage);
  });

  it('产物与默认值不共享实例', () => {
    // 共享实例时任一处原地修改都会污染整个会话的默认值
    const merged = mergeConfig({});
    expect(merged.watermark).not.toBe(defaultSiteConfig.watermark);
  });
});

describe('validateConfig', () => {
  it('未知分组与未知字段被剔除并记入 issues', () => {
    const { value, issues } = validateConfig({ nope: {}, basic: { unknownField: 1 } });
    expect(value).not.toHaveProperty('nope');
    expect(value.basic).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['nope', 'basic.unknownField']);
  });

  it('类型不符的值被剔除', () => {
    const { value, issues } = validateConfig({ watermark: { enabled: 'yes' } });
    expect(value.watermark).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['watermark.enabled']);
  });

  it('越界数值收敛到边界而非剔除', () => {
    // 用户意图明确，只是超出范围
    expect(validateConfig({ watermark: { fontSize: fontSize.max + 1 } }).value.watermark?.fontSize).toBe(fontSize.max);
    expect(validateConfig({ watermark: { fontSize: fontSize.min - 1 } }).value.watermark?.fontSize).toBe(fontSize.min);
  });

  it('非法枚举值被剔除', () => {
    const { value } = validateConfig({ theme: { defaultMode: 'rainbow' } });
    expect(value.theme).toEqual({});
  });

  it('required 字段不接受空串', () => {
    const { value, issues } = validateConfig({ basic: { systemTitle: '  ' } });
    expect(value.basic).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['basic.systemTitle']);
  });

  it('defaultPage 必须是站内单斜杠路径', () => {
    expect(validateConfig({ basic: { defaultPage: '//evil.com' } }).value.basic).toEqual({});
    expect(validateConfig({ basic: { defaultPage: '/home' } }).value.basic?.defaultPage).toBe('/home');
  });

  it('解析不了的颜色被剔除', () => {
    const { value, issues } = validateConfig({ theme: { primaryColor: 'not-a-color' } });
    expect(value.theme).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['theme.primaryColor']);
  });

  it('水印色允许透明度，主题色不允许', () => {
    // watermark.color 的默认值本身就带 alpha，schema 必须声明 alpha: true
    expect(validateConfig({ watermark: { color: 'rgba(0,0,0,0.15)' } }).value.watermark?.color).toBe(
      'rgba(0,0,0,0.15)',
    );
    const { value, issues } = validateConfig({ theme: { primaryColor: 'rgba(0,0,0,0.5)' } });
    expect(value.theme).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['theme.primaryColor']);
  });

  it('超过上限的内联图片被剔除', () => {
    const { value, issues } = validateConfig({ basic: { logoUrl: oversizedDataUrl(logoUrl.maxSize + 1024) } });
    expect(value.basic).toEqual({});
    expect(issues.map(i => i.path)).toEqual(['basic.logoUrl']);
  });

  it('根节点不是对象时整体丢弃', () => {
    expect(validateConfig('oops').value).toEqual({});
    expect(validateConfig(undefined).issues).toEqual([]);
  });
});

describe('diffConfig', () => {
  it('等于默认值的字段不落库', () => {
    // 否则用户点一次保存就把当时的全部默认值冻进存储，此后改 schema 默认值对他永远不生效
    const diff = diffConfig({ basic: { systemTitle: defaultSiteConfig.basic.systemTitle, defaultPage: '/chat' } });
    expect(diff.basic).toEqual({ defaultPage: '/chat' });
  });

  it('颜色按解析结果比对，不比字符串写法', () => {
    // 取色器会把 rgb(21 70 242) 归一化成 #1546f2，比字符串会误判成改过
    const diff = diffConfig({ theme: { primaryColor: '#1546f2' } });
    expect(diff.theme).toBeUndefined();
  });

  it('全部维持默认时产出空对象', () => {
    expect(diffConfig(defaultSiteConfig)).toEqual({});
  });
});

describe('dataUrlByteSize', () => {
  it('按 base64 长度估算原始字节数', () => {
    expect(dataUrlByteSize('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlByteSize('data:image/png;base64,AAA=')).toBe(2);
    expect(dataUrlByteSize('data:image/png;base64,AA==')).toBe(1);
  });
});
