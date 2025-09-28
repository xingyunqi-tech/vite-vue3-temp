#!/usr/bin/env node
import fs from 'fs';
import { BaseI18nProcessor, FILES, FileUtils, LOCALE_TYPE, LoggerUtils, type Translations } from './utils';

/**
 * 合并处理器
 * 负责将翻译好的文件合并到translations中，并更新语言包
 */
export class MergeProcessor extends BaseI18nProcessor {
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
    return '合并翻译文件';
  }

  /**
   * 执行合并操作
   */
  protected async _execute(): Promise<void> {
    this.mergeTranslationData();
  }

  /**
   * 合并翻译数据的核心逻辑
   */
  private mergeTranslationData(): void {
    const untranslatedPath = FileUtils.getUntranslatedPath(this.isCustom);
    const translatedPath = FileUtils.getTranslatedPath(this.isCustom);

    LoggerUtils.info(`正在合并翻译数据...`);

    // 检查文件是否存在
    if (!fs.existsSync(untranslatedPath)) {
      LoggerUtils.error(`待翻译文件不存在: ${untranslatedPath}`);
      LoggerUtils.info('请先运行 pick 命令生成待翻译文件。');
      return;
    }

    // 加载待翻译数据
    const untranslatedData = this.loadUntranslatedData(untranslatedPath);
    if (!untranslatedData) return;

    const totalCount = Object.keys(untranslatedData).length;
    if (totalCount === 0) {
      LoggerUtils.warn('待翻译文件为空，没有需要处理的翻译。');
      return;
    }

    LoggerUtils.info(`📄 待翻译文件: ${untranslatedPath}`);
    LoggerUtils.info(`📊 发现 ${totalCount} 个待翻译条目`);

    // 加载现有的translations.json
    const existingTranslations = this.loadExistingTranslations(translatedPath);

    // 分析翻译状态
    const analysisResult = this.analyzeTranslationStatus(untranslatedData);

    if (analysisResult.newTranslatedCount === 0) {
      LoggerUtils.warn('没有新完成的翻译可以合并。');
      return;
    }

    // 执行合并操作
    this.performMerge(analysisResult, existingTranslations, translatedPath);

    // 更新语言包文件
    this.updateLanguagePackage(analysisResult.newlyTranslated);

    // 显示合并结果
    this.displayMergeResult(analysisResult);
  }

  /**
   * 加载待翻译数据
   * @param filePath - 文件路径
   * @returns 待翻译数据或null
   */
  private loadUntranslatedData(filePath: string): Translations | null {
    const result = FileUtils.safeLoadJsonFile<Translations>(filePath, {
      defaultValue: null as unknown as Translations,
      errorMessage: '读取待翻译文件失败',
    });
    return result;
  }

  /**
   * 加载现有的translations.json
   * @param filePath - 文件路径
   * @returns 现有翻译数据
   */
  private loadExistingTranslations(filePath: string): Translations {
    if (!fs.existsSync(filePath)) {
      LoggerUtils.info(`创建新的 ${FILES.TRANSLATIONS_JSON} 文件`);
      return {};
    }

    return FileUtils.safeLoadJsonFile<Translations>(filePath, {
      errorMessage: '读取现有translations文件失败，将创建新文件',
      logSuccess: true,
    });
  }

  /**
   * 分析翻译状态
   * @param untranslatedData - 待翻译数据
   * @returns 分析结果
   */
  private analyzeTranslationStatus(untranslatedData: Translations): {
    newlyTranslated: Translations;
    stillUntranslated: Translations;
    newTranslatedCount: number;
    stillUntranslatedCount: number;
  } {
    const newlyTranslated: Translations = {};
    const stillUntranslated: Translations = {};
    let newTranslatedCount = 0;
    let stillUntranslatedCount = 0;

    LoggerUtils.info('🔍 正在分析翻译状态...');

    for (const [key, data] of Object.entries(untranslatedData)) {
      const zhValue = data[LOCALE_TYPE.ZH_CN];
      const enValue = data[LOCALE_TYPE.EN_US];

      // 检查是否已翻译（en-US有值且为有效英文）
      if (enValue && FileUtils.isValidEnglishTranslation(enValue)) {
        // 已翻译：合并到translations中
        newlyTranslated[key] = {
          [LOCALE_TYPE.ZH_CN]: zhValue,
          [LOCALE_TYPE.EN_US]: enValue,
        };
        newTranslatedCount++;
      } else {
        // 仍未翻译：保留在untranslated中
        stillUntranslated[key] = {
          [LOCALE_TYPE.ZH_CN]: zhValue,
          [LOCALE_TYPE.EN_US]: enValue || '',
        };
        stillUntranslatedCount++;
      }
    }

    LoggerUtils.success(`✅ 新翻译完成: ${newTranslatedCount} 个`);
    LoggerUtils.info(`📝 仍需翻译: ${stillUntranslatedCount} 个`);

    return {
      newlyTranslated,
      stillUntranslated,
      newTranslatedCount,
      stillUntranslatedCount,
    };
  }

  /**
   * 执行合并操作
   * @param analysisResult - 分析结果
   * @param existingTranslations - 现有翻译
   * @param translatedPath - 翻译文件路径
   */
  private performMerge(
    analysisResult: ReturnType<typeof MergeProcessor.prototype.analyzeTranslationStatus>,
    existingTranslations: Translations,
    translatedPath: string,
  ): void {
    // 合并到translations.json
    const finalTranslations = { ...existingTranslations, ...analysisResult.newlyTranslated };
    FileUtils.createOrEmptyFile(translatedPath, JSON.stringify(finalTranslations, null, 2));
    LoggerUtils.info(`📄 已更新 ${FILES.TRANSLATIONS_JSON}，现有 ${Object.keys(finalTranslations).length} 个翻译条目`);

    // 更新untranslated.json
    const untranslatedFilePath = FileUtils.getUntranslatedPath(this.isCustom);
    this.updateUntranslatedFile(untranslatedFilePath, analysisResult);
  }

  /**
   * 更新待翻译文件
   * @param filePath - 文件路径
   * @param analysisResult - 分析结果
   */
  private updateUntranslatedFile(
    filePath: string,
    analysisResult: ReturnType<typeof MergeProcessor.prototype.analyzeTranslationStatus>,
  ): void {
    if (analysisResult.stillUntranslatedCount > 0) {
      // 仍有待翻译条目，更新文件内容
      FileUtils.createOrEmptyFile(filePath, JSON.stringify(analysisResult.stillUntranslated, null, 2));
      LoggerUtils.info(
        `📝 已更新 ${FILES.UNTRANSLATED_JSON}，剩余 ${analysisResult.stillUntranslatedCount} 个待翻译条目`,
      );
    } else {
      // 所有条目已翻译完成，清空文件但保留文件
      FileUtils.createOrEmptyFile(filePath, '{}');
      LoggerUtils.success(`🎉 所有条目已翻译完成，已清空 ${FILES.UNTRANSLATED_JSON}`);
    }
  }

  /**
   * 更新语言包文件
   * @param newlyTranslated - 新翻译的数据
   */
  private updateLanguagePackage(newlyTranslated: Translations): void {
    const enUSPath = FileUtils.getLocaleFilePath(this.isCustom, LOCALE_TYPE.EN_US);
    let enUSMessages: Record<string, string> = {};

    // 加载现有的en-US.json
    if (fs.existsSync(enUSPath)) {
      try {
        const loadedMessages = FileUtils.loadJsonFile(enUSPath);
        // 将Translations类型转换为Record<string, string>
        enUSMessages = Object.fromEntries(Object.entries(loadedMessages).map(([key, value]) => [key, String(value)]));
      } catch (error) {
        LoggerUtils.warn(`读取en-US.json失败，将创建新文件: ${error}`);
      }
    }

    // 将新翻译合并到en-US.json
    let enUSUpdatedCount = 0;
    for (const [key, data] of Object.entries(newlyTranslated)) {
      const enValue = data[LOCALE_TYPE.EN_US];
      if (enValue && enUSMessages[key] !== enValue) {
        enUSMessages[key] = enValue;
        enUSUpdatedCount++;
      }
    }

    // 保存更新后的en-US.json
    fs.writeFileSync(enUSPath, JSON.stringify(enUSMessages, null, 2), 'utf8');
    LoggerUtils.info(`📄 已更新 ${FILES.EN_US_JSON}，更新 ${enUSUpdatedCount} 个条目`);
  }

  /**
   * 显示合并结果
   * @param analysisResult - 分析结果
   */
  private displayMergeResult(
    analysisResult: ReturnType<typeof MergeProcessor.prototype.analyzeTranslationStatus>,
  ): void {
    // 显示新翻译的示例
    const newTranslatedExamples = Object.keys(analysisResult.newlyTranslated).slice(0, 3);
    if (newTranslatedExamples.length > 0) {
      LoggerUtils.info('\n✅ 新翻译完成示例:');
      newTranslatedExamples.forEach(key => {
        const item = analysisResult.newlyTranslated[key];
        LoggerUtils.info(`  ${key}:`);
        LoggerUtils.info(`    zh-CN: "${item[LOCALE_TYPE.ZH_CN]}"`);
        LoggerUtils.info(`    en-US: "${item[LOCALE_TYPE.EN_US]}"`);
      });
    }

    LoggerUtils.info(`\n📊 合并结果:`);
    LoggerUtils.info(`   - ✅ 新合并翻译: ${analysisResult.newTranslatedCount} 个`);
    LoggerUtils.info(`   - 📝 仍需翻译: ${analysisResult.stillUntranslatedCount} 个`);
  }
}
