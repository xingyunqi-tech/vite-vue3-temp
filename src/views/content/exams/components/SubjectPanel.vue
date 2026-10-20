<template>
  <section class="subject-panel">
    <div class="subject-panel__header">
      <h3 class="subject-panel__title">{{ exam ? `「${exam.name}」的科目` : '科目' }}</h3>
      <div>
        <el-button :disabled="!exam" :loading="loading" @click="load()">刷新</el-button>
        <el-button type="primary" :disabled="!exam" @click="openEditor(null)">新建科目</el-button>
      </div>
    </div>
    <el-empty v-if="!exam" description="点击上方考试查看其科目" :image-size="80" />
    <el-table v-else v-loading="loading" :data="subjects" row-key="id" class="data-table">
      <el-table-column prop="name" label="科目" min-width="160" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="含主观题" width="100">
        <template #default="{ row }">{{ row.hasSubjective ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <StatusTag :status="row.status" :meta-map="CONTENT_STATUS_META" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openKnowledge(row as Subject)">知识点</el-button>
          <el-button link type="primary" @click="openEditor(row as Subject)">编辑</el-button>
          <el-button
            v-if="canPublish(row.status)"
            link
            type="success"
            :loading="isActing(row.id)"
            @click="handlePublish(row as Subject)"
          >
            上架
          </el-button>
          <el-button
            v-if="canOffline(row.status)"
            link
            type="warning"
            :disabled="isActing(row.id)"
            @click="handleOffline(row as Subject)"
          >
            下架
          </el-button>
          <el-button
            v-if="canDelete(row.status)"
            link
            type="danger"
            :disabled="isActing(row.id)"
            @click="handleRemove(row as Subject)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <SubjectFormDialog v-model="editorVisible" :subject="editing" :saving="saving" @submit="handleSubmit" />
    <KnowledgePointDrawer v-model="knowledgeVisible" :subject="knowledgeSubject" />
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { confirmAction, runAction, useRowAction } from '../../shared/actions';
import StatusTag from '../../shared/components/StatusTag.vue';
import { CONTENT_STATUS_META } from '../../shared/constants';
import { canDelete, canOffline, canPublish, useSubjectList } from '../useExamCatalog';
import KnowledgePointDrawer from './KnowledgePointDrawer.vue';
import SubjectFormDialog from './SubjectFormDialog.vue';
import type { Exam, Subject, UpdateSubjectDto } from '@/api';

interface Props {
  exam: Exam | null;
}

const props = defineProps<Props>();

const { subjects, loading, load, save, publish, offline, remove } = useSubjectList();

const editorVisible = ref(false);
const editing = ref<Subject | null>(null);
const saving = ref(false);
const knowledgeVisible = ref(false);
const knowledgeSubject = ref<Subject | null>(null);

watch(
  () => props.exam?.id ?? '',
  id => {
    load(id).catch(() => undefined);
  },
  { immediate: true },
);

const openEditor = (subject: Subject | null) => {
  editing.value = subject;
  editorVisible.value = true;
};

const openKnowledge = (subject: Subject) => {
  knowledgeSubject.value = subject;
  knowledgeVisible.value = true;
};

const handleSubmit = async (dto: Required<UpdateSubjectDto>) => {
  saving.value = true;
  try {
    if (await runAction(() => save(editing.value?.id ?? null, dto), '已保存')) editorVisible.value = false;
  } finally {
    saving.value = false;
  }
};

const { isActing, run: runRowAction } = useRowAction();

const handlePublish = (subject: Subject) => runRowAction(subject.id, () => publish(subject), '已上架');

const handleOffline = async (subject: Subject) => {
  if (!(await confirmAction(`下架科目「${subject.name}」？用户将看不到该科目，历史记录保留`, '下架科目'))) return;
  await runRowAction(subject.id, () => offline(subject), '已下架');
};

const handleRemove = async (subject: Subject) => {
  if (!(await confirmAction(`删除科目「${subject.name}」？仅可删除无知识点的草稿科目`, '删除科目'))) return;
  await runRowAction(subject.id, () => remove(subject), '已删除');
};
</script>

<style scoped lang="scss">
.subject-panel {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0;
    color: var(--aix-colorTextHeading);
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
