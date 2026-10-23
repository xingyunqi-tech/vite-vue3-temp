<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <p class="batch-result__summary">
      成功
      <span class="batch-result__count batch-result__count--success">{{ succeeded }}</span>
      项，失败
      <span class="batch-result__count batch-result__count--error">{{ failures.length }}</span>
      项
    </p>
    <el-table :data="failures" row-key="id" max-height="400" class="batch-result__table">
      <el-table-column :label="itemLabel" min-width="280">
        <template #default="{ row }">
          <el-button link type="primary" class="batch-result__link" @click="emit('select', row.id)">
            {{ row.label || row.id }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="失败原因" min-width="200" />
    </el-table>
    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
export interface BatchResultFailure {
  id: string;
  label: string;
  message: string;
}

interface Props {
  modelValue: boolean;
  succeeded: number;
  failures: BatchResultFailure[];
  title?: string;
  itemLabel?: string;
}

withDefaults(defineProps<Props>(), {
  title: '批量操作结果',
  itemLabel: '题目',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [id: string];
  closed: [];
}>();
</script>

<style scoped lang="scss">
.batch-result__summary {
  margin: 0 0 12px;
  color: var(--aix-colorText);
}

.batch-result__count {
  font-weight: 600;

  &--success {
    color: var(--aix-colorSuccess);
  }

  &--error {
    color: var(--aix-colorError);
  }
}

.batch-result__link {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
