<template>
  <el-dialog
    :model-value="modelValue"
    :title="exam ? '编辑考试' : '新建考试'"
    width="520px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="如：国考" />
      </el-form-item>
      <el-form-item label="类别" prop="category">
        <el-select v-model="form.category" placeholder="请选择">
          <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="图标" prop="icon">
        <el-input v-model="form.icon" maxlength="255" placeholder="图标 URL 或 file:{fileId}，可留空" />
      </el-form-item>
      <el-form-item label="简介" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="100000" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { EXAM_CATEGORY_LABEL, toOptions } from '../../shared/constants';
import type { CreateExamDto, Exam, ExamCategory } from '@/api';

interface Props {
  modelValue: boolean;
  exam: Exam | null;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [dto: CreateExamDto];
}>();

const categoryOptions = toOptions(EXAM_CATEGORY_LABEL);

const formRef = ref<FormInstance>();
const form = reactive({
  name: '',
  category: 'CIVIL_SERVICE' as ExamCategory,
  icon: '',
  description: '',
  sort: 0,
});

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: '请输入名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
};

const reset = () => {
  const exam = props.exam;
  Object.assign(form, {
    name: exam?.name ?? '',
    category: exam?.category ?? 'CIVIL_SERVICE',
    icon: exam?.icon ?? '',
    description: exam?.description ?? '',
    sort: exam?.sort ?? 0,
  });
  formRef.value?.clearValidate();
};

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    name: form.name.trim(),
    category: form.category,
    icon: form.icon.trim() || null,
    description: form.description.trim() || null,
    sort: form.sort,
  });
};
</script>
