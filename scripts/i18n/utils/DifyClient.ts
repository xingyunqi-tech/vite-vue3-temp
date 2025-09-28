import { ConcurrencyController } from './ConcurrencyController';
import { ID_GENERATION_CONFIG, TRANSLATION_CONFIG } from './constants';
import { IdGenerator } from './IdGenerator';
import { LoggerUtils } from './LoggerUtils';
import { DifyConfig, DifyResponse, DifyTranslateResponse, Translations } from './types';

/**
 * 重试机制配置
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Dify API 客户端
 * 封装所有与Dify API的交互逻辑，支持并发调用、重试机制和请求队列管理
 */
export class DifyClient {
  private config: DifyConfig;
  private concurrencyController: ConcurrencyController;
  private retryConfig: RetryConfig;

  /**
   * 构造函数
   * @param config - Dify配置
   * @param maxConcurrency - 最大并发数，默认为5
   * @param retryConfig - 重试配置
   */
  constructor(
    config: DifyConfig,
    maxConcurrency: number = 5,
    retryConfig: RetryConfig = {
      maxRetries: 2,
      baseDelay: 500,
      maxDelay: 10000,
      backoffFactor: 2,
    },
  ) {
    this.config = config;
    this.concurrencyController = new ConcurrencyController(maxConcurrency);
    this.retryConfig = retryConfig;
  }

  /**
   * 创建默认的Dify客户端（用于ID生成）
   * @param maxConcurrency - 最大并发数
   * @returns DifyClient实例
   */
  static createForIdGeneration(maxConcurrency: number = 5): DifyClient {
    return new DifyClient(ID_GENERATION_CONFIG, maxConcurrency);
  }

  /**
   * 创建用于翻译的Dify客户端
   * @param maxConcurrency - 最大并发数
   * @returns DifyClient实例
   */
  static createForTranslation(maxConcurrency: number = 3): DifyClient {
    return new DifyClient(TRANSLATION_CONFIG, maxConcurrency);
  }

