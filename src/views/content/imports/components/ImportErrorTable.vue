<template>
  <div class="import-errors">
    <div class="import-errors__toolbar">
      <el-select v-model="sheet" placeholder="全部工作表" clearable class="import-errors__select">
        <el-option v-for="item in sheetOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <slot name="toolbar" />
    </div>
    <el-table v-loading="loading" :data="errors" class="data-table" empty-text="没有错误">
      <el-table-column label="工作表" min-width="150">
        <template #default="{ row }">{{ sheetText(row.sheet) }}</template>
      </el-table-column>
      <el-table-column label="行号" prop="row" width="80" />
      <el-table-column label="字段" min-width="120">
        <template #default="{ row }">{{ row.field || EMPTY_TEXT }}</template>
      </el-table-column>
      <el-table-column label="原因" min-width="260">
        <template #default="{ row }">
          <div>{{ row.message }}</div>
          <div v-if="row.detail" class="import-errors__detail">{{ row.detail }}</div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { IMPORT_SHEET_LABEL, sheetText, type ImportSheetFilter } from '../useImportJobs';
import type { ImportRowErrorDto } from '@/api';
import { EMPTY_TEXT, toOptions } from '@/constants';

interface Props {
  errors: ImportRowErrorDto[];
  loading?: boolean;
}

withDefaults(defineProps<Props>(), { loading: false });

const sheet = defineModel<ImportSheetFilter>('sheet', { default: '' });

const sheetOptions = toOptions(IMPORT_SHEET_LABEL).map(item => ({ ...item, label: sheetText(item.value) }));
</script>

<style scoped lang="scss">
.import-errors {
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__select {
    width: 200px;
  }

  &__detail {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
