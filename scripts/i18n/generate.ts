#!/usr/bin/env node
import fs from 'fs';
import {
  BaseI18nProcessor,
  CommandUtils,
  DifyClient,
  ExtractedString,
  FileUtils,
  GenerateTransformer,
  IdGenerator,
  InteractiveUtils,
  LanguageFileManager,
  LoggerUtils,
  TextExtractor,
} from './utils';

// ==================== 代码生成处理器类 ====================

/**
 * 语义化ID生成处理器
 * 负责从React文件中提取文本并提取多语言组件
 */
export class GeneratorProcessor extends BaseI18nProcessor {
  /** Dify客户端实例 */
  private difyClient: DifyClient;

  /**
   * 构造函数
   * @param isCustom - 是否为定制目录
   * @param maxConcurrency - 最大并发数，默认为5
   */
  constructor(isCustom: boolean = false, maxConcurrency: number = 5) {
    super(isCustom);
    this.difyClient = DifyClient.createForIdGeneration(maxConcurrency);
  }

  /**
   * 获取操作名称
   * @returns 操作名称
   */
  protected getOperationName(): string {
    return '代码生成';
  }

  /**
   * 执行代码生成操作
   * @param targetPath - 目标路径（文件或目录）
   * @param skipDify - 是否跳过Dify API调用
   */
  async _execute(targetPath: string, skipDify: boolean = false): Promise<void> {
    // 验证目标路径
    const validation = FileUtils.validateTargetPath(targetPath);
    if (!validation.isValid) {
      LoggerUtils.error(`❌ ${validation.error}`);
      return;
    }

    if (validation.type === 'file') {
      await this.runSingleFile(targetPath, skipDify);
    } else if (validation.type === 'directory') {
      await this.runDirectory(targetPath, skipDify);
    }
  }

  /**
   * 处理单个文件的国际化
   * @param filePath - 文件路径
   * @param skipDify - 是否跳过Dify API调用
   */
  async runSingleFile(filePath: string, skipDify: boolean = false): Promise<void> {
    LoggerUtils.info(`🚀 开始分析文件: ${FileUtils.getRelativePath(filePath)}`);

    // 验证文件存在性
    if (!fs.existsSync(filePath)) {
      LoggerUtils.error(`文件不存在: ${filePath}`);
      return;
    }

    try {
      // 提取需要国际化的文本
      const extractedStrings = await TextExtractor.extractFromFile(filePath);

      if (extractedStrings.length === 0) {
        LoggerUtils.info('✅ 未发现需要提取的文本');
        return;
      }

      // 生成语义化ID
      await this.generateIdsForStrings(extractedStrings, skipDify);

      // 显示提取结果
      this.displayResults(extractedStrings);

      // 询问用户是否应用转换
      const shouldApply = await InteractiveUtils.promptForGenericConfirmation('是否应用这些转换？');

      if (shouldApply) {
        await this.applyTransformations([filePath], extractedStrings);
        LoggerUtils.success(`✅ 转换完成！`);
      }
    } catch (error) {
      LoggerUtils.error(`处理文件时发生错误: ${error}`);
      throw error;
    }
  }

  /**
   * 处理目录的国际化
   * @param dirPath - 目录路径
   * @param skipDify - 是否跳过Dify API调用
   */
  private async runDirectory(dirPath: string, skipDify: boolean = false): Promise<void> {
    LoggerUtils.info(`🚀 开始分析目录: ${FileUtils.getRelativePath(dirPath)}`);

    const reactFiles = FileUtils.getReactFiles(dirPath);
    if (reactFiles.length === 0) {
      LoggerUtils.info('✅ 目录中未找到React文件');
      return;
    }

    LoggerUtils.info(`📁 找到 ${reactFiles.length} 个React文件:`);
    reactFiles.forEach((file, index) => {
      LoggerUtils.info(`  ${index + 1}. ${FileUtils.getRelativePath(file)}`);
    });

    const shouldProceed = await InteractiveUtils.promptForGenericConfirmation('是否继续分析这些文件？');

    if (!shouldProceed) {
      LoggerUtils.warn('❌ 已取消操作');
      return;
    }

    const extractedStrings = await TextExtractor.extractFromFiles(reactFiles);

    if (extractedStrings.length === 0) {
      LoggerUtils.info('✅ 所有文件均未发现需要提取的文本');
      return;
    }

    await this.generateIdsForStrings(extractedStrings, skipDify);
    this.displayResults(extractedStrings, true);

    const shouldApply = await InteractiveUtils.promptForGenericConfirmation('是否应用这些转换？');

    if (shouldApply) {
      const processedFiles = Array.from(new Set(extractedStrings.map(s => s.filePath)));
      await this.applyTransformations(processedFiles, extractedStrings);
      LoggerUtils.success(`✅ 转换完成！处理了 ${processedFiles.length} 个文件`);
    }
  }

