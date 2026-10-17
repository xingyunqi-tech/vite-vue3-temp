<template>
  <el-cascader
    :model-value="modelValue || undefined"
    :options="cascaderOptions"
    :props="{ emitPath: false }"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    filterable
    class="subject-cascader"
    @update:model-value="emit('update:modelValue', ($event as string | null) ?? '')"
  />
</template>

<script setup lang="ts">
import type { CascaderOption } from 'element-plus';
import { computed, onMounted } from 'vue';
import { useSubjectOptions, type SubjectOption } from '../useSubjectOptions';

interface Props {
  modelValue: string;
  options?: SubjectOption[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  options: undefined,
  placeholder: '考试 / 科目',
  clearable: true,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { options: ownOptions, load } = useSubjectOptions();
const cascaderOptions = computed(() => (props.options ?? ownOptions.value) as CascaderOption[]);

onMounted(() => {
  if (!props.options) load().catch(() => undefined);
});
</script>

<style scoped lang="scss">
.subject-cascader {
  width: 220px;
}
</style>
