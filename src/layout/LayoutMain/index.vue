<template>
  <main class="layout-content">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </main>
</template>

<style scoped lang="scss">
.layout-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 100%;
  padding: 0;
}
</style>
