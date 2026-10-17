import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_TITLE } from '@/constants/system';
import type { ConstantsOverride } from '@/plugins/override/override-constants';
import { mergeConstants } from '@/plugins/override/override-constants';

/**
 * 入口标题走常量维度：租户写在 `overrides/{学校代码}/constants.ts` 的 appTitle，
 * 经 `@/constants` 合并后导出为 APP_TITLE，供 router/title.ts 与页面共用。
 */
async function loadAppTitle(school: ConstantsOverride = {}) {
  vi.resetModules();
  vi.doMock('@/overrides/constants', () => ({
    // 复用真实合并函数，保留「undefined 跳过」等策略，只替换租户配置的来源
    applyConstantsOverrides: (defaults: Record<string, unknown>) =>
      mergeConstants(defaults, school as Record<string, unknown>),
  }));
  return (await import('@/constants')).APP_TITLE;
}

afterEach(() => {
  vi.doUnmock('@/overrides/constants');
  vi.resetModules();
});

describe('入口标题的常量覆盖', () => {
  it('租户配置 appTitle 时取租户值', async () => {
    await expect(loadAppTitle({ appTitle: '湘雅智学' })).resolves.toBe('湘雅智学');
  });

  it.each([undefined, '', '  '])('租户值为 %s 时回落标准标题', async appTitle => {
    await expect(loadAppTitle({ appTitle })).resolves.toBe(DEFAULT_APP_TITLE);
  });
});
