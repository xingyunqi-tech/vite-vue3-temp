<template>
  <div class="page">
    <section class="page__section">
      <div class="page__header">
        <h2 class="page__title">考试</h2>
        <el-button type="primary" @click="openEditor(null)">新建考试</el-button>
      </div>
      <el-form :model="filters" inline @submit.prevent="handleSearch">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="考试名称" clearable maxlength="50" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="filters.category" placeholder="全部" clearable class="page__select">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable class="page__select">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
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
        highlight-current-row
        class="data-table"
        @current-change="selectExam"
      >
        <el-table-column prop="name" label="考试" min-width="160" />
        <el-table-column label="类别" width="110">
          <template #default="{ row }">
            {{ EXAM_CATEGORY_LABEL[row.category as ExamCategory] ?? row.category }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <StatusTag :status="row.status" :meta-map="CONTENT_STATUS_META" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTimeFull(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <span @click.stop>
              <el-button link type="primary" @click="openEditor(row as Exam)">编辑</el-button>
              <el-button
                v-if="userStore.canReview && canPublish(row.status)"
                link
                type="success"
                :loading="isActing(row.id)"
                @click="handlePublish(row as Exam)"
              >
                发布
              </el-button>
              <el-button
                v-if="userStore.canReview && canOffline(row.status)"
                link
                type="warning"
                :disabled="isActing(row.id)"
                @click="handleOffline(row as Exam)"
              >
                下架
              </el-button>
              <el-button
                v-if="canDelete(row.status)"
                link
                type="danger"
                :disabled="isActing(row.id)"
                @click="handleRemove(row as Exam)"
              >
                删除
              </el-button>
            </span>
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
    </section>

    <section class="page__section">
      <SubjectPanel :exam="selectedExam" />
    </section>

    <ExamFormDialog v-model="editorVisible" :exam="editing" :saving="saving" @submit="handleSubmit" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CONTENT_STATUS_META, EXAM_CATEGORY_LABEL } from '../shared/constants';
import ExamFormDialog from './components/ExamFormDialog.vue';
import SubjectPanel from './components/SubjectPanel.vue';
import { canDelete, canOffline, canPublish, useExamList } from './useExamCatalog';
import type { CreateExamDto, Exam, ExamCategory } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { useRowAction } from '@/composables/useRowAction';
import { PAGE_SIZES, toOptions, toStatusOptions } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';
import { confirmAction, runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';

const userStore = useUserInfoStore();
const categoryOptions = toOptions(EXAM_CATEGORY_LABEL);
const statusOptions = toStatusOptions(CONTENT_STATUS_META);

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
  save,
  publish,
  offline,
  remove,
} = useExamList();

const selectedId = ref('');
const selectedExam = computed(() => list.value.find(exam => exam.id === selectedId.value) ?? null);
const editorVisible = ref(false);
const editing = ref<Exam | null>(null);
const saving = ref(false);

const selectExam = (exam: Exam | null) => {
  if (exam) selectedId.value = exam.id;
};

const openEditor = (exam: Exam | null) => {
  editing.value = exam;
  editorVisible.value = true;
};

const handleSubmit = async (dto: CreateExamDto) => {
  saving.value = true;
  try {
    if (await runAction(() => save(editing.value?.id ?? null, dto), '已保存')) editorVisible.value = false;
  } finally {
    saving.value = false;
  }
};

const { isActing, run: runRowAction } = useRowAction();

const handlePublish = (exam: Exam) => runRowAction(exam.id, () => publish(exam), '已发布');

const handleOffline = async (exam: Exam) => {
  if (!(await confirmAction(`下架考试「${exam.name}」？用户将看不到该考试，历史记录保留`, '下架考试'))) return;
  await runRowAction(exam.id, () => offline(exam), '已下架');
};

const handleRemove = async (exam: Exam) => {
  if (!(await confirmAction(`删除考试「${exam.name}」？仅可删除无科目的草稿考试`, '删除考试'))) return;
  await runRowAction(exam.id, () => remove(exam), '已删除');
};

const handleSearch = () => search().catch(() => undefined);
const handleReset = () => reset().catch(() => undefined);

onMounted(() => {
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '@/styles/page';
</style>
