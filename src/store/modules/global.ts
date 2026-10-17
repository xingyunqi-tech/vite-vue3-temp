import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
// #if i18n
import { DEFAULT_LOCALE } from '@/constants';
// #endif
import { DEFAULT_THEME_STYLE } from '@/constants';
// #if i18n
import type { LocaleKey } from '@/interface/system';
// #endif
import type { ThemeStyleKey } from '@/interface/system';

export const useGlobalStore = defineStore(
  'global',
  () => {
    // #if i18n
    // ==================== 语言相关 ====================
    const currentLocale = ref<LocaleKey>(DEFAULT_LOCALE as LocaleKey);

    /**
     * 切换语言
     * @param locale 语言代码
     */
    const switchLocale = (locale: LocaleKey) => {
      currentLocale.value = locale;
    };

    /**
     * 初始化语言设置
     */
    const initLocale = () => {
      // 持久化插件会自动恢复，无需手动获取
      if (!currentLocale.value) {
        currentLocale.value = DEFAULT_LOCALE as LocaleKey;
      }
    };

    // #endif
    // ==================== 主题相关 ====================

    /** 用户显式选择的主题；`null` 表示从未选择过，此时跟随站点声明的默认主题 */
    const userTheme = ref<ThemeStyleKey | null>(null);

    /** 站点声明的默认主题，由 App.vue 从 siteConfig 同步进来 */
    const siteDefaultTheme = ref<ThemeStyleKey>(DEFAULT_THEME_STYLE as ThemeStyleKey);

    /**
     * 实际生效的主题：用户选过就用用户的，否则跟随站点默认
     *
     * 全项目统一消费这一个值，不要直接读 userTheme（它可能是 null）。
     */
    const currentTheme = computed<ThemeStyleKey>(() => userTheme.value ?? siteDefaultTheme.value);

    /**
     * 设置主题（明暗模式由 App.vue 写入 html[data-theme]，对应 theme.css 的暗色块）
     */
    const setTheme = (theme: ThemeStyleKey) => {
      userTheme.value = theme;
    };

    /**
     * 切换主题
     */
    const toggleTheme = () => {
      setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
    };

    /**
     * 同步站点声明的默认主题（进站时调用）
     *
     * 只改默认值，不动用户的选择——这是「用户没选过时用哪个」的那一层。
     */
    const syncSiteDefaultTheme = (theme: ThemeStyleKey) => {
      siteDefaultTheme.value = theme;
    };

    /**
     * 应用新的站点默认主题（仅由设置页保存成功后调用）
     *
     * 管理员改写站点默认值属于一条新声明，优先级高于用户此前的选择，故把 userTheme
     * 清空让其重新跟随。刻意不在「配置发生变化」时自动触发：接了服务端存储源后，
     * 每次启动的 load() 都会替换配置，那样会把用户自己的明暗选择反复抹掉。
     */
    const applySiteDefaultTheme = (theme: ThemeStyleKey) => {
      siteDefaultTheme.value = theme;
      userTheme.value = null;
    };

    // ==================== 侧边栏相关 ====================
    const sidebar = reactive({ opened: true, withoutAnimation: false });

    const toggleSidebar = () => {
      sidebar.opened = !sidebar.opened;
      sidebar.withoutAnimation = false;
    };

    const closeSidebar = (withoutAnimation: boolean) => {
      sidebar.opened = false;
      sidebar.withoutAnimation = withoutAnimation;
    };

    return {
      // #if i18n
      // 语言相关
      currentLocale,
      switchLocale,
      initLocale,

      // #endif
      // 主题相关
      userTheme,
      siteDefaultTheme,
      currentTheme,
      toggleTheme,
      setTheme,
      syncSiteDefaultTheme,
      applySiteDefaultTheme,

      // 侧边栏相关
      sidebar,
      toggleSidebar,
      closeSidebar,
    };
  },
  {
    persist: true,
  },
);
