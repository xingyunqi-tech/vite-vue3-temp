<!--
  小程序配置页面
  草稿模式：本地修改，点击保存后才提交到后端
-->
<template>
  <div v-loading="loading" class="mini-program-setting">
    <el-result
      v-if="loadFailed"
      class="mini-program-setting__failed"
      icon="error"
      title="读取失败"
      sub-title="小程序配置读取失败，请重试"
    >
      <template #extra>
        <el-button type="primary" class="mini-program-setting__retry" @click="load">重试</el-button>
      </template>
    </el-result>

    <ConfigEditor
      v-else-if="saved"
      ref="configEditorRef"
      class="mini-program-setting__editor"
      :schema="appProfileSchema"
      :model-value="draft"
      :issues="issues"
      :disabled="saving"
      @update:model-value="draft = $event"
    >
      <template #actions>
        <el-button
          type="primary"
          size="small"
          class="mini-program-setting__save"
          :disabled="!canSave"
          :loading="saving"
          @click="handleSave"
        >
          保存配置
        </el-button>
      </template>
    </ConfigEditor>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';
import { cloneDeep, get, isEqual } from 'lodash-es';
import { computed, onMounted, ref } from 'vue';
import {
  isUnknownProfilePath,
  normalizeEditorValue,
  toAppProfilePayload,
  toEditorValue,
  toFieldIssues,
  validateAppProfile,
  type AppProfileEditorValue,
} from './app-profile';
import { appProfileSchema } from './schema';
import { adminUpdateAppProfile, getAppProfile, type AppProfile } from '@/api';
import { requestErrorMessage } from '@/api/core/error';
import ConfigEditor from '@/components/ConfigEditor/index.vue';
import { useLeaveGuard } from '@/composables/useLeaveGuard';
import type { IConfigIssue } from '@/plugins/site-config';

const configEditorRef = ref<InstanceType<typeof ConfigEditor>>();

/** 最近一次读取或保存成功的值，读取成功前为 null */
const saved = ref<AppProfileEditorValue | null>(null);
const draft = ref<AppProfileEditorValue>({});

const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);

/** 后端返回的字段错误，仅在对应字段仍为提交时的值时展示 */
const serverIssues = ref<{ submitted: AppProfileEditorValue; issues: IConfigIssue[] } | null>(null);

/** 代码模式下以编辑器文本为准 */
const current = computed(() => configEditorRef.value?.parsed ?? { ok: true as const, value: draft.value });

const issues = computed<IConfigIssue[]>(() => {
  if (!current.value.ok) return [];
  const local = validateAppProfile(current.value.value);
  const server = serverIssues.value;
  if (!server) return local;
  const normalized = normalizeEditorValue(current.value.value);
  const remaining = server.issues.filter(
    issue =>
      !local.some(item => item.path === issue.path) &&
      get(normalized, issue.path) === get(server.submitted, issue.path),
  );
  return [...local, ...remaining];
});

/** JSON 解析失败视为有修改 */
const isDirty = computed(() => {
  if (!saved.value) return false;
  return current.value.ok ? !isEqual(normalizeEditorValue(current.value.value), saved.value) : true;
});

const canSave = computed(() => current.value.ok && isDirty.value);

function formatIssues(list: IConfigIssue[]): string {
  const paths = list.slice(0, 3).map(issue => issue.path || '(根节点)');
  return `${paths.join('、')}${list.length > 3 ? ' 等' : ''}`;
}

function setDraft(next: AppProfileEditorValue): void {
  draft.value = next;
  configEditorRef.value?.reload(next);
}

function applyProfile(profile: AppProfile): void {
  const next = toEditorValue(profile);
  saved.value = next;
  serverIssues.value = null;
  setDraft(cloneDeep(next));
}

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    applyProfile(await getAppProfile({ isIgnoreToast: true }));
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleSave(): Promise<void> {
  const snapshot = current.value;
  if (!snapshot.ok) {
    ElMessage.error('JSON 存在语法错误，请修正后再保存');
    return;
  }
  const localIssues = validateAppProfile(snapshot.value);
  const blocking = localIssues.filter(issue => !isUnknownProfilePath(issue.path));
  if (blocking.length > 0) {
    ElMessage.error(`存在不合法的配置项，请修正后再保存：${formatIssues(blocking)}`);
    return;
  }
  const ignored = localIssues.filter(issue => isUnknownProfilePath(issue.path));

  try {
    await ElMessageBox.confirm('保存后小程序将展示新的站点信息，留空的字段使用小程序默认值。', '保存小程序配置', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  saving.value = true;
  let profile: AppProfile;
  try {
    profile = await adminUpdateAppProfile(toAppProfilePayload(snapshot.value), { isIgnoreToast: true });
  } catch (error) {
    const fieldIssues = toFieldIssues(error);
    if (fieldIssues.length > 0) {
      serverIssues.value = { submitted: normalizeEditorValue(snapshot.value), issues: fieldIssues };
      ElMessage.error('保存失败，请根据提示修正配置项');
    } else {
      ElMessage.error(requestErrorMessage(error, '保存失败，请稍后重试'));
    }
    return;
  } finally {
    saving.value = false;
  }

  applyProfile(profile);
  if (ignored.length > 0) ElMessage.warning(`配置已保存，已忽略未知配置项：${formatIssues(ignored)}`);
  else ElMessage.success('配置已保存');
}

useLeaveGuard(() => isDirty.value);

onMounted(load);
</script>

<style lang="scss" scoped>
.mini-program-setting {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--aix-colorBgContainer);
}

.mini-program-setting__editor {
  flex: 1;
  min-height: 0;
}
</style>
