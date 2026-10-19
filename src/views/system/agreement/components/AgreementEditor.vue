<template>
  <div class="agreement-editor">
    <Toolbar class="agreement-editor__toolbar" :editor="editorRef" :default-config="TOOLBAR_CONFIG" mode="default" />
    <Editor
      class="agreement-editor__body"
      :model-value="modelValue"
      :default-config="editorConfig"
      mode="default"
      @update:model-value="emit('update:modelValue', $event)"
      @on-created="handleCreated"
      @custom-alert="handleAlert"
    />
  </div>
</template>

<script setup lang="ts">
import '@wangeditor-next/editor/dist/css/style.css';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor-next/editor';
import { Editor, Toolbar } from '@wangeditor-next/editor-for-vue';
import { ElMessage } from 'element-plus';
import { onBeforeUnmount, shallowRef } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), { placeholder: '请输入协议正文' });
const emit = defineEmits<Emits>();

/** 协议正文不含图片、视频、表情、待办、代码块与颜色 */
const TOOLBAR_CONFIG: Partial<IToolbarConfig> = {
  excludeKeys: [
    'group-image',
    'insertImage',
    'uploadImage',
    'group-video',
    'insertVideo',
    'uploadVideo',
    'emotion',
    'todo',
    'codeBlock',
    'fontFamily',
    'color',
    'bgColor',
  ],
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      customUpload: () => {
        ElMessage.warning('协议正文不支持图片');
      },
    },
  },
};

const handleAlert = (message: string, type: AlertType) => {
  ElMessage[type](message);
};

type AlertType = 'success' | 'info' | 'warning' | 'error';

const editorRef = shallowRef<IDomEditor>();

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor;
};

onBeforeUnmount(() => {
  editorRef.value?.destroy();
});
</script>

<style scoped lang="scss">
.agreement-editor {
  border: 1px solid var(--aix-colorBorder);
  border-radius: 4px;

  &__toolbar {
    border-bottom: 1px solid var(--aix-colorBorder);
  }

  &__body {
    height: 520px;
    overflow-y: hidden;
  }
}
</style>
