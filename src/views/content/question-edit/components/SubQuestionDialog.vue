<template>
  <el-dialog
    :model-value="modelValue"
    :title="child ? '编辑小题' : '新增小题'"
    width="820px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset(child, 'SINGLE')"
  >
    <QuestionFields
      v-model:form="form"
      :subject-id="subjectId"
      :file-urls="fileUrls"
      :answer-locked="answerLocked"
      is-sub-question
      @uploaded="emit('uploaded', $event)"
      @knowledge-loaded="setKnowledgeTree"
    />
    <el-alert v-if="errors.length" type="error" :closable="false" class="sub-dialog__errors">
      <div v-for="error in errors" :key="error">{{ error }}</div>
    </el-alert>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { QuestionValidationError, useQuestionDraft } from '../useQuestionEditor';
import QuestionFields from './QuestionFields.vue';
import type { AdminQuestionDto, FileType } from '@/api';

interface Props {
  modelValue: boolean;
  materialId: string;
  subjectId: string;
  child: AdminQuestionDto | null;
  fileUrls?: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  uploaded: [file: FileType];
  saved: [];
}>();

const { form, answerLocked, reset, save, setKnowledgeTree } = useQuestionDraft({ isSubQuestion: true });
const errors = ref<string[]>([]);
const saving = ref(false);

const submit = async () => {
  errors.value = [];
  saving.value = true;
  try {
    const result = await save({ subjectId: props.subjectId, parentId: props.materialId });
    ElMessage.success(result.kind === 'unchanged' ? '没有修改' : '已保存');
    emit('saved');
    emit('update:modelValue', false);
  } catch (error) {
    if (error instanceof QuestionValidationError) errors.value = error.errors;
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped lang="scss">
.sub-dialog__errors {
  margin-top: 12px;
}
</style>
