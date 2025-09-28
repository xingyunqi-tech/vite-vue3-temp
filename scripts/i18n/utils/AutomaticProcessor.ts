import { ExportProcessor } from '../exportLocale';
import { GeneratorProcessor } from '../generate';
import { MergeProcessor } from '../merge';
import { PickProcessor } from '../pick';
import { TranslateProcessor } from '../translate';
import { LoggerUtils } from './LoggerUtils';

/**
 * 自动处理器
 * 负责按顺序执行完整的i18n工作流
 */
export class AutomaticProcessor {
  private isCustom: boolean;

  constructor(isCustom: boolean = false) {
    this.isCustom = isCustom;
  }

  async execute(targetPath: string, skipDify: boolean = false): Promise<void> {
    const steps = [
      { name: 'generate', processor: new GeneratorProcessor(this.isCustom) },
      { name: 'pick', processor: new PickProcessor(this.isCustom) },
      { name: 'translate', processor: new TranslateProcessor(this.isCustom) },
      { name: 'merge', processor: new MergeProcessor(this.isCustom) },
      { name: 'export', processor: new ExportProcessor() },
    ];

    LoggerUtils.info('🚀 开始执行自动化i18n工作流...');

    for (const step of steps) {
      try {
        LoggerUtils.info(`\n===== [步骤: ${step.name.toUpperCase()}] =====`);

        if (step.name === 'generate') {
          // 使用传入的路径和dify配置
          await (step.processor as GeneratorProcessor).execute(targetPath, skipDify);
        } else {
          await step.processor.execute();
        }
      } catch (error) {
        LoggerUtils.error(`❌ 自动化工作流在 [${step.name}] 步骤失败:`, error);
        // 提供建议
        LoggerUtils.warn(`💡 建议: 您可以尝试使用手动模式单独运行此步骤以进行调试: npm run i18n -- -i -m ${step.name}`);
        // 中断流程
        throw new Error(`自动化流程在 ${step.name} 步骤中断。`);
      }
    }

    LoggerUtils.success('\n✅ 自动化i18n工作流全部执行成功！');
  }
}
