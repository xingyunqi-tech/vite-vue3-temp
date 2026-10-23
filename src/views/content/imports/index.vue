<template>
  <div class="page">
    <section class="page__section">
      <div class="page__header">
        <h2 class="page__title">批量导入</h2>
      </div>
      <el-steps :active="activeStep" finish-status="success" simple class="import-page__steps">
        <el-step v-for="title in STEP_TITLES" :key="title" :title="title" />
      </el-steps>
      <ImportUploadCard
        v-model:file="file"
        v-model:publish-on-import="publishOnImport"
        :checking="checking"
        :disabled="submitting"
        @precheck="handlePrecheck"
        @reset="reset"
      />
      <el-alert
        v-if="failure?.kind === 'unparsable'"
        type="error"
        :closable="false"
        show-icon
        :title="`文件无法解析：${failure.message}`"
        class="import-page__alert"
      />

      <div v-if="step === 'result'" class="page__card import-page__result">
        <h3 class="page__subtitle import-page__note">预检结果</h3>
        <p class="page__muted import-page__note">预检结果仅供参考，以实际导入为准</p>
        <template v-if="failure?.kind === 'tooLarge'">
          <el-alert type="warning" :closable="false" show-icon :title="failure.message" />
          <div class="page__actions import-page__confirm">
            <el-button type="primary" :loading="submitting" @click="handleImport">直接导入</el-button>
          </div>
        </template>
        <template v-else-if="result">
          <el-alert
            v-if="stale"
            type="warning"
            :closable="false"
            show-icon
            title="「导入即发布」已更改，预检结果已失效，请重新预检"
          />
          <PrecheckResult :result="result" />
          <div class="page__actions import-page__confirm">
            <el-button type="primary" :disabled="stale" :loading="submitting" @click="handleConfirm">
              {{ errorCount > 0 ? `确认导入（${errorCountText} 处错误）` : '确认导入' }}
            </el-button>
            <el-button v-if="stale" :loading="checking" @click="handlePrecheck">重新预检</el-button>
          </div>
        </template>
      </div>
    </section>

    <section class="page__section">
      <div class="page__header">
        <h2 class="page__title">导入任务</h2>
        <div class="page__actions">
          <el-select
            v-model="filters.status"
            placeholder="全部状态"
            clearable
            class="page__select"
            @change="handleSearch"
          >
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button :loading="loading" @click="handleRefresh">刷新</el-button>
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
            <span v-else-if="row.finishedAt" class="page__muted">完成于 {{ formatDateTimeFull(row.finishedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="hasErrorReport(row as ImportJob)">
              <el-button link type="primary" @click="openErrors(row as ImportJob)">查看错误</el-button>
              <el-button
                link
                type="primary"
                :loading="downloadingId === row.id"
                @click="handleDownload(row as ImportJob)"
              >
                下载错误报告
              </el-button>
            </template>
            <span v-else class="page__muted">—</span>
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

    <ImportErrorsDrawer v-model="errorsVisible" :job-id="errorsJobId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IMPORT_STATUS_META } from '../shared/constants';
import ImportErrorsDrawer from './components/ImportErrorsDrawer.vue';
import ImportUploadCard from './components/ImportUploadCard.vue';
import PrecheckResult from './components/PrecheckResult.vue';
import { hasErrorReport, jobProgress, useImportJobs } from './useImportJobs';
import { useImportPrecheck } from './useImportPrecheck';
import type { ImportJob } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { PAGE_SIZES, toStatusOptions } from '@/constants';
import { confirmAction, runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';

const STEP_TITLES = ['上传文件', '预检结果', '确认导入'];

const statusOptions = toStatusOptions(IMPORT_STATUS_META);
const { filters, page, limit, total, list, loading, load, search, changePage, changeSize, create, downloadErrors } =
  useImportJobs();
const {
  file,
  publishOnImport,
  fileId,
  result,
  failure,
  checking,
  step,
  stale,
  errorCount,
  errorCountText,
  precheck,
  reset,
} = useImportPrecheck();

const submitting = ref(false);
const downloadingId = ref('');
const errorsVisible = ref(false);
const errorsJobId = ref('');

const activeStep = computed(() => {
  if (submitting.value) return 2;
  return step.value === 'result' ? 1 : 0;
});

const handlePrecheck = () => precheck();

const handleImport = async () => {
  if (!fileId.value) return;
  submitting.value = true;
  if (await runAction(() => create(fileId.value, publishOnImport.value), '已创建导入任务')) reset();
  submitting.value = false;
};

const handleConfirm = async () => {
  if (
    errorCount.value > 0 &&
    !(await confirmAction(
      `预检发现 ${errorCountText.value} 处错误，有错误的单元不会写入，其余照常导入。确认导入？`,
      '确认导入',
    ))
  ) {
    return;
  }
  await handleImport();
};

const openErrors = (job: ImportJob) => {
  errorsJobId.value = job.id;
  errorsVisible.value = true;
};

const handleDownload = async (job: ImportJob) => {
  downloadingId.value = job.id;
  await runAction(() => downloadErrors(job));
  downloadingId.value = '';
};

const handleSearch = () => search().catch(() => undefined);
const handleRefresh = () => load().catch(() => undefined);

onMounted(() => {
  load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '@/styles/page';

.import-page {
  &__steps {
    margin-bottom: 16px;
  }

  &__alert,
  &__result {
    margin-top: 16px;
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__note {
    margin: 0;
  }

  &__confirm {
    justify-content: flex-start;
  }

  &__succeeded {
    color: var(--aix-colorSuccess);
  }

  &__failed {
    color: var(--aix-colorError);
  }
}
</style>
