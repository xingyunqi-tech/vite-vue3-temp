<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="440px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="reset"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="64px" @submit.prevent="submit">
      <el-form-item v-if="parentName" label="上级">
        <span>{{ parentName }}</span>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="50" show-word-limit />
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
import type { KnowledgePointDraft } from '../useKnowledgeTree';

interface Props {
  modelValue: boolean;
  title: string;
  initial: KnowledgePointDraft | null;
  parentName?: string;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { parentName: '', saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [draft: KnowledgePointDraft];
}>();

const formRef = ref<FormInstance>();
const form = reactive<KnowledgePointDraft>({ name: '', sort: 0 });

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: '请输入名称', trigger: 'blur' }],
};

const reset = () => {
  Object.assign(form, { name: props.initial?.name ?? '', sort: props.initial?.sort ?? 0 });
  formRef.value?.clearValidate();
};

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', { name: form.name.trim(), sort: form.sort });
};
</script>
