<template>
  <div v-loading="loading" class="page question-edit">
    <div class="page__header">
      <div class="page__actions">
        <el-button @click="router.push('/content/questions')">返回</el-button>
        <h2 class="page__title">{{ question || loadFailed ? '编辑题目' : '新建题目' }}</h2>
        <StatusTag v-if="question" :status="question.status" :meta-map="QUESTION_STATUS_META" />
        <span v-if="question?.currentVersion" class="page__muted">当前版本 v{{ question.currentVersion }}</span>
      </div>
      <div v-if="!loadFailed" class="page__actions">
        <el-button v-if="question && question.currentVersion > 0" @click="versionsTarget = question.id">
          版本历史
        </el-button>
        <el-button
          v-if="question && userStore.canReview && canStartErrata(question)"
          @click="router.push(errataCreateLocation(question.id))"
        >
          勘误
        </el-button>
        <el-button type="primary" :loading="saving" :disabled="!editable" @click="handleSave">保存</el-button>
        <el-button v-if="question?.status === 'DRAFT'" type="success" :loading="submitting" @click="handleSubmitReview">
          提交审核
        </el-button>
      </div>
    </div>

    <el-result v-if="loadFailed" icon="error" title="题目加载失败" sub-title="题目可能已被删除，或网络异常">
      <template #extra>
        <el-button type="primary" @click="reload">重新加载</el-button>
      </template>
    </el-result>
    <template v-else>
      <QuestionAuditInfo v-if="question" :question="question" />
      <el-alert
        v-if="rejectReason"
        type="warning"
        :closable="false"
        show-icon
        :title="`已被驳回：${rejectReason}`"
        :description="`审核人：${question?.reviewer?.name ?? EMPTY_TEXT}`"
        class="question-edit__notice"
      />
      <el-alert
        v-if="!editable"
        type="warning"
        :closable="false"
        show-icon
        title="题目审核中，不能编辑；如需修改请先由审核人驳回"
        class="question-edit__notice"
      />
      <el-alert
        v-else-if="answerLocked"
        type="info"
        :closable="false"
        show-icon
        title="题目已发布过：保存将生成新版本，不能修改题型、答案、选项数量与填空空数"
        class="question-edit__notice"
      />

      <div class="question-edit__body">
        <div class="page__card question-edit__form">
          <el-form label-width="88px">
            <el-form-item label="科目" required>
              <SubjectCascader v-model="subjectId" :disabled="!!question" :clearable="false" />
            </el-form-item>
          </el-form>
          <QuestionFields
            v-model:form="form"
            :subject-id="subjectId"
            :file-urls="fileUrls"
            :answer-locked="answerLocked"
            :editing-type="question?.type ?? null"
            :disabled="!editable"
            @uploaded="register"
            @knowledge-loaded="setKnowledgeTree"
          />
          <el-alert v-if="errors.length" type="error" :closable="false" class="question-edit__notice">
            <div v-for="error in errors" :key="error">{{ error }}</div>
          </el-alert>

          <MaterialChildren
            v-if="question?.type === 'MATERIAL'"
            :material-id="question.id"
            :subject-id="subjectId"
            :children="children"
            :can-add="question.status === 'DRAFT'"
            :editable="editable"
            :file-urls="fileUrls"
            class="question-edit__children"
            @uploaded="register"
            @changed="reloadCurrent"
            @remove="handleRemoveChild"
            @versions="versionsTarget = $event.id"
            @errata="router.push(errataCreateLocation($event.id))"
          />
          <p v-else-if="form.type === 'MATERIAL'" class="page__muted">保存材料后可添加小题</p>
        </div>

        <aside class="page__card question-edit__preview">
          <h3 class="page__subtitle">预览</h3>
          <QuestionPreview :question="previewQuestion" :file-urls="fileUrls" />
        </aside>
      </div>
    </template>

    <QuestionVersionDrawer v-model="versionsVisible" :question-id="versionsTarget" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QuestionPreview, { type PreviewQuestion } from '../shared/components/QuestionPreview.vue';
