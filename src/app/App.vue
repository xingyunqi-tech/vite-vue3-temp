<template>
  <el-config-provider :locale="elementPlusLocale">
    <SentryProvider>
      <router-view />
    </SentryProvider>
  </el-config-provider>
</template>
<script setup lang="ts">
import { computed, watchEffect, onMounted, toRefs } from 'vue';
import { ElConfigProvider } from 'element-plus';
import { useGlobalStore } from '@/store';
import { getElementPlusLocale } from '@/utils/locale';
import { loadLocaleMessages } from '@/plugins/locale';
import SentryProvider from '@/components/SentryProvider/index.vue';
import dayjs from '@/plugins/dayjs';

const globalStore = useGlobalStore();
const { currentLocale, currentTheme } = toRefs(globalStore);
const { initLocale, initTheme } = globalStore;

onMounted(() => {
  initLocale();
  initTheme();
});

// 根据当前语言自动获取 Element Plus 语言包
const elementPlusLocale = computed(() => {
  return getElementPlusLocale(globalStore.currentLocale);
});

// 监听语言变化并重新加载语言包
watchEffect(async () => {
  const locale = currentLocale.value;
  await loadLocaleMessages(locale);
  // 设置网站语言
  document.documentElement.setAttribute('lang', currentLocale.value);
  // 设置日期国际化
  dayjs.locale(currentLocale.value);
});

// 监听主题变化
watchEffect(() => {
  const html = document.documentElement;
  const theme = currentTheme.value;
  // 切换主题
  html.setAttribute('theme', theme);
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
});
</script>
<style lang="scss">
@use './index';

html,
body,
#main-app {
  background-color: var(--colorBgLayout);
  color: var(--colorTextBase);
}
</style>
