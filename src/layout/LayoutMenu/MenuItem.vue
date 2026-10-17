<!--
  菜单树组件
-->
<template>
  <el-menu
    :default-active="currentActive"
    :collapse="isCollapse"
    :unique-opened="false"
    :collapse-transition="false"
    mode="vertical"
    @select="handleSelect"
  >
    <MenuNode v-for="item in menus" :key="item.path" :item="item" />
  </el-menu>
</template>

<script setup lang="ts">
import { onUnmounted, provide, ref, watch } from 'vue';
import { MenuResyncKey } from './menu-resync';
import MenuNode from './MenuNode.vue';
import type { MenuItem } from '@/constants';

interface Props {
  menus: MenuItem[];
  isCollapse: boolean;
  activeMenu: string;
}

const props = defineProps<Props>();

// 受控的激活菜单
const currentActive = ref(props.activeMenu);

// 路由变化时同步
watch(
  () => props.activeMenu,
  val => {
    currentActive.value = val;
  },
);

// 点击后 activeMenu 未变、又与被点项不一致时，先清空再恢复，让 el-menu 按当前路由重设高亮
let activeAtSelect = '';
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

const handleSelect = () => {
  activeAtSelect = props.activeMenu;
};

const resync = (index: string) => {
  if (restoreTimer !== null) clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    if (props.activeMenu !== activeAtSelect || props.activeMenu === index) return;
    currentActive.value = '';
    restoreTimer = setTimeout(() => {
      currentActive.value = props.activeMenu;
      restoreTimer = null;
    });
  });
};

provide(MenuResyncKey, resync);

onUnmounted(() => {
  if (restoreTimer !== null) clearTimeout(restoreTimer);
});
</script>
