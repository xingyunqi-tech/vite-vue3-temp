<template>
  <div class="layout-container">
    <!-- Header 头部 -->
    <LayoutHeader :logo-title="$t('layout.systemTitle')">
      <template #menu>
        <!-- 这里可以添加菜单项 -->
      </template>
    </LayoutHeader>

    <!-- Main 主体内容 -->
    <LayoutMain />
  </div>
</template>

<script setup lang="ts">
import LayoutHeader from './components/LayoutHeader/index.vue';
import LayoutMain from './components/LayoutMain/index.vue';
</script>

<style scoped lang="scss">
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
