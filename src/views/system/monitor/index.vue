<template>
  <div class="monitor-page">
    <section class="monitor-page__section">
      <div class="monitor-page__header">
        <h2 class="monitor-page__title">队列状态</h2>
        <el-button :loading="queueLoading" @click="loadQueues">刷新</el-button>
      </div>
      <el-alert
        v-if="overview && !overview.enabled"
        type="warning"
        :closable="false"
        show-icon
        title="Redis 未启用，队列不可用"
        class="monitor-page__notice"
      />
      <el-table v-else v-loading="queueLoading" :data="overview?.queues ?? []" row-key="name" class="data-table">
        <el-table-column prop="name" label="队列" min-width="140" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.available ? 'success' : 'danger'" size="small">
              {{ row.available ? '正常' : '统计失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-for="column in QUEUE_COUNT_COLUMNS" :key="column.prop" :label="column.label" width="100">
          <template #default="{ row }">
            <span :class="{ 'monitor-page__failed': column.prop === 'failed' && row.available && row.failed > 0 }">
              {{ row.available ? row[column.prop] : '—' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="monitor-page__section">
      <div class="monitor-page__header">
        <h2 class="monitor-page__title">告警列表</h2>
      </div>
      <el-form :model="filters" inline class="monitor-page__filters" @submit.prevent="search">
        <el-form-item label="状态">
          <el-select v-model="filters.status" class="monitor-page__select">
            <el-option v-for="item in ACK_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="filters.level" placeholder="全部" clearable class="monitor-page__select">
            <el-option v-for="(meta, level) in ALERT_LEVEL_META" :key="level" :label="meta.label" :value="level" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-input v-model="filters.type" placeholder="如 auto-submit" clearable maxlength="50" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="alertLoading">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="alertLoading" :data="list" row-key="id" class="data-table">
        <el-table-column type="expand" width="40">
          <template #default="{ row }">
            <pre class="monitor-page__payload">{{ formatPayload(row.payload) }}</pre>
          </template>
        </el-table-column>
        <el-table-column label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelMeta(row.level).tag" size="small">{{ levelMeta(row.level).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="140" />
        <el-table-column prop="message" label="内容" min-width="240" show-overflow-tooltip />
        <el-table-column label="发生时间" width="170">
          <template #default="{ row }">{{ formatDateTimeFull(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="确认时间" width="170">
          <template #default="{ row }">{{ formatDateTimeFull(row.acknowledgedAt ?? undefined) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.acknowledgedAt"
              link
              type="primary"
              :loading="ackingId === row.id"
              @click="handleAcknowledge(row as AdminAlert)"
            >
              确认
            </el-button>
            <span v-else class="monitor-page__muted">已确认</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        :current-page="page"
        :page-size="limit"
        class="monitor-page__pagination"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @update:current-page="changePage"
        @update:page-size="changeSize"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref } from 'vue';
import { ACK_STATUS_OPTIONS, ALERT_LEVEL_META } from './alert-query';
import { useAlertList, useQueueStats } from './useMonitor';
import type { AdminAlert, AdminAlertLevel, QueueStatsDto } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';

type QueueCountKey = keyof Omit<QueueStatsDto, 'name' | 'available'>;

const QUEUE_COUNT_COLUMNS: { prop: QueueCountKey; label: string }[] = [
  { prop: 'waiting', label: '等待' },
  { prop: 'active', label: '执行中' },
  { prop: 'delayed', label: '延迟' },
  { prop: 'prioritized', label: '优先' },
  { prop: 'failed', label: '失败' },
  { prop: 'completed', label: '已完成' },
];

const { overview, loading: queueLoading, load: loadQueues } = useQueueStats();
const {
  filters,
  page,
  limit,
  total,
  list,
  loading: alertLoading,
  load,
  changePage,
  changeSize,
  search,
  reset,
  acknowledge,
} = useAlertList();

const ackingId = ref<number | null>(null);

const levelMeta = (level: AdminAlertLevel) => ALERT_LEVEL_META[level] ?? { label: level, tag: 'info' as const };

const formatPayload = (payload: AdminAlert['payload']) => (payload ? JSON.stringify(payload, null, 2) : '无附加数据');

const handleAcknowledge = async (alert: AdminAlert) => {
  const confirmed = await ElMessageBox.confirm(`确认告警「${alert.message}」？`, '确认告警', { type: 'warning' })
    .then(() => true)
    .catch(() => false);
  if (!confirmed) return;

  ackingId.value = alert.id;
  try {
    await acknowledge(alert.id);
    ElMessage.success('已确认');
  } catch {
    // 请求失败的提示由请求层统一弹出
  } finally {
    ackingId.value = null;
  }
};

onMounted(() => {
  loadQueues();
  load();
});
</script>

<style scoped lang="scss">
.monitor-page {
  box-sizing: border-box;
  min-height: 100%;
  padding: 20px;
  background: var(--aix-colorBgLayout);

  &__section + &__section {
    margin-top: 32px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0;
    color: var(--aix-colorTextHeading);
    font-size: 18px;
    font-weight: 600;
  }

  &__select {
    width: 140px;
  }

  &__failed {
    color: var(--aix-colorError);
    font-weight: 600;
  }

  &__muted {
    color: var(--aix-colorTextTertiary);
  }

  &__payload {
    margin: 0;
    padding: 12px 16px;
    overflow: auto;
    border-radius: 6px;
    background: var(--aix-colorFillQuaternary);
    color: var(--aix-colorText);
    font-size: 12px;
    white-space: pre-wrap;
  }

  &__pagination {
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
