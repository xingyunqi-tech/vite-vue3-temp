<template>
  <div class="markdown-editor">
    <div class="markdown-editor__toolbar">
      <el-button size="small" :loading="uploading" :disabled="disabled" @click="pickImage">插入图片</el-button>
      <el-checkbox v-model="previewVisible" size="small">预览</el-checkbox>
      <span class="markdown-editor__hint">支持 Markdown 与 $公式$</span>
      <input
        ref="fileInput"
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        class="markdown-editor__file"
        @change="handleFileChange"
      />
    </div>
    <el-input
      ref="inputRef"
      :model-value="modelValue"
      type="textarea"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :disabled="disabled"
      show-word-limit
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div v-if="previewVisible" class="markdown-editor__preview">
      <MarkdownContent :content="modelValue" :file-urls="fileUrls" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InputInstance } from 'element-plus';
import { nextTick, ref } from 'vue';
import MarkdownContent from './MarkdownContent.vue';
import { uploadContentFile, type FileType } from '@/api';
import { insertFileReference } from '@/utils/markdown';

interface Props {
  modelValue: string;
  fileUrls?: Record<string, string>;
  rows?: number;
  maxlength?: number;
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { rows: 4, placeholder: '', disabled: false });

const emit = defineEmits<{
  'update:modelValue': [value: string];
  uploaded: [file: FileType];
}>();

const inputRef = ref<InputInstance>();
const fileInput = ref<HTMLInputElement>();
const uploading = ref(false);
const previewVisible = ref(false);

const pickImage = () => fileInput.value?.click();

const insertReference = async (fileId: string) => {
  const textarea = inputRef.value?.textarea;
  const length = props.modelValue.length;
  const selection = textarea
    ? { start: textarea.selectionStart, end: textarea.selectionEnd }
    : { start: length, end: length };
  const { text, cursor } = insertFileReference(props.modelValue, selection, fileId);
  emit('update:modelValue', text);
  await nextTick();
  textarea?.setSelectionRange(cursor, cursor);
};

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  uploading.value = true;
  const uploaded = await uploadContentFile(file, 'content-image').catch(() => null);
  uploading.value = false;
  if (!uploaded) return;
  emit('uploaded', uploaded);
  await insertReference(uploaded.id);
};
</script>

<style scoped lang="scss">
.markdown-editor {
  width: 100%;

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }

  &__file {
    display: none;
  }

  &__preview {
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px dashed var(--aix-colorBorder);
    border-radius: 6px;
    background: var(--aix-colorFillQuaternary);
  }
}
</style>
