#!/usr/bin/env node
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ExportProcessor } from './exportLocale';
import { GeneratorProcessor } from './generate';
import { MergeProcessor } from './merge';
import { PickProcessor } from './pick';
import { RestoreProcessor } from './restore';
import { TranslateProcessor } from './translate';
import { AutomaticProcessor, InteractiveUtils, LoggerUtils, MODE_DESCRIPTIONS, ModeName } from './utils';

/**
 * 执行generate操作（提取多语言组件）
 * @param isCustom - 是否是定制目录
 */
const executeGenerate = async (isCustom: boolean): Promise<void> => {
  const targetPath = await InteractiveUtils.promptForPath(ModeName.GENERATE);
  const processor = new GeneratorProcessor(isCustom);
  await processor.execute(targetPath);
};

/**
 * 执行restore操作（还原多语言组件）
 * @param isCustom - 是否是定制目录
 */
const executeRestore = async (isCustom: boolean): Promise<void> => {
  const targetPath = await InteractiveUtils.promptForPath(ModeName.RESTORE);
  const processor = new RestoreProcessor(isCustom);
  await processor.execute([targetPath], path.dirname(targetPath), true);
};

/**
 * 执行export操作（导出语言包）
 * 合并基础语言包和自定义语言包，生成最终的语言包文件
 */
const executeExport = async (): Promise<void> => {
  const processor = new ExportProcessor();
  await processor.execute();
};

/**
 * 执行pick操作（生成待翻译文件）
 * @param isCustom - 是否是定制目录
 */
const executePick = async (isCustom: boolean): Promise<void> => {
  const processor = new PickProcessor(isCustom);
  await processor.execute();
};

/**
 * 执行translate操作（翻译待翻译文件）
 * @param isCustom - 是否是定制目录
 */
const executeTranslate = async (isCustom: boolean): Promise<void> => {
  const processor = new TranslateProcessor(isCustom);
  await processor.execute();
};

/**
 * 执行merge操作（合并翻译文件）
 * @param isCustom - 是否是定制目录
 */
const executeMerge = async (isCustom: boolean): Promise<void> => {
  const processor = new MergeProcessor(isCustom);
  await processor.execute();
};

/**
 * 主函数 - 程序入口点
 * 解析命令行参数，支持交互式模式和直接操作模式
 * 根据用户选择执行对应的i18n操作
 */
