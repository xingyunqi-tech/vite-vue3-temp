<template>
  <div class="page">
    <div class="page__header">
      <h2 class="page__title">审核发布</h2>
      <el-button type="primary" :disabled="selectedIds.length === 0" :loading="batching" @click="handleBatchPublish">
        批量发布{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
      </el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="科目">
        <SubjectCascader v-model="filters.subjectId" :options="subjectOptions" />
      </el-form-item>
      <el-form-item label="题型">
        <el-select v-model="filters.type" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="filters.keyword" placeholder="题干或材料" clearable maxlength="100" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table
      v-loading="loading"
      :data="list"
      row-key="id"
      class="data-table"
      @selection-change="selectedIds = ($event as AdminQuestionDto[]).map(item => item.id)"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column label="题干" min-width="300">
        <template #default="{ row }">
          <span class="page__stem">
            {{ markdownSummary(row.type === 'MATERIAL' ? row.material : row.stem) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
      </el-table-column>
      <el-table-column label="科目" min-width="140">
        <template #default="{ row }">{{ subjectLabel(row.subjectId) || '—' }}</template>
      </el-table-column>
      <el-table-column label="版本" width="70">
        <template #default="{ row }">{{ row.currentVersion ? `v${row.currentVersion}` : '新题' }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row as AdminQuestionDto)">预览</el-button>
          <el-button link type="warning" @click="handleReject(row as AdminQuestionDto)">驳回</el-button>
          <el-button link type="success" @click="handlePublish(row as AdminQuestionDto)">发布</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      :page-sizes="PAGE_SIZES"
      layout="total, sizes, prev, pager, next"
      class="page__pagination"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />

    <QuestionPreviewDialog v-model="previewVisible" :question-id="previewId">
      <template #footer="{ question }">
        <el-button @click="previewVisible = false">关闭</el-button>
        <template v-if="question.status === 'REVIEWING'">
          <el-button type="warning" @click="handleReject(question, true)">驳回</el-button>
          <el-button type="success" @click="handlePublish(question, true)">发布</el-button>
        </template>
      </template>
    </QuestionPreviewDialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import QuestionPreviewDialog from '../shared/components/QuestionPreviewDialog.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { QUESTION_TYPE_LABEL } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import { useReviewList } from './useReviewList';
import type { AdminQuestionDto, QuestionType } from '@/api';
import { PAGE_SIZES, toOptions } from '@/constants';
import { confirmAction, runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';
import { markdownSummary } from '@/utils/markdown';

const typeOptions = toOptions(QUESTION_TYPE_LABEL);
const { options: subjectOptions, load: loadSubjects, subjectLabel } = useSubjectOptions();
const {
  filters,
  page,
  limit,
  total,
  list,
  loading,
  load,
  search,
  reset,
  changePage,
  changeSize,
  selectedIds,
  publish,
  reject,
  batchPublish,
} = useReviewList();

const previewVisible = ref(false);
const previewId = ref('');
const batching = ref(false);

const openPreview = (question: AdminQuestionDto) => {
  previewId.value = question.id;
  previewVisible.value = true;
};

const materialHint = (question: AdminQuestionDto) => (question.type === 'MATERIAL' ? '，材料及其全部小题一起处理' : '');

const handlePublish = async (question: AdminQuestionDto, fromPreview = false) => {
  if (!(await confirmAction(`发布该题目${materialHint(question)}？`, '发布题目'))) return;
  if ((await runAction(() => publish(question), '已发布')) && fromPreview) previewVisible.value = false;
};

const handleReject = async (question: AdminQuestionDto, fromPreview = false) => {
  if (!(await confirmAction(`驳回为草稿${materialHint(question)}？`, '驳回题目'))) return;
  if ((await runAction(() => reject(question), '已驳回')) && fromPreview) previewVisible.value = false;
};

const handleBatchPublish = async () => {
  if (!(await confirmAction(`发布选中的 ${selectedIds.value.length} 道题目？材料题按整组发布`, '批量发布'))) return;
  batching.value = true;
  await runAction(async () => {
    const count = await batchPublish();
    ElMessage.success(`已发布 ${count} 道题目`);
  });
  batching.value = false;
};

const handleSearch = () => search().catch(() => undefined);
const handleReset = () => reset().catch(() => undefined);

onMounted(() => {
  loadSubjects().catch(() => undefined);
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '@/styles/page';
</style>
