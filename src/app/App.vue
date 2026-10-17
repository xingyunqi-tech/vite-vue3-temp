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
// 无条件引入：既是 i18n 关闭时的唯一语言包，也是开启时 elementPlusLocale 的默认值。
// 开启 i18n 时 @/plugins/locale 也引用同一个模块，打包会去重，不产生额外体积。
import elZhCN from 'element-plus/es/locale/lang/zh-cn';
import { computed, watchEffect, onMounted, onBeforeUnmount, toRefs } from 'vue';
import ErrorBoundary from '@/components/ErrorBoundary/index.vue';
import { useSiteConfig } from '@/composables/useSiteConfig';
import type { ThemeStyleKey } from '@/interface/system';
import { provideLayoutContext } from '@/layout/useLayoutContext';
// #if i18n
import dayjs from '@/plugins/dayjs';
import { i18n, loadLocaleMessages, getLibraryLocales } from '@/plugins/locale';
// #else
import '@/plugins/dayjs';
// #endif
// 放在条件块之外：裁掉 i18n 特性时 #if 段会被整段删除，import 跟着消失就会构建失败
import { deriveThemeVars } from '@/plugins/site-config';
import { useGlobalStore, useUserInfoStore } from '@/store';
import { handleError } from '@/utils/error-handler';

const globalStore = useGlobalStore();
const siteConfig = useSiteConfig();
const { currentTheme } = toRefs(globalStore);
const { syncSiteDefaultTheme } = globalStore;
// #if i18n
const { currentLocale } = toRefs(globalStore);
const { initLocale } = globalStore;
// #endif

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
  // #if i18n
  initLocale();
  // #endif
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

// Element Plus 语言包：默认中文，启用国际化后跟随当前语言切换
const elementPlusLocale = computed(() => {
  const picked = { locale: elZhCN };
  // #if i18n
  picked.locale = getLibraryLocales(globalStore.currentLocale);
  // #endif
  return picked.locale;
});

// #if i18n
/** 挂载前的 html[lang]：被宿主嵌入时属于宿主，卸载时还原。须在下方 watchEffect 首次执行前读取 */
const langBeforeMount = document.documentElement.getAttribute('lang');

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

onBeforeUnmount(() => {
  if (langBeforeMount === null) document.documentElement.removeAttribute('lang');
  else document.documentElement.setAttribute('lang', langBeforeMount);
});
// #endif

// 上一次写入的站点主题变量名，用于在配置被清空时精确撤销
let appliedThemeVars: string[] = [];

/** 挂载前 <html> 上的主题状态：被宿主嵌入时它属于宿主，撤销与卸载都还原成它 */
const htmlBeforeMount = {
  dataTheme: document.documentElement.getAttribute('data-theme'),
  themeClasses: ['light', 'dark'].filter(name => document.documentElement.classList.contains(name)),
  vars: new Map<string, string>(),
};

function restoreThemeVar(root: HTMLElement, name: string): void {
  const original = htmlBeforeMount.vars.get(name);
  if (original) root.style.setProperty(name, original);
  else root.style.removeProperty(name);
}

/**
 * 把站点配置推导出的主题变量写到 :root
 *
 * deriveThemeVars 只返回「与品牌基准不同」的变量，维持默认配置时是空对象，
 * 静态 theme.css 原样生效，不产生任何行内覆盖。
 *
 * 撤销时还原成挂载前的行内值（独立运行时即移除），不写回内置值：内置值本身随明暗块变化，
 * 硬写回去等于把某一侧的值钉死，切到另一侧就错了。
 */
function applySiteThemeVars(root: HTMLElement, mode: ThemeStyleKey): void {
  const { primaryColor, borderRadius } = siteConfig.config.theme;
  const vars = deriveThemeVars({ primaryColor, borderRadius }, mode === 'dark' ? 'dark' : 'light');

  for (const name of appliedThemeVars) {
    if (!(name in vars)) restoreThemeVar(root, name);
  }
  for (const [name, value] of Object.entries(vars)) {
    if (!htmlBeforeMount.vars.has(name)) htmlBeforeMount.vars.set(name, root.style.getPropertyValue(name));
    root.style.setProperty(name, value);
  }
  appliedThemeVars = Object.keys(vars);
}

/**
 * 卸载时把 <html> 上的主题痕迹还原到挂载前
 *
 * 这些属性挂在应用之外的节点上，不随 unmount 消失。被宿主嵌入时 <html> 由宿主与子应用共用，
 * 只能还原成挂载前的样子，不能直接删除，否则宿主自己的明暗与色阶会一并丢失。
 */
onBeforeUnmount(() => {
  const html = document.documentElement;
  for (const name of htmlBeforeMount.vars.keys()) restoreThemeVar(html, name);
  appliedThemeVars = [];
  if (htmlBeforeMount.dataTheme === null) html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', htmlBeforeMount.dataTheme);
  html.classList.remove('light', 'dark');
  html.classList.add(...htmlBeforeMount.themeClasses);
});

// 监听主题变化：明暗切换与站点主题变量在同一个 effect 里完成，避免两者分帧导致色阶与明暗错配
watchEffect(() => {
  const html = document.documentElement;
  const theme = currentTheme.value;
  // 切换主题：写 data-theme 属性，匹配 theme.css 的 :root[data-theme='dark'] 暗色块
  html.setAttribute('data-theme', theme);
  html.classList.remove('light', 'dark');
  html.classList.add(theme);

  applySiteThemeVars(html, theme);
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
