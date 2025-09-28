#!/usr/bin/env node
import fs from 'fs';
import { BaseI18nProcessor, DifyClient, FileUtils, LOCALE_TYPE, LoggerUtils, type Translations } from './utils';

/**
 * 翻译处理器
 * 负责处理待翻译文件的翻译工作
 */
export class TranslateProcessor extends BaseI18nProcessor {
  private difyClient: DifyClient;
  private batchConfig: {
    size: number;
    delay: number;
  };

  /**
   * 构造函数
   * @param isCustom - 是否为定制目录
   * @param batchSize - 批次大小，默认10
   * @param batchDelay - 批次延时，默认500ms
   * @param maxConcurrency - 最大并发数，默认3
   */
  constructor(isCustom: boolean = false, batchSize: number = 10, batchDelay: number = 500, maxConcurrency: number = 5) {
    super(isCustom);
    this.difyClient = DifyClient.createForTranslation(maxConcurrency);
    this.batchConfig = {
      size: batchSize,
      delay: batchDelay,
    };
  }

  /**
   * 获取操作名称
   * @returns 操作名称
   */
  protected getOperationName(): string {
    return '翻译';
  }

  /**
   * 执行翻译操作
   * @param filePath - 可选的自定义文件路径
   */
  async _execute(filePath?: string): Promise<void> {
    const targetPath = filePath || FileUtils.getUntranslatedPath(this.isCustom);

    // 检查文件是否存在
    if (!fs.existsSync(targetPath)) {
      LoggerUtils.error(`文件不存在: ${targetPath}`);
      LoggerUtils.info('请先运行 pick 命令生成待翻译文件。');
      return;
    }

    // 加载待翻译数据
    const data = FileUtils.safeLoadJsonFile<Translations>(targetPath, {
      errorMessage: '读取待翻译文件失败',
      logSuccess: true,
    });
    const totalCount = Object.keys(data).length;

    if (totalCount === 0) {
      LoggerUtils.warn('文件为空，无需处理。');
      return;
    }

    // 分析需要翻译的条目
    const toTranslate = this.filterUntranslatedItems(data);
    const needsTranslation = Object.keys(toTranslate).length;

    if (needsTranslation === 0) {
      LoggerUtils.warn('所有条目已翻译完成。');
      return;
    }

    LoggerUtils.info(`📋 总条目: ${totalCount}, 需翻译: ${needsTranslation}`);
    LoggerUtils.info(`⚙️  批次设置: ${this.batchConfig.size} 条目/批次, ${this.batchConfig.delay}ms 延时`);

    // 执行批量翻译
    const result = await this.performBatchTranslation(toTranslate, targetPath);

    // 输出结果统计
    this.logTranslationResult(result);
  }

  /**
   * 过滤出需要翻译的条目
   * @param data - 原始数据
   * @returns 需要翻译的条目
   */
  private filterUntranslatedItems(data: Translations): Translations {
    const toTranslate: Translations = {};

    for (const [key, item] of Object.entries(data)) {
      if (!item[LOCALE_TYPE.EN_US]?.trim()) {
        toTranslate[key] = item;
      }
    }

    return toTranslate;
  }

  /**
   * 执行批量翻译（使用并发优化）
   * @param toTranslate - 需要翻译的数据
   * @param filePath - 文件路径
   * @returns 翻译结果统计
   */
  private async performBatchTranslation(
    toTranslate: Translations,
    filePath: string,
  ): Promise<{ totalTranslated: number; successBatches: number; totalBatches: number }> {
    const batches = this.chunkData(toTranslate, this.batchConfig.size);
    let totalTranslated = 0;
    let successBatches = 0;

    LoggerUtils.info(`📦 共 ${batches.length} 个批次，使用并发处理`);
    LoggerUtils.info(`🔄 最大并发数: ${this.difyClient.getConcurrencyStatus().maxConcurrency}`);

    try {
      // 使用并发批量翻译
      const translatedBatches = await this.difyClient.batchTranslate(batches, (current, total) => {
        LoggerUtils.info(`📈 翻译进度: ${current}/${total} (${Math.round((current / total) * 100)}%)`);
      });

      // 处理翻译结果
      for (let i = 0; i < translatedBatches.length; i++) {
        const translatedBatch = translatedBatches[i];
        const originalBatch = batches[i];

        try {
          const translated = await this.processBatchResult(translatedBatch, originalBatch, i, batches.length, filePath);
          totalTranslated += translated;
          successBatches++;
        } catch (error) {
          LoggerUtils.error(`批次 ${i + 1} 结果处理失败:`, error instanceof Error ? error.message : error);
        }
      }
    } catch (error) {
      LoggerUtils.error(`并发翻译失败，回退到串行处理:`, error);

      // 回退到串行处理
      for (let i = 0; i < batches.length; i++) {
        try {
          const translated = await this.processBatch(batches[i], i, batches.length, filePath);
          totalTranslated += translated;
          successBatches++;

          // 批次间延时
          if (i < batches.length - 1) {
            await this.delay(this.batchConfig.delay);
          }
        } catch (error) {
          LoggerUtils.error(`批次 ${i + 1} 失败:`, error instanceof Error ? error.message : error);
        }
      }
    }

    return {
      totalTranslated,
      successBatches,
      totalBatches: batches.length,
    };
  }

