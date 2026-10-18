<template>
  <div class="content-page">
    <div class="content-page__header">
      <h2 class="content-page__title">勘误</h2>
      <el-button :loading="loading" @click="load()">刷新</el-button>
    </div>

    <el-form :model="filters" inline @submit.prevent="handleSearch">
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable class="content-page__select">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="题目 ID">
        <el-input v-model="filters.questionId" placeholder="题目 ID" clearable class="errata-list__question" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="题目" min-width="150">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row.questionId)">{{ shortId(row.questionId) }}</el-button>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="100">
        <template #default="{ row }">v{{ row.fromVersion }} → v{{ row.toVersion }}</template>
      </el-table-column>
      <el-table-column label="修改" width="100">
        <template #default="{ row }">{{ row.answerChanged ? '答案与解析' : '仅解析' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="ERRATA_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="受影响用户进度" min-width="220">
        <template #default="{ row }">
          <ErrataProgress :errata="row as Errata" />
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="180">
        <template #default="{ row }">
          <span v-if="row.status === 'FAILED'" class="errata-list__failed">{{ row.failureReason || '任务失败' }}</span>
          <span v-else-if="isErrataStale(row as Errata, now)" class="errata-list__failed">超过 10 分钟未进展</span>
          <span v-else-if="row.finishedAt" class="content-page__muted">
            完成于 {{ formatDateTimeFull(row.finishedAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push(`/feedback/errata/${row.id}`)">进度</el-button>
          <el-button
            v-if="canRetryErrata(row as Errata, now)"
            link
            type="warning"
            :loading="retryingId === row.id"
            @click="handleRetry(row as Errata)"
          >
            重试
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

    <QuestionPreviewDialog v-model="previewVisible" :question-id="previewId" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrataProgress from '../shared/components/ErrataProgress.vue';
import QuestionPreviewDialog from '../shared/components/QuestionPreviewDialog.vue';
import StatusTag from '../shared/components/StatusTag.vue';
import { PAGE_SIZES, toStatusOptions } from '../shared/constants';
import { canRetryErrata, isErrataStale } from '../shared/errata';
import { ERRATA_STATUS_META } from '../shared/feedback-constants';
import { requestErrorMessage } from '../shared/request-error';
import { isUuid, queryString } from '../shared/utils';
import { useErrataList } from './useErrataList';
import type { Errata } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';

const route = useRoute();
const router = useRouter();
const statusOptions = toStatusOptions(ERRATA_STATUS_META);

const { filters, page, limit, total, list, loading, load, search, reset, changePage, changeSize, now, retry } =
  useErrataList();

const retryingId = ref('');
const previewVisible = ref(false);
const previewId = ref('');

const shortId = (id: string) => id.slice(0, 8);

const openPreview = (questionId: string) => {
  previewId.value = questionId;
  previewVisible.value = true;
};

const handleSearch = () => {
  const questionId = filters.questionId.trim();
  if (questionId && !isUuid(questionId)) {
    ElMessage.warning('题目 ID 格式不正确');
    return;
  }
  search().catch(() => undefined);
};

const handleReset = () => reset().catch(() => undefined);

const handleRetry = async (errata: Errata) => {
  retryingId.value = errata.id;
  try {
    await retry(errata);
    ElMessage.success('已从中断处继续执行');
  } catch (error) {
    ElMessage.error(requestErrorMessage(error));
  } finally {
    retryingId.value = '';
  }
};

onMounted(() => {
  const questionId = queryString(route.query.questionId);
  if (isUuid(questionId)) filters.questionId = questionId;
  search().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';

.errata-list {
  &__question {
    width: 300px;
  }

  &__failed {
    color: var(--aix-colorError);
  }
}
</style>
