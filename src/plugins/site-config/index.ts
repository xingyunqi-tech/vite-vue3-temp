/**
 * 站点配置内核：默认值提取、合并、差分与校验
 *
 * 内核放 plugins，配置数据放别处：
 * schema 本体在 `@/constants/site-config`。
 * 内部分层见 ./types.ts 顶部说明。
 */

import { siteConfigSchema } from '@/constants/site-config';
import { hasAlpha, isSameColor, isValidColor } from '@/plugins/site-config/color';
import type {
  SiteSchema,
  IFieldSchema,
  IArrayFieldSchema,
  IPropertySchema,
  InferSiteConfig,
} from '@/plugins/site-config/types';

export * from '@/plugins/site-config/types';
export * from '@/plugins/site-config/color';
// 刻意不 re-export ./source：它反过来依赖本文件的 SiteConfigOverrides，
// 收进 barrel 就成环。需要存储源的从 '@/plugins/site-config/source' 直接引入。

export type SiteConfig = InferSiteConfig<typeof siteConfigSchema>;

/**
 * 用户覆盖项：分组可缺省，分组内字段也可缺省
 *
 * `Partial<SiteConfig>` 只是浅层可选（分组一旦出现就要求字段齐全），而本体系存的
 * 是**字段级**覆盖项——store 里那份、diffConfig 的产物、validateConfig 的产物都是
 * 分组不完整的。用 Partial<SiteConfig> 描述它们只能靠 `as unknown as` 蒙过去。
 */
export type SiteConfigOverrides = {
  [K in keyof SiteConfig]?: Partial<SiteConfig[K]>;
};

// ==================== 工具函数 ====================

/**
 * 从 schema 中提取默认值
 */
export function extractDefaults(schema: SiteSchema): SiteConfig {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [sectionKey, section] of Object.entries(schema)) {
    const obj: Record<string, unknown> = {};
    for (const [fieldKey, field] of Object.entries(section.properties)) {
      // 必须深拷贝：直接引用会让 defaultSiteConfig 与 schema 共享同一个数组/对象实例，
      // 消费侧一次原地修改就污染整个会话的默认值（defaultValue 在类型上已必填，无需兜底）
      obj[fieldKey] = structuredClone(field.defaultValue);
    }
    result[sectionKey] = obj;
  }
  return result as unknown as SiteConfig;
}

export const defaultSiteConfig: SiteConfig = extractDefaults(siteConfigSchema);

/**
 * 按 section 合并配置，custom 覆盖默认值
 * - 每个 section 内的字段：custom 有值则覆盖，否则保留默认值
 * - 数组字段：整体替换（不做元素级合并）
 */
export function mergeConfig(custom: SiteConfigOverrides): SiteConfig {
  const result: Record<string, unknown> = {};
  for (const [key, defaultVal] of Object.entries(defaultSiteConfig)) {
    const customVal = (custom as Record<string, unknown>)[key];
    // 默认值同样深拷贝，避免每次合并出的配置都指回 defaultSiteConfig 的同一批实例
    result[key] = {
      ...structuredClone(defaultVal as Record<string, unknown>),
      ...((customVal ?? {}) as Record<string, unknown>),
    };
  }
  return result as unknown as SiteConfig;
}

/**
 * 剥掉与默认值相同的字段，只留下真正的覆盖项（mergeConfig 的逆操作）
 *
 * 设置页交给 save() 的是**完整**配置（草稿从 mergeConfig 的结果克隆而来）。
 * 若原样持久化，用户点一次保存就把当时的全部默认值冻进了 IndexedDB——此后再改
 * schema 里已有字段的 defaultValue 对他永远不生效。故存之前先在此收敛。
 *
 * - section 以 defaultSiteConfig 为准（与 mergeConfig 对齐，未知 section 本就会被合并丢弃）
 * - 字段值用 JSON 序列化比较，数组/对象整体比对；颜色字段例外，见 isUnchanged
 * - 未知字段已由 validateConfig 在入库前剔除（并记入 issues 提示用户），此处不再特殊处理
 */
/**
 * 字段值是否仍等于默认值
 *
 * 颜色字段不能比字符串：取色器会把值归一化成另一种写法，同一个颜色会被判成改过，
 * 于是原样存进覆盖项——此后 schema 默认色的任何调整对该用户都不再生效。
 */
function isUnchanged(field: IPropertySchema | undefined, val: unknown, defaultVal: unknown): boolean {
  if (
    field?.type === 'string' &&
    field.inputType === 'color' &&
    typeof val === 'string' &&
    typeof defaultVal === 'string'
  ) {
    return isSameColor(val, defaultVal);
  }
  return JSON.stringify(val) === JSON.stringify(defaultVal);
}

