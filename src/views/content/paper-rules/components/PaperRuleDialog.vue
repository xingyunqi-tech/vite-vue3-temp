<template>
  <el-dialog
    :model-value="modelValue"
    :title="rule ? '编辑组卷规则' : '新建组卷规则'"
    width="980px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-form :model="form" label-width="96px">
      <el-form-item label="科目" required>
        <SubjectCascader v-model="form.subjectId" :options="subjectOptions" :disabled="!!rule" :clearable="false" />
      </el-form-item>
      <el-form-item label="名称" required>
        <el-input v-model="form.name" :maxlength="RULE_LIMITS.nameLength" show-word-limit />
      </el-form-item>
      <el-form-item label="时长（分钟）" required>
        <el-input-number
          v-model="form.durationMin"
          :min="1"
          :max="RULE_LIMITS.maxDurationMin"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="多选判分">
        <el-radio-group v-model="form.multiScoringRule">
          <el-radio v-for="(label, value) in MULTI_SCORING_RULE_LABEL" :key="value" :value="value">
            {{ label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div class="rule-dialog__items-header">
      <span>抽题项（同名分区的题型须一致；材料按整组抽取，题数按小题计）</span>
      <el-button :disabled="form.items.length >= RULE_LIMITS.items" @click="form.items.push(createRuleItem())">
        添加抽题项
      </el-button>
    </div>
    <el-table :data="form.items" class="data-table">
      <el-table-column label="分区标题" min-width="140">
        <template #default="{ row }">
          <el-input v-model="row.sectionTitle" :maxlength="RULE_LIMITS.sectionTitleLength" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="题型" width="120">
        <template #default="{ row }">
          <el-select v-model="row.questionType" size="small">
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="知识点（含下级）" min-width="200">
        <template #default="{ row }">
          <KnowledgePointSelect
            :model-value="row.knowledgePointIds"
            :subject-id="form.subjectId"
            multiple
            placeholder="不限"
            @update:model-value="row.knowledgePointIds = Array.isArray($event) ? $event : []"
          />
        </template>
      </el-table-column>
      <el-table-column label="难度" width="190">
        <template #default="{ row }">
          <el-checkbox v-model="row.limitDifficulty" size="small">限定</el-checkbox>
          <template v-if="row.limitDifficulty">
            <el-input-number
              v-model="row.difficultyRange[0]"
              :min="DIFFICULTY_MIN"
              :max="DIFFICULTY_MAX"
              size="small"
              controls-position="right"
              class="rule-dialog__difficulty"
            />
            -
            <el-input-number
              v-model="row.difficultyRange[1]"
              :min="DIFFICULTY_MIN"
              :max="DIFFICULTY_MAX"
              size="small"
              controls-position="right"
              class="rule-dialog__difficulty"
            />
          </template>
        </template>
      </el-table-column>
      <el-table-column label="题数" width="110">
        <template #default="{ row }">
          <el-input-number
            v-model="row.count"
            :min="1"
            :max="RULE_LIMITS.countPerItem"
            size="small"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column label="每题分值" width="120">
        <template #default="{ row }">
          <el-input-number
            v-model="row.scorePerQuestion"
            :min="RULE_LIMITS.minScore"
            :max="RULE_LIMITS.maxScore"
            :precision="2"
            :step="0.5"
            size="small"
            controls-position="right"
          />
        </template>
      </el-table-column>
      <el-table-column width="64">
        <template #default="{ $index }">
          <el-button link type="danger" :disabled="form.items.length <= 1" @click="form.items.splice($index, 1)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <p class="rule-dialog__summary">预计总分 {{ estimateRuleScore(form.items) }}</p>
    <el-alert v-if="errors.length" type="error" :closable="false">
      <div v-for="error in errors" :key="error">{{ error }}</div>
    </el-alert>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import KnowledgePointSelect from '../../shared/components/KnowledgePointSelect.vue';
import SubjectCascader from '../../shared/components/SubjectCascader.vue';
import { DIFFICULTY_MAX, DIFFICULTY_MIN, MULTI_SCORING_RULE_LABEL, QUESTION_TYPE_LABEL } from '../../shared/constants';
import type { SubjectOption } from '../../shared/useSubjectOptions';
import {
  createPaperRuleForm,
  createRuleItem,
  estimateRuleScore,
  RULE_LIMITS,
  toPaperRuleForm,
  validatePaperRuleForm,
  type PaperRuleForm,
} from '../paper-rule-form';
import type { PaperRule } from '@/api';
import { toOptions } from '@/constants';

interface Props {
  modelValue: boolean;
  rule: PaperRule | null;
  subjectOptions: SubjectOption[];
  defaultSubjectId?: string;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { defaultSubjectId: '', saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [form: PaperRuleForm];
}>();

const typeOptions = toOptions(QUESTION_TYPE_LABEL);
const form = ref<PaperRuleForm>(createPaperRuleForm());
const errors = ref<string[]>([]);

const reset = () => {
  form.value = props.rule ? toPaperRuleForm(props.rule) : createPaperRuleForm(props.defaultSubjectId);
  errors.value = [];
};

watch(
  () => form.value.subjectId,
  () => {
    if (props.rule) return;
    form.value.items.forEach(item => {
      item.knowledgePointIds = [];
    });
  },
);

const submit = () => {
  errors.value = validatePaperRuleForm(form.value);
  if (errors.value.length === 0) emit('submit', form.value);
};
</script>

<style scoped lang="scss">
.rule-dialog {
  &__items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8px 0;
    color: var(--aix-colorTextSecondary);
  }

  &__difficulty {
    width: 64px;
  }

  &__summary {
    margin: 8px 0;
    color: var(--aix-colorTextSecondary);
  }
}
</style>
