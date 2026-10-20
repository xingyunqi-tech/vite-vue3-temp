<template>
  <el-dialog
    :model-value="modelValue"
    :title="rule ? `试生成预览 · ${rule.name}` : '试生成预览'"
    width="860px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="generate"
  >
    <div v-loading="loading" class="rule-preview">
      <template v-if="draft">
        <p class="rule-preview__summary">
          共 {{ draft.questionCount }} 题 · 总分 {{ draft.totalScore }} · 客观题
          {{ draft.objectiveScore }}（结果不落库，每次生成可能不同）
        </p>
        <el-alert v-if="draft.insufficient.length" type="warning" :closable="false" class="rule-preview__alert">
          <div v-for="item in draft.insufficient" :key="item.itemIndex">
            第 {{ item.itemIndex + 1 }} 项「{{ rule?.items[item.itemIndex]?.sectionTitle }}」需要
            {{ item.requested }} 题，只抽到 {{ item.drawn }} 题
          </div>
        </el-alert>
        <div v-for="(section, index) in draft.sections" :key="index" class="rule-preview__section">
          <h4 class="rule-preview__title">{{ section.title }}（{{ QUESTION_TYPE_LABEL[section.questionType] }}）</h4>
          <el-table :data="questionsOf(index)" size="small" class="data-table">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column label="题干" min-width="360">
              <template #default="{ row }">{{ markdownSummary(row.stem) }}</template>
            </el-table-column>
            <el-table-column label="题型" width="90">
              <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
            </el-table-column>
            <el-table-column label="材料小题" width="90">
              <template #default="{ row }">{{ row.parentId ? '是' : '' }}</template>
            </el-table-column>
            <el-table-column label="版本" width="70">
              <template #default="{ row }">v{{ row.questionVersion }}</template>
            </el-table-column>
            <el-table-column prop="score" label="分值" width="80" />
          </el-table>
        </div>
      </template>
      <el-empty v-else-if="failed" description="试生成失败，可点击「重新生成」再试" :image-size="80" />
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" :loading="loading" @click="generate">重新生成</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QUESTION_TYPE_LABEL } from '../../shared/constants';
import { adminPreviewPaperRule, type PaperDraftDto, type PaperRule, type QuestionType } from '@/api';
import { markdownSummary } from '@/utils/markdown';

interface Props {
  modelValue: boolean;
  rule: PaperRule | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const draft = ref<PaperDraftDto | null>(null);
const loading = ref(false);
const failed = ref(false);
let requestSeq = 0;

const questionsOf = (sectionIndex: number) =>
  draft.value?.questions.filter(question => question.sectionIndex === sectionIndex) ?? [];

const generate = async () => {
  const seq = ++requestSeq;
  draft.value = null;
  failed.value = false;
  loading.value = false;
  if (!props.rule) return;
  loading.value = true;
  const result = await adminPreviewPaperRule(props.rule.id).catch(() => null);
  if (seq !== requestSeq) return;
  draft.value = result;
  failed.value = result === null;
  loading.value = false;
};
</script>

<style scoped lang="scss">
.rule-preview {
  min-height: 120px;

  &__summary {
    margin: 0 0 12px;
    color: var(--aix-colorTextSecondary);
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__section + &__section {
    margin-top: 16px;
  }

  &__title {
    margin: 0 0 8px;
    color: var(--aix-colorTextHeading);
  }
}
</style>
