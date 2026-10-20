<template>
  <div v-loading="loading" class="page report-detail">
    <div class="page__header">
      <div class="page__actions">
        <el-button @click="router.push('/feedback/reports')">返回</el-button>
        <h2 class="page__title">纠错单 #{{ reportId }}</h2>
        <StatusTag v-if="report" :status="report.status" :meta-map="REPORT_STATUS_META" />
      </div>
    </div>

    <el-result v-if="loadFailed" icon="error" title="纠错单加载失败" sub-title="可能已被删除，或网络异常">
      <template #extra>
        <el-button type="primary" @click="reload">重新加载</el-button>
      </template>
    </el-result>
    <div v-else-if="report" class="report-detail__body">
      <div class="report-detail__main">
        <section class="page__card">
          <h3 class="page__subtitle">用户反馈</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="类型">{{ reportTypeLabel(report.type) }}</el-descriptions-item>
            <el-descriptions-item label="原因">
              {{ report.reason ? REPORT_REASON_LABEL[report.reason] : '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="提交人">
              {{ report.userId === null ? '已注销用户' : `用户 ${report.userId}` }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatDateTimeFull(report.createdAt) }}</el-descriptions-item>
            <el-descriptions-item v-if="report.type === 'ai_content'" label="AI 消息 ID" :span="2">
              {{ report.messageId || '—' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="report.questionId" label="题目版本" :span="2">
              提交时 v{{ report.questionVersion ?? '—' }}
              <span v-if="question" class="page__muted">（当前 v{{ question.currentVersion }}）</span>
            </el-descriptions-item>
            <el-descriptions-item label="联系方式" :span="2">{{ report.contact || '—' }}</el-descriptions-item>
            <el-descriptions-item label="说明" :span="2">
              <span class="report-detail__content">{{ report.content || '—' }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="images.length" label="图片" :span="2">
              <div class="report-detail__images">
                <el-image
                  v-for="(image, index) in images"
                  :key="image"
                  :src="image"
                  :preview-src-list="images"
                  :initial-index="index"
                  fit="cover"
                  preview-teleported
                  class="report-detail__image"
                />
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </section>

        <section v-if="report.type === 'ai_content'" class="page__card">
          <div class="report-detail__card-header">
            <h3 class="page__subtitle">被举报的 AI 回答</h3>
            <div v-if="snapshot" class="page__actions">
              <StatusTag :status="snapshot.status" :meta-map="AI_MESSAGE_STATUS_META" />
              <span class="page__muted">生成于 {{ formatDateTimeFull(snapshot.createdAt) }}</span>
            </div>
          </div>
          <template v-if="snapshot">
            <el-collapse v-if="snapshot.reasoning" class="report-detail__reasoning">
              <el-collapse-item title="深度思考" name="reasoning">
                <MarkdownContent :content="snapshot.reasoning" images-as-links />
              </el-collapse-item>
            </el-collapse>
            <MarkdownContent
              :content="snapshot.content || '（无回答内容）'"
              images-as-links
              class="report-detail__answer"
            />
          </template>
          <p v-else class="page__muted">未保存消息内容</p>
        </section>

        <section v-if="report.questionId" class="page__card">
          <div class="report-detail__card-header">
            <h3 class="page__subtitle">题目</h3>
            <div v-if="question" class="page__actions">
              <StatusTag :status="question.status" :meta-map="QUESTION_STATUS_META" />
              <el-button
                link
                type="primary"
                @click="router.push(`/content/questions/${question.parentId ?? question.id}`)"
              >
                {{ question.parentId ? '查看材料' : '查看题目' }}
              </el-button>
              <el-button v-if="canErrata" type="primary" size="small" @click="startErrata">发起勘误</el-button>
            </div>
          </div>
          <QuestionPreview v-if="question" :question="question" />
          <p v-else-if="report.question" class="page__muted">{{ markdownSummary(report.question.stem) }}</p>
          <p v-else class="page__muted">题目不存在</p>
        </section>
      </div>

      <aside class="report-detail__side">
        <section class="page__card">
          <h3 class="page__subtitle">处理</h3>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="状态">
              <el-select v-model="form.status">
                <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="回复（用户在我的纠错中可见）">
              <el-input
                v-model="form.reply"
                type="textarea"
                :rows="5"
                :maxlength="REPORT_REPLY_MAX"
                show-word-limit
                placeholder="填写处理结果"
              />
            </el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          </el-form>
        </section>

        <section v-if="report.type === 'question_error'" class="page__card">
          <h3 class="page__subtitle">关联勘误</h3>
          <template v-if="report.errata">
            <div class="report-detail__errata">
              <div class="page__actions">
                <StatusTag :status="report.errata.status" :meta-map="ERRATA_STATUS_META" />
                <span>v{{ report.errata.fromVersion }} → v{{ report.errata.toVersion }}</span>
                <span class="page__muted">{{ report.errata.answerChanged ? '答案与解析' : '仅解析' }}</span>
              </div>
              <ErrataProgress :errata="report.errata" />
              <div class="page__actions">
                <el-button link type="primary" @click="router.push(`/feedback/errata/${report.errata.id}`)">
                  查看进度
                </el-button>
                <el-button link type="danger" :loading="linking" @click="handleUnlink">取消关联</el-button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="report-detail__link">
              <el-select
                v-model="linkTarget"
                placeholder="选择该题的勘误任务"
                clearable
                no-data-text="该题暂无勘误任务"
              >
                <el-option v-for="item in errataOptions" :key="item.id" :label="errataLabel(item)" :value="item.id" />
              </el-select>
              <el-button :disabled="!linkTarget" :loading="linking" @click="handleLink">关联</el-button>
            </div>
            <p class="report-detail__hint">关联已完成的勘误时，纠错单置为已解决并写入勘误回复</p>
          </template>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrataProgress from '../shared/components/ErrataProgress.vue';
import MarkdownContent from '../shared/components/MarkdownContent.vue';
import QuestionPreview from '../shared/components/QuestionPreview.vue';
import { QUESTION_STATUS_META } from '../shared/constants';
import { canStartErrata, errataCreateLocation } from '../shared/errata';
import {
  AI_MESSAGE_STATUS_META,
  ERRATA_STATUS_META,
  REPORT_REASON_LABEL,
  REPORT_REPLY_MAX,
  REPORT_STATUS_META,
  reportTypeLabel,
} from '../shared/feedback-constants';
import { isHttpUrl } from '../shared/utils';
import { ReportValidationError, useReportDetail } from './useReportDetail';
import type { Errata } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { statusMeta, toStatusOptions } from '@/constants';
import { confirmAction, runAction } from '@/utils/actions';
import { formatDateTimeFull } from '@/utils/datetime';
import { handleError } from '@/utils/error-handler';
import { markdownSummary } from '@/utils/markdown';

const route = useRoute();
const router = useRouter();
const statusOptions = toStatusOptions(REPORT_STATUS_META);

const { report, question, errataOptions, form, loading, load, save, linkErrata } = useReportDetail();

const saving = ref(false);
const linking = ref(false);
const linkTarget = ref('');

const reportId = computed(() => Number(route.params.id));
const snapshot = computed(() => report.value?.messageSnapshot ?? null);
const images = computed(() => (report.value?.images ?? []).filter(isHttpUrl));
const canErrata = computed(
  () => report.value?.type === 'question_error' && !!question.value && canStartErrata(question.value),
);

const errataLabel = (errata: Errata) =>
  `v${errata.fromVersion} → v${errata.toVersion} · ${statusMeta(ERRATA_STATUS_META, errata.status).label} · ${formatDateTimeFull(errata.createdAt)}`;

const loadFailed = ref(false);

const loadById = (id: number) => {
  if (!Number.isInteger(id) || id <= 0) return;
  loadFailed.value = false;
  load(id).catch(() => {
    if (reportId.value === id) loadFailed.value = true;
  });
};

const reload = () => loadById(reportId.value);

watch(
  reportId,
  id => {
    linkTarget.value = '';
    loadById(id);
  },
  { immediate: true },
);

const handleSave = async () => {
  saving.value = true;
  try {
    if (await save()) ElMessage.success('已保存');
    else ElMessage.info('没有修改');
  } catch (error) {
    if (error instanceof ReportValidationError) ElMessage.error(error.message);
    else if (!isAxiosError(error)) handleError(error);
  } finally {
    saving.value = false;
  }
};

const runUpdate = async (task: () => Promise<unknown>, successMessage: string) => {
  linking.value = true;
  await runAction(task, successMessage);
  linking.value = false;
};

const handleLink = () =>
  runUpdate(async () => {
    await linkErrata(linkTarget.value);
    linkTarget.value = '';
  }, '已关联勘误');

const handleUnlink = async () => {
  if (!(await confirmAction('取消该纠错单与勘误任务的关联？', '取消关联'))) return;
  await runUpdate(() => linkErrata(null), '已取消关联');
};

const startErrata = () => {
  if (!question.value || !report.value) return;
  router.push(errataCreateLocation(question.value.id, [report.value.id]));
};
</script>

<style scoped lang="scss">
@use '@/styles/page';

.report-detail {
  &__body {
    display: flex;
    align-items: flex-start;
    gap: 24px;
  }

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  &__side {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 16px;
    width: 380px;
  }

  &__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .page__subtitle {
      margin-bottom: 0;
    }
  }

  &__content {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  &__images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__image {
    width: 96px;
    height: 96px;
    border-radius: 6px;
  }

  &__reasoning {
    margin-bottom: 12px;
  }

  &__answer {
    padding: 12px 16px;
    border-radius: 6px;
    background: var(--aix-colorFillQuaternary);
  }

  &__errata {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__link {
    display: flex;
    gap: 8px;
  }

  &__hint {
    margin: 8px 0 0;
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
