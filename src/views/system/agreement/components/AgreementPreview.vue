<template>
  <el-dialog
    :model-value="modelValue"
    :title="`预览：${title}`"
    width="420px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="agreement-preview">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="agreement-preview__body" v-html="safeHtml" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderAgreementPreview } from '../agreement-html';

interface Props {
  modelValue: boolean;
  title: string;
  html: string;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const safeHtml = computed(() => renderAgreementPreview(props.html));
</script>

<style scoped lang="scss">
@use '../agreement-content' as content;

.agreement-preview {
  max-height: 60vh;
  overflow-y: auto;

  :deep(.agreement-preview__body) {
    @include content.agreement-content;

    table {
      width: 100%;
    }
  }
}
</style>
