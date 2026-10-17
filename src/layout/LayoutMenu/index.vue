<!--
  侧边栏组件
-->
<template>
  <aside class="layout-menu" :class="{ 'is-collapse': isCollapse }">
    <!-- 面板：承载圆角裁切，与 .layout-menu 分离，避免裁掉绝对定位挪出去的展开按钮 -->
    <div class="menu-panel">
      <!-- Logo 区域 -->
      <div class="menu-logo">
        <div class="menu-logo__brand" @click="onLogoClick">
          <AppLogo
            :show-icon="headerVisible.logoIcon"
            :show-title="headerVisible.logoTitle && !isCollapse"
            :icon="logoConfig.icon"
            :title="resolvedTitle"
          />
        </div>
        <!-- 展开态：收起入口留在 Logo 行内 -->
        <button
          v-if="!isCollapse"
          class="menu-toggle-btn"
          type="button"
          aria-label="收起侧边栏"
          :aria-expanded="true"
          @click="globalStore.toggleSidebar()"
        >
          <SvgIcon name="common-sidebar-toggle" :size="16" />
        </button>
      </div>

      <!-- 菜单滚动容器 -->
      <el-scrollbar wrap-class="scrollbar-wrapper">
        <MenuItem :menus="permissionStore.accessMenus" :is-collapse="isCollapse" :active-menu="activeMenu" />
      </el-scrollbar>

      <!-- 底部用户区 -->
      <div class="menu-bottom">
        <HeaderAvatar v-if="headerVisible.avatar" :is-collapse="isCollapse" />
      </div>
    </div>

    <!-- 收起态：展开入口用绝对定位挪出侧边栏轨道，落在主内容区顶部 -->
    <button
      v-if="isCollapse"
      class="menu-toggle-btn menu-toggle-btn--floating"
      type="button"
      aria-label="展开侧边栏"
      :aria-expanded="false"
      @click="globalStore.toggleSidebar()"
    >
      <SvgIcon name="common-sidebar-toggle" :size="16" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLogo from '../components/AppLogo/index.vue';
import HeaderAvatar from '../components/HeaderAvatar/index.vue';
import { useLayout } from '../useLayoutContext';
import MenuItem from './MenuItem.vue';
import { useSiteConfig } from '@/composables/useSiteConfig';
import { useGlobalStore } from '@/store/modules/global';
import { usePermissionStore } from '@/store/modules/permission';

const route = useRoute();
const router = useRouter();
const globalStore = useGlobalStore();
const permissionStore = usePermissionStore();
const siteConfig = useSiteConfig();
const { headerVisible, logoConfig } = useLayout();

// 标题来源：站点配置 basic.systemTitle（默认值见 constants/site-config.ts，由模版按项目名注入）
const resolvedTitle = computed(() => {
  if (logoConfig.title === null) return '';
  return logoConfig.title ?? siteConfig.config.basic.systemTitle;
});

const activeMenu = computed(() => {
  const { meta, path } = route;
  return (meta?.activeMenu as string) || path;
});

const isCollapse = computed(() => !globalStore.sidebar.opened);

const onLogoClick = () => {
  router.push('/');
};
</script>

<style lang="scss" scoped>
.menu-logo {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid var(--aix-colorSplit);
  gap: 8px;

  &__brand {
    display: flex;
    align-items: center;
    min-width: 0;
    transition: opacity 0.3s ease;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}

// 收起/展开侧边栏入口
.menu-toggle-btn {
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
    background-color: var(--aix-colorBgContainer);
    color: var(--aix-colorTextHeading);
  }

  &:focus-visible {
    outline: 2px solid var(--aix-colorPrimary);
    outline-offset: 2px;
  }

  // 收起态：展开入口挪出 .menu-panel 的裁切范围，绝对定位到主内容区顶部
  // left: 100% 跟随 .layout-menu 实际宽度自适应，margin-left 为按钮与 menu 的间距
  &--floating {
    position: absolute;
    top: 10px;
    left: 100%;
    margin-left: 16px;

    &:hover {
      background-color: var(--aix-colorBgLayout);
      color: var(--aix-colorTextHeading);
    }
  }
}

// 承载圆角裁切（overflow: hidden），与 .layout-menu 分离，避免裁掉绝对定位挪出去的展开按钮
.menu-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.3s ease;
  border-radius: 20px;
  background: var(--aix-colorBgLayout);
}

