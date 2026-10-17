/**
 * 站点主题：把用户配置的 seed 交给 @aix/theme 派生，算出要写到 :root 的覆盖变量
 *
 * **不要在这里自己实现颜色算法**：`public/assets/theme.css` 由
 * `scripts/cssVars/genThemeCss.ts` 调 @aix/theme 的 `generateThemeCSS` 生成，
 * 运行时另起一套推导必然与静态 CSS 对不齐。故复刻它内部的同一条链路：
 *
 *     deriveThemeTokens(seed)   →  light tokens
 *     applyDarkAlgorithm(light) →  dark tokens
 *
 * 再用 computeTokenDiff 只取「与品牌基准的差异」，避免把几百个 token 全量写成行内样式。
 *
 * 纯函数，不碰 DOM，便于测试。
 */
import {
  applyDarkAlgorithm,
  computeTokenDiff,
  defaultSeedTokens,
  deriveThemeTokens,
  parseColor,
  parseColorWithAlpha,
  tokensToCSSVars,
  type SeedTokens,
  type ThemeMode,
  type ThemeTokens,
} from '@aix/theme';
import { BRAND_PRIMARY } from '@/constants/system';

export type { ThemeMode };

/** 站点配置里可调的 seed 子集 */
export interface ISiteThemeSeed {
  /** 主题色 */
  primaryColor: string;
  /** 基准圆角（px） */
  borderRadius: number;
}

/**
 * 颜色是否可被 @aix/theme 解析
 *
 * 它的 parseColor 对非法输入是 throw 而非返回空，校验场景需要布尔语义。
 */
export function isValidColor(value: string): boolean {
  try {
    parseColor(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 两个颜色是否等值
 *
 * 必须按解析结果比而不是比字符串：取色器确定时 emit 的是归一化后的写法（`#1546f2`），
 * 而 schema 默认值写的是 `rgb(21 70 242)`，同一个颜色两种写法，字符串比较会判成「改过」。
 * 任一侧解析不了时退回字符串比较。
 */
export function isSameColor(a: string, b: string): boolean {
  try {
    const x = parseColorWithAlpha(a);
    const y = parseColorWithAlpha(b);
    return x.r === y.r && x.g === y.g && x.b === y.b && x.a === y.a;
  } catch {
    return a === b;
  }
}

/**
 * 颜色是否带透明度（解析不了时按「不带」处理，交给 isValidColor 报错）
 */
export function hasAlpha(value: string): boolean {
  try {
    return parseColorWithAlpha(value).a < 1;
  } catch {
    return false;
  }
}

/**
 * 按 seed 与明暗模式派生整套 token
 * 与 generateThemeCSS 内部完全一致：先 light，再由 darkAlgorithm 变换
 */
function tokensFor(seed: Partial<SeedTokens>, mode: ThemeMode): ThemeTokens {
  const light = deriveThemeTokens({ ...defaultSeedTokens, ...seed });
  return mode === 'dark' ? applyDarkAlgorithm(light) : light;
}

/** 品牌基准 token 与模式一一对应且恒定，缓存避免每次调用都重跑整套派生 */
const baselineCache = new Map<ThemeMode, ThemeTokens>();
function baselineTokens(mode: ThemeMode): ThemeTokens {
  let tokens = baselineCache.get(mode);
  if (!tokens) {
    tokens = tokensFor({ colorPrimary: BRAND_PRIMARY }, mode);
    baselineCache.set(mode, tokens);
  }
  return tokens;
}

/**
 * Element Plus 的桥接变量
 *
 * 圆角必须桥接：Element 组件读 `--el-border-radius-*`，与 `--aix-borderRadius` 毫无关系，
 * 漏掉就会「aix 组件圆角变了、Element 组件没变」。
 */
function bridgeVars(tokens: ThemeTokens): Record<string, string> {
  return {
    '--el-border-radius-base': tokens.borderRadius,
    '--el-border-radius-small': tokens.borderRadiusSM,
  };
}

/**
 * 由站点主题配置推导出要写到 :root 的 CSS 变量
 *
 * @returns 仅包含与品牌基准不同的变量；配置维持默认时返回空对象（无需覆盖静态 CSS）
 */
export function deriveThemeVars(seed: ISiteThemeSeed, mode: ThemeMode): Record<string, string> {
  const primary = isValidColor(seed.primaryColor) ? seed.primaryColor : BRAND_PRIMARY;
  const radius = Number.isFinite(seed.borderRadius) && seed.borderRadius >= 0 ? seed.borderRadius : undefined;

  const baseline = baselineTokens(mode);
  const target = tokensFor({ colorPrimary: primary, ...(radius === undefined ? {} : { borderRadius: radius }) }, mode);

  const vars: Record<string, string> = tokensToCSSVars(computeTokenDiff(baseline, target) as ThemeTokens);

  // 桥接变量同样只在与基准不同时才写
  const baselineBridge = bridgeVars(baseline);
  for (const [name, value] of Object.entries(bridgeVars(target))) {
    if (value !== baselineBridge[name]) vars[name] = value;
  }

  return vars;
}
