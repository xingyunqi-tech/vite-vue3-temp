#!/usr/bin/env node
import {
  BaseI18nProcessor,
  FILES,
  FileUtils,
  LanguageFileManager,
  LOCALE_TYPE,
  LoggerUtils,
  type Translations,
} from './utils';

/**
 * Pick处理器
 * 负责生成待翻译文件，将已翻译和待翻译的条目分离
 */
export class PickProcessor extends BaseI18nProcessor {
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
    return '生成待翻译文件';
  }

  /**
   * 执行Pick操作
   */
  protected async _execute(): Promise<void> {
    this.generateUntranslatedFile();
  }

  /**
   * 生成待翻译文件的核心逻辑
   * 检查en-US中未翻译的key提取到untranslated，已翻译的key提取到translations
   */
  private generateUntranslatedFile(): void {
    const untranslatedPath = FileUtils.getUntranslatedPath(this.isCustom);
    const translatedPath = FileUtils.getTranslatedPath(this.isCustom);
    this.ensureWorkingDirectory();

    // 读取语言文件
    const messages = LanguageFileManager.getMessages(this.isCustom);
    const zhCNMessages = messages[LOCALE_TYPE.ZH_CN] || {};
    const enUSMessages = messages[LOCALE_TYPE.EN_US] || {};

    LoggerUtils.info(`📋 开始分析语言条目，共 ${Object.keys(zhCNMessages).length} 个zh-CN条目`);

    // 分析翻译状态
    const analysisResult = this.analyzeTranslationStatus(zhCNMessages, enUSMessages);

    // 保存文件
    this.saveFiles(untranslatedPath, translatedPath, analysisResult);

    // 显示结果
    this.displayResults(analysisResult);
  }

  /**
   * 分析翻译状态
   * @param zhCNMessages - 中文消息
   * @param enUSMessages - 英文消息
   * @returns 分析结果
   */
  private analyzeTranslationStatus(
    zhCNMessages: Record<string, any>,
    enUSMessages: Record<string, any>,
  ): {
    untranslatedEntries: Translations;
    translatedEntries: Translations;
    untranslatedCount: number;
    translatedCount: number;
  } {
    const untranslatedEntries: Translations = {};
    const translatedEntries: Translations = {};
    let untranslatedCount = 0;
    let translatedCount = 0;

    // 遍历所有zh-CN条目
    for (const key in zhCNMessages) {
      if (Object.prototype.hasOwnProperty.call(zhCNMessages, key)) {
        const zhValue = zhCNMessages[key] as string;
        const enValue = enUSMessages[key] as string;

        // 检查en-US是否需要翻译：key不存在、值为空或是中文
        if (!enValue || !FileUtils.isValidEnglishTranslation(enValue)) {
          // 需要翻译：放入untranslated
          untranslatedEntries[key] = {
            [LOCALE_TYPE.ZH_CN]: zhValue,
            [LOCALE_TYPE.EN_US]: enValue || '',
          };
          untranslatedCount++;
        } else {
          // 已翻译：放入translations
          translatedEntries[key] = {
            [LOCALE_TYPE.ZH_CN]: zhValue,
            [LOCALE_TYPE.EN_US]: enValue,
          };
          translatedCount++;
        }
      }
    }

    return {
      untranslatedEntries,
      translatedEntries,
      untranslatedCount,
      translatedCount,
    };
  }

  /**
   * 保存文件
   * @param untranslatedPath - 待翻译文件路径
   * @param translatedPath - 已翻译文件路径
   * @param analysisResult - 分析结果
   */
  private saveFiles(
    untranslatedPath: string,
    translatedPath: string,
    analysisResult: ReturnType<typeof PickProcessor.prototype.analyzeTranslationStatus>,
  ): void {
    // 保存untranslated文件
    FileUtils.createOrEmptyFile(untranslatedPath, JSON.stringify(analysisResult.untranslatedEntries, null, 2));
    LoggerUtils.info(`📄 生成 ${FILES.UNTRANSLATED_JSON} 文件成功 (${this.getDirectoryDescription()})`);
    LoggerUtils.info(`📝 待翻译条目: ${analysisResult.untranslatedCount} 个`);

    // 保存translations文件
    FileUtils.createOrEmptyFile(translatedPath, JSON.stringify(analysisResult.translatedEntries, null, 2));
    LoggerUtils.info(`📄 生成 ${FILES.TRANSLATIONS_JSON} 文件成功 (${this.getDirectoryDescription()})`);
    LoggerUtils.info(`✅ 已翻译条目: ${analysisResult.translatedCount} 个`);
  }

  /**
   * 显示结果示例
   * @param analysisResult - 分析结果
   */
  private displayResults(analysisResult: ReturnType<typeof PickProcessor.prototype.analyzeTranslationStatus>): void {
    // 显示待翻译示例
    this.displayUntranslatedExamples(analysisResult.untranslatedEntries);

    // 显示已翻译示例
    this.displayTranslatedExamples(analysisResult.translatedEntries);

    // 显示统计信息
    LoggerUtils.info(`\n📊 统计信息:`);
    LoggerUtils.info(`   📝 待翻译: ${analysisResult.untranslatedCount} 个`);
    LoggerUtils.info(`   ✅ 已翻译: ${analysisResult.translatedCount} 个`);
    LoggerUtils.info(`   📋 总计: ${analysisResult.untranslatedCount + analysisResult.translatedCount} 个`);
  }

  /**
   * 显示待翻译示例
   * @param untranslatedEntries - 待翻译条目
   */
  private displayUntranslatedExamples(untranslatedEntries: Translations): void {
    const untranslatedExamples = Object.keys(untranslatedEntries).slice(0, 3);
    if (untranslatedExamples.length > 0) {
      LoggerUtils.info('\n📝 待翻译条目示例:');
      untranslatedExamples.forEach(key => {
        const item = untranslatedEntries[key];
        LoggerUtils.info(`  ${key}:`);
        LoggerUtils.info(`    zh-CN: "${item[LOCALE_TYPE.ZH_CN]}"`);
        LoggerUtils.info(`    en-US: "${item[LOCALE_TYPE.EN_US] || '(空)'}"`);
      });
    }
  }

  /**
   * 显示已翻译示例
   * @param translatedEntries - 已翻译条目
   */
  private displayTranslatedExamples(translatedEntries: Translations): void {
    const translatedExamples = Object.keys(translatedEntries).slice(0, 3);
    if (translatedExamples.length > 0) {
      LoggerUtils.info('\n✅ 已翻译条目示例:');
      translatedExamples.forEach(key => {
        const item = translatedEntries[key];
        LoggerUtils.info(`  ${key}:`);
        LoggerUtils.info(`    zh-CN: "${item[LOCALE_TYPE.ZH_CN]}"`);
        LoggerUtils.info(`    en-US: "${item[LOCALE_TYPE.EN_US]}"`);
      });
    }
  }
}
