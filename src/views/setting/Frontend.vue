<!--
  前端配置页面
  草稿模式：本地修改，点击保存后才写入 store
-->
<template>
  <div class="frontend-setting">
    <ConfigEditor
      ref="configEditorRef"
      class="frontend-setting__editor"
      :schema="siteConfigSchema"
      :model-value="draft"
      :issues="issues"
      @update:model-value="draft = $event"
    >
      <template #actions>
        <el-button type="danger" plain size="small" @click="handleReset">恢复默认</el-button>
        <el-button type="primary" size="small" :disabled="!canSave" :loading="saving" @click="handleSave">
          保存配置
        </el-button>
      </template>
    </ConfigEditor>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox, ElMessage } from 'element-plus';
import { cloneDeep, isEqual } from 'lodash-es';
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import ConfigEditor from '@/components/ConfigEditor/index.vue';
import { useSiteConfig } from '@/composables/useSiteConfig';
import { siteConfigSchema } from '@/constants/site-config';
import type { ThemeStyleKey } from '@/interface/system';
import { defaultSiteConfig, validateConfig, type IConfigIssue, type SiteConfigOverrides } from '@/plugins/site-config';
import { useGlobalStore } from '@/store';
import { handleError } from '@/utils/error-handler';

type ConfigValue = Record<string, Record<string, unknown>>;

const siteConfig = useSiteConfig();
const globalStore = useGlobalStore();

const configEditorRef = ref<InstanceType<typeof ConfigEditor>>();

// 草稿：从合并配置克隆
const draft = ref<ConfigValue>(cloneDeep(siteConfig.config) as unknown as ConfigValue);

/**
 * 当前待保存的值
 *
 * 代码模式下 draft 不会实时同步，必须从编辑器取——否则「敲完最后一个字符立刻点保存」
 * 存进去的会是上一次同步的旧值。
 */
const current = computed(() => configEditorRef.value?.parsed ?? { ok: true as const, value: draft.value });

/**
 * 当前值的校验问题，实时呈现
 *
 * 与保存路径共用 validateConfig，不另外生成一套 el-form rules——「什么算合法」只有一份实现。
 * 刻意不拿它拦截保存：问题里既有「不能为空」也有「已收敛到边界」，后者拦下来是错的；
 * 保存仍会走 validateConfig 修复并回报结果，这里只是提前把同一份判定展示出来。
 */
const issues = computed(() => (current.value.ok ? validateConfig(current.value.value).issues : []));

/**
 * 是否有未保存的修改
 *
 * JSON 解析不了时一律算「有修改」：编辑器的文本只会由 reload() 写入合法 JSON，
 * 解析失败必然意味着用户已经动过它。若此时判为未修改，离开页面与刷新标签页的两道确认
 * 都会失效，用户一次误操作就把改动全丢了。
 *
 * 这不影响保存按钮——canSave 另外要求 `current.value.ok`，语法错误时依然点不动。
 */
const isDirty = computed(() => (current.value.ok ? !isEqual(current.value.value, siteConfig.config) : true));

// 保存按钮是否可用：有修改 且 无语法错误
const canSave = computed(() => current.value.ok && isDirty.value);

const saving = ref(false);

/**
 * 把草稿和编辑器文本一起换成指定的值
 * 显式传值而非让编辑器读 props：props 要等父组件重渲染才更新，此刻读到的是旧值
 */
function setDraft(next: ConfigValue): void {
  draft.value = next;
  configEditorRef.value?.reload(next);
}

/**
 * 保存配置
 */
async function handleSave(): Promise<void> {
  const snapshot = current.value;
  if (!snapshot.ok) {
    ElMessage.error('JSON 存在语法错误，请修正后再保存');
    return;
  }

  // 保存前后对比：站点默认主题被改写时要立即生效（见 globalStore.applySiteDefaultTheme）
  const previousMode = siteConfig.config.theme.defaultMode;

  saving.value = true;
  let saved: IConfigIssue[];
  try {
    saved = await siteConfig.save(snapshot.value as unknown as SiteConfigOverrides);
  } catch (error) {
    handleError(error, { message: '配置保存失败' });
    return;
  } finally {
    saving.value = false;
  }

  // 落库结果可能与提交值不同（非法项已被剔除），对齐后 isDirty 才能归零
  setDraft(cloneDeep(siteConfig.config) as unknown as ConfigValue);

  // 站点默认主题是「新声明」，优先级高于用户此前的明暗选择，故只在这条保存路径上触发
  const nextMode = siteConfig.config.theme.defaultMode;
  if (nextMode !== previousMode) {
    globalStore.applySiteDefaultTheme(nextMode as ThemeStyleKey);
  }

  if (saved.length === 0) {
    ElMessage.success('配置已保存');
    return;
  }
  const detail = saved
    .slice(0, 3)
    .map(issue => `${issue.path} ${issue.message}`)
    .join('；');
  ElMessage.warning(`配置已保存，${saved.length} 项不合法已处理：${detail}${saved.length > 3 ? ' 等' : ''}`);
}

/**
 * 恢复默认配置（二次确认）
 *
 * 只把草稿换成默认值，**不直接落库**——否则这个按钮就成了页面上唯一绕过
 * 「点保存才生效」的写入口，和另一个按钮的语义不一致。用户改完还能反悔直接走人。
 */
async function handleReset(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要恢复默认配置吗？当前修改将会丢失。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    // 用户取消，不做任何操作
    return;
  }
  setDraft(cloneDeep(defaultSiteConfig) as unknown as ConfigValue);
  ElMessage.success('已恢复默认值，点击保存后生效');
}

/**
 * 远端配置到达后重新播种草稿
 *
 * App.vue 的 siteConfig.load() 在它自己的 onMounted 里 await，晚于本页挂载：深链进来时
 * draft 是 load 前的值。远端覆盖落下来后不跟着换的话，isDirty 会凭空为真（弹出离开与刷新确认），
 * 保存还会拿这份旧快照覆盖掉远端。
 *
 * 只在用户没动过草稿时换：拿编辑器当下的值与**变更前**的配置比，不等就说明有未保存的修改，保留。
 */
watch(
  () => siteConfig.config,
  (next, prev) => {
    const editing = current.value.ok ? current.value.value : null;
    // JSON 解析不了说明用户肯定动过
    if (editing === null || !isEqual(editing, prev)) return;
    setDraft(cloneDeep(next) as unknown as ConfigValue);
  },
);

// 离开页面前确认，避免未保存的修改被静默丢弃
onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true;
  try {
    await ElMessageBox.confirm('有未保存的修改，确定要离开吗？', '提示', {
      confirmButtonText: '离开',
      cancelButtonText: '留在本页',
      type: 'warning',
    });
    return true;
  } catch {
    return false;
  }
});

// 关闭/刷新标签页时的浏览器原生确认（文案由浏览器决定，无法自定义）
function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (isDirty.value) event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload));
</script>

<style lang="scss" scoped>
.frontend-setting {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--aix-colorBgContainer);
}

.frontend-setting__editor {
  flex: 1;
  min-height: 0;
}
</style>
