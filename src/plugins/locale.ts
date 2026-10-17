import elEnUS from 'element-plus/es/locale/lang/en';
import elZhCN from 'element-plus/es/locale/lang/zh-cn';
import { createI18n } from 'vue-i18n';
import { DEFAULT_LOCALE } from '@/constants';
import type { LocaleKey } from '@/interface/system';
// 导入语言包
import enUS from '@/locale/en-US.json';
import zhCN from '@/locale/zh-CN.json';

// Element Plus 语言包
const libraryLocales = {
  'zh-CN': elZhCN,
  'en-US': elEnUS,
};

/**
 * 根据语言代码获取对应的 Element Plus 语言包
 */
export const getLibraryLocales = (locale: LocaleKey) => {
  return libraryLocales[locale] || libraryLocales['zh-CN'];
};

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
 * 导出一个便捷函数
 */
export const t = i18n.global.t;

/**
 * 把远端语言包（public/locale/*.json，改文案无需重新构建）增量合并进指定语言
 *
 * - 只负责合并：切换当前语言是调用方的事（App.vue 与 `html[lang]`、dayjs 同步完成），
 *   远端包拉不到时内置语言包仍完整可用，语言切换不受影响
 * - 必须用 mergeLocaleMessage：setLocaleMessage 是整份替换，会冲掉内置语言包
 *
 * @param locale 语言代码
 * @param options.signal 取消信号，语言快速切换时作废过期请求
 * @returns Promise<boolean> 远端增量包是否成功合入
 */
export const loadLocaleMessages = async (locale: LocaleKey, options: { signal?: AbortSignal } = {}) => {
  const { signal } = options;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}locale/${locale}.json`, { signal });
    if (!response.ok) {
      console.warn(`加载远端语言包失败: ${locale}，沿用内置语言包`);
      return false;
    }

    const remoteMessages = await response.json();
    // 解析期间语言又变了：这份响应已经过期，丢弃而不是合入
    if (signal?.aborted) return false;

    i18n.global.mergeLocaleMessage(locale, remoteMessages);

    return true;
  } catch (error) {
    // 主动取消不是异常，静默返回；其余失败只告警，不影响已经生效的语言切换
    if (signal?.aborted) return false;
    console.warn(`加载远端语言包出错: ${locale}，沿用内置语言包`, error);
    return false;
  }
};
