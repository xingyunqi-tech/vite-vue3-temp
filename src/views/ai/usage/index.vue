<template>
  <div class="page ai-usage">
    <div class="page__header">
      <h2 class="page__title">AI 用量与成本</h2>
    </div>

    <el-form inline @submit.prevent="handleSearch">
      <el-form-item label="日期">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          :shortcuts="shortcuts"
          :disabled-date="isFutureDate"
          :clearable="false"
          class="ai-usage__range"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">查询</el-button>
      </el-form-item>
    </el-form>

    <el-result v-if="error && !loading" icon="error" title="加载失败" class="ai-usage__error">
      <template #extra>
        <el-button type="primary" @click="handleSearch">重试</el-button>
      </template>
    </el-result>

    <template v-else>
      <div v-loading="loading" class="ai-usage__summary">
        <div v-for="stat in summary" :key="stat.label" class="ai-usage__stat">
          <div class="ai-usage__stat-label">{{ stat.label }}</div>
          <div class="ai-usage__stat-value" :class="{ 'ai-usage__stat-value--danger': stat.danger }">
            {{ stat.value }}
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane v-for="tab in TABS" :key="tab.name" :label="tab.label" :name="tab.name">
          <el-table v-loading="loading" :data="tab.rows()" row-key="key" class="data-table">
            <el-table-column :label="tab.keyLabel" min-width="140">
              <template #default="{ row }">{{ tab.name === 'kind' ? usageKindLabel(row.key) : row.key }}</template>
            </el-table-column>
            <el-table-column
              v-for="column in METRIC_COLUMNS"
              :key="column.prop"
              :label="column.label"
              align="right"
              min-width="110"
            >
              <template #default="{ row }">
                <span :class="{ 'ai-usage__failed': column.prop === 'failures' && row.failures > 0 }">
                  {{ column.format(row[column.prop]) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="明细" name="detail">
          <el-table v-loading="loading" :data="items" class="data-table">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="model" label="模型" min-width="140" />
            <el-table-column label="类型" width="110">
              <template #default="{ row }">{{ usageKindLabel(row.kind) }}</template>
            </el-table-column>
            <el-table-column
              v-for="column in DETAIL_COLUMNS"
              :key="column.prop"
              :label="column.label"
              align="right"
              min-width="110"
            >
              <template #default="{ row }">{{ column.format(row[column.prop]) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import {
  defaultUsageRange,
  formatCost,
  formatCount,
  formatRate,
  isAfterBusinessToday,
  usageKindLabel,
  type UsageDimension,
  type UsageRow,
} from './usage-stats';
import { useAiUsage } from './useAiUsage';
import type { AiUsageTotalDto } from '@/api';
import dayjs from '@/plugins/dayjs';
import { validateDateRange } from '@/utils/business-date';

type MetricKey = keyof Omit<UsageRow, 'key'>;
type DetailKey = keyof AiUsageTotalDto;

interface MetricColumn<K extends MetricKey = MetricKey> {
  prop: K;
  label: string;
  format: (value: number) => string;
}

const METRIC_COLUMNS: MetricColumn[] = [
  { prop: 'requests', label: '请求数', format: formatCount },
  { prop: 'failures', label: '失败数', format: formatCount },
  { prop: 'failureRate', label: '失败率', format: formatRate },
  { prop: 'inputTokens', label: '输入 token', format: formatCount },
  { prop: 'cachedInputTokens', label: '缓存命中 token', format: formatCount },
  { prop: 'outputTokens', label: '输出 token', format: formatCount },
  { prop: 'cost', label: '估算成本', format: formatCost },
];

const isDetailColumn = (column: MetricColumn): column is MetricColumn<DetailKey> => column.prop !== 'failureRate';

const DETAIL_COLUMNS = METRIC_COLUMNS.filter(isDetailColumn);

const { range, items, total, byDate, byModel, byKind, loading, error, load } = useAiUsage();

const activeTab = ref<UsageDimension | 'detail'>('date');

const TABS: { name: UsageDimension; label: string; keyLabel: string; rows: () => UsageRow[] }[] = [
  { name: 'date', label: '按日', keyLabel: '日期', rows: () => byDate.value },
  { name: 'model', label: '按模型', keyLabel: '模型', rows: () => byModel.value },
  { name: 'kind', label: '按类型', keyLabel: '类型', rows: () => byKind.value },
];

const shortcuts = [7, 30, 90].map(days => ({
  text: `最近 ${days} 天`,
  value: () => defaultUsageRange(new Date(), days).map(date => dayjs(date).toDate()),
}));

const isFutureDate = (date: Date) => isAfterBusinessToday(date);

const summary = computed(() => [
  { label: '请求数', value: formatCount(total.value.requests) },
  { label: '失败数', value: formatCount(total.value.failures), danger: total.value.failures > 0 },
  { label: '失败率', value: formatRate(total.value.failureRate) },
  { label: '输入 token', value: formatCount(total.value.inputTokens) },
  { label: '缓存命中 token', value: formatCount(total.value.cachedInputTokens) },
  { label: '输出 token', value: formatCount(total.value.outputTokens) },
  { label: '估算成本', value: formatCost(total.value.cost) },
]);

const handleSearch = () => {
  const message = validateDateRange(range.value);
  if (message) {
    ElMessage.warning(message);
    return;
  }
  load().catch(() => undefined);
};

onMounted(handleSearch);
</script>

<style scoped lang="scss">
@use '@/styles/page';

.ai-usage {
  &__range {
    width: 280px;
  }

  &__error {
    border-radius: 8px;
    background: var(--aix-colorBgContainer);
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  &__stat {
    padding: 16px;
    border-radius: 8px;
    background: var(--aix-colorBgContainer);
  }

  &__stat-label {
    color: var(--aix-colorTextTertiary);
    font-size: 13px;
  }

  &__stat-value {
    margin-top: 8px;
    color: var(--aix-colorTextHeading);
    font-size: 22px;
    font-weight: 600;

    &--danger {
      color: var(--aix-colorError);
    }
  }

  &__failed {
    color: var(--aix-colorError);
    font-weight: 600;
  }
}
</style>
