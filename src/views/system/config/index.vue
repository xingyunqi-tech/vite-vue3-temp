<template>
  <div class="remote-config">
    <div class="remote-config__header">
      <h2 class="remote-config__title">远程配置</h2>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" row-key="key" class="data-table">
      <el-table-column label="配置项" min-width="240">
        <template #default="{ row }">
          <div class="remote-config__key">{{ row.key }}</div>
          <div class="remote-config__desc">{{ row.description }}</div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ REMOTE_CONFIG_TYPE_LABEL[row.type as RemoteConfigType] }}</template>
      </el-table-column>
      <el-table-column label="当前值" min-width="200">
        <template #default="{ row }">
          <el-tag v-if="row.loadFailed" type="danger" size="small">读取失败</el-tag>
          <template v-else>
            <span class="remote-config__value">{{ formatConfigValue(row.type, row.value) }}</span>
            <el-tag v-if="!row.stored" type="info" size="small" class="remote-config__tag">
              {{ row.value === undefined ? '未设置' : '默认值' }}
            </el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="默认值" width="110">
        <template #default="{ row }">{{ formatConfigValue(row.type, row.defaultValue) }}</template>
      </el-table-column>
      <el-table-column label="公开" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isPublic ? 'success' : 'info'" size="small">{{ row.isPublic ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.updatedAt ?? undefined) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="row.loadFailed" @click="openEditor(row as RemoteConfigRow)">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <ConfigValueDialog v-model="dialogVisible" :row="editingRow" :saving="saving" @submit="handleSubmit" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import ConfigValueDialog from './components/ConfigValueDialog.vue';
import { formatConfigValue } from './config-value';
import { useRemoteConfig, type RemoteConfigRow } from './useRemoteConfig';
import { REMOTE_CONFIG_TYPE_LABEL, type RemoteConfigType } from '@/constants/remote-config';
import { formatDateTimeFull } from '@/utils/datetime';

const { rows, loading, load, save } = useRemoteConfig();

const dialogVisible = ref(false);
const editingRow = ref<RemoteConfigRow | null>(null);
const saving = ref(false);

const openEditor = (row: RemoteConfigRow) => {
  editingRow.value = row;
  dialogVisible.value = true;
};

const handleSubmit = async ({ key, value }: { key: string; value: unknown }) => {
  saving.value = true;
  try {
    await save(key, value);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
  } catch {
    // 请求失败的提示由请求层统一弹出
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<style scoped lang="scss">
.remote-config {
  box-sizing: border-box;
  min-height: 100%;
  padding: 20px;
  background: var(--aix-colorBgLayout);

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

  &__key {
    color: var(--aix-colorTextHeading);
    font-family: Menlo, Consolas, monospace;
  }

  &__desc {
    color: var(--aix-colorTextSecondary);
    font-size: 12px;
  }

  &__value {
    word-break: break-all;
  }

  &__tag {
    margin-left: 8px;
  }
}
</style>
