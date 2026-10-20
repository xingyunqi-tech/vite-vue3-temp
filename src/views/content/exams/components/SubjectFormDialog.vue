<template>
  <el-dialog
    :model-value="modelValue"
    :title="subject ? '编辑科目' : '新建科目'"
    width="480px"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="如：行测" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="MAX_SORT" controls-position="right" />
      </el-form-item>
      <el-form-item label="含主观题" prop="hasSubjective">
        <el-switch v-model="form.hasSubjective" />
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
import { MAX_SORT } from '../../shared/constants';
import type { Subject, UpdateSubjectDto } from '@/api';

interface Props {
  modelValue: boolean;
  subject: Subject | null;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [dto: Required<UpdateSubjectDto>];
}>();

const formRef = ref<FormInstance>();
const form = reactive({ name: '', sort: 0, hasSubjective: false });

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: '请输入名称', trigger: 'blur' }],
};

const reset = () => {
  Object.assign(form, {
    name: props.subject?.name ?? '',
    sort: props.subject?.sort ?? 0,
    hasSubjective: props.subject?.hasSubjective ?? false,
  });
  formRef.value?.clearValidate();
};

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', { name: form.name.trim(), sort: form.sort, hasSubjective: form.hasSubjective });
};
</script>
