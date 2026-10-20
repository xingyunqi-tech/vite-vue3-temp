<template>
  <el-dialog
    :model-value="modelValue"
    title="选择题目"
    width="900px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="题型">
        <el-select v-model="filters.type" placeholder="全部" clearable class="picker__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="知识点">
        <KnowledgePointSelect v-model="knowledgeModel" :subject-id="subjectId" class="picker__knowledge" />
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="filters.keyword" clearable maxlength="100" placeholder="题干或材料" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
      </el-form-item>
    </el-form>
    <p class="picker__hint">只列出已发布的独立题与材料；材料按整组加入，小题分值可在试卷中单独调整</p>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="list"
      row-key="id"
      max-height="420"
      class="data-table"
      @selection-change="handleSelection"
    >
      <el-table-column
        type="selection"
        width="48"
        reserve-selection
        :selectable="(row: AdminQuestionDto) => !excludeIds.includes(row.id)"
      />
      <el-table-column label="题干" min-width="320">
        <template #default="{ row }">
          <span>{{ markdownSummary(row.type === 'MATERIAL' ? row.material || row.stem : row.stem) }}</span>
          <el-tag v-if="excludeIds.includes(row.id)" size="small" type="info" class="picker__added">已在试卷中</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column label="版本" width="70">
        <template #default="{ row }">v{{ row.currentVersion }}</template>
      </el-table-column>
    </el-table>
    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      layout="total, prev, pager, next"
      class="picker__pagination"
      @update:current-page="changePage"
    />

    <template #footer>
      <span class="picker__score">
        每题分值
        <el-input-number
          v-model="score"
          :min="PAPER_SHARED_LIMITS.minScore"
          :max="PAPER_SHARED_LIMITS.maxScore"
          :precision="2"
          :step="0.5"
          size="small"
        />
      </span>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="selected.length === 0" :loading="confirming" @click="confirm">
        加入试卷{{ selected.length ? `（${selected.length}）` : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { TableInstance } from 'element-plus';
import { computed, ref } from 'vue';
import KnowledgePointSelect from '../../shared/components/KnowledgePointSelect.vue';
import { PAPER_SHARED_LIMITS, QUESTION_TYPE_LABEL } from '../../shared/constants';
import { DEFAULT_SCORE } from '../paper-items';
import { adminGetQuestion, adminGetQuestions } from '@/api';
import type { AdminQuestionDto, QuestionType } from '@/api';
import { usePagedList } from '@/composables/usePagedList';
import { toOptions } from '@/constants';
import { markdownSummary } from '@/utils/markdown';

interface Props {
  modelValue: boolean;
  subjectId: string;
  defaultType?: QuestionType | '';
  excludeIds?: string[];
}

const props = withDefaults(defineProps<Props>(), { defaultType: '', excludeIds: () => [] });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [questions: AdminQuestionDto[], score: number];
}>();

interface PickerFilters {
  type: QuestionType | '';
  knowledgePointId: string;
  keyword: string;
}

const typeOptions = toOptions(QUESTION_TYPE_LABEL);
const tableRef = ref<TableInstance>();
const selected = ref<AdminQuestionDto[]>([]);
const score = ref(DEFAULT_SCORE);
const confirming = ref(false);

const { filters, page, limit, total, list, loading, search, changePage } = usePagedList<
  PickerFilters,
  AdminQuestionDto
>({
  createFilters: () => ({ type: '', knowledgePointId: '', keyword: '' }),
  fetchPage: (applied, current, size) =>
    adminGetQuestions(
      {
        page: current,
        limit: size,
        subjectId: props.subjectId,
        status: 'PUBLISHED',
        topLevel: true,
        ...(applied.type ? { type: applied.type } : {}),
        ...(applied.knowledgePointId ? { knowledgePointId: applied.knowledgePointId } : {}),
        ...(applied.keyword.trim() ? { keyword: applied.keyword.trim() } : {}),
      },
      { disableDedup: true },
    ),
});

const knowledgeModel = computed({
  get: () => filters.knowledgePointId,
  set: (value: string | string[]) => {
    filters.knowledgePointId = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  },
});

const handleSearch = () => search().catch(() => undefined);

const handleOpen = () => {
  selected.value = [];
  tableRef.value?.clearSelection();
  Object.assign(filters, { type: props.defaultType, knowledgePointId: '', keyword: '' });
  search().catch(() => undefined);
};

const handleSelection = (rows: AdminQuestionDto[]) => {
  selected.value = rows;
};

/** 材料需取详情拿到小题 */
const withChildren = (question: AdminQuestionDto) =>
  question.type === 'MATERIAL' ? adminGetQuestion(question.id) : Promise.resolve(question);

const confirm = async () => {
  confirming.value = true;
  const questions = await Promise.all(selected.value.map(withChildren)).catch(() => null);
  confirming.value = false;
  if (!questions) return;
  emit('confirm', questions, score.value);
  emit('update:modelValue', false);
};
</script>

<style scoped lang="scss">
.picker {
  &__select {
    width: 140px;
  }

  &__knowledge {
    width: 200px;
  }

  &__hint {
    margin: 0 0 8px;
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }

  &__added {
    margin-left: 6px;
  }

  &__pagination {
    justify-content: flex-end;
    margin-top: 12px;
  }

  &__score {
    margin-right: 16px;
    color: var(--aix-colorTextSecondary);
  }
}
</style>
