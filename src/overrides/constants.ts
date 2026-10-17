import deploymentConstants from './deployment';
import { getSchoolCode } from './registry';
import type { ConstantsOverride } from '@/plugins/override/override-constants';
import { mergeConstants } from '@/plugins/override/override-constants';

/**
 * Override 系统 - 常量维度入口，由 `@/constants` 在模块加载期同步消费
 *
 * 这条链上的任何模块都不得引用 `@/constants`，否则成环、常量读到 undefined。因此：
 * - 本文件只依赖 `./deployment`、`./registry` 和零依赖的 `override-constants`（不走内核 barrel）；
 * - 只 glob 租户的 `constants.ts`，租户 `index.ts`（可自由引用 `@/constants`）由 `./index.ts` 另行加载；
 * - 租户 `constants.ts` 自身不得 import `@/constants`。
 */

/** 租户常量模块（`overrides/{学校代码}/constants.ts` 的默认导出） */
type SchoolConstantsModule = { default: ConstantsOverride };

/** 自动扫描各租户的常量覆盖，只 glob constants.ts，不触碰租户 index.ts */
const schoolConstantsModules = import.meta.glob<SchoolConstantsModule>('./*/constants.ts', { eager: true });

/** 加载指定学校的常量覆盖，匹配不到时返回空对象；参数默认值即生产链路，显式传参供测试注入 */
export function loadSchoolConstants(
  code: string | null = getSchoolCode(),
  modules: Record<string, SchoolConstantsModule> = schoolConstantsModules,
): ConstantsOverride {
  if (!code) return {};
  return modules[`./${code}/constants.ts`]?.default ?? {};
}

/**
 * 依次合并部署级、学校级常量覆盖，优先级：默认值 < 部署级 < 学校级
 *
 * 分两次 mergeConstants 而不是先展开成一份：对象类字段（如 `proxyUri`）要逐 key 合并，
 * 学校只覆盖其中一个 key 时不能抹掉部署级的其余 key。
 */
export function applyConstantsOverrides(
  defaults: Required<ConstantsOverride>,
  deployment: ConstantsOverride = deploymentConstants,
  school: ConstantsOverride = loadSchoolConstants(),
): Required<ConstantsOverride> {
  return mergeConstants(mergeConstants(defaults, deployment), school);
}
