import { createI18n } from 'vue-i18n';
import { DEFAULT_LOCALE } from '@/constants/System';
import type { LocaleKey } from '@/interface/System';

// 导入语言包
import zhCN from '@/locale/zh-CN.json';
import enUS from '@/locale/en-US.json';

/**
 * vue-i18n 语言包配置
 */
const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

/**
 * 创建 i18n 实例
 */
export const i18n = createI18n({
  legacy: false, // 使用Composition API模式
  locale: DEFAULT_LOCALE, // 默认语言
  fallbackLocale: 'zh-CN', // 回退语言
  messages,
  globalInjection: true, // 全局注入$t函数
});

/**
 * 动态加载语言包
 * @param locale 语言代码
 * @returns Promise<boolean> 加载是否成功
 */
export const loadLocaleMessages = async (locale: LocaleKey) => {
  try {
    const response = await fetch(`/locale/${locale}.json`);
    if (!response.ok) {
      console.error(`加载语言包失败: ${locale}，使用默认语言包`);
      return false;
    }

    const messages = await response.json();

    // 设置语言包到 vue-i18n
    i18n.global.setLocaleMessage(locale, messages);

    // 确保当前语言也更新
    i18n.global.locale.value = locale;

    return true;
  } catch (error) {
    console.error(`加载语言包出错: ${locale}，使用默认语言包`, error);
    return false;
  }
};
