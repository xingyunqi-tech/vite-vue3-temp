<template>
  <div class="content-page">
    <section class="content-page__section">
      <div class="content-page__header">
        <h2 class="content-page__title">批量导入</h2>
      </div>
      <ImportUploadCard ref="uploadCard" :submitting="submitting" @submit="handleSubmit" />
    </section>

    <section class="content-page__section">
      <div class="content-page__header">
        <h2 class="content-page__title">导入任务</h2>
        <div class="content-page__actions">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            class="content-page__select"
            @change="search"
          >
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button :loading="loading" @click="load()">刷新</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" row-key="id" class="data-table">
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTimeFull(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <StatusTag :status="row.status" :meta-map="IMPORT_STATUS_META" />
          </template>
        </el-table-column>
        <el-table-column label="进度" min-width="180">
          <template #default="{ row }">
            <el-progress
              :percentage="jobProgress(row as ImportJob)"
              :status="row.status === 'FAILED' ? 'exception' : row.status === 'DONE' ? 'success' : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column label="总数" prop="total" width="70" />
        <el-table-column label="成功" width="70">
          <template #default="{ row }">
            <span class="import-page__succeeded">{{ row.succeeded }}</span>
          </template>
        </el-table-column>
        <el-table-column label="失败" width="70">
          <template #default="{ row }">
            <span :class="{ 'import-page__failed': row.failed > 0 }">{{ row.failed }}</span>
          </template>
        </el-table-column>
        <el-table-column label="跳过" prop="skipped" width="70" />
        <el-table-column label="导入即发布" width="100">
          <template #default="{ row }">{{ row.publishOnImport ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="说明" min-width="160">
          <template #default="{ row }">
            <span v-if="row.failureReason" class="import-page__failed">{{ row.failureReason }}</span>
            <span v-else-if="row.finishedAt" class="content-page__muted">
              完成于 {{ formatDateTimeFull(row.finishedAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="hasErrorReport(row as ImportJob)"
              link
              type="primary"
              :loading="downloadingId === row.id"
              @click="handleDownload(row as ImportJob)"
            >
              下载错误报告
            </el-button>
            <span v-else class="content-page__muted">—</span>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { runAction } from '../shared/actions';
import StatusTag from '../shared/components/StatusTag.vue';
import { IMPORT_STATUS_META, PAGE_SIZES, toStatusOptions } from '../shared/constants';
import ImportUploadCard from './components/ImportUploadCard.vue';
import { hasErrorReport, jobProgress, useImportJobs } from './useImportJobs';
import type { ImportJob } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';

const statusOptions = toStatusOptions(IMPORT_STATUS_META);
const { filters, page, limit, total, list, loading, load, search, changePage, changeSize, create, downloadErrors } =
  useImportJobs();

const uploadCard = ref<InstanceType<typeof ImportUploadCard>>();
const submitting = ref(false);
const downloadingId = ref('');

const handleSubmit = async (file: File, publishOnImport: boolean) => {
  submitting.value = true;
  if (await runAction(() => create(file, publishOnImport), '已创建导入任务')) uploadCard.value?.clear();
  submitting.value = false;
};

const handleDownload = async (job: ImportJob) => {
  downloadingId.value = job.id;
  await runAction(() => downloadErrors(job));
  downloadingId.value = '';
};

onMounted(() => {
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';

.import-page {
  &__succeeded {
    color: var(--aix-colorSuccess);
  }

  &__failed {
    color: var(--aix-colorError);
  }
}
</style>
