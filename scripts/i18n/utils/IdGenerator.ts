import path from 'path';
import { CONFIG } from './constants';
import { DifyClient } from './DifyClient';
import { LoggerUtils } from './LoggerUtils';

/**
 * ID生成器工具类
 * 提供语义ID生成功能，支持Dify API和默认策略
 */
export class IdGenerator {
  /**
   * 生成语义ID列表
   * @param textList - 文本列表
   * @param skipDify - 是否跳过Dify API
   * @returns 语义ID列表
   */
  static async generateSemanticIds(
    textList: string[],
    skipDify: boolean = false,
    existingIds: Set<string> = new Set<string>(),
  ): Promise<string[]> {
    if (textList.length === 0) return [];

    if (!skipDify) {
      try {
        LoggerUtils.info('🔗 使用Dify API生成语义ID...');
        const difyClient = DifyClient.createForIdGeneration();
        const ids = await difyClient.generateSemanticIds(textList);
        // DifyClient返回原始ID，此处进行清理
        return ids.map(id => this.sanitizeSemanticId(id));
      } catch (error) {
        LoggerUtils.error('Dify API调用失败，使用默认策略', error);
      }
    }

    // 使用默认策略
    LoggerUtils.info('📝 使用默认策略生成语义ID...');
    return textList.map((text, index) => this.generateDefault(`file_${index}`, text, existingIds));
  }

  /**
   * 清理语义ID
   * @param id - 原始ID
   * @param preserveCase - 是否保留大小写
   * @returns 清理后的ID
   */
  private static sanitizeSemanticId(id: string, preserveCase: boolean = false): string {
    let result = id;

    if (!preserveCase) {
      result = result.toLowerCase();
    }

    return result
      .replace(/[^a-zA-Z0-9\s_]/g, '') // 保留下划线和大小写字母
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_{3,}/g, '__') // 将3个或更多连续下划线替换为__
      .replace(/^_+|_+$/g, '') // 删除开头和结尾的下划线
      .replace(/([^_])_([^_])/g, '$1$2'); // 删除单个下划线，但保留__
  }

  /**
   * 清理完整的ID，保留目录前缀的大小写
   * @param id - 完整的ID（包含目录前缀）
   * @returns 清理后的ID
   */
  private static sanitizeFullId(id: string): string {
    // 检查是否包含目录分隔符
    if (id.includes(CONFIG.ID_SEPARATOR)) {
      const parts = id.split(CONFIG.ID_SEPARATOR);

      // 前两部分是目录前缀，保持大小写
      const directoryParts = parts.slice(0, 2);

      // 语义部分转小写
      const semanticParts = parts.slice(2);

      const cleanedDirectoryParts = directoryParts.map(part => part.replace(/[^a-zA-Z0-9]/g, ''));

      const cleanedSemanticParts = semanticParts.map(
        part => this.sanitizeSemanticId(part, false), // 语义部分转小写
      );

      return [...cleanedDirectoryParts, ...cleanedSemanticParts].join(CONFIG.ID_SEPARATOR);
    }
    // 没有目录前缀，直接清理
    return this.sanitizeSemanticId(id, false);
  }

  /**
   * 使用默认策略生成ID
   * @param filePath - 文件路径
   * @param text - 文本内容
   * @returns 生成的ID
   */
  private static generateDefault(filePath: string, text: string, existingIds: Set<string>): string {
    const semanticPart = this.extractSemanticPart(text);
    return this._createFullId(filePath, semanticPart, existingIds);
  }

  /**
   * 提取目录前缀
   * @param filePath - 文件路径
   * @returns 目录前缀
   */
  private static extractDirectoryPrefix(filePath: string): string {
    if (!filePath) return '';

    const normalizedPath = path.normalize(filePath);
    const parts = normalizedPath.split(path.sep);

    // 找到src目录的索引
    const srcIndex = parts.findIndex(part => part === 'src');
    if (srcIndex === -1 || srcIndex >= parts.length - 1) {
      return '';
    }

    // src下的一级目录
    const firstLevelDir = parts[srcIndex + 1];

    // 当前文件所在目录（不包括文件名）
    const fileIndex = parts.length - 1; // 文件名的索引
    const currentDir = parts[fileIndex - 1]; // 文件所在目录

    // 如果当前目录就是一级目录，则使用文件名（去掉扩展名）
    if (currentDir === firstLevelDir) {
      const fileName = parts[fileIndex];
      const fileNameWithoutExt = path.parse(fileName).name;
      return `${firstLevelDir}${CONFIG.ID_SEPARATOR}${fileNameWithoutExt}`;
    }

    return `${firstLevelDir}${CONFIG.ID_SEPARATOR}${currentDir}`;
  }

  /**
   * 提取语义部分
   * @param text - 文本内容
   * @returns 语义部分
   */
  private static extractSemanticPart(text: string): string {
    const cleanText = text.replace(/[^\u4e00-\u9fff\w\s]/g, '').trim();

    // 检查是否有直接的中文映射
    for (const [chinese, english] of Object.entries(CONFIG.CHINESE_MAPPINGS)) {
      if (cleanText.includes(chinese)) {
        return english;
      }
    }

    // 如果是纯英文，直接处理
    if (!/[\u4e00-\u9fff]/.test(cleanText)) {
      return this.sanitizeSemanticId(cleanText);
    }

    // 默认处理中文文本
    return 'text';
  }

  /**
   * 确保ID唯一性
   * @param baseId - 基础ID
   * @returns 唯一ID
   */
  private static ensureUniqueId(baseId: string, existingIds: Set<string>): string {
    // 先清理ID，保留目录前缀的大小写
    const cleanedId = this.sanitizeFullId(baseId);

    if (!existingIds.has(cleanedId)) {
      existingIds.add(cleanedId);
      return cleanedId;
    }

    let counter = 1;
    let uniqueId = `${cleanedId}_${counter}`;
    while (existingIds.has(uniqueId)) {
      counter++;
      uniqueId = `${cleanedId}_${counter}`;
    }

    existingIds.add(uniqueId);
    return uniqueId;
  }

  /**
   * 生成带文件路径的ID
   * @param filePath - 文件路径
   * @param text - 文本内容
   * @returns 生成的ID
   */
  static generateWithFilePath(filePath: string, text: string, existingIds: Set<string>): string {
    return this.generateDefault(filePath, text, existingIds);
  }

  /**
   * 为语义ID添加目录前缀
   * @param filePath - 文件路径
   * @param semanticId - 语义ID
   * @returns 带目录前缀的完整ID
   */
  static addDirectoryPrefixToId(filePath: string, semanticId: string, existingIds: Set<string>): string {
    return this._createFullId(filePath, semanticId, existingIds);
  }

  /**
   * 创建完整的、唯一的ID
   * @param filePath - 文件路径
   * @param semanticPart - 语义部分
   * @returns 完整的唯一ID
   */
  private static _createFullId(filePath: string, semanticPart: string, existingIds: Set<string>): string {
    const directoryPrefix = this.extractDirectoryPrefix(filePath);
    const cleanedSemanticId = this.sanitizeSemanticId(semanticPart);

    if (directoryPrefix) {
      const fullId = `${directoryPrefix}${CONFIG.ID_SEPARATOR}${cleanedSemanticId}`;
      return this.ensureUniqueId(fullId, existingIds);
    }
    return this.ensureUniqueId(cleanedSemanticId, existingIds);
  }
}
