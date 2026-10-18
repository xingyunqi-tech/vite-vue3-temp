<template>
  <section class="material-children">
    <div class="material-children__header">
      <h3 class="material-children__title">小题（{{ children.length }}）</h3>
      <el-button type="primary" :disabled="!canAdd" @click="openEditor(null)">新增小题</el-button>
    </div>
    <p v-if="!canAdd" class="material-children__hint">只有草稿材料可以新增小题；小题状态跟随材料整体流转</p>
    <el-table :data="children" row-key="id" class="data-table">
      <el-table-column type="index" label="序号" width="70" />
      <el-table-column label="题干" min-width="280">
        <template #default="{ row }">{{ markdownSummary(row.stem) }}</template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
      </el-table-column>
      <el-table-column label="版本" width="70">
        <template #default="{ row }">{{ row.currentVersion ? `v${row.currentVersion}` : '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="!editable" @click="openEditor(row as AdminQuestionDto)">
            编辑
          </el-button>
          <el-button
            v-if="row.currentVersion > 0"
            link
            type="primary"
            @click="emit('versions', row as AdminQuestionDto)"
          >
            版本
          </el-button>
          <el-button
            v-if="canStartErrata(row as AdminQuestionDto)"
            link
            type="warning"
            @click="emit('errata', row as AdminQuestionDto)"
          >
            勘误
          </el-button>
          <el-button
            v-if="row.currentVersion === 0"
            link
            type="danger"
            :disabled="!editable"
            @click="emit('remove', row as AdminQuestionDto)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <SubQuestionDialog
      v-model="editorVisible"
      :material-id="materialId"
      :subject-id="subjectId"
      :child="editing"
      :file-urls="fileUrls"
      @uploaded="emit('uploaded', $event)"
      @saved="emit('changed')"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { QUESTION_TYPE_LABEL } from '../../shared/constants';
import { canStartErrata } from '../../shared/errata';
import SubQuestionDialog from './SubQuestionDialog.vue';
import type { AdminQuestionDto, FileType, QuestionType } from '@/api';
import { markdownSummary } from '@/utils/markdown';

interface Props {
  materialId: string;
  subjectId: string;
  children: AdminQuestionDto[];
  canAdd: boolean;
  editable: boolean;
  fileUrls?: Record<string, string>;
}

defineProps<Props>();

const emit = defineEmits<{
  uploaded: [file: FileType];
  changed: [];
  remove: [child: AdminQuestionDto];
  versions: [child: AdminQuestionDto];
  errata: [child: AdminQuestionDto];
}>();

const editorVisible = ref(false);
const editing = ref<AdminQuestionDto | null>(null);

const openEditor = (child: AdminQuestionDto | null) => {
  editing.value = child;
  editorVisible.value = true;
};
</script>

<style scoped lang="scss">
.material-children {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__title {
    margin: 0;
    color: var(--aix-colorTextHeading);
    font-size: 16px;
    font-weight: 600;
  }

  &__hint {
    margin: 0 0 8px;
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
