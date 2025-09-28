<template>
  <span class="logo-text">{{ title }}</span>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: '',
});
</script>

<style scoped lang="scss">
.logo-text {
  color: var(--colorTextHeading);
  font-size: 18px;
  font-weight: 600;
}

/* 响应式设计 */
@media (width <= 768px) {
  .logo-text {
    display: none;
  }
}
</style>
