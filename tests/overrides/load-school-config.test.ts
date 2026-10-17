import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSchoolConfig } from '@/overrides';
import type { OverrideConfig } from '@/plugins/override';

/**
 * 租户运行时配置的加载与错配告警
 *
 * 学校代码、模块表、常量入口表都从参数注入（生产链路走默认值），不依赖仓库里是否真有租户目录。
 */
const config: OverrideConfig = { router: { whiteList: ['/portal'] } };
const modules = { './demo/index.ts': { default: config } };

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSchoolConfig', () => {
  it('命中租户模块时返回它的默认导出', () => {
    expect(loadSchoolConfig('demo', modules, {})).toBe(config);
    expect(warn).not.toHaveBeenCalled();
  });

  it('没有学校代码时返回 null，且不当成错配', () => {
    expect(loadSchoolConfig(null, modules, {})).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('识别出代码但目录下什么都没有时告警', () => {
    expect(loadSchoolConfig('typo', modules, {})).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(vi.mocked(warn).mock.calls[0][0]).toContain('typo');
  });

  it('只写了 constants.ts 的租户不告警', () => {
    // 常量维度不经过本文件，这种租户是合法配置，返回 null 只表示没有运行时维度
    expect(loadSchoolConfig('demo-constants-only', modules, { './demo-constants-only/constants.ts': {} })).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
