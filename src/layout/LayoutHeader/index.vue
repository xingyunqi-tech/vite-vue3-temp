<!--
  顶部 header：左侧 Logo + 标题，右侧用户区（与侧边栏底部同一个 HeaderAvatar）
  供关闭侧边栏的页面（meta.layout.layoutVisible.header）使用，Logo 点击回首页
-->
<template>
  <header class="layout-header">
    <div class="layout-header__brand" @click="goHome">
      <AppLogo
        :show-icon="headerVisible.logoIcon"
        :show-title="headerVisible.logoTitle"
        :icon="logoConfig.icon"
        :title="resolvedTitle"
      />
    </div>

    <div v-if="headerVisible.avatar" class="layout-header__user">
      <HeaderAvatar trigger="hover" placement="bottom-end" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import AppLogo from '../components/AppLogo/index.vue';
import HeaderAvatar from '../components/HeaderAvatar/index.vue';
import { useLayout } from '../useLayoutContext';
import { useSiteConfig } from '@/composables/useSiteConfig';

const router = useRouter();
const siteConfig = useSiteConfig();
const { headerVisible, logoConfig } = useLayout();

// 与 LayoutMenu 的标题口径一致：title 显式置 null 表示不显示
const resolvedTitle = computed(() => {
  if (logoConfig.title === null) return '';
  return logoConfig.title ?? siteConfig.config.basic.systemTitle;
});

const goHome = () => router.push('/');
</script>

<style scoped lang="scss">
.layout-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  border-bottom: 1px solid var(--aix-colorSplit);
  background: var(--aix-colorBgContainer);
  gap: 16px;

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

  // 宽度收在 auto（上限 260px）：HeaderAvatar 内部是 width: 100%，靠这层给出可收缩的基准
  &__user {
    flex-shrink: 0;
    max-width: 260px;
  }
}
</style>
