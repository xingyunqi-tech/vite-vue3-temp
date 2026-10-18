/**
 * 站点配置 Schema 的类型系统
 *
 * 本文件**不 import 任何东西**，这是刻意的：schema 本体（constants/site-config.ts）要
 * 引用这里的类型，而工具函数（./index.ts）又要引用 schema 本体。类型独立成零依赖的一层，
 * 三者才构成无环的依赖图。
 */

// ==================== Schema 类型定义 ====================

/**
 * 每个字段的 `defaultValue` 都是**必填**的
 *
 * mergeConfig / diffConfig 的全部正确性都建立在「每字段恒有默认值」上：前者靠它回落，
 * 后者靠它判断「这个值是否等于默认值、需不需要持久化」。写成可选就只是个约定，
 * 必填才是编译期保证。
 */
export interface IStringSchema {
  type: 'string';
  title: string;
  description?: string;
  inputType?: 'text' | 'textarea' | 'password' | 'color' | 'url' | 'image' | 'file';
  /** file 类型的接受格式，如 '.pdf,.doc' */
  accept?: string;
  enumType?: readonly string[];
  /** 枚举多选，需配合 enumType 使用 */
  multiple?: boolean;
  /** 不允许为空字符串（缺省值仍由 defaultValue 提供） */
  required?: boolean;
  /**
   * color 类型是否允许透明度（默认不允许）
   */
  alpha?: boolean;
  /** 正则约束，写正则源码而非 RegExp 字面量，保证 schema 可 JSON 序列化 */
  pattern?: string;
  /** pattern 不匹配时的提示文案 */
  patternMessage?: string;
  /** 值为站内路径，须命中 setRoutePathMatcher 注册的路由（未注册时不校验） */
  routePath?: boolean;
  /**
   * image / file 类型的体积上限（字节）
   *
   * 缺省时，**内联 base64** 场景会套用 DEFAULT_INLINE_MAX_SIZE 兜底——把任意大小的
   * 文件塞进配置对象都不是对的；接了 uploader（上传拿 URL）时则不设默认上限，交给服务端决定。
   */
  maxSize?: number;
  /** 多选/单选下拉选项的展示文案映射（key 是 enumType 里的值），缺省时直接显示原始值 */
  enumLabels?: Record<string, string>;
  defaultValue: string | readonly string[];
  span?: number;
}

export interface INumberSchema {
  type: 'number';
  title: string;
  description?: string;
  inputType?: 'input' | 'slider';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  span?: number;
}

export interface IBooleanSchema {
  type: 'boolean';
  title: string;
  description?: string;
  defaultValue: boolean;
  span?: number;
}

export type IFieldSchema = IStringSchema | INumberSchema | IBooleanSchema;

export interface IArrayFieldSchema {
  type: 'array';
  title: string;
  description?: string;
  /** 数组每项的字段定义 */
  items: Record<string, IFieldSchema>;
  defaultValue: Record<string, unknown>[];
  span?: number;
}

/** properties 中可出现的字段类型：基础字段 或 数组字段 */
export type IPropertySchema = IFieldSchema | IArrayFieldSchema;

export interface IObjectSchema {
  type: 'object';
  title: string;
  description?: string;
  properties: Record<string, IPropertySchema>;
}

export type SiteSchema = Record<string, IObjectSchema>;

// ==================== 类型推断工具 ====================

/** 根据字段完整定义推断值类型 */
type InferFieldValue<T extends IFieldSchema> = T extends IStringSchema
  ? T extends { multiple: true }
    ? string[]
    : string
  : T extends INumberSchema
    ? number
    : T extends IBooleanSchema
      ? boolean
      : never;

/** 从字段集合推断出值类型 */
type InferFields<T extends Record<string, IFieldSchema>> = {
  [K in keyof T]: InferFieldValue<T[K]>;
};

/** 推断单个属性的值类型 */
type InferPropertyValue<T extends IPropertySchema> = T extends IArrayFieldSchema
  ? InferFields<T['items']>[]
  : T extends IFieldSchema
    ? InferFieldValue<T>
    : never;

/** 推断 object section 的值类型 */
type InferSection<T extends IObjectSchema> = {
  [K in keyof T['properties']]: InferPropertyValue<T['properties'][K]>;
};

export type InferSiteConfig<T extends SiteSchema> = {
  [K in keyof T]: InferSection<T[K]>;
};