export function diffConfig(config: SiteConfigOverrides): SiteConfigOverrides {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [sectionKey, defaultSection] of Object.entries(defaultSiteConfig)) {
    const custom = (config as Record<string, unknown>)[sectionKey] as Record<string, unknown> | undefined;
    if (!custom) continue;

    const properties = Object.hasOwn(siteConfigSchema, sectionKey)
      ? (siteConfigSchema as SiteSchema)[sectionKey].properties
      : {};

    const diff: Record<string, unknown> = {};
    for (const [fieldKey, val] of Object.entries(custom)) {
      const defaultVal = (defaultSection as Record<string, unknown>)[fieldKey];
      const field = Object.hasOwn(properties, fieldKey) ? properties[fieldKey] : undefined;
      if (!isUnchanged(field, val, defaultVal)) diff[fieldKey] = val;
    }
    if (Object.keys(diff).length > 0) result[sectionKey] = diff;
  }
  return result as SiteConfigOverrides;
}

// ==================== 运行时校验 ====================

export interface IConfigIssue {
  /** 出问题的位置，如 `watermark.fontSize`、`basic.links[0].url` */
  path: string;
  /** 人类可读的说明 */
  message: string;
}

export interface IValidateResult {
  /** 校验后的覆盖项：非法字段已剔除，越界数值已收敛到边界 */
  value: SiteConfigOverrides;
  /** 被剔除或修正的项，供 UI 提示；空数组表示完全合法 */
  issues: IConfigIssue[];
}

/**
 * 内联 base64 的默认体积上限
 *
 * 只在「schema 没写 maxSize 且没有接 uploader」时兜底：内联意味着文件会进入配置对象，
 * 此后每一次序列化、比对、持久化都要搬运它，没有上限是不可接受的。
 */
export const DEFAULT_INLINE_MAX_SIZE = 512 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** data URL 的近似原始字节数（base64 每 4 字符编码 3 字节） */
export function dataUrlByteSize(value: string): number {
  const base64 = value.slice(value.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

const TYPE_NAMES: Record<string, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  object: '对象',
  undefined: 'undefined',
};

/** 字节数的可读形式。与 utils/datetime 的 formatFileSize 同口径，不复用是为了不把 dayjs 拖进配置内核 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  return TYPE_NAMES[typeof value] ?? typeof value;
}

/**
 * 校验单个基础字段
 *
 * 返回 `ok: false` 表示该字段应被剔除（剔除后 mergeConfig 会回落到 schema 默认值）。
 * 数值越界不剔除而是收敛到边界——用户意图是明确的，只是超出了范围。
 */
function validateField(
  field: IFieldSchema,
  value: unknown,
  path: string,
  issues: IConfigIssue[],
): { ok: true; value: unknown } | { ok: false } {
  switch (field.type) {
    case 'boolean': {
      if (typeof value !== 'boolean') {
        issues.push({ path, message: `应为布尔值，实际为${typeName(value)}` });
        return { ok: false };
      }
      return { ok: true, value };
    }

    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({ path, message: `应为数字，实际为${typeName(value)}` });
        return { ok: false };
      }
      let result = value;
      if (field.min !== undefined && result < field.min) {
        issues.push({ path, message: `小于最小值 ${field.min}，已收敛` });
        result = field.min;
      }
      if (field.max !== undefined && result > field.max) {
        issues.push({ path, message: `大于最大值 ${field.max}，已收敛` });
        result = field.max;
      }
      return { ok: true, value: result };
    }

    case 'string': {
      // 枚举多选：逐项过滤，保留合法值
      if (field.enumType && field.multiple) {
        if (!Array.isArray(value)) {
          issues.push({ path, message: `应为数组，实际为${typeName(value)}` });
          return { ok: false };
        }
        const allowed = value.filter(
          (item): item is string => typeof item === 'string' && field.enumType!.includes(item),
        );
        if (allowed.length !== value.length) {
          issues.push({ path, message: '含非法枚举值，已剔除' });
        }
        return { ok: true, value: allowed };
      }
      if (typeof value !== 'string') {
        issues.push({ path, message: `应为字符串，实际为${typeName(value)}` });
        return { ok: false };
      }
      if (field.enumType && !field.enumType.includes(value)) {
        issues.push({ path, message: `取值需为 ${field.enumType.join(' / ')} 之一` });
        return { ok: false };
      }
      if (field.required && value.trim() === '') {
        issues.push({ path, message: '不能为空' });
        return { ok: false };
      }
      if (field.pattern && value !== '' && !new RegExp(field.pattern).test(value)) {
        issues.push({ path, message: field.patternMessage ?? `不满足格式要求（${field.pattern}）` });
        return { ok: false };
      }
      // 颜色字段：代码模式可以写任何字符串，解析不了的值渲染时会静默失效
      if (field.inputType === 'color' && value !== '') {
        if (!isValidColor(value)) {
          issues.push({ path, message: '不是可识别的颜色值（支持 #rgb / #rrggbb / rgb() / rgba()）' });
          return { ok: false };
        }
        // 不支持透明度的颜色字段，带 alpha 的值会被静默丢弃透明度，不如直接拒绝
        if (!field.alpha && hasAlpha(value)) {
          issues.push({ path, message: '该颜色不支持透明度' });
          return { ok: false };
        }
      }
      // 内联 base64 的体积闸门：可视化模式由 SchemaField 在读取前拦截，
      // 代码模式能直接粘贴 data URL，只有这里能挡住
      if (value.startsWith('data:')) {
        const limit = field.maxSize ?? DEFAULT_INLINE_MAX_SIZE;
        const size = dataUrlByteSize(value);
        if (size > limit) {
          issues.push({ path, message: `内联文件 ${formatBytes(size)} 超过上限 ${formatBytes(limit)}` });
          return { ok: false };
        }
      }
      return { ok: true, value };
    }
  }
}

