<template>
  <h1 class="logo-text">
    <template v-for="(line, index) in titleLines" :key="index">
      {{ line }}<br v-if="index < titleLines.length - 1" />
    </template>
  </h1>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
});

const titleLines = computed(() => {
  if (!props.title) return [''];
  return props.title.split('\n');
});
</script>

<style scoped lang="scss">
.logo-text {
  color: var(--colorTextHeading);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.32;
}
</style>
