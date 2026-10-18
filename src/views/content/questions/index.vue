<template>
  <div class="content-page">
    <div class="content-page__header">
      <h2 class="content-page__title">题目</h2>
      <el-button type="primary" @click="router.push('/content/questions/create')">新建题目</el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="search">
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
        <el-select v-model="filters.type" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源">
        <el-select v-model="filters.source" placeholder="全部" clearable class="content-page__select">
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

    <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
      <el-table-column label="题干" min-width="280">
        <template #default="{ row }">
          <span class="content-page__stem">
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
            v-if="canStartErrata(row as AdminQuestionDto)"
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
            @click="handleSubmit(row as AdminQuestionDto)"
          >
            提交审核
          </el-button>
          <el-button
            v-if="canOfflineQuestion(row as AdminQuestionDto)"
            link
            type="warning"
            @click="handleOffline(row as AdminQuestionDto)"
          >
            下架
          </el-button>
          <el-button
            v-if="canRepublishQuestion(row as AdminQuestionDto)"
            link
            type="success"
            @click="handleRepublish(row as AdminQuestionDto)"
          >
            重新上架
          </el-button>
          <el-button
            v-if="canDeleteQuestion(row as AdminQuestionDto)"
            link
            type="danger"
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
      class="content-page__pagination"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />

    <QuestionPreviewDialog v-model="previewVisible" :question-id="activeId" />
    <QuestionVersionDrawer v-model="versionsVisible" :question-id="activeId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { confirmAction, runAction } from '../shared/actions';
import KnowledgePointSelect from '../shared/components/KnowledgePointSelect.vue';
import QuestionPreviewDialog from '../shared/components/QuestionPreviewDialog.vue';
import QuestionVersionDrawer from '../shared/components/QuestionVersionDrawer.vue';
import StatusTag from '../shared/components/StatusTag.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import {
  PAGE_SIZES,
  QUESTION_SOURCE_LABEL,
  QUESTION_STATUS_META,
  QUESTION_TYPE_LABEL,
  toOptions,
  toStatusOptions,
} from '../shared/constants';
import { canStartErrata, errataCreateLocation } from '../shared/errata';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import {
  canDeleteQuestion,
  canEditQuestion,
  canOfflineQuestion,
  canRepublishQuestion,
  canSubmitQuestion,
  useQuestionList,
} from './useQuestionList';
import type { AdminQuestionDto, QuestionSource, QuestionType } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';
import { markdownSummary } from '@/utils/markdown';

const router = useRouter();
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

const handleSubmit = (question: AdminQuestionDto) => runAction(() => submit(question), '已提交审核');

const handleOffline = async (question: AdminQuestionDto) => {
  if (!(await confirmAction('下架后不再被抽入新练习，已在进行中的练习不受影响', '下架题目'))) return;
  await runAction(() => offline(question), '已下架');
};

const handleRepublish = (question: AdminQuestionDto) => runAction(() => republish(question), '已重新上架');

const handleRemove = async (question: AdminQuestionDto) => {
  const message = question.type === 'MATERIAL' ? '删除该材料题及其全部小题？' : '删除该草稿题目？';
  if (!(await confirmAction(message, '删除题目'))) return;
  await runAction(() => remove(question), '已删除');
};

onMounted(() => {
  loadSubjects().catch(() => undefined);
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';

.question-list__knowledge {
  width: 200px;
}
</style>
