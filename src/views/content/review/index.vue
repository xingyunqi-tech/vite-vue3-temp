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
      <el-table-column type="selection" width="48" :selectable="row => !isOwnQuestion(row as AdminQuestionDto)" />
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
      <el-table-column label="提交人" min-width="120">
        <template #default="{ row }">{{ row.submitter?.name ?? EMPTY_TEXT }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.submittedAt ?? undefined) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="page__actions">
            <el-button link type="primary" @click="openPreview(row as AdminQuestionDto)">预览</el-button>
            <el-tooltip :disabled="!isOwnQuestion(row as AdminQuestionDto)" :content="SELF_REVIEW_TIP" placement="top">
              <span class="page__actions">
                <el-button
                  link
                  type="warning"
                  :disabled="isOwnQuestion(row as AdminQuestionDto)"
                  @click="handleReject(row as AdminQuestionDto)"
                >
                  驳回
                </el-button>
                <el-button
                  link
                  type="success"
                  :disabled="isOwnQuestion(row as AdminQuestionDto)"
                  @click="handlePublish(row as AdminQuestionDto)"
                >
                  发布
                </el-button>
              </span>
            </el-tooltip>
          </div>
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
        <div class="page__actions page__actions--end">
          <el-button @click="previewVisible = false">关闭</el-button>
          <el-tooltip
            v-if="question.status === 'REVIEWING'"
            :disabled="!isOwnQuestion(question)"
            :content="SELF_REVIEW_TIP"
            placement="top"
          >
            <span class="page__actions">
              <el-button type="warning" :disabled="isOwnQuestion(question)" @click="handleReject(question, true)">
                驳回
              </el-button>
              <el-button type="success" :disabled="isOwnQuestion(question)" @click="handlePublish(question, true)">
                发布
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </template>
    </QuestionPreviewDialog>

    <RejectReasonDialog ref="rejectDialog" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import QuestionPreviewDialog from '../shared/components/QuestionPreviewDialog.vue';
import RejectReasonDialog from '../shared/components/RejectReasonDialog.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { QUESTION_TYPE_LABEL } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import { useReviewList } from './useReviewList';
import type { AdminQuestionDto, QuestionType } from '@/api';
import { EMPTY_TEXT, PAGE_SIZES, toOptions } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';
import { confirmAction, runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';
import { markdownSummary } from '@/utils/markdown';

const SELF_REVIEW_TIP = '不能审核自己创建或提交的题';

const typeOptions = toOptions(QUESTION_TYPE_LABEL);
const userStore = useUserInfoStore();
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
  refreshAfterChange,
} = useReviewList();

const previewVisible = ref(false);
const previewId = ref('');
const batching = ref(false);
const rejectDialog = ref<InstanceType<typeof RejectReasonDialog>>();

const isOwnQuestion = (question: AdminQuestionDto) =>
  !userStore.isAdmin &&
  userStore.info.id !== undefined &&
  (question.creator?.id === userStore.info.id || question.submitter?.id === userStore.info.id);

const openPreview = (question: AdminQuestionDto) => {
  previewId.value = question.id;
  previewVisible.value = true;
};

const materialHint = (question: AdminQuestionDto) => (question.type === 'MATERIAL' ? '，材料及其全部小题一起处理' : '');

const refreshList = () => refreshAfterChange().catch(() => undefined);

const handlePublish = async (question: AdminQuestionDto, fromPreview = false) => {
  if (!(await confirmAction(`发布该题目${materialHint(question)}？`, '发布题目'))) return;
  if (!(await runAction(() => publish(question), '已发布'))) return;
  if (fromPreview) previewVisible.value = false;
  await refreshList();
};

const handleReject = async (question: AdminQuestionDto, fromPreview = false) => {
  const done = await rejectDialog.value?.open({
    description: `驳回为草稿${materialHint(question)}`,
    submit: reason => runAction(() => reject(question, reason), '已驳回'),
  });
  if (!done) return;
  if (fromPreview) previewVisible.value = false;
  await refreshList();
};

const handleBatchPublish = async () => {
  if (!(await confirmAction(`发布选中的 ${selectedIds.value.length} 道题目？材料题按整组发布`, '批量发布'))) return;
  batching.value = true;
  const done = await runAction(async () => {
    const count = await batchPublish();
    ElMessage.success(`已发布 ${count} 道题目`);
  });
  batching.value = false;
  if (done) await refreshList();
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

.page__actions {
  &--end {
    justify-content: flex-end;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