/**
 * 按 schema 校验配置，剔除非法字段、收敛越界数值
 *
 * 这是「脏数据不进库」的唯一关口，store 的读（savedConfig）和写（save）两端都会经过：
 * - 写：代码模式只保证 JSON 语法合法，语义校验只能落在这里
 * - 读：已落库的非法值在这里被修复，配置自愈
 *
 * 未在 schema 中声明的分组/字段一律剔除，但会记入 issues 交给 UI 提示——
 * 是「告知后丢弃」而非静默丢弃。
 */
export function validateConfig(input: unknown): IValidateResult {
  const issues: IConfigIssue[] = [];
  const schema: SiteSchema = siteConfigSchema;

  if (!isPlainObject(input)) {
    if (input !== undefined) issues.push({ path: '', message: `配置根节点应为对象，实际为${typeName(input)}` });
    return { value: {}, issues };
  }

  const result: Record<string, Record<string, unknown>> = {};

  for (const [sectionKey, rawSection] of Object.entries(input)) {
    // 必须用 hasOwn：JSON 里可以带 `toString` / `__proto__` 这类 key，
    // 直接索引会取到原型链上的成员（真值），后续当成 schema 用会崩
    const section = Object.hasOwn(schema, sectionKey) ? schema[sectionKey] : undefined;
    if (!section) {
      issues.push({ path: sectionKey, message: '未知配置分组，已忽略' });
      continue;
    }
    if (!isPlainObject(rawSection)) {
      issues.push({ path: sectionKey, message: `应为对象，实际为${typeName(rawSection)}，已忽略` });
      continue;
    }

    const out: Record<string, unknown> = {};

    for (const [fieldKey, rawValue] of Object.entries(rawSection)) {
      const path = `${sectionKey}.${fieldKey}`;
      const field = Object.hasOwn(section.properties, fieldKey) ? section.properties[fieldKey] : undefined;

      if (!field) {
        issues.push({ path, message: '未知配置项，已忽略' });
        continue;
      }

      if (field.type === 'array') {
        if (!Array.isArray(rawValue)) {
          issues.push({ path, message: `应为数组，实际为${typeName(rawValue)}，已忽略` });
          continue;
        }
        out[fieldKey] = validateArrayItems(field, rawValue, path, issues);
        continue;
      }

      const checked = validateField(field, rawValue, path, issues);
      if (checked.ok) out[fieldKey] = checked.value;
    }

    result[sectionKey] = out;
  }

  return { value: result as SiteConfigOverrides, issues };
}

/**
 * 校验数组字段的每一项
 *
 * 单个子字段非法只回落该子字段的默认值，不整行丢弃——一格填错就删掉整行对用户太苛刻。
 * 缺失的子字段补默认值，保证消费侧拿到的每一项结构完整（mergeConfig 不做元素级合并）。
 */
function validateArrayItems(
  field: IArrayFieldSchema,
  rawItems: unknown[],
  path: string,
  issues: IConfigIssue[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  rawItems.forEach((rawItem, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(rawItem)) {
      issues.push({ path: itemPath, message: `数组项应为对象，实际为${typeName(rawItem)}，已剔除` });
      return;
    }

    const item: Record<string, unknown> = {};
    for (const [subKey, subField] of Object.entries(field.items)) {
      // 深拷贝：多选枚举的 defaultValue 是数组，直接引用会让所有行与 schema 共用同一个实例，
      // 任何一处原地修改都会污染 schema 默认值和其余所有行
      if (!Object.hasOwn(rawItem, subKey)) {
        item[subKey] = structuredClone(subField.defaultValue);
        continue;
      }
      const checked = validateField(subField, rawItem[subKey], `${itemPath}.${subKey}`, issues);
      item[subKey] = checked.ok ? checked.value : structuredClone(subField.defaultValue);
    }
    for (const subKey of Object.keys(rawItem)) {
      if (!Object.hasOwn(field.items, subKey))
        issues.push({ path: `${itemPath}.${subKey}`, message: '未知字段，已忽略' });
    }

    result.push(item);
  });

  return result;
}
