<template>
  <el-form label-width="88px" class="question-fields" :disabled="disabled">
    <el-form-item label="题型" required>
      <el-select
        v-model="form.type"
        :disabled="answerLocked || typeOptions.length <= 1"
        class="question-fields__select"
      >
        <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </el-form-item>

    <template v-if="isMaterial">
      <el-form-item label="材料题干" required>
        <MarkdownEditor
          v-model="form.stem"
          :file-urls="fileUrls"
          :rows="2"
          :maxlength="CONTENT_LIMITS.stem"
          @uploaded="emit('uploaded', $event)"
        />
      </el-form-item>
      <el-form-item label="材料">
        <MarkdownEditor
          v-model="form.material"
          :file-urls="fileUrls"
          :rows="8"
          :maxlength="CONTENT_LIMITS.material"
          placeholder="材料内容，与音频至少填写一项"
          @uploaded="emit('uploaded', $event)"
        />
      </el-form-item>
      <el-form-item label="听力音频">
        <AudioUploader v-model="form.audioFileId" :audio-urls="fileUrls ?? {}" @uploaded="emit('uploaded', $event)" />
      </el-form-item>
    </template>

    <template v-else>
      <el-form-item label="题干" required>
        <MarkdownEditor
          v-model="form.stem"
          :file-urls="fileUrls"
          :rows="4"
          :maxlength="CONTENT_LIMITS.stem"
          @uploaded="emit('uploaded', $event)"
        />
      </el-form-item>
      <el-form-item v-if="isChoiceType(form.type)" label="选项" required>
        <OptionsEditor
          v-model:form="form"
          :file-urls="fileUrls"
          :keys-locked="answerLocked"
          @uploaded="emit('uploaded', $event)"
        />
      </el-form-item>
      <el-form-item label="答案" :required="form.type !== 'ESSAY'">
        <AnswerEditor v-model:form="form" :locked="answerLocked" />
      </el-form-item>
      <el-form-item label="知识点">
        <KnowledgePointSelect
          v-model="knowledgeModel"
          :subject-id="subjectId"
          multiple
          leaf-only
          placeholder="只能选择叶子知识点"
          @loaded="emit('knowledgeLoaded', $event)"
        />
      </el-form-item>
      <el-form-item label="难度">
        <el-rate v-model="form.difficulty" :max="5" />
      </el-form-item>
    </template>

    <el-form-item label="解析">
      <MarkdownEditor
        v-model="form.analysis"
        :file-urls="fileUrls"
        :rows="4"
        :maxlength="CONTENT_LIMITS.analysis"
        @uploaded="emit('uploaded', $event)"
      />
    </el-form-item>

    <template v-if="!isSubQuestion">
      <el-form-item label="来源">
        <el-select v-model="form.source" class="question-fields__select">
          <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input
          v-model="form.sourceNote"
          :maxlength="CONTENT_LIMITS.sourceNote"
          placeholder="来源说明，如 2025 年模拟卷"
          class="question-fields__note"
        />
      </el-form-item>
      <el-form-item label="免费">
        <el-switch v-model="form.isFree" />
        <span class="question-fields__hint">关闭后仅会员可做，材料小题跟随材料</span>
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import KnowledgePointSelect from '../../shared/components/KnowledgePointSelect.vue';
import MarkdownEditor from '../../shared/components/MarkdownEditor.vue';
import { QUESTION_SOURCE_LABEL, QUESTION_TYPE_LABEL, toOptions } from '../../shared/constants';
import type { KnowledgeNode } from '../../shared/knowledge-tree';
import { CONTENT_LIMITS, isChoiceType, selectableQuestionTypes, type QuestionForm } from '../../shared/question-form';
import AnswerEditor from './AnswerEditor.vue';
import AudioUploader from './AudioUploader.vue';
import OptionsEditor from './OptionsEditor.vue';
import type { FileType, QuestionType } from '@/api';

interface Props {
  subjectId: string;
  fileUrls?: Record<string, string>;
  answerLocked?: boolean;
  editingType?: QuestionType | null;
  isSubQuestion?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  answerLocked: false,
  editingType: null,
  isSubQuestion: false,
  disabled: false,
});

const form = defineModel<QuestionForm>('form', { required: true });

const emit = defineEmits<{
  uploaded: [file: FileType];
  knowledgeLoaded: [tree: KnowledgeNode[]];
}>();

const typeOptions = computed(() =>
  selectableQuestionTypes({ isSubQuestion: props.isSubQuestion, editingType: props.editingType }).map(value => ({
    value,
    label: QUESTION_TYPE_LABEL[value],
  })),
);
const sourceOptions = toOptions(QUESTION_SOURCE_LABEL);
const isMaterial = computed(() => form.value.type === 'MATERIAL');

const knowledgeModel = computed({
  get: () => form.value.knowledgePointIds,
  set: (value: string | string[]) => {
    form.value.knowledgePointIds = Array.isArray(value) ? value : value ? [value] : [];
  },
});
</script>

<style scoped lang="scss">
.question-fields {
  &__select {
    width: 180px;
  }

  &__note {
    width: 280px;
    margin-left: 8px;
  }

  &__hint {
    margin-left: 8px;
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