  /**
   * 为字符串生成语义化ID（支持并发优化）
   * @param extractedStrings - 提取的字符串数组
   * @param skipDify - 是否跳过Dify API调用
   */
  private async generateIdsForStrings(extractedStrings: ExtractedString[], skipDify: boolean = false): Promise<void> {
    // 按文件分组，准备并发处理
    const fileGroups = FileUtils.groupBy(extractedStrings, str => str.filePath);

    // 用于记录文案到ID的映射，确保相同文案使用相同ID
    const textToIdMap = new Map<string, string>();
    const existingIds = new Set<string>();

    // 准备并发处理的文本数据
    const textGroups: Record<string, string[]> = {};
    Object.entries(fileGroups).forEach(([filePath, strings]) => {
      textGroups[filePath] = strings.map(item => item.original);
    });

    LoggerUtils.info(`📊 开始并发处理 ${Object.keys(fileGroups).length} 个文件的语义ID生成`);

    try {
      // 使用Dify或本地生成策略进行处理
      const idResults = await this.difyClient.generateSemanticIdsForFiles(textGroups, skipDify);

      // 将生成的ID分配给对应的字符串
      Object.entries(fileGroups).forEach(([filePath, strings]) => {
        const ids = idResults[filePath] || [];

        // 当不跳过Dify时，增加健壮性校验
        if (!skipDify && ids.length !== strings.length) {
          LoggerUtils.warn(
            `[${FileUtils.getRelativePath(filePath)}] Dify返回的ID数量与文本数量不匹配 (期望 ${strings.length}, 收到 ${
              ids.length
            })，将使用本地ID生成进行回退。`,
          );
          // 可以在这里选择中断或为这个文件单独回退
        }

        strings.forEach((item, index) => {
          if (textToIdMap.has(item.original)) {
            item.semanticId = textToIdMap.get(item.original)!;
          } else {
            let finalId: string;
            if (skipDify) {
              // 在skipDify模式下，idResults[filePath] 为本地生成的ID
              finalId = ids[index] || IdGenerator.generateWithFilePath(item.filePath, item.original, existingIds);
            } else {
              // Dify模式
              const difyId = ids[index] || IdGenerator.generateWithFilePath(item.filePath, item.original, existingIds);
              finalId = IdGenerator.addDirectoryPrefixToId(item.filePath, difyId, existingIds);
            }
            textToIdMap.set(item.original, finalId);
            item.semanticId = finalId;
          }
        });
      });

      LoggerUtils.success(`✅ 并发处理完成，共生成 ${textToIdMap.size} 个唯一语义ID`);
    } catch (error) {
      LoggerUtils.error(`处理文件时发生严重错误:`, error);
      // 根据需要，这里可以添加更详细的错误处理逻辑
      // 例如，可以选择完全停止，或者记录错误后继续处理其他文件
      throw new Error('语义ID生成失败');
    }
  }

  /**
   * 为单条提取结果生成格式化的日志行
   * @param item - 提取的字符串信息
   * @returns 格式化后的字符串
   */
  private formatResultLine(item: ExtractedString): string {
    return `"${item.original}" -> ${item.semanticId} (${item.context})`;
  }

  /**
   * 显示提取结果
   * @param extractedStrings - 提取的字符串数组
   * @param groupByFile - 是否按文件分组显示
   */
  private displayResults(extractedStrings: ExtractedString[], groupByFile: boolean = false): void {
    LoggerUtils.info(`\n📋 共提取 ${extractedStrings.length} 个字符串:`);

    if (groupByFile) {
      const fileGroups = FileUtils.groupBy(extractedStrings, str => str.filePath);

      for (const [filePath, strings] of Object.entries(fileGroups)) {
        LoggerUtils.info(`\n📄 ${FileUtils.getRelativePath(filePath)} (${strings.length} 个):`);
        strings.forEach((item, index) => {
          LoggerUtils.info(`  ${index + 1}. ${this.formatResultLine(item)}`);
        });
      }
    } else {
      extractedStrings.forEach((item, index) => {
        LoggerUtils.info(`${index + 1}. ${this.formatResultLine(item)}`);
      });
    }
  }

  /**
   * 应用转换
   * @param filePaths - 文件路径数组
   * @param extractedStrings - 提取的字符串数组
   */
  private async applyTransformations(filePaths: string[], extractedStrings: ExtractedString[]): Promise<void> {
    LoggerUtils.info(`\n🔄 开始应用转换...`);

    // 更新语言文件
    LanguageFileManager.updateLanguageFiles(this.isCustom, extractedStrings);

    // 转换源代码文件
    for (const filePath of filePaths) {
      try {
        const transformedCode = GenerateTransformer.transform(filePath, extractedStrings, false);
        fs.writeFileSync(filePath, transformedCode, 'utf-8');

        // 格式化代码
        await CommandUtils.formatWithPrettier(filePath);

        LoggerUtils.success(`✅ 已转换: ${FileUtils.getRelativePath(filePath)}`);
      } catch (error) {
        LoggerUtils.error(`❌ 转换失败 ${FileUtils.getRelativePath(filePath)}:`, error);
      }
    }
    LoggerUtils.success('✅ 应用转换完成');
    LoggerUtils.info(`✨ 处理文件列表: \n- ${filePaths.join('\n- ')}`);
  }
}
