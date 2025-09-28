import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_LOCALE, DEFAULT_THEME_STYLE } from '@/constants/System';
import type { LocaleKey, ThemeStyleKey } from '@/interface/System';

export const useGlobalStore = defineStore(
  'global',
  () => {
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

    // ==================== 主题相关 ====================
    const currentTheme = ref<ThemeStyleKey>(DEFAULT_THEME_STYLE as ThemeStyleKey);

    /**
     * 切换主题
     */
    const toggleTheme = () => {
      const newTheme: ThemeStyleKey = currentTheme.value === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    };

    /**
     * 设置主题
     */
    const setTheme = (theme: ThemeStyleKey) => {
      currentTheme.value = theme;
    };

    /**
     * 初始化主题
     */
    const initTheme = () => {
      // 持久化插件会自动恢复，无需手动获取
      if (!currentTheme.value) {
        currentTheme.value = DEFAULT_THEME_STYLE as ThemeStyleKey;
      }
    };

    // ==================== 高级模式相关 ====================
    const advanceMode = ref<boolean>(false);
    const clickCount = ref<number>(0);
    const clickTimer = ref<NodeJS.Timeout | null>(null);

    /**
     * 切换高级模式
     */
    const toggleAdvanceMode = () => {
      advanceMode.value = !advanceMode.value;
    };

    /**
     * 处理Logo连续点击逻辑
     * @param onNormalClick 正常点击时的回调
     * @param onAdvanceModeToggle 高级模式切换时的回调
     */
    const handleLogoClick = (onAdvanceModeToggle?: (isEnabled: boolean) => void) => {
      clickCount.value++;

      if (clickTimer.value) {
        clearTimeout(clickTimer.value);
      }

      if (clickCount.value === 5) {
        toggleAdvanceMode();
        onAdvanceModeToggle?.(advanceMode.value);
        clickCount.value = 0;
        return;
      }

      clickTimer.value = setTimeout(() => {
        clickCount.value = 0;
      }, 500);
    };

    return {
      // 语言相关
      currentLocale,
      switchLocale,
      initLocale,

      // 主题相关
      currentTheme,
      toggleTheme,
      setTheme,
      initTheme,

      // 高级模式相关
      advanceMode,
      handleLogoClick,
    };
  },
  {
    persist: true,
  },
);
