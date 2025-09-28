#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {
  ASTUtils,
  BaseI18nProcessor,
  CommandUtils,
  FileUtils,
  ImportManager,
  LocaleMap,
  LoggerUtils,
  RestoreTransformer,
  TextExtractor,
  TransformContext,
} from './utils';

// ==================== 接口定义 ====================

/**
 * 还原操作选项接口
 */
interface RestoreOptions {
  /** 源代码目录 */
  sourceDir: string;
  /** 输出目录 */
  outputDir: string;
  /** 语言文件路径 */
  localePath: string;
  /** 是否覆盖现有文件 */
  overwrite: boolean;
}

// ==================== 还原处理器类 ====================

/**
 * 还原处理器
 * 负责将国际化代码还原为原始文本
 */
export class RestoreProcessor extends BaseI18nProcessor {
  /**
   * 构造函数
   * @param isCustom - 是否为定制目录
   */
  constructor(isCustom: boolean = false) {
    super(isCustom);
  }

  /**
   * 获取操作名称
   * @returns 操作名称
   */
  protected getOperationName(): string {
    return '还原';
  }

  /**
   * 执行还原操作
   * @param targets - 目标文件或目录数组
   * @param outputDir - 输出目录（可选）
   * @param overwrite - 是否覆盖现有文件
   */
  async _execute(targets: string[] = [], outputDir?: string, overwrite: boolean = false): Promise<void> {
    const options: RestoreOptions = {
      sourceDir: process.cwd(),
      outputDir: outputDir || path.join(process.cwd(), 'restored'),
      localePath: this.getLocaleFilePath(),
      overwrite,
    };

    // 解析目标文件
    const targetFiles = targets.length > 0 ? await this.resolveTargetFiles(targets) : undefined;

    await this.restoreFiles(options, targetFiles);
  }

  /**
   * 获取语言文件路径
   * @returns 语言文件路径
   */
  private getLocaleFilePath(): string {
    const localeDir = FileUtils.getDirectoryPath(this.isCustom);
    return path.join(localeDir, 'zh-CN.json');
  }

  /**
   * 解析目标文件
   * @param targets - 目标数组
   * @returns 解析后的文件路径数组
   */
  private async resolveTargetFiles(targets: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const target of targets) {
      try {
        const resolvedTarget = path.resolve(target);
        const stat = fs.statSync(resolvedTarget);

        if (stat.isFile()) {
          files.push(resolvedTarget);
        } else if (stat.isDirectory()) {
          // 使用 FileUtils 统一获取 React 文件
          files.push(...FileUtils.getReactFiles(resolvedTarget));
        }
      } catch (error) {
        LoggerUtils.error(`无法解析目标: ${target}`, error);
      }
    }

    return files;
  }

  /**
   * 还原文件
   * @param options - 还原选项
   * @param targetFiles - 目标文件数组（可选）
   */
  private async restoreFiles(options: RestoreOptions, targetFiles?: string[]): Promise<void> {
    try {
      // 加载语言映射
      const localeMap = this.loadLocaleMap(options.localePath);
      if (Object.keys(localeMap).length === 0) {
        LoggerUtils.warn('语言文件为空或无法加载');
        return;
      }

      LoggerUtils.info(`📖 加载了 ${Object.keys(localeMap).length} 个语言条目`);

      // 确定要处理的文件
      let filesToProcess: string[];
      if (targetFiles && targetFiles.length > 0) {
        filesToProcess = targetFiles;
      } else {
        // 查找所有React文件
        filesToProcess = FileUtils.getReactFiles(options.sourceDir);
      }

      LoggerUtils.info(`📁 找到 ${filesToProcess.length} 个文件待处理`);

      if (filesToProcess.length === 0) {
        LoggerUtils.info('✅ 没有找到需要处理的文件');
        return;
      }

      // 确保输出目录存在
      FileUtils.ensureDirectoryExists(options.outputDir);

      let processedCount = 0;
      let modifiedCount = 0;

      // 处理每个文件
      for (const filePath of filesToProcess) {
        try {
          const outputPath = options.overwrite
            ? filePath
            : path.join(options.outputDir, path.relative(options.sourceDir, filePath));

          const wasModified = await this.processFile(filePath, localeMap, options, outputPath);
          processedCount++;
          if (wasModified) {
            modifiedCount++;
          }

          if (processedCount % 10 === 0) {
            LoggerUtils.info(`📈 进度: ${processedCount}/${filesToProcess.length} 文件已处理`);
          }
        } catch (error) {
          LoggerUtils.error(`处理文件失败: ${FileUtils.getRelativePath(filePath)}`, error);
        }
      }

      LoggerUtils.success(`\n✅ 处理完成！`);
      LoggerUtils.info(`📊 总计处理: ${processedCount} 个文件`);
      LoggerUtils.info(`📊 已修改: ${modifiedCount} 个文件`);

      if (!options.overwrite && modifiedCount > 0) {
        LoggerUtils.info(`📂 输出目录: ${options.outputDir}`);
      }
    } catch (error) {
      LoggerUtils.error('还原过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 加载语言映射
   * @param localePath - 语言文件路径
   * @returns 语言映射
   */
  private loadLocaleMap(localePath: string): LocaleMap {
    return FileUtils.safeLoadJsonFile<LocaleMap>(localePath, {
      errorMessage: '加载语言文件失败',
    });
  }

  /**
   * 处理单个文件
   * @param filePath - 文件路径
   * @param localeMap - 语言映射
   * @param options - 还原选项
   * @param outputPath - 输出路径（可选）
   * @returns 是否有修改
   */
  private async processFile(
    filePath: string,
    localeMap: LocaleMap,
    options: RestoreOptions,
    outputPath?: string,
  ): Promise<boolean> {
    const actualOutputPath = outputPath || filePath;

    try {
      const sourceText = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ASTUtils.parseSourceFile(sourceText, filePath);

      const context: TransformContext = {
        localeMap,
        definedMessages: new Map(),
        hasChanges: false,
        sourceFile,
        componentNameMap: new Map(),
      };

      // 首先提取defineMessages中的消息定义
      ts.forEachChild(sourceFile, function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          TextExtractor.extractDefineMessages(node, context.definedMessages, sourceFile);
        }
        ts.forEachChild(node, visit);
      });

      // 应用转换
      const transformer = RestoreTransformer.createTransformer(context);
      const result = ts.transform(sourceFile, [transformer]);

      if (context.hasChanges) {
        // 生成转换后的代码
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        let transformedCode = printer.printFile(result.transformed[0]);

        // 清理代码
        transformedCode = ImportManager.convertUnicodeToChineseInCode(transformedCode);

        // 确保输出目录存在
        FileUtils.ensureDirectoryExists(path.dirname(actualOutputPath));

        // 写入文件
        fs.writeFileSync(actualOutputPath, transformedCode, 'utf-8');

        // 格式化代码
        try {
          await CommandUtils.formatWithPrettier(actualOutputPath);
        } catch (error) {
          LoggerUtils.error(`格式化失败，但文件已保存: ${FileUtils.getRelativePath(actualOutputPath)}`, error);
        }

        LoggerUtils.success(`✅ 还原: ${FileUtils.getRelativePath(filePath)}`);
        return true;
      }
      LoggerUtils.info(`⚪ 跳过: ${FileUtils.getRelativePath(filePath)} (无需修改)`);
      return false;
    } catch (error) {
      LoggerUtils.error(`处理文件失败 ${FileUtils.getRelativePath(filePath)}:`, error);
      return false;
    }
  }
}
