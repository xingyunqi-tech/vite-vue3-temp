<template>
  <el-config-provider :locale="elementPlusLocale">
    <ErrorBoundary>
      <router-view v-slot="{ Component: RouteComponent }">
        <component :is="RouteComponent" />
      </router-view>
    </ErrorBoundary>
  </el-config-provider>
</template>
<script setup lang="ts">
import { ElConfigProvider } from 'element-plus';
import { computed, watchEffect, onMounted, onBeforeUnmount, toRefs } from 'vue';
import ErrorBoundary from '@/components/ErrorBoundary/index.vue';
import { useSiteConfig } from '@/composables/useSiteConfig';
import type { ThemeStyleKey } from '@/interface/system';
import { provideLayoutContext } from '@/layout/useLayoutContext';
import dayjs from '@/plugins/dayjs';
import { i18n, loadLocaleMessages, getLibraryLocales } from '@/plugins/locale';
import { useGlobalStore, useUserInfoStore } from '@/store';
import { handleError } from '@/utils/error-handler';

const globalStore = useGlobalStore();
const siteConfig = useSiteConfig();
const { currentTheme, currentLocale } = toRefs(globalStore);
const { syncSiteDefaultTheme, initLocale } = globalStore;

// 提供布局上下文给整个应用
provideLayoutContext();

/** 切回标签页时检查账号：停在页面上不导航时，守卫的检查覆盖不到 */
const userStore = useUserInfoStore();
const reloadIfAccountSwitched = () => {
  if (document.visibilityState === 'visible' && userStore.isAccountSwitched()) window.location.reload();
};
onMounted(() => document.addEventListener('visibilitychange', reloadIfAccountSwitched));
onBeforeUnmount(() => document.removeEventListener('visibilitychange', reloadIfAccountSwitched));

onMounted(async () => {
  initLocale();
  // 本地源下是空操作；接了服务端源时先拉到远端配置，再据此同步主题默认值
  // 包一层 try/catch：远端失败不能让整个 mounted 钩子 reject，主题初始化必须照常进行
  try {
    await siteConfig.load();
  } catch (error) {
    handleError(error, { message: '站点配置加载失败，已使用本地配置' });
  }
  // 站点配置只声明「用户还没选过时用哪个」，用户自己的选择优先
  syncSiteDefaultTheme(siteConfig.config.theme.defaultMode as ThemeStyleKey);
});

// Element Plus 语言包跟随当前语言切换
const elementPlusLocale = computed(() => getLibraryLocales(globalStore.currentLocale));

/**
 * 语言切换：同步的那几处立刻落地，远端语言包异步补齐
 *
 * i18n 当前语言、`html[lang]`、dayjs 都在本轮同步执行完，三者永远一致，
 * 不会因为远端语言包 404 就停在另一种语言上。
 *
 * 远端包用 AbortController 兜住竞态：zh → en（慢）→ zh（快）时，onCleanup 在
 * 重新执行前中止上一次请求，过期响应直接丢弃。
 */
watchEffect(onCleanup => {
  const locale = currentLocale.value;
  // 设置界面文案语言
  i18n.global.locale.value = locale;
  // 设置网站语言
  document.documentElement.setAttribute('lang', locale);
  // 设置日期国际化
  dayjs.locale(locale);

  const controller = new AbortController();
  onCleanup(() => controller.abort());
  void loadLocaleMessages(locale, { signal: controller.signal });
});

// 切换主题：写 data-theme 属性匹配 theme.css 的 :root[data-theme='dark'] 暗色块，class 供 Element Plus 暗色变量使用
watchEffect(() => {
  const html = document.documentElement;
  const theme = currentTheme.value;
  html.setAttribute('data-theme', theme);
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
});
</script>
<style lang="scss">
@use './index';

html,
body,
#main-app {
  min-width: 1280px;
  background-color: var(--aix-colorBgLayout);
  color: var(--aix-colorTextBase);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
}
</style>
