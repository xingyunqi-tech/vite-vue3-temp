<template>
  <div ref="userBarRef" class="user-bar" :class="{ 'is-collapse': isCollapse }">
    <!-- 收起态：头像本身触发下拉（没有单独的"更多"按钮） -->
    <el-dropdown v-if="isCollapse" :trigger="trigger" :placement="resolvedPlacement" @command="handleCommand">
      <div class="avatar">
        <el-avatar :size="32" :src="userStore.info.avatar || defaultAvatar" />
      </div>
      <template #dropdown>
        <UserDropdownMenu />
      </template>
    </el-dropdown>

    <!-- 展开态：仅"更多"按钮触发下拉 -->
    <template v-else>
      <div class="avatar">
        <el-avatar :size="32" :src="userStore.info.avatar || defaultAvatar" />
      </div>

      <!-- 用户名：过长时省略，hover 显示完整内容 -->
      <el-tooltip v-if="userStore.info.realName" :content="userStore.info.realName" placement="top" :show-after="300">
        <span class="user-name">{{ userStore.info.realName }}</span>
      </el-tooltip>

      <el-dropdown :trigger="trigger" :placement="resolvedPlacement" @command="handleCommand">
        <button class="more-btn" type="button" aria-label="更多操作">
          <SvgIcon name="common-more" :size="16" />
        </button>
        <template #dropdown>
          <UserDropdownMenu />
        </template>
      </el-dropdown>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox, type Placement } from 'element-plus';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import UserDropdownMenu from './UserDropdownMenu.vue';
import defaultAvatar from '@/assets/images/common/avatar.png';
import { useThemeTransition } from '@/composables/useThemeTransition';
// #if i18n
import type { LocaleKey } from '@/interface/system';
// #endif
import { useUserInfoStore, usePermissionStore } from '@/store';
// #if i18n
// 单独从模块取而不并进上一行：`@/store` 那行在 i18n 关闭时仍要保留，
// 合并会让 useGlobalStore 留在块外变成未用导入；分成两个块是为了让 import/order 的字典序成立
import { useGlobalStore } from '@/store/modules/global';
// #endif

interface Props {
  /** 侧边栏是否处于收起态 */
  isCollapse?: boolean;
  /** 下拉触发方式 */
  trigger?: 'click' | 'hover';
  /** 下拉弹出位置，缺省按形态取侧边栏的落位 */
  placement?: Placement;
}

const props = withDefaults(defineProps<Props>(), {
  isCollapse: false,
  trigger: 'click',
  placement: undefined,
});

const resolvedPlacement = computed(() => props.placement ?? (props.isCollapse ? 'right-end' : 'top-end'));

const userStore = useUserInfoStore();
const permissionStore = usePermissionStore();
// #if i18n
const globalStore = useGlobalStore();
// #endif
const router = useRouter();
const { toggleThemeWithTransition } = useThemeTransition();

// 主题扩散动画的圆心 = 侧边栏底部这一条用户区的中心。
// ref 挂在始终挂载的根节点上，不挂"更多"按钮 / 头像——那两个分支互斥，会互相把 ref 置空
const userBarRef = ref<HTMLElement | null>(null);

// 处理下拉菜单命令
const handleCommand = async (command: string) => {
  if (command === 'theme') {
    toggleThemeWithTransition(userBarRef.value);
    return;
  }
  // #if i18n
  if (command.startsWith('lang:')) {
    globalStore.switchLocale(command.slice(5) as LocaleKey);
    return;
  }
  // #endif
  if (command === 'setting') {
    router.push('/setting');
    return;
  }
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
    })
      .then(async () => {
        permissionStore.resetPermission();
        // logoutAction 会清理状态并跳转 SSO 登出页
        await userStore.logoutAction();
      })
      .catch(() => {
        // 用户取消操作
      });
  }
};
</script>

<style scoped lang="scss">
.user-bar {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;

  &.is-collapse {
    justify-content: center;
  }
}

.avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--aix-colorBorderSecondary);
  border-radius: 50%;
  background: var(--aix-colorBgContainer);
  cursor: pointer;
}

.user-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--aix-colorTextHeading);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  transition: all 0.2s ease;
  border: none;
  border-radius: 6px;
  outline: none;
  background: transparent;
  color: var(--aix-colorTextSecondary);
  cursor: pointer;

  &:hover {
    background-color: var(--aix-colorBgLayout);
    color: var(--aix-colorTextHeading);
  }
}
</style>
