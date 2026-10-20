<template>
  <el-dialog
    :model-value="modelValue"
    title="新建试卷"
    width="560px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
      <el-form-item label="科目" prop="subjectId">
        <SubjectCascader v-model="form.subjectId" :options="subjectOptions" :clearable="false" />
      </el-form-item>
      <PaperBasicFields v-model="form" />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">创建并编辑题目</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import PaperBasicFields from '../../paper-edit/components/PaperBasicFields.vue';
import { createPaperBasicForm, paperBasicRules, type PaperBasicForm } from '../../paper-edit/paper-basic';
import SubjectCascader from '../../shared/components/SubjectCascader.vue';
import type { SubjectOption } from '../../shared/useSubjectOptions';
import type { CreatePaperDto } from '@/api';

interface Props {
  modelValue: boolean;
  subjectOptions: SubjectOption[];
  defaultSubjectId?: string;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { defaultSubjectId: '', saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [dto: CreatePaperDto];
}>();

const formRef = ref<FormInstance>();
const form = reactive<PaperBasicForm & { subjectId: string }>({ ...createPaperBasicForm(), subjectId: '' });

const rules: FormRules = {
  ...paperBasicRules,
  subjectId: [{ required: true, message: '请选择科目', trigger: 'change' }],
};

const reset = () => {
  Object.assign(form, createPaperBasicForm(), { subjectId: props.defaultSubjectId });
  formRef.value?.clearValidate();
};

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    subjectId: form.subjectId,
    title: form.title.trim(),
    type: form.type,
    year: form.year,
    durationMin: form.durationMin,
    multiScoringRule: form.multiScoringRule,
    isFree: form.isFree,
  });
};
</script>
