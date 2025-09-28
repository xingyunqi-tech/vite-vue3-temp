#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { BaseI18nProcessor, FileUtils, type ILangMsg, LoggerUtils, PROJECT_CONFIG } from './utils';

// ==================== 导出处理器类 ====================

/**
 * 导出处理器
 * 负责合并基础语言包和自定义语言包，生成最终的语言包文件
 */
export class ExportProcessor extends BaseI18nProcessor {
  /**
   * 构造函数
   * ExportProcessor不区分主目录和定制目录，固定为false
   */
  constructor() {
    super(false);
  }

  /**
   * 获取操作名称
   * @returns 操作名称
   */
  protected getOperationName(): string {
    return '导出语言包';
  }

  /**
   * 执行导出操作
   * @param outputDir - 可选的自定义输出目录
   */
  protected async _execute(outputDir?: string): Promise<void> {
    LoggerUtils.info(`📂 基础目录: ${PROJECT_CONFIG.MAIN_LOCALE_DIR}`);
    LoggerUtils.info(`📂 定制目录: ${PROJECT_CONFIG.CUSTOM_LOCALE_DIR}`);
    LoggerUtils.info(`📂 输出目录: ${outputDir || PROJECT_CONFIG.OUTPUT_DIR}`);

    // 执行导出逻辑
    await this.performExport(outputDir);
  }

  /**
   * 执行导出操作的具体实现
   * @param outputDir - 可选的自定义输出目录
   */
  private async performExport(outputDir?: string): Promise<void> {
    try {
      // 确定输出目录
      const finalOutputDir = outputDir || PROJECT_CONFIG.OUTPUT_DIR;

      // 加载基础语言包
      const baseZhCN = FileUtils.loadLanguageFile(
        path.join(PROJECT_CONFIG.MAIN_LOCALE_DIR, 'zh-CN.json'),
        'zh-CN',
        '基础',
      );
      const baseEnUS = FileUtils.loadLanguageFile(
        path.join(PROJECT_CONFIG.MAIN_LOCALE_DIR, 'en-US.json'),
        'en-US',
        '基础',
      );

      // 加载自定义语言包
      const customZhCN = FileUtils.loadLanguageFile(
        path.join(PROJECT_CONFIG.CUSTOM_LOCALE_DIR, 'zh-CN.json'),
        'zh-CN',
        '自定义',
      );
      const customEnUS = FileUtils.loadLanguageFile(
        path.join(PROJECT_CONFIG.CUSTOM_LOCALE_DIR, 'en-US.json'),
        'en-US',
        '自定义',
      );

      // 检查语言包冲突
      LoggerUtils.info('🔍 检查语言包冲突...');
      const zhConflicts = FileUtils.findConflictingKeys(baseZhCN, customZhCN);
      const enConflicts = FileUtils.findConflictingKeys(baseEnUS, customEnUS);

      if (zhConflicts.length > 0) {
        LoggerUtils.error('zh-CN 语言包冲突', zhConflicts);
      }

      if (enConflicts.length > 0) {
        LoggerUtils.error('en-US 语言包冲突', enConflicts);
      }

      LoggerUtils.success('✅ 未发现语言包冲突');

      // 合并语言包（自定义语言包优先）
      const mergedZhCN: ILangMsg = { ...baseZhCN, ...customZhCN };
      const mergedEnUS: ILangMsg = { ...baseEnUS, ...customEnUS };

      // 确保输出目录存在
      FileUtils.ensureDirectoryExists(finalOutputDir);

      // 生成统计信息
      const baseZhCount = Object.keys(baseZhCN).length;
      const baseEnCount = Object.keys(baseEnUS).length;
      const customZhCount = Object.keys(customZhCN).length;
      const customEnCount = Object.keys(customEnUS).length;
      const mergedZhCount = Object.keys(mergedZhCN).length;
      const mergedEnCount = Object.keys(mergedEnUS).length;

      LoggerUtils.info('\n📊 语言包统计信息:');
      LoggerUtils.info(`📁 基础语言包 (${PROJECT_CONFIG.MAIN_LOCALE_DIR}):`);
      LoggerUtils.info(`   zh-CN: ${baseZhCount} 个条目`);
      LoggerUtils.info(`   en-US: ${baseEnCount} 个条目`);
      LoggerUtils.info(`📁 自定义语言包 (${PROJECT_CONFIG.CUSTOM_LOCALE_DIR}):`);
      LoggerUtils.info(`   zh-CN: ${customZhCount} 个条目`);
      LoggerUtils.info(`   en-US: ${customEnCount} 个条目`);
      LoggerUtils.info(`📦 合并后语言包:`);
      LoggerUtils.info(`   zh-CN: ${mergedZhCount} 个条目`);
      LoggerUtils.info(`   en-US: ${mergedEnCount} 个条目`);

      // 写入合并后的语言包
      const outputZhPath = path.join(finalOutputDir, 'zh-CN.json');
      const outputEnPath = path.join(finalOutputDir, 'en-US.json');

      fs.writeFileSync(outputZhPath, JSON.stringify(mergedZhCN, null, 2) + '\n', 'utf8');
      fs.writeFileSync(outputEnPath, JSON.stringify(mergedEnUS, null, 2) + '\n', 'utf8');

      LoggerUtils.success('\n✅ 语言包导出成功!');
      LoggerUtils.info(`📄 输出文件:`);
      LoggerUtils.info(`   ${outputZhPath}`);
      LoggerUtils.info(`   ${outputEnPath}`);

      // 验证导出的文件
      LoggerUtils.info('\n🔍 验证导出文件...');
      try {
        const exportedZh = JSON.parse(fs.readFileSync(outputZhPath, 'utf8'));
        const exportedEn = JSON.parse(fs.readFileSync(outputEnPath, 'utf8'));

        if (Object.keys(exportedZh).length === mergedZhCount && Object.keys(exportedEn).length === mergedEnCount) {
          LoggerUtils.success('✅ 导出文件验证通过');
        } else {
          LoggerUtils.warn('导出文件条目数量不匹配');
        }
      } catch (error) {
        LoggerUtils.warn(`导出文件验证失败: ${error}`);
      }
    } catch (error) {
      LoggerUtils.error('语言包导出失败', error);
      throw error;
    }
  }
}
