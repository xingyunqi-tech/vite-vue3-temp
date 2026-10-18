<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-content" v-html="html" />
</template>

<script setup lang="ts">
import 'katex/dist/katex.min.css';
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/markdown';

interface Props {
  content: string | null | undefined;
  fileUrls?: Record<string, string>;
  /** 图片渲染为链接文本，不自动加载 */
  imagesAsLinks?: boolean;
}

const props = defineProps<Props>();

const html = computed(() =>
  renderMarkdown(props.content, fileId => props.fileUrls?.[fileId], { imagesAsLinks: props.imagesAsLinks }),
);
</script>

<style scoped lang="scss">
.markdown-content {
  color: var(--aix-colorText);
  font-size: 14px;
  line-height: 1.7;
  overflow-wrap: anywhere;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
    vertical-align: middle;
  }

  :deep(table) {
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 8px;
    border: 1px solid var(--aix-colorBorderSecondary);
  }

  :deep(code) {
    padding: 0 4px;
    border-radius: 4px;
    background: var(--aix-colorFillQuaternary);
    font-family: var(--aix-fontFamilyCode);
  }

  :deep(.md-math-block) {
    margin: 8px 0;
    overflow-x: auto;
  }

  :deep(.md-file-missing) {
    color: var(--aix-colorTextTertiary);
  }
}
</style>
