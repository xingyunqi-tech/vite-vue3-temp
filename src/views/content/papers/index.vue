<template>
  <div class="page">
    <div class="page__header">
      <h2 class="page__title">试卷</h2>
      <el-button type="primary" @click="createVisible = true">新建试卷</el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="科目">
        <SubjectCascader v-model="filters.subjectId" :options="subjectOptions" />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="filters.type" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="filters.keyword" placeholder="试卷标题" clearable maxlength="100" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ PAPER_TYPE_LABEL[row.type as PaperType] }}</template>
      </el-table-column>
      <el-table-column label="科目" min-width="140">
        <template #default="{ row }">{{ subjectLabel(row.subjectId) || '—' }}</template>
      </el-table-column>
      <el-table-column label="年份" width="80">
        <template #default="{ row }">{{ row.year ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="时长" width="80">
        <template #default="{ row }">{{ row.durationMin }} 分钟</template>
      </el-table-column>
      <el-table-column prop="questionCount" label="题量" width="70" />
      <el-table-column prop="totalScore" label="总分" width="80" />
      <el-table-column prop="attemptCount" label="参考人数" width="90" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="CONTENT_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/content/papers/${row.id}`)">
            {{ row.status === 'DRAFT' ? '编辑' : '查看' }}
          </el-button>
          <el-button v-if="row.status !== 'PUBLISHED'" link type="success" @click="handlePublish(row as Paper)">
            发布
          </el-button>
          <el-button v-else link type="warning" @click="handleOffline(row as Paper)">下架</el-button>
          <el-button v-if="row.type !== 'GENERATED'" link type="primary" @click="handleCopy(row as Paper)">
            复制
          </el-button>
          <el-button v-if="row.status === 'DRAFT'" link type="danger" @click="handleRemove(row as Paper)">
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

    <PaperCreateDialog
      v-model="createVisible"
      :subject-options="subjectOptions"
      :default-subject-id="filters.subjectId"
      :saving="creating"
      @submit="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { CONTENT_STATUS_META, PAPER_TYPE_LABEL } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import PaperCreateDialog from './components/PaperCreateDialog.vue';
import { usePaperList } from './usePaperList';
import type { CreatePaperDto, Paper, PaperType } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { PAGE_SIZES, toOptions, toStatusOptions } from '@/constants';
import { confirmAction, runAction } from '@/utils/actions';

const router = useRouter();
const typeOptions = toOptions(PAPER_TYPE_LABEL);
const statusOptions = toStatusOptions(CONTENT_STATUS_META);

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
  create,
  publish,
  offline,
  copy,
  remove,
} = usePaperList();

const createVisible = ref(false);
const creating = ref(false);

const handleCreate = async (dto: CreatePaperDto) => {
  creating.value = true;
  await runAction(async () => {
    const paper = await create(dto);
    createVisible.value = false;
    await router.push(`/content/papers/${paper.id}`);
  });
  creating.value = false;
};

const handlePublish = async (paper: Paper) => {
  if (!(await confirmAction(`发布试卷「${paper.title}」？发布后题目与分值冻结`, '发布试卷'))) return;
  await runAction(() => publish(paper), '已发布');
};

const handleOffline = async (paper: Paper) => {
  if (!(await confirmAction(`下架试卷「${paper.title}」？`, '下架试卷'))) return;
  await runAction(() => offline(paper), '已下架');
};

const handleCopy = async (paper: Paper) => {
  if (!(await confirmAction(`复制「${paper.title}」为新的草稿试卷？`, '复制试卷'))) return;
  await runAction(async () => {
    const copied = await copy(paper);
    await router.push(`/content/papers/${copied.id}`);
  });
};

const handleRemove = async (paper: Paper) => {
  if (!(await confirmAction(`删除草稿试卷「${paper.title}」？`, '删除试卷'))) return;
  await runAction(() => remove(paper), '已删除');
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
