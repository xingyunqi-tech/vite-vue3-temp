<template>
  <div class="setting-button">
    <el-tooltip :content="$t('layout.settings')" placement="bottom">
      <el-button :icon="Setting" circle text size="large" class="setting-btn" @click="handleSettingClick" />
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

/**
 * 处理设置按钮点击事件
 */
const handleSettingClick = () => {
  router.push('/Setting');
};
</script>

<script lang="ts">
export default {
  name: 'SettingButton',
};
</script>

<style scoped lang="scss">
.setting-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-btn {
  transition: all 0.3s ease;
  color: var(--el-text-color-regular);

  &:hover {
    transform: rotate(90deg);
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &:focus {
    background-color: var(--el-color-primary-light-8);
    color: var(--el-color-primary);
  }

  // 图标样式
  :deep(.el-icon) {
    font-size: 24px;
  }
}
</style>