.layout-menu {
  display: flex;
  position: relative;
  flex-direction: column;
  margin: 8px;

  // 收起态：Logo 区改为纵向排列、图标居中（折叠按钮此时已挪到侧边栏外）
  &.is-collapse .menu-logo {
    flex-direction: column;
    justify-content: center;
    padding: 20px 8px;
  }

  .el-scrollbar {
    flex: 1;

    :deep(.scrollbar-wrapper) {
      overflow-x: hidden !important;

      .el-scrollbar__view {
        height: 100%;
      }
    }

    :deep(.el-scrollbar__bar.is-horizontal) {
      display: none;
    }

    :deep(.el-menu) {
      height: 100%;
      padding: 8px 12px;
      border: none;
      background-color: transparent;

      .el-menu-item {
        position: relative;
        height: 40px;
        margin-bottom: 4px;
        padding: 0 12px 0 16px !important;
        transition: all 0.2s ease;
        border-radius: 6px;
        color: var(--aix-colorTextHeading);
        font-size: 14px;
        line-height: 40px;

        .el-icon {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          color: inherit;
          font-size: 20px;
        }

        &:hover {
          background-color: var(--aix-colorBgContainer);
          color: var(--aix-colorTextHeading);
        }

        // 选中态：白色卡片 + 右侧箭头指示（与 hover 同为白底，用箭头区分选中）
        &.is-active {
          background-color: var(--aix-colorBgContainer);
          color: var(--aix-colorTextHeading);
          font-weight: 500;

          &::after {
            content: '';
            position: absolute;
            top: 50%;
            right: 14px;
            width: 16px;
            height: 16px;
            transform: translateY(-50%);
            background-color: currentColor;
            mask: url('@/assets/icons/common/arrow-right.svg') no-repeat center / contain;
          }
        }
      }

      .el-sub-menu {
        margin-bottom: 8px;

        .el-sub-menu__title {
          height: 40px;
          padding: 0 12px 0 16px !important;
          transition: all 0.2s ease;
          border-radius: 6px;
          color: var(--aix-colorTextHeading);
          font-size: 14px;
          line-height: 40px;

          .el-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
            color: inherit;
            font-size: 20px;
          }

          .el-sub-menu__icon-arrow {
            right: 12px;
            color: var(--aix-colorTextTertiary);
            font-size: 12px;
          }

          &:hover {
            background-color: var(--aix-colorBgContainer);
          }
        }

        &.is-active > .el-sub-menu__title {
          color: var(--aix-colorPrimary);
        }

        .el-menu--inline {
          padding: 0;
          background-color: transparent !important;

          .el-menu-item {
            min-width: unset;
            height: 34px;
            margin-bottom: 4px;
            padding: 0 12px 0 36px !important;
            border-radius: 8px;
            font-size: 14px;
            line-height: 34px;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }

      // 收起态：宽度撑满 72px 轨道，每项收成居中的 40px 方块图标
      &.el-menu--collapse {
        width: 100%;
        padding: 8px;

        .el-menu-item,
        .el-sub-menu__title {
          justify-content: center;
          width: 40px !important;
          margin-right: auto !important;
          margin-left: auto !important;
          padding: 0 !important;

          // Element Plus 收起态会在 item 内部再套一层 tooltip 触发容器，
          // 图标真正的 flex 布局在这一层，外层 justify-content: center 不生效
          .el-menu-tooltip__trigger {
            display: flex !important;
            justify-content: center !important;
          }

          // Element Plus 内置 [class^=el-icon] 选择器会强制 icon 宽度为 --el-menu-icon-width(24px)
          // 并 text-align: center，这里显式覆盖，避免图标在收起态下没有真正居中
          .el-icon {
            width: 20px !important;
            margin-right: 0 !important;
            text-align: center;
          }

          &.is-active::after {
            display: none;
          }
        }

        span {
          display: none;
        }

        .el-sub-menu__icon-arrow {
          display: none;
        }
      }
    }
  }
}

.menu-bottom {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  // 底部用户卡片为白色胶囊，与侧边栏灰底区分，左右外边距 16px 对齐 Logo 区域
  margin: 0 16px 16px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--aix-colorBgContainer);

  // 收起态：胶囊收成圆形头像按钮，两侧留 10px 对齐 72px 轨道
  .layout-menu.is-collapse & {
    margin: 0 10px 16px;
    padding: 8px;
    border-radius: 50%;
  }
}
</style>
