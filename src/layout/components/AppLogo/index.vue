<template>
  <div class="app-logo">
    <template v-if="showIcon">
      <img v-if="iconSrc" :src="iconSrc" alt="Logo" class="logo-badge" />
      <SvgIcon v-else name="icon-Union" :size="32" />
    </template>
    <span v-if="showTitle && displayTitle" class="logo-title">{{ displayTitle }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SvgIcon from '@/components/SvgIcon/index.vue';

interface Props {
  title?: string;
  icon?: string;
  showIcon?: boolean;
  showTitle?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  icon: undefined,
  showIcon: true,
  showTitle: true,
});
const iconSrc = computed(() => props.icon || '');
const displayTitle = computed(() => props.title);
</script>

<style scoped lang="scss">
.app-logo {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.logo-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  object-fit: contain;
}

.logo-title {
  overflow: hidden;
  color: var(--aix-colorTextHeading);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
