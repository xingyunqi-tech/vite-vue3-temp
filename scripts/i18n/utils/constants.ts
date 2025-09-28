import path from 'path';
import { ModeName } from './types';

/**
 * 项目配置常量
 */
export const PROJECT_CONFIG = {
  /** 主目录路径 */
  MAIN_LOCALE_DIR: 'src/locale',
  /** 定制目录路径 */
  CUSTOM_LOCALE_DIR: 'src/overrides/locale',
  /** 输出目录路径 */
  OUTPUT_DIR: 'public/locale',
} as const;

/**
 * 文件路径常量定义
 */
export const PATHS = {
  /** 主目录绝对路径 */
  DEFAULT_DIR: path.resolve(process.cwd(), PROJECT_CONFIG.MAIN_LOCALE_DIR),
  /** 定制目录绝对路径 */
  CUSTOM_DIR: path.resolve(process.cwd(), PROJECT_CONFIG.CUSTOM_LOCALE_DIR),
  /** 主目录编译路径 */
  get DEFAULT_COMPILE_DIR() {
    return path.join(this.DEFAULT_DIR, 'compile');
  },
  /** 定制目录编译路径 */
  get CUSTOM_COMPILE_DIR() {
    return path.join(this.CUSTOM_DIR, 'compile');
  },
  /** 输出目录绝对路径 */
  OUTPUT_DIR: path.resolve(process.cwd(), PROJECT_CONFIG.OUTPUT_DIR),
} as const;

/**
 * 文件名常量
 */
export const FILES = {
  /** 未翻译文件名 */
  UNTRANSLATED_JSON: 'untranslated.json',
  /** 翻译文件名 */
  TRANSLATIONS_JSON: 'translations.json',
  /** 英文语言包文件名 */
  EN_US_JSON: 'en-US.json',
  /** 中文语言包文件名 */
  ZH_CN_JSON: 'zh-CN.json',
} as const;

/**
 * 配置常量
 */
export const CONFIG = {
  /** 中文字符正则表达式 */
  CHINESE_REGEX: /[\u4e00-\u9fff]/,
  /** 支持的文件扩展名 */
  SUPPORTED_EXTENSIONS: ['.tsx', '.jsx', '.ts', '.js'] as string[],
  /** 中文映射 */
  CHINESE_MAPPINGS: {
    确认: 'confirm',
    取消: 'cancel',
    删除: 'delete',
    添加: 'add',
    编辑: 'edit',
    保存: 'save',
    提交: 'submit',
    搜索: 'search',
    登录: 'login',
    退出: 'logout',
    成功: 'success',
    失败: 'failed',
    错误: 'error',
    警告: 'warning',
    提示: 'tip',
    用户: 'user',
    请输入: 'please_input',
    请选择: 'please_select',
  } as const,
  /** ID分隔符 */
  ID_SEPARATOR: '__',
} as const;

/**
 * 支持的语言类型
 */
export const LOCALE_TYPE = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const;

/**
 * 操作模式说明映射
 */
export const MODE_DESCRIPTIONS: Record<string, string> = {
  [ModeName.AUTOMATIC]: '自动化流程 - 一键完成从提取到导出的所有步骤',
  [ModeName.GENERATE]: '代码生成 - 扫描源码提取中文并生成国际化调用',
  [ModeName.PICK]: '提取待翻译 - 从国际化文件中提取未翻译条目',
  [ModeName.TRANSLATE]: 'AI翻译 - 调用AI服务将中文翻译为英文',
  [ModeName.MERGE]: '合并翻译 - 将翻译结果合并回主文件',
  [ModeName.RESTORE]: '代码还原 - 将国际化调用还原为中文（调试用）',
  [ModeName.EXPORT]: '语言包导出 - 生成最终的多语言文件',
};

/**
 * ID生成API配置
 */
export const ID_GENERATION_CONFIG = {
  url: 'http://10.40.50.21/v1/workflows/run',
  apiKey: 'app-7twvIJOA7Cm7mf4LwtavHuaO',
  timeout: 60000,
};

/**
 * 翻译API配置
 */
export const TRANSLATION_CONFIG = {
  url: 'http://10.40.50.21/v1/workflows/run',
  apiKey: 'app-eOnKLdi6sLNLdqvG1Z4BBrnX',
  timeout: 60000,
};
