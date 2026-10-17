<template>
  <el-dialog
    :model-value="modelValue"
    :title="row ? `编辑 ${row.key}` : ''"
    width="560px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="resetDraft"
  >
    <template v-if="row">
      <el-descriptions :column="1" border size="small" class="config-dialog__meta">
        <el-descriptions-item label="说明">{{ row.description }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ REMOTE_CONFIG_TYPE_LABEL[row.type] }}</el-descriptions-item>
        <el-descriptions-item label="默认值">{{ formatConfigValue(row.type, row.defaultValue) }}</el-descriptions-item>
        <el-descriptions-item label="公开">{{ row.isPublic ? '是' : '否' }}</el-descriptions-item>
      </el-descriptions>

      <div class="config-dialog__field">
        <el-switch
          v-if="row.type === 'boolean'"
          v-model="booleanDraft"
          class="config-dialog__switch"
          active-text="开启"
          inactive-text="关闭"
        />
        <el-input-number
          v-else-if="row.type === 'number'"
          v-model="numberDraft"
          class="config-dialog__number"
          :min="0"
          :precision="row.precision ?? 0"
          controls-position="right"
        />
        <el-input
          v-else-if="row.type === 'string'"
          v-model="textDraft"
          class="config-dialog__string"
          placeholder="请输入"
          clearable
        />
        <el-input
          v-else
          v-model="textDraft"
          class="config-dialog__json"
          type="textarea"
          :rows="10"
          :spellcheck="false"
        />
        <p v-if="error" class="config-dialog__error">{{ error }}</p>
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" class="config-dialog__submit" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, type WritableComputedRef } from 'vue';
import { formatConfigValue, parseDraft, toDraft } from '../config-value';
import type { RemoteConfigRow } from '../useRemoteConfig';
import { REMOTE_CONFIG_TYPE_LABEL } from '@/constants/remote-config';

interface Props {
  modelValue: boolean;
  row: RemoteConfigRow | null;
  saving?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit', payload: { key: string; value: unknown }): void;
}

const props = withDefaults(defineProps<Props>(), { saving: false });
const emit = defineEmits<Emits>();

const draft = ref<unknown>();
const error = ref('');

const typedDraft = <T,>(): WritableComputedRef<T> =>
  computed({
    get: () => draft.value as T,
    set: value => {
      draft.value = value;
    },
  });

const booleanDraft = typedDraft<boolean>();
const numberDraft = typedDraft<number | undefined>();
const textDraft = typedDraft<string>();

const resetDraft = () => {
  error.value = '';
  draft.value = props.row ? toDraft(props.row, props.row.value) : undefined;
};

const submit = () => {
  if (!props.row) return;
  const result = parseDraft(props.row.type, draft.value);
  if (!result.ok) {
    error.value = result.message;
    return;
  }
  error.value = '';
  emit('submit', { key: props.row.key, value: result.value });
};
</script>

<style scoped lang="scss">
.config-dialog__meta {
  margin-bottom: 16px;
}

.config-dialog__number,
.config-dialog__string {
  width: 100%;
}

.config-dialog__json :deep(textarea) {
  font-family: Menlo, Consolas, monospace;
}

.config-dialog__error {
  margin: 8px 0 0;
  color: var(--aix-colorError);
  font-size: 12px;
}
</style>
