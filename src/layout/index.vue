<template>
  <!-- 默认布局（可选水印包裹） -->
  <component
    :is="siteConfig.config.watermark.enabled ? ElWatermark : 'div'"
    v-bind="watermarkProps"
    :class="{ 'layout-watermark': siteConfig.config.watermark.enabled }"
  >
    <div class="layout-shell">
      <component :is="resolvedHeader" v-if="layoutVisible.header" />
      <div class="layout-container" :class="layoutClasses">
        <SkeletonWrap
          v-if="layoutVisible.nav"
          :loading="layoutSkeleton.visible.value"
          :component="MenuSkeleton"
          :skeleton-props="{ isCollapse }"
          class="layout-sidebar"
        >
          <component :is="resolvedMenu" />
        </SkeletonWrap>
        <component :is="resolvedMain" class="layout-main" />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { ElWatermark } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import LayoutHeader from './LayoutHeader/index.vue';
import LayoutMain from './LayoutMain/index.vue';
import LayoutMenu from './LayoutMenu/index.vue';
import MenuSkeleton from './LayoutMenu/MenuSkeleton.vue';
import { useLayout } from './useLayoutContext';
import SkeletonWrap from '@/components/Skeleton/SkeletonWrap/index.vue';
import { useSiteConfig } from '@/composables/useSiteConfig';
import { useSkeleton } from '@/composables/useSkeleton';
// #if overrides
import { layoutManager } from '@/plugins/override';
// #endif
import { useGlobalStore } from '@/store/modules/global';

const route = useRoute();
const siteConfig = useSiteConfig();

// 区域组件：默认用内置的顶栏/菜单/主区域组件；Override 系统注册了同名插槽时替换掉。
// 用 shallowRef 而非 let 重赋值：条件块被裁掉后 let 就成了「从未重赋值」，会触发 prefer-const
const resolvedHeader = shallowRef<Component>(LayoutHeader);
const resolvedMenu = shallowRef<Component>(LayoutMenu);
const resolvedMain = shallowRef<Component>(LayoutMain);
// #if overrides
resolvedHeader.value = layoutManager.getSlotComponent('header', LayoutHeader);
resolvedMenu.value = layoutManager.getSlotComponent('menu', LayoutMenu);
resolvedMain.value = layoutManager.getSlotComponent('main', LayoutMain);
// #endif

// 骨架屏：首次挂载时展示，onMounted 后自然消失
const layoutSkeleton = useSkeleton({ minDuration: 300 });
onMounted(() => layoutSkeleton.stopLoading());
// 卸载时清理骨架屏定时器，避免快速路由切换后定时器仍修改已卸载组件的 ref
onBeforeUnmount(() => layoutSkeleton.cleanup());
const { layoutVisible, setLayoutVisible, setHeaderVisible, setLogoConfig, resetLogo, resetAll } = useLayout();

const globalStore = useGlobalStore();
const isCollapse = computed(() => !globalStore.sidebar.opened);

const layoutClasses = computed(() => ({
  'no-sidebar': !layoutVisible.nav,
  'is-collapse': isCollapse.value,
}));

const watermarkProps = computed(() => {
  if (!siteConfig.config.watermark.enabled) return {};
  const { content, color, fontSize, fontWeight, rotate, gapX, gapY } = siteConfig.config.watermark;
  return {
    content,
    font: { color, fontSize, fontWeight: fontWeight as never },
    rotate,
    gap: [gapX, gapY],
  };
});

// siteConfig logoUrl 响应式监听
const logoUrl = computed(() => siteConfig.config.basic.logoUrl);

// 监听路由变化，应用 Layout 配置
watch(
  () => route.meta.layout,
  layoutConfig => {
    // 先重置到默认配置
    resetAll();

    // 应用 siteConfig 的 logoUrl 作为基础值
    if (logoUrl.value) {
      setLogoConfig({ icon: logoUrl.value });
    }

    // 如果路由配置了 layout，则应用配置（优先级高于 siteConfig）
    if (layoutConfig) {
      if (layoutConfig.layoutVisible) {
        setLayoutVisible(layoutConfig.layoutVisible);
      }
      if (layoutConfig.headerVisible) {
        setHeaderVisible(layoutConfig.headerVisible);
      }
      if (layoutConfig.logoConfig) {
        setLogoConfig(layoutConfig.logoConfig);
      }
    }
  },
  { immediate: true },
);

// logoUrl 变化时实时更新（路由级 logo 配置优先）
watch(logoUrl, url => {
  const routeLogo = route.meta.layout?.logoConfig;
  if (routeLogo?.icon) return;
  // siteConfig 被清空时回落到内置默认 logo，而不是清成无图标
  if (url) setLogoConfig({ icon: url });
  else resetLogo();
});
</script>

<style scoped lang="scss">
.layout-watermark {
  height: 100vh;
}

.layout-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.layout-container {
  display: grid;
  position: relative;

  // 侧边栏视觉宽度 220px（.layout-menu 左右各 8px 外边距，轨道宽度 220 + 16 = 236px）
  grid-template: 'sidebar main' 1fr / 236px 1fr;
  flex: 1;
  min-height: 0;
  transition: grid-template-columns 0.3s;
  background: var(--aix-colorBgContainer);

  // 收起态：侧边栏视觉宽度 72px，轨道宽度 72 + 16 = 88px
  &.is-collapse {
    grid-template-columns: 88px 1fr;
  }

  // no-sidebar 需始终优先于 is-collapse（两者可能同时命中，用更高特异性保证 main 独占）
  &.no-sidebar,
  &.no-sidebar.is-collapse {
    grid-template: 'main' 1fr / 1fr;
  }
}

.layout-sidebar {
  display: flex;

  // 高于 main：收起态的展开按钮绝对定位挪到 main 之上，需要压住 main 才可点击
  z-index: 2;
  grid-area: sidebar;
  flex-direction: column;
  min-height: 0;

  // 内容态下本类落在 SkeletonWrap 的包裹层上，菜单是它的子元素，需撑满侧边栏轨道
  > * {
    flex: 1;
    min-height: 0;
  }
}

.layout-main {
  z-index: 1;
  grid-area: main;
  height: 100%;
  overflow: auto;
}
</style>
