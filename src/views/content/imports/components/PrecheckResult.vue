<template>
  <div class="precheck-result">
    <el-table :data="countRows" class="data-table precheck-result__counts">
      <el-table-column label="" prop="label" width="90" />
      <el-table-column v-for="column in COUNT_COLUMNS" :key="column.key" :label="column.label">
        <template #default="{ row }">{{ row.counts[column.key] }}</template>
      </el-table-column>
    </el-table>

    <el-alert
      v-if="result.truncated"
      type="warning"
      :closable="false"
      show-icon
      :title="`仅显示前 ${PRECHECK_ERROR_LIMIT} 条错误，完整错误请导入后下载报告`"
    />
    <el-alert
      v-if="result.errors.length > 0"
      type="info"
      :closable="false"
      title="有错误的单元不会写入，其余照常导入"
    />

    <ImportErrorTable v-model:sheet="sheet" :errors="filteredErrors" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ImportSheetFilter } from '../useImportJobs';
import { PRECHECK_ERROR_LIMIT } from '../useImportPrecheck';
import ImportErrorTable from './ImportErrorTable.vue';
import type { ImportEntityCountsDto, ImportPrecheckResultDto } from '@/api';

interface Props {
  result: ImportPrecheckResultDto;
}

const props = defineProps<Props>();

const COUNT_COLUMNS: { key: keyof ImportEntityCountsDto; label: string }[] = [
  { key: 'knowledgePoints', label: '知识点' },
  { key: 'materials', label: '材料' },
  { key: 'questions', label: '独立题' },
  { key: 'papers', label: '试卷' },
];

const sheet = ref<ImportSheetFilter>('');

const countRows = computed(() => [
  { label: '新增', counts: props.result.wouldCreate },
  { label: '更新', counts: props.result.wouldUpdate },
  { label: '跳过', counts: props.result.wouldSkip },
]);

const filteredErrors = computed(() =>
  sheet.value ? props.result.errors.filter(error => error.sheet === sheet.value) : props.result.errors,
);
</script>

<style scoped lang="scss">
.precheck-result {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__counts {
    max-width: 640px;
  }
}
</style>
