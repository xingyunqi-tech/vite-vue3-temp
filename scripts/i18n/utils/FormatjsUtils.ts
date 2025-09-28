import { CommandUtils } from './CommandUtils';
import { PATHS, PROJECT_CONFIG } from './constants';
import { LoggerUtils } from './LoggerUtils';

/**
 * formatjs命令执行工具类
 */
export class FormatjsUtils {
  /**
   * 提取国际化消息
   * @param isCustom - 是否是定制目录
   * @throws {Error} 当提取失败时抛出错误
   */
  static extractMessages(isCustom: boolean): void {
    try {
      if (!isCustom) {
        CommandUtils.execCommand(
          `formatjs extract "${PROJECT_CONFIG.MAIN_LOCALE_DIR}/**/!(*.d).{js,jsx,ts,tsx}" --ignore "${PROJECT_CONFIG.CUSTOM_LOCALE_DIR}/**/*.{js,jsx,ts,tsx}" --out-file ${PROJECT_CONFIG.MAIN_LOCALE_DIR}/extract/zh-CN.json`,
        );
        LoggerUtils.success('主目录国际化消息提取成功');
      } else {
        CommandUtils.execCommand(
          `formatjs extract "${PROJECT_CONFIG.CUSTOM_LOCALE_DIR}/**/!(*.d).{js,jsx,ts,tsx}" --out-file ${PROJECT_CONFIG.CUSTOM_LOCALE_DIR}/extract/zh-CN.json`,
        );
        LoggerUtils.success('定制目录国际化消息提取成功');
      }
    } catch (error) {
      LoggerUtils.error(`国际化消息提取失败 ${isCustom ? '(定制目录)' : '(主目录)'}:`, error);
      throw error;
    }
  }

  /**
   * 编译国际化消息
   * @param isCustom - 是否是定制目录
   * @throws {Error} 当编译失败时抛出错误
   */
  static compileMessages(isCustom: boolean): void {
    try {
      const extractDir = isCustom ? `${PATHS.CUSTOM_DIR}/extract` : `${PATHS.DEFAULT_DIR}/extract`;
      const compileDir = isCustom ? `${PATHS.CUSTOM_DIR}/compile` : `${PATHS.DEFAULT_DIR}/compile`;

      CommandUtils.execCommand(`formatjs compile-folder ${extractDir} ${compileDir}`);
      LoggerUtils.success(`${isCustom ? '定制' : '主'}目录国际化消息编译成功`);
    } catch (error) {
      LoggerUtils.error(`国际化消息编译失败 ${isCustom ? '(定制目录)' : '(主目录)'}:`, error);
      throw error;
    }
  }

  /**
   * 处理语言文件 (提取和编译)
   * @param isCustom - 是否是定制目录
   */
  static processLang(isCustom: boolean): void {
    try {
      FormatjsUtils.extractMessages(isCustom);
      FormatjsUtils.compileMessages(isCustom);
      LoggerUtils.success(`语言处理完成 ${isCustom ? '(定制目录)' : '(主目录)'}`);
    } catch (error) {
      LoggerUtils.error(`语言处理失败 ${isCustom ? '(定制目录)' : '(主目录)'}:`, error);
    }
  }
}
