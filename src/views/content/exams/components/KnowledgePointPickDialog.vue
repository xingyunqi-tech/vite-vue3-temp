<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="480px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="selected = ''"
  >
    <p v-if="description" class="pick-dialog__desc">{{ description }}</p>
    <el-tree-select
      v-model="selected"
      :data="options"
      check-strictly
      filterable
      clearable
      default-expand-all
      node-key="value"
      :placeholder="allowRoot ? '不选则移动为一级知识点' : '请选择'"
      class="pick-dialog__select"
    />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!allowRoot && !selected" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { TreeOption } from '../../shared/knowledge-tree';

interface Props {
  modelValue: boolean;
  title: string;
  options: TreeOption[];
  description?: string;
  allowRoot?: boolean;
  saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), { description: '', allowRoot: false, saving: false });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [targetId: string | null];
}>();

const selected = ref('');

const submit = () => {
  if (!selected.value && !props.allowRoot) return;
  emit('submit', selected.value || null);
};
</script>

<style scoped lang="scss">
.pick-dialog {
  &__desc {
    margin: 0 0 12px;
    color: var(--aix-colorTextSecondary);
  }

  &__select {
    width: 100%;
  }
}
</style>
