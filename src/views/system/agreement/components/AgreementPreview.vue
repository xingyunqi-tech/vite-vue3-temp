<template>
  <el-dialog
    :model-value="modelValue"
    :title="`预览：${title}`"
    width="420px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="agreement-preview" v-html="safeHtml" />
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
.agreement-preview {
  max-height: 60vh;
  overflow-y: auto;
  color: var(--aix-colorText);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 8px;
    border: 1px solid var(--aix-colorBorder);
  }

  :deep(th > p),
  :deep(td > p) {
    margin: 0;
  }

  :deep(blockquote) {
    margin: 8px 0;
    padding-left: 12px;
    border-left: 4px solid var(--aix-colorBorder);
    color: var(--aix-colorTextSecondary);
  }
}
</style>
