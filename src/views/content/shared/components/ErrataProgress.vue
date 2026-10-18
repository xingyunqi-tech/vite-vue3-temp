<template>
  <div class="errata-progress">
    <el-progress :percentage="errataProgress(errata)" :status="status" class="errata-progress__bar" />
    <span class="errata-progress__count">{{ errata.processedUsers }} / {{ errata.affectedUsers }} 人</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { errataProgress } from '../errata';
import type { Errata } from '@/api';

interface Props {
  errata: Pick<Errata, 'status' | 'affectedUsers' | 'processedUsers'>;
}

const props = defineProps<Props>();

const status = computed(() => {
  if (props.errata.status === 'FAILED') return 'exception';
  if (props.errata.status === 'DONE') return 'success';
  return undefined;
});
</script>

<style scoped lang="scss">
.errata-progress {
  display: flex;
  align-items: center;
  gap: 8px;

  &__bar {
    flex: 1;
    min-width: 120px;
  }

  &__count {
    flex: none;
    color: var(--aix-colorTextSecondary);
    font-size: 12px;
  }
}
</style>
