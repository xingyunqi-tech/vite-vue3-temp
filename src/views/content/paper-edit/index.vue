<template>
  <div v-loading="loading" class="page paper-edit">
    <div class="page__header">
      <div class="page__actions">
        <el-button @click="router.push('/content/papers')">返回</el-button>
        <h2 class="page__title">{{ paper?.title || '试卷' }}</h2>
        <StatusTag v-if="paper" :status="paper.status" :meta-map="CONTENT_STATUS_META" />
      </div>
      <div v-if="paper" class="page__actions">
        <el-button type="primary" :loading="saving && !acting" :disabled="!dirty || busy" @click="handleSave">
          保存
        </el-button>
        <el-button
          v-if="paper.status !== 'PUBLISHED'"
          type="success"
          :loading="acting === 'publish'"
          :disabled="busy && acting !== 'publish'"
          @click="handlePublish"
        >
          发布
        </el-button>
        <el-button
          v-else
          type="warning"
          :loading="acting === 'offline'"
          :disabled="busy && acting !== 'offline'"
          @click="handleOffline"
        >
          下架
        </el-button>
        <el-button
          v-if="paper.type !== 'GENERATED'"
          :loading="acting === 'copy'"
          :disabled="busy && acting !== 'copy'"
          @click="handleCopy"
        >
          复制为新试卷
        </el-button>
        <el-button
          v-if="paper.status === 'DRAFT'"
          type="danger"
          plain
          :loading="acting === 'remove'"
          :disabled="busy && acting !== 'remove'"
          @click="handleRemove"
        >
          删除
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="paper && frozen"
      type="info"
      :closable="false"
      show-icon
      title="试卷已发布过，题目、顺序与分值已冻结，只能修改基本信息；如需调整题目请复制为新试卷"
      class="paper-edit__block"
    />

    <template v-if="paper">
      <section class="page__card paper-edit__block">
        <h3 class="page__subtitle">基本信息</h3>
        <el-form
          ref="basicFormRef"
          :model="basic"
          :rules="paperBasicRules"
          label-width="104px"
          class="paper-edit__basic"
        >
          <el-form-item label="科目">{{ subjectLabel(paper.subjectId) || paper.subjectId }}</el-form-item>
          <PaperBasicFields v-model="basic" :lock-draft-only="frozen" />
        </el-form>
      </section>

      <section class="paper-edit__block">
        <div class="page__header">
          <h3 class="page__subtitle">
            题目
            <span class="page__muted">
              共 {{ summary.questionCount }} 题 · 总分 {{ summary.totalScore }} · 客观题 {{ summary.objectiveScore }}
            </span>
          </h3>
          <el-button v-if="!frozen" type="primary" plain @click="addSection()">添加分区</el-button>
        </div>
        <el-empty v-if="sections.length === 0" description="先添加分区，再向分区中添加题目" :image-size="80" />
        <PaperSectionCard
          v-for="(section, index) in sections"
          :key="index"
          v-model:section="sections[index]"
          :index="index"
          :items="items.filter(item => item.sectionIndex === index)"
          :frozen="frozen"
          @changed="markDirty"
          @add="openPicker(index)"
          @remove-section="handleRemoveSection(index)"
          @remove-item="removeItem"
          @move="move"
          @score="handleScore"
          @child-score="handleChildScore"
        />
        <el-alert v-if="errors.length" type="error" :closable="false" class="paper-edit__errors">
          <div v-for="error in errors" :key="error">{{ error }}</div>
        </el-alert>
      </section>

      <QuestionPickerDialog
        v-model="pickerVisible"
        :subject-id="paper.subjectId"
        :default-type="pickerType"
        :exclude-ids="items.map(item => item.questionId)"
        @confirm="handlePicked"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CONTENT_STATUS_META } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import PaperBasicFields from './components/PaperBasicFields.vue';
import PaperSectionCard from './components/PaperSectionCard.vue';
import QuestionPickerDialog from './components/QuestionPickerDialog.vue';
import { paperBasicRules } from './paper-basic';
import { setMaterialScore, type PaperItem, type PaperItemChild } from './paper-items';
import { PaperValidationError, usePaperEditor } from './usePaperEditor';
import type { AdminQuestionDto, QuestionType } from '@/api';
import StatusTag from '@/components/StatusTag/index.vue';
import { useLeaveGuard } from '@/composables/useLeaveGuard';
import { confirmAction, runAction } from '@/utils/actions';

