<template>
  <div class="container">
    <div class="LeftNav">
      <el-menu class="LeftNavMenu" :default-active="selectedKeys[0]" @select="handleSelect">
        <el-menu-item v-for="item in menuList" :key="item.key" :index="item.key">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </div>
    <div class="RightMain">
      <router-view />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 菜单配置
const menuList = computed(() => [
  {
    label: '前端配置',
    key: '/Setting/FrontendSetting',
  },
  {
    label: '主题配置',
    key: '/Setting/ThemeSetting',
  },
]);

// 选中的菜单 key
const selectedKeys = ref<string[]>([]);

// 监听路由，更新选中菜单
watch(
  () => route.path,
  currentPath => {
    const activeNav = menuList.value.find(nav => nav.key === currentPath || currentPath.startsWith(nav.key));
    selectedKeys.value = [activeNav?.key ?? menuList.value[0].key];
  },
  { immediate: true },
);

// 点击菜单跳转
const handleSelect = (key: string) => {
  router.push(key);
};
</script>
<style lang="scss" scoped>
.container {
  display: grid;
  grid-template-areas: 'nav main';
  grid-template-columns: min-content 1fr;
  height: 100%;

  .LeftNav {
    grid-area: nav;

    .LeftNavMenu {
      height: 100%;
    }
  }

  .RightMain {
    grid-area: main;
    overflow-y: auto;
  }
}
</style>
