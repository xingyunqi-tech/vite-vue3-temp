<!--
  单个菜单节点（递归）
  支持外链、内部路由、多级子菜单
  图标支持：Vue 组件 | URL 图片 | iconfont class
-->
<template>
  <template v-if="!item.hidden">
    <!-- 有子菜单，展示折叠子菜单 -->
    <el-sub-menu v-if="item.children?.length" :index="item.path" teleported>
      <template #title>
        <MenuIcon :icon="item.icon" />
        <span>{{ item.title }}</span>
      </template>
      <MenuNode v-for="child in item.children" :key="child.path" :item="child" />
    </el-sub-menu>

    <!-- 外链 -->
    <a v-else-if="item.link" :href="item.link" target="_blank" rel="noopener noreferrer" @click="resync(item.path)">
      <el-menu-item :index="item.path">
        <MenuIcon :icon="item.icon" />
        <template #title>
          <span>{{ item.title }}</span>
        </template>
      </el-menu-item>
    </a>

    <!-- 内部路由：custom 插槽自己控制跳转，禁用项才拦得住（@click 作为透传属性会排在 RouterLink 自带的 navigate 之后） -->
    <router-link v-else :to="item.path" custom>
      <template #default="{ href, navigate, isExactActive }">
        <!-- 禁用项不给 href：否则中键 / ctrl 点击会绕过拦截直接新开页 -->
        <!-- aria-current 要自己补：RouterLink 只在非 custom 分支里加它，el-menu-item 也不提供 -->
        <a
          :href="item.disabled ? undefined : href"
          :aria-disabled="item.disabled || undefined"
          :aria-current="isExactActive ? 'page' : undefined"
          @click="handleClick($event, item, navigate)"
        >
          <el-menu-item :index="item.path">
            <MenuIcon :icon="item.icon" />
            <template #title>
              <span>{{ item.title }}</span>
            </template>
          </el-menu-item>
        </a>
      </template>
    </router-link>
  </template>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { inject } from 'vue';
import { MenuResyncKey } from './menu-resync';
import MenuIcon from './MenuIcon.vue';
import type { MenuItem } from '@/constants';

interface Props {
  item: MenuItem;
}

defineProps<Props>();

const resync = inject(MenuResyncKey, () => {});

/** 正常项把事件原样交给 navigate，由 vue-router 判断修饰键与中键（保留新标签页打开）；落定后同步高亮 */
const handleClick = async (e: MouseEvent, item: MenuItem, navigate: (e?: MouseEvent) => Promise<unknown>) => {
  if (item.disabled) {
    e.preventDefault();
    ElMessage.info('敬请期待');
    resync(item.path);
    return;
  }
  await navigate(e);
  resync(item.path);
};
</script>

<style lang="scss" scoped>
a {
  display: block;
  color: inherit;
  text-decoration: none;
}
</style>
