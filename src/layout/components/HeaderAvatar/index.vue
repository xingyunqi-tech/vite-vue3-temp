<template>
  <el-dropdown @command="handleCommand">
    <div class="user-info">
      <el-avatar :size="32" :src="userStore.avatar || undefined">
        <el-icon><User /></el-icon>
      </el-avatar>
      <span class="username">{{ userStore.name || $t('layout.admin') }}</span>
      <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="logout">
          <el-icon><SwitchButton /></el-icon>
          {{ $t('layout.logout') }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, ArrowDown, Setting, SwitchButton } from '@element-plus/icons-vue';
import { useUserStore } from '@/store';
import { useI18n } from 'vue-i18n';

// 路由和store
const router = useRouter();
const userStore = useUserStore();
const { t: $t } = useI18n();

// 处理下拉菜单命令
const handleCommand = async (command: string) => {
  switch (command) {
    case 'logout':
      await ElMessageBox.confirm($t('layout.logoutConfirm'), $t('layout.tip'), {
        confirmButtonText: $t('common.confirm'),
        cancelButtonText: $t('common.cancel'),
        type: 'warning',
      })
        .then(async () => {
          // 执行退出登录
          await userStore.logoutAction();
          ElMessage.success($t('layout.logoutSuccess'));
          router.push('/Login');
        })
        .catch(() => {
          // 用户取消操作
        });
      break;
  }
};
</script>

<style scoped lang="scss">
.user-info {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  transition: background-color 0.3s;
  border-radius: 6px;
  cursor: pointer;
  gap: 8px;

  &:hover {
    background-color: var(--controlItemBgHover);
  }
}

.username {
  color: var(--colorText);
  font-size: 14px;
  font-weight: 500;
}

.dropdown-icon {
  transition: transform 0.3s;
  color: var(--colorTextTertiary);
  font-size: 12px;
}

/* 响应式设计 */
@media (width <= 768px) {
  .username {
    display: none;
  }
}
</style>