  /**
   * 生成语义ID列表（支持并发）
   * @param textList - 文本列表
   * @param batchSize - 批处理大小，默认10
   * @returns 语义ID列表
   */
  async generateSemanticIds(textList: string[], batchSize: number = 10): Promise<string[]> {
    if (textList.length === 0) return [];

    // 如果文本数量小于等于批处理大小，直接调用
    if (textList.length <= batchSize) {
      return this.generateSemanticIdsBatch(textList);
    }

    // 分批处理，支持并发
    const batches: string[][] = [];
    const totalBatches = Math.ceil(textList.length / batchSize);

    // 创建批次
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, textList.length);
      batches.push(textList.slice(startIndex, endIndex));
    }

    LoggerUtils.info(`📊 需要分 ${totalBatches} 批次处理，每批 ${batchSize} 个文本`);
    LoggerUtils.info(`🔄 使用并发处理，最大并发数: ${this.concurrencyController.getStatus().maxConcurrency}`);

    // 并发处理所有批次
    const batchPromises = batches.map((batch, index) =>
      this.concurrencyController.add(async () => {
        LoggerUtils.info(`🔄 正在处理第 ${index + 1}/${totalBatches} 批次 (${batch.length} 个文本)...`);

        try {
          const results = await this.generateSemanticIdsBatch(batch);
          LoggerUtils.success(`✅ 第 ${index + 1} 批次处理完成`);
          return results;
        } catch (error) {
          LoggerUtils.error(`❌ 第 ${index + 1} 批次处理失败:`, error);
          throw error;
        }
      }),
    );

    // 等待所有批次完成
    const batchResults = await Promise.all(batchPromises);
    const results = batchResults.flat();

    LoggerUtils.success(`🎉 所有批次处理完成，共生成 ${results.length} 个语义ID`);
    return results;
  }

  /**
   * 批量翻译（支持并发）
   * @param batches - 批次数据
   * @param onProgress - 进度回调
   * @returns 翻译结果
   */
  async batchTranslate(
    batches: Translations[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<Translations[]> {
    if (batches.length === 0) return [];

    LoggerUtils.info(`🔄 开始批量翻译，共 ${batches.length} 批次`);
    LoggerUtils.info(`🔄 使用并发处理，最大并发数: ${this.concurrencyController.getStatus().maxConcurrency}`);

    const results: Translations[] = new Array(batches.length);
    let completedCount = 0;

    // 并发处理所有批次
    const batchPromises = batches.map((batch, index) =>
      this.concurrencyController.add(async () => {
        const jsonText = JSON.stringify(batch, null, 2);

        try {
          const translatedJsonText = await this.translateJson(jsonText);
          const translatedBatch: Translations = JSON.parse(translatedJsonText);
          results[index] = translatedBatch;

          completedCount++;
          if (onProgress) {
            onProgress(completedCount, batches.length);
          }

          LoggerUtils.success(`✅ 翻译批次 ${index + 1}/${batches.length} 完成`);
        } catch (error) {
          LoggerUtils.error(`❌ 翻译批次 ${index + 1} 失败:`, error);
          results[index] = batch; // 保留原始数据

          completedCount++;
          if (onProgress) {
            onProgress(completedCount, batches.length);
          }
        }
      }),
    );

    // 等待所有批次完成
    await Promise.all(batchPromises);

    LoggerUtils.success(`🎉 批量翻译完成，成功处理 ${completedCount} 个批次`);
    return results;
  }

  /**
   * 处理单个批次的语义ID生成
   * @param textList - 文本列表
   * @returns 语义ID列表
   */
  private async generateSemanticIdsBatch(textList: string[]): Promise<string[]> {
    const response = await this.makeRequest({
      inputs: { text_list: JSON.stringify(textList) },
      response_mode: 'blocking',
      user: 'i18n',
    });

    if (!this.isIdGenerationResponse(response)) {
      throw new Error('Invalid response format from Dify API for ID generation');
    }

    return response.data.outputs.results.id_list;
  }

  /**
   * 翻译JSON文本
   * @param jsonText - 待翻译的JSON文本
   * @returns 翻译后的JSON文本
   */
  async translateJson(jsonText: string): Promise<string> {
    const response = await this.makeRequest({
      inputs: { input_locale: jsonText },
      response_mode: 'blocking',
      user: 'i18n',
    });

    if (!this.isTranslationResponse(response)) {
      throw new Error('Invalid response format from Dify API for translation');
    }

    return response.data.outputs.results;
  }

  /**
   * 发送请求到Dify API（支持重试机制）
   * @param body - 请求体
   * @returns 响应数据
   */
  private async makeRequest(body: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Dify API请求失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // 如果是重试成功的情况，记录日志
        if (attempt > 0) {
          LoggerUtils.success(`✅ 重试成功，共尝试 ${attempt + 1} 次`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.retryConfig.maxRetries;

        if (!isLastAttempt) {
          // 计算退避时间
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
            this.retryConfig.maxDelay,
          );
          LoggerUtils.warn(`请求失败，将在 ${delay}ms 后重试 (第 ${attempt + 1}/${this.retryConfig.maxRetries} 次)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          LoggerUtils.error(`请求失败，已达到最大重试次数:`, lastError);
          throw lastError;
        }
      }
    }

    // This should not be reached
    throw new Error('请求重试逻辑错误');
  }

  /**
   * 检查是否为ID生成响应
   * @param response - 响应对象
   * @returns 是否为ID生成响应
   */
  private isIdGenerationResponse(response: any): response is DifyResponse {
    return (
      response &&
      response.data &&
      response.data.outputs &&
      response.data.outputs.results &&
      Array.isArray(response.data.outputs.results.id_list)
    );
  }

  /**
   * 检查是否为翻译响应
   * @param response - 响应对象
   * @returns 是否为翻译响应
   */
  private isTranslationResponse(response: any): response is DifyTranslateResponse {
    return response && response.data && response.data.outputs && typeof response.data.outputs.results === 'string';
  }

  /**
   * 获取并发控制器状态
   * @returns 并发控制器状态
   */
  getConcurrencyStatus(): { running: number; queued: number; maxConcurrency: number } {
    return this.concurrencyController.getStatus();
  }

  /**
   * 调整并发数
   * @param newMaxConcurrency - 新的最大并发数
   */
  adjustConcurrency(newMaxConcurrency: number): void {
    if (newMaxConcurrency < 1) {
      LoggerUtils.warn(`⚠️ 无效的并发数: ${newMaxConcurrency}，必须大于0`);
      return;
    }
    LoggerUtils.info(
      `🔧 调整最大并发数: ${this.concurrencyController.getStatus().maxConcurrency} -> ${newMaxConcurrency}`,
    );
    this.concurrencyController = new ConcurrencyController(newMaxConcurrency);
  }

  /**
   * 为文件生成语义ID
   * @param fileGroups - 文件分组
   * @param skipDify - 是否跳过Dify API
   * @returns 文件分组的语义ID
   */
  async generateSemanticIdsForFiles(
    fileGroups: Record<string, string[]>,
    skipDify: boolean = false,
  ): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};
    const existingIds = new Set<string>(); // 本地ID生成器

    // 如果跳过Dify，则使用本地生成策略
    if (skipDify) {
      LoggerUtils.info('🔄 检测到 --skip-dify，使用本地ID生成策略...');
      for (const [filePath, texts] of Object.entries(fileGroups)) {
        // 直接使用 IdGenerator 生成 ID
        results[filePath] = texts.map(text => IdGenerator.generateWithFilePath(filePath, text, existingIds));
      }
      return results;
    }

    // -- 如果不跳过Dify，则继续执行以下并发API调用逻辑 --

    LoggerUtils.info(`🚀 开始通过Dify为 ${Object.keys(fileGroups).length} 个文件生成语义ID...`);

    const promises = Object.entries(fileGroups).map(([filePath, texts]) =>
      this.concurrencyController.add(async () => {
        LoggerUtils.info(`🔄 正在处理文件: ${filePath} (${texts.length} 个文本)...`);

        try {
          const allIds = await this.generateSemanticIds(texts);
          results[filePath] = allIds;
          LoggerUtils.success(`✅ 文件 ${filePath} 的语义ID生成完成，共 ${allIds.length} 个ID`);
        } catch (error) {
          LoggerUtils.error(`❌ 文件 ${filePath} 的语义ID生成失败:`, error);
          results[filePath] = []; // 保留原始数据
        }
      }),
    );

    await Promise.all(promises);
    LoggerUtils.success(`🎉 所有文件的语义ID生成完成，共 ${Object.values(results).flat().length} 个ID`);
    return results;
  }
}
