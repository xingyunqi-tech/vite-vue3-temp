<template>
  <aside class="menu-skeleton" :class="{ 'is-collapse': isCollapse }">
    <el-skeleton animated>
      <template #template>
        <!-- Logo 区占位：图标 + 标题 + 折叠按钮，与 LayoutMenu 的 .menu-logo 对齐 -->
        <div class="menu-skeleton__logo">
          <div class="menu-skeleton__brand">
            <el-skeleton-item variant="image" class="menu-skeleton__logo-icon" />
            <el-skeleton-item v-if="!isCollapse" variant="text" class="menu-skeleton__logo-text" />
          </div>
          <el-skeleton-item v-if="!isCollapse" variant="button" class="menu-skeleton__toggle" />
        </div>

        <!-- 菜单项占位：图标 + 文字两列，与 MenuItem 的行高一致 -->
        <div class="menu-skeleton__items">
          <div v-for="i in 4" :key="i" class="menu-skeleton__item">
            <el-skeleton-item variant="image" class="menu-skeleton__item-icon" />
            <el-skeleton-item v-if="!isCollapse" variant="text" class="menu-skeleton__item-text" />
          </div>
        </div>

        <!-- 底部用户区占位：白色胶囊内的头像 + 昵称 + 更多按钮，与 .menu-bottom 对齐 -->
        <div class="menu-skeleton__bottom">
          <el-skeleton-item variant="circle" class="menu-skeleton__avatar" />
          <template v-if="!isCollapse">
            <el-skeleton-item variant="text" class="menu-skeleton__name" />
            <el-skeleton-item variant="text" class="menu-skeleton__more" />
          </template>
        </div>
      </template>
    </el-skeleton>
  </aside>
</template>

<script setup lang="ts">
import { ElSkeleton, ElSkeletonItem } from 'element-plus';

interface Props {
  /** 侧边栏是否处于收起态：侧边栏收起状态会被持久化，首屏骨架必须跟着收窄，否则会溢出 72px 面板 */
  isCollapse?: boolean;
}

withDefaults(defineProps<Props>(), {
  isCollapse: false,
});
</script>

<style scoped lang="scss">
.menu-skeleton {
  display: flex;
  flex-direction: column;

  // 不能写 height: 100%：本元素同时带 margin: 8px，100% 会算成「网格区域整高 + 上下 16px 外边距」，
  // 比真实菜单的 .menu-panel 高出 16px 并溢出网格区域，骨架切真实内容时底部会跳 16px。
  // 交给网格默认的 align-self: stretch 撑开，才与 .layout-menu > .menu-panel 逐像素一致。
  margin: 8px;
  overflow: hidden;
  border-radius: 20px;
  background: var(--aix-colorBgLayout);

  // el-skeleton 默认按内容高度排布，这里让它撑满侧边栏，底部用户区才能沉底
  :deep(.el-skeleton) {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
}

// Logo 区：与 .menu-logo 对齐（padding 20px 16px + 底部分隔线）
.menu-skeleton__logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid var(--aix-colorSplit);
  gap: 8px;

  // 收起态：与 .layout-menu.is-collapse .menu-logo 对齐
  .menu-skeleton.is-collapse & {
    flex-direction: column;
    justify-content: center;
    padding: 20px 8px;
  }
}

.menu-skeleton__brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-skeleton__logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 16px;
}

.menu-skeleton__logo-text {
  width: 80px;
  height: 20px;
}

.menu-skeleton__toggle {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

// 菜单项：与 el-menu padding 8px 12px、item 40px、radius 6px 对齐
.menu-skeleton__items {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 8px 12px;
  gap: 4px;

  // 收起态：与 .el-menu--collapse 的 padding 8px 对齐
  .menu-skeleton.is-collapse & {
    padding: 8px;
  }
}

.menu-skeleton__item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px 0 16px;
  gap: 8px;

  // 收起态：与收起态菜单项一致——居中的 40x40 方块
  .menu-skeleton.is-collapse & {
    justify-content: center;
    width: 40px;
    margin: 0 auto;
    padding: 0;
  }
}

.menu-skeleton__item-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.menu-skeleton__item-text {
  width: 76px;
  height: 16px;
}

// 底部用户区：与 .menu-bottom 白色胶囊卡片对齐
.menu-skeleton__bottom {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin: 0 16px 16px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--aix-colorBgContainer);
  gap: 8px;

  // 收起态：胶囊收成圆形头像按钮，与 .menu-bottom 收起态一致
  .menu-skeleton.is-collapse & {
    margin: 0 10px 16px;
    padding: 8px;
    border-radius: 50%;
  }
}

.menu-skeleton__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.menu-skeleton__name {
  flex: 1;
  height: 16px;
}

.menu-skeleton__more {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}
</style>
