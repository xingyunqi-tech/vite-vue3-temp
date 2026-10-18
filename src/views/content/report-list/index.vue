<template>
  <div class="content-page">
    <div class="content-page__header">
      <h2 class="content-page__title">纠错与举报</h2>
    </div>

    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="类型">
        <el-select v-model="filters.type" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="题目 ID">
        <el-input v-model="filters.questionId" placeholder="题目 ID" clearable class="report-list__question" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
      <el-table-column label="编号" prop="id" width="80" />
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="110">
        <template #default="{ row }">{{ reportTypeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column label="原因" width="110">
        <template #default="{ row }">
          {{ row.reason ? REPORT_REASON_LABEL[row.reason as QuestionReportReason] : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="200">
        <template #default="{ row }">
          <span class="content-page__stem">{{ row.content || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="题目" min-width="220">
        <template #default="{ row }">
          <span v-if="row.question" class="content-page__stem">{{ markdownSummary(row.question.stem) }}</span>
          <span v-else-if="row.messageId" class="content-page__muted">AI 消息 {{ row.messageId }}</span>
          <span v-else class="content-page__muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="REPORT_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="勘误" width="80">
        <template #default="{ row }">
          <span v-if="row.errataId">已关联</span>
          <span v-else class="content-page__muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/feedback/reports/${row.id}`)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      :page-sizes="REPORT_PAGE_SIZES"
      layout="total, sizes, prev, pager, next"
      class="content-page__pagination"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusTag from '../shared/components/StatusTag.vue';
import { toOptions, toStatusOptions } from '../shared/constants';
import {
  REPORT_PAGE_SIZES,
  REPORT_REASON_LABEL,
  REPORT_STATUS_META,
  REPORT_TYPE_LABEL,
  reportTypeLabel,
} from '../shared/feedback-constants';
import { isUuid, queryString } from '../shared/utils';
import { useReportList } from './useReportList';
import type { QuestionReportReason } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';
import { markdownSummary } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
const typeOptions = toOptions(REPORT_TYPE_LABEL);
const statusOptions = toStatusOptions(REPORT_STATUS_META);

const { filters, page, limit, total, list, loading, search, reset, changePage, changeSize } = useReportList();

const handleSearch = () => {
  const questionId = filters.questionId.trim();
  if (questionId && !isUuid(questionId)) {
    ElMessage.warning('题目 ID 格式不正确');
    return;
  }
  search().catch(() => undefined);
};

const handleReset = () => reset().catch(() => undefined);

onMounted(() => {
  const questionId = queryString(route.query.questionId);
  if (isUuid(questionId)) filters.questionId = questionId;
  search().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';

.report-list__question {
  width: 300px;
}
</style>
