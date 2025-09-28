<template>
  <el-tooltip :content="$t('layout.themeSwitch')" placement="bottom">
    <el-button
      type="text"
      :icon="currentTheme === 'dark' ? Moon : Sunny"
      class="theme-switcher-btn"
      @click="toggleTheme"
    />
  </el-tooltip>
</template>

<script setup lang="ts">
import { ElButton, ElTooltip } from 'element-plus';
import { Moon, Sunny } from '@element-plus/icons-vue';
import { useGlobalStore } from '@/store';
import { toRefs } from 'vue';

const globalStore = useGlobalStore();
const { currentTheme } = toRefs(globalStore);
const { toggleTheme } = globalStore;
</script>

<style scoped lang="scss">
.theme-switcher-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  transition: all 0.3s ease;
  border-radius: 6px;

  &:hover {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  :deep(.el-icon) {
    font-size: 18px;
  }
}
</style>
