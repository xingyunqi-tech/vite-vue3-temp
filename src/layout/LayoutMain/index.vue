<template>
  <main class="layout-content">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </main>
</template>

<style scoped lang="scss">
.layout-content {
  flex: 1;
  padding: 0;
}
</style>
