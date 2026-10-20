<template>
  <div v-loading="loading" class="page errata-create">
    <div class="page__header">
      <div class="page__actions">
        <el-button @click="router.back()">返回</el-button>
        <h2 class="page__title">题目勘误</h2>
        <span v-if="question" class="page__muted">基于当前版本 v{{ question.currentVersion }}</span>
      </div>
      <div class="page__actions">
        <el-button type="primary" :loading="submitting" :disabled="!allowed" @click="handleSubmit">提交勘误</el-button>
      </div>
    </div>

    <el-alert v-if="!questionId" type="error" :closable="false" show-icon title="缺少题目 ID" />
    <el-alert v-else-if="loadError" type="error" :closable="false" show-icon :title="loadError">
      <el-button link type="primary" @click="reload">重新加载</el-button>
    </el-alert>
    <template v-else-if="question && draft">
      <el-alert
        v-if="question.type === 'MATERIAL'"
        type="error"
        :closable="false"
        show-icon
        title="材料不能勘误，请对小题勘误"
        class="errata-create__notice"
      />
      <el-alert
        v-else-if="!allowed"
        type="error"
        :closable="false"
        show-icon
        title="题目未发布过，请直接编辑"
        class="errata-create__notice"
      />
      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        title="勘误只修改答案与解析，题型、选项与填空空数不可修改；提交后生成新版本，并按新答案重判历史作答、修正统计与错题本"
        class="errata-create__notice"
      />

      <div class="errata-create__body">
        <div class="errata-create__form">
          <section class="page__card errata-create__section">
            <h3 class="page__subtitle">当前版本</h3>
            <QuestionPreview :question="question" />
          </section>

          <el-form v-if="allowed" label-width="88px" class="page__card errata-create__section">
            <el-form-item label="新答案" required>
              <AnswerEditor v-model:form="draft.form" fixed-blanks />
            </el-form-item>
            <el-form-item label="新解析">
              <MarkdownEditor
                v-model="draft.form.analysis"
                :file-urls="fileUrls"
                :rows="6"
                :maxlength="CONTENT_LIMITS.analysis"
                placeholder="解析，支持 Markdown 与公式"
              />
            </el-form-item>
            <el-form-item label="关联纠错单">
              <el-select
                v-model="draft.reportIds"
                multiple
                clearable
                placeholder="可选，勘误完成后置为已解决并回复"
                no-data-text="该题暂无可关联的纠错单"
                class="errata-create__reports"
              >
                <el-option v-for="item in reportOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <span class="errata-create__hint">仅显示该题最近 {{ LINKABLE_LIST_LIMIT }} 条待处理或处理中的纠错单</span>
            </el-form-item>
            <el-form-item label="回复">
              <el-input
                v-model="draft.reply"
                type="textarea"
                :rows="3"
                :maxlength="REPORT_REPLY_MAX"
                show-word-limit
                placeholder="可选，勘误完成后写入关联纠错单；留空使用默认回复"
              />
            </el-form-item>
            <el-form-item>
              <span class="page__muted">{{ changeSummary }}</span>
            </el-form-item>
          </el-form>

          <el-alert v-if="errors.length" type="error" :closable="false" class="errata-create__notice">
            <div v-for="error in errors" :key="error">{{ error }}</div>
          </el-alert>
          <el-alert v-if="submitError" type="error" :closable="false" class="errata-create__notice">
            <span>{{ submitError.message }}</span>
            <el-button
              v-if="submitError.inProgress"
              link
              type="primary"
              class="errata-create__link"
              @click="router.push({ path: '/feedback/errata', query: { questionId: question.id } })"
            >
              查看该题勘误任务
            </el-button>
          </el-alert>
        </div>

        <aside v-if="allowed" class="page__card errata-create__preview">
          <h3 class="page__subtitle">勘误后预览</h3>
          <QuestionPreview :question="previewQuestion" :file-urls="fileUrls" />
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AnswerEditor from '../shared/components/AnswerEditor.vue';
import MarkdownEditor from '../shared/components/MarkdownEditor.vue';
import QuestionPreview, { type PreviewQuestion } from '../shared/components/QuestionPreview.vue';
import { parseReportIds } from '../shared/errata';
import {
  LINKABLE_LIST_LIMIT,
  REPORT_REASON_LABEL,
  REPORT_REPLY_MAX,
  REPORT_STATUS_META,
} from '../shared/feedback-constants';
import { CONTENT_LIMITS, toAnswer } from '../shared/question-form';
import { queryString } from '../shared/utils';
import { useErrataForm } from './useErrataForm';
import type { AdminQuestionReportDto } from '@/api';

const route = useRoute();
const router = useRouter();

const {
  question,
  draft,
  reports,
  loading,
  submitting,
  errors,
  submitError,
  loadError,
  allowed,
  fileUrls,
  changes,
  load,
  submit,
} = useErrataForm();

const questionId = computed(() => queryString(route.query.questionId));

const previewQuestion = computed<PreviewQuestion>(() => ({
  ...question.value!,
  answer: draft.value ? toAnswer(draft.value.form) : null,
  analysis: draft.value?.form.analysis ?? '',
}));

const changeSummary = computed(() => {
  if (changes.value.answer && changes.value.analysis) return '将修改答案与解析';
  if (changes.value.answer) return '将修改答案';
  if (changes.value.analysis) return '将只修改解析，不重判历史作答';
  return '尚未修改答案或解析';
});

const reportLabel = (report: AdminQuestionReportDto) => {
  const reason = report.reason ? REPORT_REASON_LABEL[report.reason] : '纠错';
  const status = REPORT_STATUS_META[report.status]?.label ?? report.status;
  const content = report.content ? ` · ${report.content.slice(0, 30)}` : '';
  return `#${report.id} ${reason}（${status}）${content}`;
};

const reportOptions = computed(() => {
  const listed = reports.value.map(report => ({ value: report.id, label: reportLabel(report) }));
  const listedIds = new Set(listed.map(option => option.value));
  const missing = (draft.value?.reportIds ?? [])
    .filter(id => !listedIds.has(id))
    .map(id => ({ value: id, label: `纠错单 #${id}` }));
  return [...listed, ...missing];
});

const reload = () => {
  if (questionId.value) load(questionId.value, parseReportIds(route.query.reportIds)).catch(() => undefined);
};

watch(() => [route.query.questionId, route.query.reportIds], reload, { immediate: true });

const handleSubmit = async () => {
  const errata = await submit();
  if (!errata) return;
  ElMessage.success('已提交勘误');
  await router.replace(`/feedback/errata/${errata.id}`);
};
</script>

<style scoped lang="scss">
@use '@/styles/page';

.errata-create {
  &__notice {
    margin-bottom: 16px;
  }

  &__body {
    display: flex;
    align-items: flex-start;
    gap: 24px;
  }

  &__form {
    flex: 1;
    min-width: 0;
  }

  &__section {
    margin-bottom: 16px;
  }

  &__reports {
    width: 100%;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }

  &__link {
    margin-left: 8px;
  }

  &__preview {
    position: sticky;
    top: 20px;
    flex: none;
    width: 420px;
    max-height: calc(100vh - 160px);
    overflow: auto;
  }
}
</style>
