<template>
  <el-dialog
    :model-value="modelValue"
    title="题目预览"
    width="760px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="load"
  >
    <div v-loading="loading" class="preview-dialog">
      <template v-if="question">
        <div class="preview-dialog__meta">
          <StatusTag :status="question.status" :meta-map="QUESTION_STATUS_META" />
          <span>版本 v{{ question.currentVersion }}</span>
          <span>难度 {{ question.difficulty }}</span>
          <span>
            {{ QUESTION_SOURCE_LABEL[question.source] }}{{ question.sourceNote ? `（${question.sourceNote}）` : '' }}
          </span>
        </div>
        <QuestionPreview :question="question" />
      </template>
    </div>
    <template v-if="$slots.footer && question" #footer>
      <slot name="footer" :question="question" />
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QUESTION_SOURCE_LABEL, QUESTION_STATUS_META } from '../constants';
import QuestionPreview from './QuestionPreview.vue';
import StatusTag from './StatusTag.vue';
import { adminGetQuestion, type AdminQuestionDto } from '@/api';

interface Props {
  modelValue: boolean;
  questionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

defineSlots<{
  footer?: (props: { question: AdminQuestionDto }) => unknown;
}>();

const question = ref<AdminQuestionDto | null>(null);
const loading = ref(false);
let requestSeq = 0;

const load = async () => {
  const seq = ++requestSeq;
  question.value = null;
  loading.value = false;
  if (!props.questionId) return;
  loading.value = true;
  const result = await adminGetQuestion(props.questionId, { disableDedup: true }).catch(() => null);
  if (seq !== requestSeq) return;
  question.value = result;
  loading.value = false;
};
</script>

<style scoped lang="scss">
.preview-dialog {
  min-height: 120px;

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    color: var(--aix-colorTextSecondary);
    font-size: 13px;
  }
}
</style>
