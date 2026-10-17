<template>
  <div class="options-editor">
    <div v-for="(option, index) in form.options" :key="option.key" class="options-editor__row">
      <span class="options-editor__key">{{ option.key }}</span>
      <MarkdownEditor
        v-model="option.content"
        :file-urls="fileUrls"
        :rows="2"
        :maxlength="CONTENT_LIMITS.optionContent"
        :disabled="disabled"
        :placeholder="`选项 ${option.key}`"
        class="options-editor__input"
        @uploaded="emit('uploaded', $event)"
      />
      <el-button
        link
        type="danger"
        :disabled="disabled || keysLocked || form.options.length <= CONTENT_LIMITS.minChoiceOptions"
        @click="removeOption(form, index)"
      >
        删除
      </el-button>
    </div>
    <el-button
      :disabled="disabled || keysLocked || form.options.length >= CONTENT_LIMITS.options"
      @click="addOption(form)"
    >
      添加选项
    </el-button>
    <span v-if="keysLocked" class="options-editor__hint">已发布过的题目不能增删选项</span>
  </div>
</template>

<script setup lang="ts">
import MarkdownEditor from '../../shared/components/MarkdownEditor.vue';
import { addOption, CONTENT_LIMITS, removeOption, type QuestionForm } from '../../shared/question-form';
import type { FileType } from '@/api';

interface Props {
  fileUrls?: Record<string, string>;
  keysLocked?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), { keysLocked: false, disabled: false });

const form = defineModel<QuestionForm>('form', { required: true });

const emit = defineEmits<{
  uploaded: [file: FileType];
}>();
</script>

<style scoped lang="scss">
.options-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  &__row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  &__key {
    flex: none;
    width: 20px;
    padding-top: 30px;
    color: var(--aix-colorTextSecondary);
    font-weight: 600;
  }

  &__input {
    flex: 1;
    min-width: 0;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
