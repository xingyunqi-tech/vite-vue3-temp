<template>
  <div class="container">
    <div class="left-nav">
      <el-menu class="left-nav-menu" :default-active="activeKey" @select="handleSelect">
        <el-menu-item v-for="item in navList" :key="item.key" :index="item.key">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </div>
    <div class="right-main">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { canAccess } from '@/router/guards';
import { SETTING_SHELL_ROUTE_NAME } from '@/router/routes/async';
import { useUserInfoStore } from '@/store/modules/user-info';

const router = useRouter();
const route = useRoute();
const userStore = useUserInfoStore();

/**
 * 导航项：壳路由下声明的子页面中带 meta.title 的，按声明顺序列出、按当前角色过滤
 *
 * 新增设置页只需在壳路由下加一条子路由，导航自动出现；不想出现在导航里的子页面标 meta.hidden。
 */
const navList = computed(() => {
  const shell = router.getRoutes().find(record => record.name === SETTING_SHELL_ROUTE_NAME);
  if (!shell) return [];
  const roles = [userStore.info.role];
  return shell.children.flatMap(child => {
    const title = child.meta?.title;
    const path = child.path.startsWith('/') ? child.path : `${shell.path}/${child.path}`;
    if (!title || child.meta?.hidden || path.includes(':') || !canAccess(router, path, roles)) return [];
    return [{ label: title, key: path }];
  });
});

/**
 * 当前选中项：路由的纯派生值，没有副作用，不需要 watch
 *
 * 匹配必须卡在路径分隔符上。裸用 startsWith 会让 `/setting/user-group` 命中 `/setting/user`——
 * 两个平级菜单只要一个是另一个的前缀就会高亮错行。
 *
 * 命中多条时取最长的那条：`/a` 与 `/a/b` 同时匹配 `/a/b/c` 时，更具体的才是用户所在的那一项。
 */
const activeKey = computed(() => {
  const current = route.path;
  const matched = navList.value
    .filter(nav => current === nav.key || current.startsWith(`${nav.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return matched?.key ?? navList.value[0]?.key ?? '';
});

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

  .left-nav {
    grid-area: nav;

    .left-nav-menu {
      height: 100%;
    }
  }

  .right-main {
    grid-area: main;
    overflow-y: auto;
  }
}
</style>
