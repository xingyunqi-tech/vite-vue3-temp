<template>
  <div v-loading="loading" class="agreement-panel">
    <el-alert
      v-if="loadFailed"
      type="error"
      :closable="false"
      show-icon
      title="读取失败，请重试"
      class="agreement-panel__notice"
    >
      <el-button link type="primary" class="agreement-panel__retry" @click="load">重试</el-button>
    </el-alert>

    <template v-else-if="!loading">
      <div class="agreement-panel__meta">
        <span class="agreement-panel__version">当前版本：{{ version ?? '未设置' }}</span>
        <span class="agreement-panel__updated">最后更新：{{ formatDateTimeFull(updatedAt ?? undefined) }}</span>
      </div>
      <el-alert
        v-if="!configured"
        type="info"
        :closable="false"
        show-icon
        title="未配置，小程序将显示内置文本"
        class="agreement-panel__notice agreement-panel__unconfigured"
      />

      <AgreementEditor v-model="draft" />

      <div class="agreement-panel__actions">
        <el-button class="agreement-panel__preview" @click="previewVisible = true">预览</el-button>
        <el-button type="primary" class="agreement-panel__save" :loading="saving" @click="handleSave">保存</el-button>
        <el-button type="warning" class="agreement-panel__upgrade" :loading="saving" @click="handleSaveAndUpgrade">
          保存并升级版本
        </el-button>
      </div>
    </template>

    <AgreementPreview v-model="previewVisible" :title="agreement.label" :html="draft" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, ref, watch } from 'vue';
import {
  checkAgreementContent,
  sanitizeAgreementHtml,
  suggestNextVersion,
  validateNextVersion,
} from '../agreement-html';
import { AgreementVersionSaveError, useAgreement } from '../useAgreement';
import AgreementEditor from './AgreementEditor.vue';
import AgreementPreview from './AgreementPreview.vue';
import type { AgreementDocument } from '@/constants/agreement';
import { formatDateTimeFull } from '@/utils/datetime';

interface Props {
  agreement: AgreementDocument;
}

const props = defineProps<Props>();

const { content, version, updatedAt, configured, loading, loadFailed, saving, load, save } = useAgreement(
  props.agreement,
);

const draft = ref('');
const previewVisible = ref(false);

watch(content, value => {
  draft.value = value;
});

const confirmSave = (message: string, title: string): Promise<boolean> =>
  ElMessageBox.confirm(message, title, { type: 'warning' })
    .then(() => true)
    .catch(() => false);

const submit = async (nextVersion: string | undefined, successMessage: string) => {
  try {
    draft.value = await save(draft.value, nextVersion);
    ElMessage.success(successMessage);
  } catch (error) {
    if (!(error instanceof AgreementVersionSaveError)) return;
    draft.value = error.content;
    await ElMessageBox.alert(
      '正文已保存，但版本号未升级，用户暂不会被要求重新同意，请重新点击『保存并升级版本』',
      '版本号未升级',
      { type: 'warning' },
    ).catch(() => undefined);
  }
};

const ensureContent = (): boolean => {
  const invalid = checkAgreementContent(sanitizeAgreementHtml(draft.value));
  if (!invalid) return true;
  ElMessage.warning(invalid);
  return false;
};

const handleSave = async () => {
  if (!ensureContent()) return;
  const confirmed = await confirmSave(
    `保存后小程序立即展示新的${props.agreement.label}，版本号不变，已同意的用户无需重新同意。`,
    `保存${props.agreement.label}`,
  );
  if (!confirmed) return;
  await submit(undefined, '保存成功');
};

const promptNextVersion = async (): Promise<string | null> => {
  try {
    const { value } = await ElMessageBox.prompt(
      `升级版本后，所有用户需重新同意${props.agreement.label}。当前版本：${version.value ?? '未设置'}`,
      '保存并升级版本',
      {
        type: 'warning',
        inputValue: suggestNextVersion(version.value),
        inputPlaceholder: '新版本号',
        inputValidator: input => validateNextVersion(input, version.value),
        confirmButtonText: '保存并升级',
        cancelButtonText: '取消',
      },
    );
    return value.trim();
  } catch {
    return null;
  }
};

const handleSaveAndUpgrade = async () => {
  if (!ensureContent()) return;
  const nextVersion = await promptNextVersion();
  if (!nextVersion) return;
  await submit(nextVersion, `已保存并升级到 ${nextVersion}`);
};

onMounted(load);
</script>

<style scoped lang="scss">
.agreement-panel {
  min-height: 200px;

  &__meta {
    display: flex;
    gap: 24px;
    margin-bottom: 12px;
    color: var(--aix-colorTextSecondary);
    font-size: 13px;
  }

  &__notice {
    margin-bottom: 12px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
