<template>
  <div v-loading="loading" class="page errata-detail">
    <div class="page__header">
      <div class="page__actions">
        <el-button @click="router.push('/feedback/errata')">返回</el-button>
        <h2 class="page__title">勘误进度</h2>
        <StatusTag v-if="errata" :status="errata.status" :meta-map="ERRATA_STATUS_META" />
      </div>
      <div v-if="!loadFailed" class="page__actions">
        <el-button @click="handleRefresh">刷新</el-button>
        <el-button v-if="retryable" type="warning" :loading="retrying" @click="handleRetry">重试</el-button>
      </div>
    </div>

    <el-result v-if="loadFailed" icon="error" title="勘误任务加载失败" sub-title="可能已被删除，或网络异常">
      <template #extra>
        <el-button type="primary" @click="reload">重新加载</el-button>
      </template>
    </el-result>
    <template v-else-if="errata">
      <el-alert
        v-if="errata.status === 'FAILED'"
        type="error"
        :closable="false"
        show-icon
        :title="`任务失败：${errata.failureReason || '未知原因'}，可点击「重试」从中断处继续`"
        class="errata-detail__notice"
      />
      <el-alert
        v-else-if="stale"
        type="warning"
        :closable="false"
        show-icon
        :title="`任务超过 ${ERRATA_STALE_MINUTES} 分钟未进展，可点击「重试」从中断处继续`"
        class="errata-detail__notice"
      />
      <el-alert
        v-else-if="active"
        type="info"
        :closable="false"
        show-icon
        title="正在按新答案重判受影响用户的历史作答，页面会自动刷新进度"
        class="errata-detail__notice"
      />

      <section class="page__card errata-detail__card">
        <div class="errata-detail__progress">
          <span class="errata-detail__label">受影响用户</span>
          <ErrataProgress :errata="errata" class="errata-detail__bar" />
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="题目">
            <el-button link type="primary" @click="openQuestion">{{ errata.questionId }}</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="版本">v{{ errata.fromVersion }} → v{{ errata.toVersion }}</el-descriptions-item>
          <el-descriptions-item label="修改内容">
            {{ errata.answerChanged ? '答案与解析' : '仅解析' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTimeFull(errata.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatDateTimeFull(errata.startedAt ?? undefined) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ formatDateTimeFull(errata.finishedAt ?? undefined) }}
          </el-descriptions-item>
          <el-descriptions-item label="纠错回复" :span="2">{{ errata.reply || '—' }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="page__card errata-detail__card">
        <h3 class="page__subtitle">关联纠错单（{{ reports.length }}）</h3>
        <el-table :data="reports" row-key="id" empty-text="未关联纠错单" class="data-table">
          <el-table-column label="编号" prop="id" width="80" />
          <el-table-column label="原因" width="110">
            <template #default="{ row }">
              {{ row.reason ? REPORT_REASON_LABEL[row.reason as QuestionReportReason] : '—' }}
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="200">
            <template #default="{ row }">
              <span class="page__stem">{{ row.content || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <StatusTag :status="row.status" :meta-map="REPORT_STATUS_META" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/feedback/reports/${row.id}`)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section v-if="question" class="page__card errata-detail__card">
        <h3 class="page__subtitle">题目当前版本 v{{ question.currentVersion }}</h3>
        <QuestionPreview :question="question" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrataProgress from '../shared/components/ErrataProgress.vue';
import QuestionPreview from '../shared/components/QuestionPreview.vue';
import { ERRATA_STALE_MINUTES } from '../shared/errata';
import { ERRATA_STATUS_META, REPORT_REASON_LABEL, REPORT_STATUS_META } from '../shared/feedback-constants';
import { useErrataProgress } from './useErrataProgress';
import type { QuestionReportReason } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';

const route = useRoute();
const router = useRouter();

const { errata, question, reports, loading, active, stale, retryable, load, refresh, retry } = useErrataProgress();

const retrying = ref(false);
const loadFailed = ref(false);

const loadById = (id: unknown) => {
  if (typeof id !== 'string' || !id) return;
  loadFailed.value = false;
  load(id).catch(() => {
    if (route.params.id === id) loadFailed.value = true;
  });
};

const reload = () => loadById(route.params.id);

watch(() => route.params.id, loadById, { immediate: true });

const openQuestion = () => {
  if (!errata.value) return;
  router.push(`/content/questions/${question.value?.parentId ?? errata.value.questionId}`);
};

const handleRefresh = () => refresh().catch(() => undefined);

const handleRetry = async () => {
  retrying.value = true;
  await runAction(retry, '已从中断处继续执行');
  retrying.value = false;
};
</script>

<style scoped lang="scss">
@use '@/styles/page';

.errata-detail {
  &__notice {
    margin-bottom: 16px;
  }

  &__card + &__card {
    margin-top: 16px;
  }

  &__progress {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__label {
    flex: none;
    color: var(--aix-colorTextSecondary);
  }

  &__bar {
    flex: 1;
  }
}
</style>