const main = async (): Promise<void> => {
  // 解析命令行参数
  const yargsObj = yargs(hideBin(process.argv))
    .scriptName('i18n')
    .usage(
      `🌐 国际化工具集 - 自动化多语言处理

🚀 ${ModeName.AUTOMATIC} - ${MODE_DESCRIPTIONS[ModeName.AUTOMATIC]}
📝 ${ModeName.GENERATE} - ${MODE_DESCRIPTIONS[ModeName.GENERATE]}
📤 ${ModeName.PICK} - ${MODE_DESCRIPTIONS[ModeName.PICK]}
🤖 ${ModeName.TRANSLATE} - ${MODE_DESCRIPTIONS[ModeName.TRANSLATE]}
📥 ${ModeName.MERGE} - ${MODE_DESCRIPTIONS[ModeName.MERGE]}
🔄 ${ModeName.RESTORE} - ${MODE_DESCRIPTIONS[ModeName.RESTORE]}
📦 ${ModeName.EXPORT} - ${MODE_DESCRIPTIONS[ModeName.EXPORT]}

使用方式: $0 [选项]`,
    )
    .option('mode', {
      alias: 'm',
      describe: '操作模式',
      choices: [
        ModeName.AUTOMATIC,
        ModeName.GENERATE,
        ModeName.PICK,
        ModeName.TRANSLATE,
        ModeName.MERGE,
        ModeName.EXPORT,
        ModeName.RESTORE,
      ] as const,
      default: ModeName.GENERATE,
    })
    .option('custom', {
      alias: 'c',
      describe: '是否操作定制目录的翻译文件 (src/overrides/locale)',
      type: 'boolean',
      default: false,
    })
    .option('interactive', {
      alias: 'i',
      describe: '交互式选择操作选项',
      type: 'boolean',
      default: false,
    })
    .help()
    .alias('help', 'h')
    .group(['mode', 'custom'], '📋 基本选项:')
    .group(['interactive'], '⚙️  高级选项:')
    .example('$0', '使用默认模式提取多语言组件')
    .example('$0 --mode generate', '扫描源码文件，提取中文并生成国际化调用')
    .example('$0 --mode generate --custom', '对定制目录执行代码生成')
    .example('$0 --mode pick', '从国际化文件中提取未翻译的条目')
    .example('$0 --mode translate', '使用AI翻译服务翻译中文为英文')
    .example('$0 --mode merge --custom', '将定制目录的翻译结果合并回主文件')
    .example('$0 --mode export', '导出最终的多语言文件包')
    .example('$0 --mode restore', '将国际化调用还原为中文（调试用）')
    .example('$0 -i', '启动交互式模式，逐步选择操作')
    .example('$0 -i --custom', '对定制目录启动交互式操作')
    .example('$0 --mode automatic', '启动全自动处理流程')
    .epilog(
      `💡 提示:
• 首次使用建议用交互模式: npm run i18n -- -i
• 完整工作流程: generate → pick → translate → merge → export
• 定制目录用于项目特定的国际化内容，与主目录分开管理`,
    );

  const argv = await yargsObj.parse();

  // 初始化参数
  let mode = (argv.mode as ModeName) || ModeName.GENERATE;
  const custom = Boolean(argv.custom);
  const interactive = Boolean(argv.interactive);

  // 交互模式处理
  if (interactive) {
    const topLevelChoice = await InteractiveUtils.promptForTopLevelMode();

    if (topLevelChoice === 'automatic') {
      mode = ModeName.AUTOMATIC;
    } else {
      // 进入手动模式选择
      mode = await InteractiveUtils.promptForMode(custom, mode);
    }

    const confirmed = await InteractiveUtils.promptForConfirmation(mode, custom);
    if (!confirmed) {
      LoggerUtils.warn('操作已取消');
      process.exit(0);
    }
  }

  // export 模式不需要区分定制目录
  if (mode === ModeName.EXPORT && custom) {
    LoggerUtils.info('注意: export 模式会导出所有语言包，不区分主目录和定制目录');
  }

  // 输出操作信息
  const location = mode === ModeName.EXPORT ? '全局' : custom ? '定制目录' : '主目录';
  LoggerUtils.info(`🎯 执行模式: ${mode} (${MODE_DESCRIPTIONS[mode]})`);
  LoggerUtils.info(`📍 操作目录: ${location}`);

  try {
    // 执行对应的操作
    switch (mode) {
      case ModeName.AUTOMATIC:
        {
          const targetPath = await InteractiveUtils.promptForPath(ModeName.AUTOMATIC);
          // 自动模式默认使用 Dify
          await new AutomaticProcessor(custom).execute(targetPath, false);
        }
        break;
      case ModeName.GENERATE:
        await executeGenerate(custom);
        break;
      case ModeName.PICK:
        await executePick(custom);
        break;
      case ModeName.TRANSLATE:
        await executeTranslate(custom);
        break;
      case ModeName.MERGE:
        await executeMerge(custom);
        break;
      case ModeName.EXPORT:
        await executeExport();
        break;
      case ModeName.RESTORE:
        await executeRestore(custom);
        break;
      default:
        LoggerUtils.error(`没有匹配的模式: ${mode}`);
    }
  } catch (error) {
    LoggerUtils.error(`执行 ${mode} 操作时发生错误:`, error);
    process.exit(1);
  }
};

/**
 * 启动程序
 * 检测是否为直接执行的主模块，如果是则运行main函数
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    LoggerUtils.error('启动失败:', error);
    process.exit(1);
  });
}
