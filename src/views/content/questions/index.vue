<template>
  <div class="page">
    <div class="page__header">
      <h2 class="page__title">题目</h2>
      <el-button type="primary" @click="router.push('/content/questions/create')">新建题目</el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="科目">
        <SubjectCascader v-model="filters.subjectId" :options="subjectOptions" @update:model-value="onSubjectChange" />
      </el-form-item>
      <el-form-item label="知识点">
        <KnowledgePointSelect
          v-model="knowledgePointModel"
          :subject-id="filters.subjectId"
          placeholder="含下级知识点"
          class="question-list__knowledge"
        />
      </el-form-item>
      <el-form-item label="题型">
        <el-select v-model="filters.type" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源">
        <el-select v-model="filters.source" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
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

    <div v-if="selected.length > 0" class="question-list__batch">
      <span class="question-list__batch-count">已选 {{ selected.length }} 项</span>
      <el-button link type="primary" :disabled="batching" @click="clearSelected">清空</el-button>
      <div class="question-list__batch-actions">
        <el-button
          v-for="action in batchActions"
          :key="action.key"
          :type="action.type"
          plain
          :disabled="batching"
          @click="action.handler"
        >
          {{ action.label }}
        </el-button>
      </div>
    </div>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="list"
      row-key="id"
      class="data-table"
      @selection-change="selected = $event as AdminQuestionDto[]"
    >
      <el-table-column type="selection" width="48" :selectable="row => !(row as AdminQuestionDto).parentId" />
      <el-table-column label="题干" min-width="280">
        <template #default="{ row }">
          <span class="page__stem">{{ questionSummary(row as AdminQuestionDto) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
      </el-table-column>
      <el-table-column label="科目" min-width="140">
        <template #default="{ row }">{{ subjectLabel(row.subjectId) || '—' }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column label="来源" width="100">
        <template #default="{ row }">{{ QUESTION_SOURCE_LABEL[row.source as QuestionSource] }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="QUESTION_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="版本" width="70">
        <template #default="{ row }">{{ row.currentVersion ? `v${row.currentVersion}` : '—' }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row as AdminQuestionDto)">预览</el-button>
          <el-button
            v-if="canEditQuestion(row as AdminQuestionDto)"
            link
            type="primary"
            @click="router.push(`/content/questions/${row.id}`)"
          >
            编辑
          </el-button>
          <el-button v-if="row.currentVersion > 0" link type="primary" @click="openVersions(row as AdminQuestionDto)">
            版本
          </el-button>
          <el-button
            v-if="userStore.canReview && canStartErrata(row as AdminQuestionDto)"
            link
            type="warning"
            @click="router.push(errataCreateLocation(row.id))"
          >
            勘误
          </el-button>
          <el-button
            v-if="canSubmitQuestion(row as AdminQuestionDto)"
            link
            type="success"
            :loading="isActing(row.id)"
            @click="handleSubmit(row as AdminQuestionDto)"
          >
            提交审核
          </el-button>
          <el-button
            v-if="userStore.canReview && canOfflineQuestion(row as AdminQuestionDto)"
            link
            type="warning"
            :disabled="isActing(row.id)"
            @click="handleOffline(row as AdminQuestionDto)"
          >
            下架
          </el-button>
          <el-button
            v-if="userStore.canReview && canRepublishQuestion(row as AdminQuestionDto)"
            link
            type="success"
            :loading="isActing(row.id)"
            @click="handleRepublish(row as AdminQuestionDto)"
          >
            重新发布
          </el-button>
          <el-button
            v-if="canDeleteQuestion(row as AdminQuestionDto)"
            link
            type="danger"
            :disabled="isActing(row.id)"
            @click="handleRemove(row as AdminQuestionDto)"
          >
            删除
          </el-button>
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

    <QuestionPreviewDialog v-model="previewVisible" :question-id="activeId" />
    <QuestionVersionDrawer v-model="versionsVisible" :question-id="activeId" />
    <RejectReasonDialog ref="rejectDialog" />
    <BatchUpdateDialog ref="updateDialog" />
    <BatchResultDialog
      v-model="resultVisible"
      :succeeded="batchResult.succeeded"
      :failures="batchResult.failures"
      @select="openEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type TableInstance } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BatchResultDialog, { type BatchResultFailure } from '../shared/components/BatchResultDialog.vue';
import KnowledgePointSelect from '../shared/components/KnowledgePointSelect.vue';
import QuestionPreviewDialog from '../shared/components/QuestionPreviewDialog.vue';
import QuestionVersionDrawer from '../shared/components/QuestionVersionDrawer.vue';
import RejectReasonDialog from '../shared/components/RejectReasonDialog.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { QUESTION_SOURCE_LABEL, QUESTION_STATUS_META, QUESTION_TYPE_LABEL } from '../shared/constants';
import { canStartErrata, errataCreateLocation } from '../shared/errata';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import BatchUpdateDialog from './components/BatchUpdateDialog.vue';
import {
  canDeleteQuestion,
  canEditQuestion,
  canOfflineQuestion,
  canRepublishQuestion,
  canSubmitQuestion,
  questionSummary,
  useQuestionList,
  type BatchQuestionChanges,
} from './useQuestionList';
import type { AdminQuestionDto, BatchQuestionsResultDto, QuestionSource, QuestionType } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { useRowAction } from '@/composables/useRowAction';
import { PAGE_SIZES, toOptions, toStatusOptions } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';
import { confirmAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';

const router = useRouter();
const userStore = useUserInfoStore();
const typeOptions = toOptions(QUESTION_TYPE_LABEL);
const statusOptions = toStatusOptions(QUESTION_STATUS_META);
const sourceOptions = toOptions(QUESTION_SOURCE_LABEL);

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
  submit,
  offline,
  republish,
  remove,
  selected,
  clearSelected,
  refreshAfterBatch,
  batchSubmit,
  batchReject,
  batchOffline,
  batchRemove,
  batchUpdate,
} = useQuestionList();

const knowledgePointModel = computed({
  get: () => filters.knowledgePointId,
  set: (value: string | string[]) => {
    filters.knowledgePointId = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  },
});

const previewVisible = ref(false);
const versionsVisible = ref(false);
const activeId = ref('');
const { isActing, run: runRowAction } = useRowAction();

const onSubjectChange = () => {
  filters.knowledgePointId = '';
};

const handleReset = () => reset().catch(() => undefined);

const openPreview = (question: AdminQuestionDto) => {
  activeId.value = question.id;
  previewVisible.value = true;
};

const openVersions = (question: AdminQuestionDto) => {
  activeId.value = question.id;
  versionsVisible.value = true;
};

const handleSubmit = (question: AdminQuestionDto) => runRowAction(question.id, () => submit(question), '已提交审核');

const handleOffline = async (question: AdminQuestionDto) => {
  if (!(await confirmAction('下架后不再被抽入新练习，已在进行中的练习不受影响', '下架题目'))) return;
  await runRowAction(question.id, () => offline(question), '已下架');
};

const handleRepublish = (question: AdminQuestionDto) =>
  runRowAction(question.id, () => republish(question), '已重新发布');

const handleRemove = async (question: AdminQuestionDto) => {
  const message = question.type === 'MATERIAL' ? '删除该材料题及其全部小题？' : '删除该草稿题目？';
  if (!(await confirmAction(message, '删除题目'))) return;
  await runRowAction(question.id, () => remove(question), '已删除');
};

const handleSearch = () => search().catch(() => undefined);

const tableRef = ref<TableInstance>();
const rejectDialog = ref<InstanceType<typeof RejectReasonDialog>>();
const updateDialog = ref<InstanceType<typeof BatchUpdateDialog>>();
const batching = ref(false);
const resultVisible = ref(false);
const batchResult = reactive<{ succeeded: number; failures: BatchResultFailure[] }>({ succeeded: 0, failures: [] });

watch(
  () => selected.value.length === 0,
  empty => {
    if (empty) tableRef.value?.clearSelection();
  },
);

const refreshAfterBatchQuietly = () => refreshAfterBatch().catch(() => undefined);

watch(resultVisible, visible => {
  if (!visible) refreshAfterBatchQuietly();
});

/** 全部成功时提示并刷新，有失败时弹出结果窗口，关闭后刷新；请求失败返回 false */
const executeBatch = async (task: () => Promise<BatchQuestionsResultDto>): Promise<boolean> => {
  if (batching.value) return false;
  batching.value = true;
  const rows = new Map(selected.value.map(question => [question.id, question]));
  try {
    const result = await task();
    if (result.failed.length === 0) {
      ElMessage.success(`已处理 ${result.succeeded} 道`);
      await refreshAfterBatchQuietly();
      return true;
    }
    batchResult.succeeded = result.succeeded;
    batchResult.failures = result.failed.map(item => {
      const row = rows.get(item.id);
      return { id: item.id, label: row ? questionSummary(row) : '', message: item.message };
    });
    resultVisible.value = true;
    return true;
  } catch {
    return false;
  } finally {
    batching.value = false;
  }
};

const openEditor = (id: string) => {
  router.push(`/content/questions/${id}`);
};

const handleBatchSubmit = () => executeBatch(batchSubmit);

const handleBatchReject = () =>
  rejectDialog.value?.open({
    description: `驳回选中的 ${selected.value.length} 道题目为草稿，材料题按整组处理`,
    submit: reason => executeBatch(() => batchReject(reason)),
  });

const handleBatchOffline = async () => {
  const message = `下架选中的 ${selected.value.length} 道题目？下架后不再被抽入新练习，已在进行中的练习不受影响`;
  if (!(await confirmAction(message, '批量下架'))) return;
  await executeBatch(batchOffline);
};

const handleBatchRemove = async () => {
  const message = `删除选中的 ${selected.value.length} 道题目？已发布过的题目不会被删除`;
  if (!(await confirmAction(message, '批量删除'))) return;
  await executeBatch(batchRemove);
};

const submitBatchUpdate = async (changes: BatchQuestionChanges) => {
  if (changes.knowledgePointIds) {
    const versioned = selected.value.filter(question => question.currentVersion > 0).length;
    if (versioned > 0 && !(await confirmAction(`将为 ${versioned} 道已发布题目生成新版本`, '批量修改'))) return false;
  }
  return executeBatch(() => batchUpdate(changes));
};

const handleBatchUpdate = () =>
  updateDialog.value?.open({
    count: selected.value.length,
    subjectIds: selected.value.map(question => question.subjectId),
    submit: submitBatchUpdate,
  });

type BatchActionKey = 'submit' | 'reject' | 'offline' | 'remove' | 'update';

const BATCH_ACTIONS: {
  key: BatchActionKey;
  label: string;
  type: 'primary' | 'success' | 'warning' | 'danger';
  reviewOnly: boolean;
  handler: () => unknown;
}[] = [
  { key: 'submit', label: '批量提交审核', type: 'success', reviewOnly: false, handler: handleBatchSubmit },
  { key: 'reject', label: '批量驳回', type: 'warning', reviewOnly: true, handler: handleBatchReject },
  { key: 'offline', label: '批量下架', type: 'warning', reviewOnly: true, handler: handleBatchOffline },
  { key: 'remove', label: '批量删除', type: 'danger', reviewOnly: false, handler: handleBatchRemove },
  { key: 'update', label: '批量修改', type: 'primary', reviewOnly: false, handler: handleBatchUpdate },
];

const batchActions = computed(() => BATCH_ACTIONS.filter(action => !action.reviewOnly || userStore.canReview));

onMounted(() => {
  loadSubjects().catch(() => undefined);
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '@/styles/page';

.question-list__knowledge {
  width: 200px;
}

.question-list__batch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--aix-colorPrimaryBg);
}

.question-list__batch-count {
  color: var(--aix-colorText);
}

.question-list__batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
