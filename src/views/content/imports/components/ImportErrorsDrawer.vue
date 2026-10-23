<template>
  <el-drawer
    :model-value="modelValue"
    title="错误明细"
    size="800px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <ImportErrorTable v-model:sheet="filters.sheet" :errors="list" :loading="loading" @update:sheet="handleSearch" />
    <el-pagination
      :current-page="page"
      :page-size="limit"
      :total="total"
      :page-sizes="PAGE_SIZES"
      layout="total, sizes, prev, pager, next"
      class="import-errors-drawer__pagination"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />
  </el-drawer>
</template>

<script setup lang="ts">
import { useImportErrors } from '../useImportJobs';
import ImportErrorTable from './ImportErrorTable.vue';
import { PAGE_SIZES } from '@/constants';

interface Props {
  modelValue: boolean;
  jobId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { filters, page, limit, total, list, loading, search, reset, changePage, changeSize } = useImportErrors(
  () => props.jobId,
);

const handleOpen = () => reset().catch(() => undefined);
const handleSearch = () => search().catch(() => undefined);
</script>

<style scoped lang="scss">
.import-errors-drawer {
  &__pagination {
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
