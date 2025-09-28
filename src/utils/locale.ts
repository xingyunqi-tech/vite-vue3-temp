// Element Plus 语言包
import elementPlusZhCN from 'element-plus/es/locale/lang/zh-cn';
import elementPlusEnUS from 'element-plus/es/locale/lang/en';
import type { LocaleKey } from '@/interface/System';

/**
 * Element Plus 语言包映射
 */
const elementPlusLocales = {
  'zh-CN': elementPlusZhCN,
  'en-US': elementPlusEnUS,
};

/**
 * 根据语言代码获取对应的 Element Plus 语言包
 * @param locale 语言代码
 * @returns Element Plus 语言包
 */
export const getElementPlusLocale = (locale: LocaleKey) => {
  return elementPlusLocales[locale] || elementPlusLocales['zh-CN'];
};