import QuestionVersionDrawer from '../shared/components/QuestionVersionDrawer.vue';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { QUESTION_STATUS_META } from '../shared/constants';
import { canStartErrata, errataCreateLocation } from '../shared/errata';
import { isQuestionType, toAnswer } from '../shared/question-form';
import MaterialChildren from './components/MaterialChildren.vue';
import QuestionAuditInfo from './components/QuestionAuditInfo.vue';
import QuestionFields from './components/QuestionFields.vue';
import { QuestionValidationError, useQuestionEditor } from './useQuestionEditor';
import type { AdminQuestionDto } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { useLeaveGuard } from '@/composables/useLeaveGuard';
import { EMPTY_TEXT } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';
import { confirmAction, runAction } from '@/utils/actions';

const route = useRoute();
const router = useRouter();
const userStore = useUserInfoStore();

const {
  form,
  fileUrls,
  register,
  question,
  subjectId,
  loading,
  loadFailed,
  saving,
  editable,
  children,
  answerLocked,
  hasUnsavedChanges,
  load,
  startCreate,
  save,
  submitForReview,
  reloadCurrent,
  removeChild,
  setKnowledgeTree,
} = useQuestionEditor();

const errors = ref<string[]>([]);
const submitting = ref(false);
let leaveConfirmed = false;
const versionsTarget = ref('');
const versionsVisible = computed({
  get: () => !!versionsTarget.value,
  set: (visible: boolean) => {
    if (!visible) versionsTarget.value = '';
  },
});

const rejectReason = computed(() => (question.value?.status === 'DRAFT' ? question.value.rejectReason : null));

const previewQuestion = computed<PreviewQuestion>(() => ({
  type: form.value.type,
  stem: form.value.stem,
  options: ['SINGLE', 'MULTIPLE'].includes(form.value.type) ? form.value.options : null,
  answer: toAnswer(form.value),
  analysis: form.value.analysis,
  material: form.value.type === 'MATERIAL' ? form.value.material : null,
  audioFileId: form.value.type === 'MATERIAL' ? form.value.audioFileId : null,
  children: form.value.type === 'MATERIAL' ? children.value : undefined,
}));

const queryString = (value: unknown) => (typeof value === 'string' ? value : '');

const reload = () => {
  const id = route.params.id;
  if (typeof id === 'string' && id) load(id).catch(() => undefined);
};

watch(
  () => route.params.id,
  id => {
    errors.value = [];
    leaveConfirmed = false;
    if (typeof id === 'string' && id) {
      load(id).catch(() => undefined);
      return;
    }
    const type = queryString(route.query.type);
    startCreate(isQuestionType(type) ? type : 'SINGLE', queryString(route.query.subjectId));
  },
  { immediate: true },
);

useLeaveGuard(() => !leaveConfirmed && hasUnsavedChanges.value, { guardParamsChange: true });

const handleSave = async () => {
  errors.value = [];
  try {
    const result = await save();
    if (result.kind === 'unchanged') {
      ElMessage.info('没有修改');
      return;
    }
    ElMessage.success('已保存');
    if (result.kind === 'created' && result.question) {
      leaveConfirmed = true;
      await router.replace(`/content/questions/${result.question.id}`);
    }
  } catch (error) {
    if (error instanceof QuestionValidationError) errors.value = error.errors;
  }
};

const handleSubmitReview = async () => {
  errors.value = [];
  submitting.value = true;
  try {
    await submitForReview();
    ElMessage.success('已提交审核');
  } catch (error) {
    if (error instanceof QuestionValidationError) errors.value = error.errors;
  } finally {
    submitting.value = false;
  }
};

const handleRemoveChild = async (child: AdminQuestionDto) => {
  if (!(await confirmAction('删除该小题？', '删除小题'))) return;
  await runAction(() => removeChild(child), '已删除');
};
</script>

<style scoped lang="scss">
@use '@/styles/page';

.question-edit {
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

  &__children {
    margin-top: 24px;
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