const route = useRoute();
const router = useRouter();

const { load: loadSubjects, subjectLabel } = useSubjectOptions();
const {
  paper,
  basic,
  sections,
  items,
  loading,
  saving,
  frozen,
  summary,
  dirty,
  load,
  markDirty,
  addSection,
  deleteSection,
  addQuestions,
  removeItem,
  move,
  save,
  publish,
  offline,
  copy,
  remove,
} = usePaperEditor();

const basicFormRef = ref<FormInstance>();
const errors = ref<string[]>([]);
const pickerVisible = ref(false);
const pickerSection = ref(0);
const pickerType = ref<QuestionType | ''>('');
let leaveConfirmed = false;

watch(
  () => route.params.id,
  id => {
    errors.value = [];
    leaveConfirmed = false;
    if (typeof id === 'string' && id) load(id).catch(() => undefined);
  },
  { immediate: true },
);
loadSubjects().catch(() => undefined);

useLeaveGuard(() => !leaveConfirmed && dirty.value, { guardParamsChange: true });

const openPicker = (sectionIndex: number) => {
  pickerSection.value = sectionIndex;
  pickerType.value = sections.value[sectionIndex]?.questionType ?? '';
  pickerVisible.value = true;
};

const handlePicked = (questions: AdminQuestionDto[], score: number) => {
  const added = addQuestions(pickerSection.value, questions, score);
  ElMessage.success(`已加入 ${added} 道题目，保存后生效`);
};

const handleScore = (item: PaperItem, score: number) => {
  if (item.type === 'MATERIAL') setMaterialScore(item, score);
  else item.score = score;
  markDirty();
};

const handleChildScore = (child: PaperItemChild, score: number) => {
  child.score = score;
  markDirty();
};

const handleRemoveSection = async (index: number) => {
  if (!(await confirmAction('删除该分区及其中的全部题目？', '删除分区'))) return;
  deleteSection(index);
};

const runWithErrors = async (task: () => Promise<unknown>, message: string) => {
  errors.value = [];
  const valid = await basicFormRef.value?.validate().catch(() => false);
  if (valid === false) return false;
  try {
    await task();
    ElMessage.success(message);
    return true;
  } catch (error) {
    if (error instanceof PaperValidationError) errors.value = error.errors;
    return false;
  }
};

type PaperAction = 'publish' | 'offline' | 'copy' | 'remove';
const acting = ref<PaperAction | null>(null);
const busy = computed(() => saving.value || acting.value !== null);

const withActing = async <T,>(action: PaperAction, task: () => Promise<T>): Promise<T> => {
  acting.value = action;
  try {
    return await task();
  } finally {
    acting.value = null;
  }
};

const handleSave = () => {
  if (busy.value) return;
  return runWithErrors(save, '已保存');
};

const handlePublish = async () => {
  if (busy.value || !(await confirmAction('发布后题目、顺序与分值冻结，确认发布？', '发布试卷'))) return;
  await withActing('publish', () => runWithErrors(publish, '已发布'));
};

const handleOffline = async () => {
  if (busy.value || !(await confirmAction('下架后用户将看不到该试卷，确认下架？', '下架试卷'))) return;
  await withActing('offline', () => runAction(offline, '已下架'));
};

const handleCopy = async () => {
  if (busy.value || !(await confirmAction('复制为新的草稿试卷？未保存的修改不会被复制', '复制试卷'))) return;
  await withActing('copy', () =>
    runAction(async () => {
      const copied = await copy();
      if (!copied) return;
      leaveConfirmed = true;
      await router.push(`/content/papers/${copied.id}`);
    }),
  );
};

const handleRemove = async () => {
  if (busy.value || !(await confirmAction('删除该草稿试卷？', '删除试卷'))) return;
  if (!(await withActing('remove', () => runAction(remove, '已删除')))) return;
  leaveConfirmed = true;
  await router.push('/content/papers');
};
</script>

<style scoped lang="scss">
@use '@/styles/page';

.paper-edit {
  &__block {
    margin-bottom: 20px;
  }

  &__basic {
    max-width: 640px;
  }

  &__errors {
    margin-top: 16px;
  }
}
</style>
