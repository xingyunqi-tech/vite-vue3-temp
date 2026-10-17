<template>
  <el-tree-select
    :model-value="modelValue"
    :data="treeOptions"
    :multiple="multiple"
    :disabled="disabled || !subjectId"
    :placeholder="subjectId ? placeholder : '请先选择科目'"
    :loading="loading"
    check-strictly
    node-key="value"
    clearable
    filterable
    default-expand-all
    class="knowledge-select"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toTreeOptions, type KnowledgeNode } from '../knowledge-tree';
import { fetchKnowledgeTree } from '../knowledge-tree-cache';

interface Props {
  subjectId: string;
  modelValue: string | string[];
  multiple?: boolean;
  leafOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  leafOnly: false,
  disabled: false,
  placeholder: '知识点',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]];
  loaded: [tree: KnowledgeNode[]];
}>();

const tree = ref<KnowledgeNode[]>([]);
const loading = ref(false);
const treeOptions = computed(() => toTreeOptions(tree.value, props.leafOnly));

let requestSeq = 0;

const load = async (subjectId: string) => {
  const seq = ++requestSeq;
  if (!subjectId) {
    tree.value = [];
    emit('loaded', []);
    return;
  }
  loading.value = true;
  const result = await fetchKnowledgeTree(subjectId).catch(() => null);
  if (seq !== requestSeq) return;
  loading.value = false;
  tree.value = result ?? [];
  if (result) emit('loaded', result);
};

watch(
  () => props.subjectId,
  subjectId => {
    load(subjectId);
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.knowledge-select {
  width: 100%;
  min-width: 200px;
}
</style>
