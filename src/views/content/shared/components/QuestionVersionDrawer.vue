<template>
  <el-drawer
    :model-value="modelValue"
    title="版本历史"
    size="720px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="load"
  >
    <div v-loading="loading" class="version-drawer">
      <el-empty v-if="!loading && versions.length === 0" description="尚未发布，暂无版本" :image-size="80" />
      <el-collapse v-else v-model="expanded">
        <el-collapse-item v-for="version in versions" :key="version.id" :name="version.id">
          <template #title>
            <span class="version-drawer__title">v{{ version.version }}</span>
            <el-tag size="small" :type="CHANGE_TYPE_META[version.changeType].tag">
              {{ CHANGE_TYPE_META[version.changeType].label }}
            </el-tag>
            <span v-if="version.materialVersion !== null" class="version-drawer__muted">
              材料 v{{ version.materialVersion }}
            </span>
            <span class="version-drawer__muted">{{ formatDateTimeFull(version.createdAt) }}</span>
          </template>
          <QuestionPreview :question="version" />
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { StatusMeta } from '../constants';
import QuestionPreview from './QuestionPreview.vue';
import { adminGetQuestionVersions, type QuestionChangeType, type QuestionVersion } from '@/api';
import { formatDateTimeFull } from '@/utils/datetime';

interface Props {
  modelValue: boolean;
  questionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const CHANGE_TYPE_META: Record<QuestionChangeType, StatusMeta> = {
  PUBLISH: { label: '首次发布', tag: 'success' },
  EDIT: { label: '编辑', tag: 'primary' },
  ERRATA: { label: '勘误', tag: 'warning' },
};

const versions = ref<QuestionVersion[]>([]);
const expanded = ref<string[]>([]);
const loading = ref(false);

const load = async () => {
  versions.value = [];
  if (!props.questionId) return;
  loading.value = true;
  const result = await adminGetQuestionVersions(props.questionId, { disableDedup: true }).catch(() => []);
  versions.value = [...(result ?? [])].sort((a, b) => b.version - a.version);
  expanded.value = versions.value.slice(0, 1).map(version => version.id);
  loading.value = false;
};
</script>

<style scoped lang="scss">
.version-drawer {
  min-height: 120px;

  &__title {
    margin-right: 8px;
    color: var(--aix-colorTextHeading);
    font-weight: 600;
  }

  &__muted {
    margin-left: 8px;
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
