<template>
  <el-dropdown @command="handleLanguageChange">
    <el-button type="text">
      <el-icon><Switch /></el-icon>
      {{ currentLanguageName }}
      <el-icon class="el-icon--right"><arrow-down /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="zh-CN" :disabled="currentLocale === 'zh-CN'"> 中文 </el-dropdown-item>
        <el-dropdown-item command="en-US" :disabled="currentLocale === 'en-US'"> English </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { ElDropdown, ElDropdownMenu, ElDropdownItem, ElButton, ElIcon } from 'element-plus';
import { Switch, ArrowDown } from '@element-plus/icons-vue';
import { useGlobalStore } from '@/store';
import type { LocaleKey } from '@/interface/System';

const globalStore = useGlobalStore();
const { switchLocale } = globalStore;
const { currentLocale } = toRefs(globalStore);

const languageNames = {
  'zh-CN': '中文',
  'en-US': 'English',
};

const currentLanguageName = computed(() => {
  return languageNames[currentLocale.value];
});

const handleLanguageChange = (locale: LocaleKey) => {
  switchLocale(locale);
};
</script>

<style scoped lang="scss">
.el-button {
  border: none;
  background: transparent;

  &:hover {
    background-color: var(--el-color-primary-light-9);
  }
}
</style>
