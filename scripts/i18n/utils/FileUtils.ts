import fs from 'fs';
import path from 'path';
import { CONFIG, FILES, PATHS } from './constants';
import { LoggerUtils } from './LoggerUtils';
import { Translations } from './types';

/**
 * 文件和文本操作工具类
 * 提供文件读写、目录管理、JSON处理和文本分析等功能
 */
export class FileUtils {
  // =================================================================
  // JSON Processing Methods
  // =================================================================

  /**
   * 安全解析JSON
   * @param content - JSON字符串
   * @returns 解析后的对象或null（解析失败时）
   */
  static safeParseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      LoggerUtils.error('JSON解析失败:', error);
      return null;
    }
  }

  /**
   * 查找JSON内容中的重复键
   * @param content - JSON内容
   * @returns 重复键列表
   */
  static findDuplicateKeysInJson(content: string): string[] {
    const keyOccurrences = new Map<string, number>();
    const duplicates: string[] = [];

    // 使用正则表达式找到所有键
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;

    while ((match = keyRegex.exec(content)) !== null) {
      const key = match[1];
      const count = keyOccurrences.get(key) || 0;
      keyOccurrences.set(key, count + 1);

      if (count === 1) {
        duplicates.push(key);
      }
    }

    return duplicates;
  }

  /**
   * 查找两个对象中的冲突键
   * @param obj1 - 第一个对象
   * @param obj2 - 第二个对象
   * @param prefix - 键前缀
   * @returns 冲突键列表
   */
  static findConflictingKeys(obj1: Record<string, any>, obj2: Record<string, any>, prefix = ''): string[] {
    const conflicts: string[] = [];

    for (const key in obj1) {
      if (Object.prototype.hasOwnProperty.call(obj1, key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;

        if (Object.prototype.hasOwnProperty.call(obj2, key)) {
          const val1 = obj1[key];
          const val2 = obj2[key];

          if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
            // 递归检查嵌套对象
            conflicts.push(...this.findConflictingKeys(val1, val2, currentPath));
          } else if (val1 !== val2) {
            // 值不同，记录冲突
            conflicts.push(currentPath);
          }
        }
      }
    }

    return conflicts;
  }

  // =================================================================
  // Collection/Array Utilities
  // =================================================================

  /**
   * 将项目数组按键分组
   * @param items - 要分组的项目数组
   * @param getKey - 从项目中提取键的函数
   * @returns 分组后的项目记录
   */
  static groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
    return items.reduce(
      (groups, item) => {
        const key = getKey(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  // =================================================================
  // Text Processing Methods
  // =================================================================

  /**
   * 检查文本是否包含中文字符
   * @param text - 待检查的文本
   * @param options - 配置选项
   * @returns 是否包含中文
   */
  static containsChinese(text: string, options: { ignoreSpaces?: boolean } = {}): boolean {
    if (!text) return false;

    // 如果需要忽略空格，先移除空格
    const processedText = options.ignoreSpaces ? text.replace(/\s/g, '') : text;

    return CONFIG.CHINESE_REGEX.test(processedText);
  }

  /**
   * 检查是否为有效的英文翻译
   * @param enValue - 英文值
   * @returns 是否为有效英文翻译
   */
  static isValidEnglishTranslation(enValue: string): boolean {
    if (!enValue?.trim()) return false;

    // 检查是否只包含占位符或特殊字符
    const cleanValue = enValue.replace(/[{}[\]().,;:!?'""`~@#$%^&*+=<>|\\/-]/g, '').trim();
    if (cleanValue.length === 0) return false;

    // 检查是否包含英文字母和数字
    return /[a-zA-Z0-9]/.test(enValue);
  }

  // =================================================================
  // File I/O Methods
  // =================================================================

  /**
   * 加载JSON文件
   * @param filePath - 文件路径
   * @returns 解析后的JSON对象，失败则返回空对象
   */
  static loadJsonFile(filePath: string): Translations {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return FileUtils.safeParseJson(fileContent) || {};
    } catch (error) {
      LoggerUtils.error(`加载JSON文件失败: ${filePath}`, error);
      return {};
    }
  }

  /**
   * 安全加载JSON文件，包含完整的错误处理
   * @param filePath - 文件路径
   * @param options - 加载选项
   * @returns 加载的JSON对象或默认值
   */
  static safeLoadJsonFile<T extends object>(
    filePath: string,
    options: {
      defaultValue?: T;
      errorMessage?: string;
      logSuccess?: boolean;
      silent?: boolean;
    } = {},
  ): T {
    const { defaultValue = {} as T, errorMessage, logSuccess = false, silent = false } = options;

    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        if (!silent) {
          LoggerUtils.warn(`⚠️ 文件不存在: ${filePath}`);
        }
        return defaultValue;
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const result = FileUtils.safeParseJson(fileContent) || defaultValue;

      // 如果需要，打印加载成功信息
      if (logSuccess && !silent) {
        const itemCount = Object.keys(result).length;
        LoggerUtils.success(`📄 已加载 ${path.basename(filePath)}, 包含 ${itemCount} 个条目`);
      }

      return result as T;
    } catch (error) {
      if (!silent) {
        LoggerUtils.error(errorMessage ? `❌ ${errorMessage}: ${filePath}` : `❌ 加载JSON文件失败: ${filePath}`, error);
      }
      return defaultValue;
    }
  }

  /**
   * 确保目录存在，不存在则创建
   * @param dirPath - 目录路径
   */
  static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 创建或清空文件
   * @param filePath - 文件路径
   * @param content - 文件内容，默认为空JSON对象
   */
  static createOrEmptyFile(filePath: string, content: string = '{}'): void {
    FileUtils.ensureDirectoryExists(path.dirname(filePath));
    // 确保文件末尾有换行符
    const contentWithNewline = content.endsWith('\n') ? content : content + '\n';
    fs.writeFileSync(filePath, contentWithNewline);
  }

  /**
   * 检查文件是否为React文件
   * @param fileName - 文件名
   * @returns 是否为React文件
   */
  static isReactFile(fileName: string): boolean {
    return CONFIG.SUPPORTED_EXTENSIONS.includes(path.extname(fileName));
  }

  /**
   * 获取目录下的所有React文件
   * @param dirPath - 目录路径
   * @returns React文件路径列表
   */
  static getReactFiles(dirPath: string): string[] {
    const files: string[] = [];

    const walkDir = (currentPath: string): void => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && FileUtils.isReactFile(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    walkDir(dirPath);
    return files;
  }

  /**
   * 删除目录及其内容
   * @param dirs - 要删除的目录数组
   */
  static deleteDirs(dirs: string[]): void {
    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        LoggerUtils.success(`已删除目录: ${dir}`);
      }
    });
  }

  /**
   * 读取并验证语言包文件
   * @param filePath - 文件路径
   * @param locale - 语言代码
   * @param fileType - 文件类型（基础或自定义）
   * @returns 解析后的语言包对象
   */
  static loadLanguageFile<T extends Record<string, any>>(filePath: string, lang: string, type: '基础' | '自定义'): T {
    if (!fs.existsSync(filePath)) {
      LoggerUtils.warn(`[${type}] ${lang} 语言文件不存在，将返回空对象: ${this.getRelativePath(filePath)}`);
      return {} as T;
    }
    return this.safeLoadJsonFile<T>(filePath, {
      errorMessage: `加载 ${type} ${lang} 语言文件失败`,
      logSuccess: true,
    });
  }

  // =================================================================
  // Path-related Methods (from PathUtils)
  // =================================================================

  /**
   * 获取工作目录路径
   * @param isCustom - 是否为定制目录
   * @returns 目录路径
   */
  static getDirectoryPath(isCustom: boolean): string {
    return isCustom ? PATHS.CUSTOM_DIR : PATHS.DEFAULT_DIR;
  }

  /**
   * 获取编译目录路径
   * @param isCustom - 是否为定制目录
   * @returns 编译目录路径
   */
  static getCompileDir(isCustom: boolean): string {
    return isCustom ? PATHS.CUSTOM_COMPILE_DIR : PATHS.DEFAULT_COMPILE_DIR;
  }

  /**
   * 获取待翻译文件路径
   * @param isCustom - 是否为定制目录
   * @returns 待翻译文件路径
   */
  static getUntranslatedPath(isCustom: boolean): string {
    return path.join(this.getDirectoryPath(isCustom), FILES.UNTRANSLATED_JSON);
  }

  /**
   * 获取翻译文件路径
   * @param isCustom - 是否为定制目录
   * @returns 翻译文件路径
   */
  static getTranslatedPath(isCustom: boolean): string {
    return path.join(this.getDirectoryPath(isCustom), FILES.TRANSLATIONS_JSON);
  }

  /**
   * 获取输出目录路径
   * @returns 输出目录路径
   */
  static getOutputDir(): string {
    return PATHS.OUTPUT_DIR;
  }

  /**
   * 获取语言文件路径
   * @param isCustom - 是否为定制目录
   * @param locale - 语言代码
   * @returns 语言文件路径
   */
  static getLocaleFilePath(isCustom: boolean, locale: string): string {
    const baseDir = this.getDirectoryPath(isCustom);
    return path.join(baseDir, `${locale}.json`);
  }

  /**
   * 获取导出文件路径
   * @param locale - 语言代码
   * @returns 导出文件路径
   */
  static getExportFilePath(locale: string): string {
    return path.join(this.getOutputDir(), `${locale}.json`);
  }

  /**
   * 验证目标路径的有效性
   * @param targetPath - 目标路径
   * @returns 验证结果对象
   */
  static validateTargetPath(targetPath: string): {
    isValid: boolean;
    type: 'file' | 'directory' | 'invalid';
    error?: string;
  } {
    if (!targetPath || !targetPath.trim()) {
      return { isValid: false, type: 'invalid', error: '路径不能为空' };
    }

    if (!fs.existsSync(targetPath)) {
      return { isValid: false, type: 'invalid', error: '路径不存在' };
    }

    const stat = fs.statSync(targetPath);

    if (stat.isFile()) {
      const ext = path.extname(targetPath);
      if (!CONFIG.SUPPORTED_EXTENSIONS.includes(ext)) {
        return { isValid: false, type: 'file', error: '不支持的文件类型，请选择React文件(.tsx, .jsx, .ts, .js)' };
      }
      return { isValid: true, type: 'file' };
    }

    if (stat.isDirectory()) {
      return { isValid: true, type: 'directory' };
    }

    return { isValid: false, type: 'invalid', error: '不支持的路径类型' };
  }

  /**
   * 获取相对路径
   * @param filePath - 文件路径
   * @returns 相对于工作目录的路径
   */
  static getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }
}
