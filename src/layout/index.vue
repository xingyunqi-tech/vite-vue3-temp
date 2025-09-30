<template>
  <div class="layout-container">
    <!-- Header 头部 -->
    <LayoutHeader v-if="layoutVisible.header" :logo-title="$t('layout.systemTitle')" class="layout-header">
      <template #menu>
        <!-- 这里可以添加菜单项 -->
      </template>
    </LayoutHeader>

    <!-- 左侧菜单 -->
    <LayoutMenu v-if="layoutVisible.nav" class="layout-nav" />

    <!-- Main 主体内容 -->
    <LayoutMain class="layout-main" />
  </div>
</template>

<script setup lang="ts">
import LayoutHeader from './components/LayoutHeader/index.vue';
import LayoutMenu from './components/LayoutMenu/index.vue';
import LayoutMain from './components/LayoutMain/index.vue';
import { useLayoutControl } from './useLayoutContext';

// 获取布局可见性状态
const { layoutVisible } = useLayoutControl();
</script>

<style scoped lang="scss">
.layout-container {
  display: grid;
  grid-template: 'header header' auto 'nav main' 1fr / auto 1fr;
  height: 100vh;
}

.layout-header {
  grid-area: header;
}

.layout-nav {
  grid-area: nav;
}

.layout-main {
  grid-area: main;
  overflow: auto;
}
</style>
