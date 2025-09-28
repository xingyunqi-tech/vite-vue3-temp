<template>
  <main class="layout-main">
    <router-view />
  </main>
</template>

<script setup lang="ts">
// 这个组件主要负责主体内容区域的布局
</script>

<style scoped lang="scss">
.layout-main {
  flex: 1;
  padding: 0;
  overflow: auto;
}
</style>
