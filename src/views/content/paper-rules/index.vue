<template>
  <div class="content-page">
    <div class="content-page__header">
      <h2 class="content-page__title">组卷规则</h2>
      <el-button type="primary" @click="openEditor(null)">新建规则</el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="search">
      <el-form-item label="科目">
        <SubjectCascader v-model="filters.subjectId" :options="subjectOptions" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="filters.keyword" placeholder="规则名称" clearable maxlength="100" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column label="科目" min-width="140">
        <template #default="{ row }">{{ subjectLabel(row.subjectId) || '—' }}</template>
      </el-table-column>
      <el-table-column label="时长" width="90">
        <template #default="{ row }">{{ row.durationMin }} 分钟</template>
      </el-table-column>
      <el-table-column label="抽题项" min-width="220">
        <template #default="{ row }">
          <span class="content-page__muted">{{ describeItems(row as PaperRule) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="CONTENT_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row as PaperRule)">试生成</el-button>
          <el-button link type="primary" @click="openEditor(row as PaperRule)">编辑</el-button>
          <el-button
            v-if="row.status !== 'PUBLISHED'"
            link
            type="success"
            @click="handleStatus(row as PaperRule, 'PUBLISHED')"
          >
            发布
          </el-button>
          <el-button v-else link type="warning" @click="handleStatus(row as PaperRule, 'OFFLINE')">下架</el-button>
          <el-button link type="danger" @click="handleRemove(row as PaperRule)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      :page-sizes="PAGE_SIZES"
      layout="total, sizes, prev, pager, next"
      class="content-page__pagination"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />

    <PaperRuleDialog
      v-model="editorVisible"
      :rule="editing"
      :subject-options="subjectOptions"
      :default-subject-id="filters.subjectId"
      :saving="saving"
      @submit="handleSubmit"
    />
    <PaperRulePreviewDialog v-model="previewVisible" :rule="previewing" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { confirmAction, runAction } from '../shared/actions';
import StatusTag from '../shared/components/StatusTag.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { CONTENT_STATUS_META, PAGE_SIZES, QUESTION_TYPE_LABEL, toStatusOptions } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import PaperRuleDialog from './components/PaperRuleDialog.vue';
import PaperRulePreviewDialog from './components/PaperRulePreviewDialog.vue';
import type { PaperRuleForm } from './paper-rule-form';
import { usePaperRules } from './usePaperRules';
import type { ContentStatus, PaperRule } from '@/api';

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
  save,
  setStatus,
  remove,
} = usePaperRules();

const editorVisible = ref(false);
const editing = ref<PaperRule | null>(null);
const saving = ref(false);
const previewVisible = ref(false);
const previewing = ref<PaperRule | null>(null);

const describeItems = (rule: PaperRule) =>
  rule.items
    .map(
      item =>
        `${item.sectionTitle}·${QUESTION_TYPE_LABEL[item.questionType]}×${item.count}（${item.scorePerQuestion}分）`,
    )
    .join('；');

const openEditor = (rule: PaperRule | null) => {
  editing.value = rule;
  editorVisible.value = true;
};

const openPreview = (rule: PaperRule) => {
  previewing.value = rule;
  previewVisible.value = true;
};

const handleSubmit = async (form: PaperRuleForm) => {
  saving.value = true;
  try {
    if (await runAction(() => save(editing.value?.id ?? null, form), '已保存')) editorVisible.value = false;
  } finally {
    saving.value = false;
  }
};

const handleStatus = async (rule: PaperRule, status: ContentStatus) => {
  const label = status === 'PUBLISHED' ? '发布' : '下架';
  if (!(await confirmAction(`${label}规则「${rule.name}」？发布的规则用户可用于生成个人试卷`, `${label}规则`))) return;
  await runAction(() => setStatus(rule, status), `已${label}`);
};

const handleRemove = async (rule: PaperRule) => {
  if (!(await confirmAction(`删除规则「${rule.name}」？`, '删除规则'))) return;
  await runAction(() => remove(rule), '已删除');
};

onMounted(() => {
  loadSubjects().catch(() => undefined);
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';
</style>