  /**
   * 切割数据成批次
   * @param data - 原始数据
   * @param chunkSize - 批次大小
   * @returns 批次数组
   */
  private chunkData(data: Translations, chunkSize: number): Translations[] {
    const entries = Object.entries(data);
    const chunks: Translations[] = [];

    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
    }

    return chunks;
  }

  /**
   * 处理单个批次
   * @param batch - 批次数据
   * @param batchIndex - 批次索引
   * @param totalBatches - 总批次数
   * @param filePath - 文件路径
   * @returns 翻译成功的条目数
   */
  private async processBatch(
    batch: Translations,
    batchIndex: number,
    totalBatches: number,
    filePath: string,
  ): Promise<number> {
    LoggerUtils.info(`🔄 处理批次 ${batchIndex + 1}/${totalBatches} (${Object.keys(batch).length} 条目)`);

    try {
      // 使用DifyClient进行翻译
      const jsonText = JSON.stringify(batch, null, 2);
      const translatedJsonText = await this.difyClient.translateJson(jsonText);
      const translatedBatch: Translations = JSON.parse(translatedJsonText);

      if (typeof translatedBatch !== 'object' || translatedBatch === null) {
        throw new Error(`批次 ${batchIndex + 1} 翻译结果格式错误`);
      }

      // 更新文件
      const translatedCount = this.updateFileWithTranslations(filePath, batch, translatedBatch);

      LoggerUtils.success(`✅ 批次 ${batchIndex + 1} 完成，翻译 ${translatedCount} 个条目`);
      return translatedCount;
    } catch (error) {
      LoggerUtils.error(`批次 ${batchIndex + 1} 处理失败:`, error);
      throw error;
    }
  }

  /**
   * 处理批次翻译结果（用于并发翻译）
   * @param translatedBatch - 翻译后的批次数据
   * @param originalBatch - 原始批次数据
   * @param batchIndex - 批次索引
   * @param totalBatches - 总批次数
   * @param filePath - 文件路径
   * @returns 翻译的条目数
   */
  private async processBatchResult(
    translatedBatch: Translations,
    originalBatch: Translations,
    batchIndex: number,
    totalBatches: number,
    filePath: string,
  ): Promise<number> {
    LoggerUtils.info(`🔄 处理批次 ${batchIndex + 1}/${totalBatches} 的翻译结果...`);

    try {
      if (typeof translatedBatch !== 'object' || translatedBatch === null) {
        throw new Error(`批次 ${batchIndex + 1} 翻译结果格式错误`);
      }

      // 更新文件
      const translatedCount = this.updateFileWithTranslations(filePath, originalBatch, translatedBatch);

      LoggerUtils.success(`✅ 批次 ${batchIndex + 1} 结果处理完成，翻译 ${translatedCount} 个条目`);
      return translatedCount;
    } catch (error) {
      LoggerUtils.error(`批次 ${batchIndex + 1} 结果处理失败:`, error);
      throw error;
    }
  }

  /**
   * 更新文件中的翻译
   * @param filePath - 文件路径
   * @param originalBatch - 原始批次数据
   * @param translatedBatch - 翻译后的批次数据
   * @returns 更新的条目数
   */
  private updateFileWithTranslations(
    filePath: string,
    originalBatch: Translations,
    translatedBatch: Translations,
  ): number {
    // 读取最新文件状态
    const currentData = FileUtils.safeLoadJsonFile<Translations>(filePath, {
      errorMessage: '读取翻译文件失败',
      silent: true,
    });
    let translatedCount = 0;

    // 合并翻译结果
    for (const [key] of Object.entries(originalBatch)) {
      const newEnValue = translatedBatch[key]?.[LOCALE_TYPE.EN_US];
      if (newEnValue?.trim()) {
        currentData[key][LOCALE_TYPE.EN_US] = newEnValue;
        translatedCount++;
      }
    }

    // 保存文件
    FileUtils.createOrEmptyFile(filePath, JSON.stringify(currentData, null, 2));
    return translatedCount;
  }

  /**
   * 延时函数
   * @param ms - 延时毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录翻译结果
   * @param result - 翻译结果统计
   */
  private logTranslationResult(result: {
    totalTranslated: number;
    successBatches: number;
    totalBatches: number;
  }): void {
    LoggerUtils.info(`\n📊 翻译结果统计:`);
    LoggerUtils.info(`   - 总批次数: ${result.totalBatches}`);
    LoggerUtils.info(`   - 成功批次数: ${result.successBatches}`);
    LoggerUtils.info(`   - 新翻译条目: ${result.totalTranslated}`);
    LoggerUtils.success(`\n✅ 翻译操作完成`);
  }
}
