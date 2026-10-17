<!--
  配置编辑器：可视化表单 / JSON 代码双模

  两条设计约束（改动前请先读）：
  1. 代码模式下 jsonText 是编辑器自己的本地状态，**不向上游实时回写**。
     取值统一走 defineExpose 的 parsed，调用方拿到的永远是编辑器里的当下内容。
  2. 切换模式走 requestMode——校验通过才真正改 mode。失败时根本没切走，
     待修正的非法 JSON 天然保留，因此不需要任何「切回来时别覆盖草稿」的标记。
-->
<template>
  <div class="config-editor">
    <div class="config-editor__toolbar">
      <el-radio-group :model-value="mode" size="small" @change="onModeChange">
        <el-radio-button value="visual">可视化</el-radio-button>
        <el-radio-button value="code">代码</el-radio-button>
      </el-radio-group>
      <div class="config-editor__actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- 可视化模式：问题挂在各字段上 -->
    <div v-if="mode === 'visual'" class="config-editor__visual">
      <SchemaForm
        :schema="schema"
        :model-value="modelValue"
        :issues="issues"
        :uploader="uploader"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>

    <!-- 代码模式：问题没有字段可挂，汇总成列表 -->
    <div v-else class="config-editor__code">
      <div class="config-editor__code-body">
        <CodeEditor v-model="jsonText" language="json" :theme="editorTheme" height="100%" />
      </div>
      <div v-if="!parsed.ok" class="config-editor__issues config-editor__issues--fatal">
        JSON 语法错误，暂时无法校验内容
      </div>
      <ul v-else-if="issues?.length" class="config-editor__issues">
        <li v-for="issue in issues" :key="`${issue.path}-${issue.message}`">
          <span class="config-editor__issue-path">{{ issue.path || '(根节点)' }}</span>
          {{ issue.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CodeEditor } from '@aix/code-editor';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import SchemaForm from '@/components/SchemaForm/index.vue';
import type { SiteSchema, IConfigIssue } from '@/plugins/site-config';
import { useGlobalStore } from '@/store';

type EditMode = 'visual' | 'code';
type ConfigValue = Record<string, Record<string, unknown>>;

/** 编辑器当前内容；code 模式下 JSON 非法时 ok 为 false */
type ParsedValue = { ok: true; value: ConfigValue } | { ok: false; value: null };

const props = defineProps<{
  schema: SiteSchema;
  modelValue: ConfigValue;
  /** 校验问题（由调用方对当前值跑 validateConfig 得到），可视化模式挂到字段上，代码模式汇总展示 */
  issues?: IConfigIssue[];
  /** 文件上传器，透传给 SchemaField；不传则内联 base64 */
  uploader?: (file: File) => Promise<string>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ConfigValue];
}>();

const globalStore = useGlobalStore();
const editorTheme = computed(() => (globalStore.currentTheme === 'dark' ? 'dark' : 'light'));

const mode = ref<EditMode>('visual');

// code 模式草稿文本（仅在进入 code 模式和 reload() 时被重新序列化）
const jsonText = ref('');

/**
 * 当前编辑中的值
 * - 可视化模式：modelValue 就是最新值（SchemaForm 每次改动都会 emit）
 * - 代码模式：以编辑器里的文本为准，不依赖任何同步时机
 */
const parsed = computed<ParsedValue>(() => {
  if (mode.value === 'visual') return { ok: true, value: props.modelValue };
  try {
    const value: unknown = JSON.parse(jsonText.value);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false, value: null };
    return { ok: true, value: value as ConfigValue };
  } catch {
    return { ok: false, value: null };
  }
});

/**
 * 请求切换模式：校验通过才真正改 mode
 */
function requestMode(next: EditMode): void {
  if (next === mode.value) return;

  if (next === 'code') {
    jsonText.value = JSON.stringify(props.modelValue, null, 2);
    mode.value = 'code';
    return;
  }

  const current = parsed.value;
  if (!current.ok) {
    ElMessage.error('JSON 格式错误，无法切换到可视化模式，请检查代码');
    return;
  }
  emit('update:modelValue', current.value);
  mode.value = 'visual';
}

function onModeChange(value: string | number | boolean | undefined): void {
  if (value === 'visual' || value === 'code') requestMode(value);
}

/**
 * 外部改写了配置（保存后落库、「恢复默认」）后，让代码模式的文本跟上
 *
 * 两个刻意的设计：
 * - 显式调用而非 watch(modelValue)：watch 会形成「emit → modelValue 变 →
 *   覆盖用户正在编辑的文本」的回环，得靠额外的标记去压制。
 * - 值由调用方传入而非读 props：调用方通常刚改完自己的草稿 ref，而 props 要等
 *   父组件重渲染才更新，此刻读 props.modelValue 拿到的是旧值。
 */
function reload(value: ConfigValue): void {
  if (mode.value === 'code') jsonText.value = JSON.stringify(value, null, 2);
}

defineExpose({ mode, parsed, requestMode, reload });
</script>

<style lang="scss" scoped>
.config-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.config-editor__toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--aix-colorBorderSecondary);
}

.config-editor__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-editor__visual {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
}

// 高度由 flex 轨道给出，逐级传递到 CodeMirror；
// 不再用 calc(100vh - 280px) 那种和 toolbar 高度隐式耦合的魔法数
.config-editor__code {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.config-editor__code-body {
  flex: 1;
  min-height: 0;

  :deep(.aix-code-editor),
  :deep(.aix-code-editor__content),
  :deep(.cm-editor) {
    height: 100%;
  }
}

.config-editor__issues {
  flex-shrink: 0;
  max-height: 120px;
  margin: 0;
  padding: 8px 16px;
  overflow-y: auto;
  border-top: 1px solid var(--aix-colorBorderSecondary);
  background-color: var(--aix-colorFillQuaternary);
  color: var(--aix-colorTextSecondary);
  font-size: 12px;
  line-height: 20px;
  list-style: none;

  &--fatal {
    color: var(--aix-colorError);
  }
}

.config-editor__issue-path {
  margin-right: 6px;
  color: var(--aix-colorText);
  font-family: var(--aix-fontFamilyCode);
}
</style>
