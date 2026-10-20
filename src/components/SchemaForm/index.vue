<!--
  Schema 驱动的表单组件
  根据传入的 SiteSchema 自动渲染分组表单
-->
<template>
  <div class="schema-form">
    <el-card v-for="(section, sectionKey) in schema" :key="sectionKey">
      <template #header>
        <div class="section-header">
          <span class="section-title">{{ section.title }}</span>
          <span v-if="section.description" class="section-desc">
            {{ section.description }}
          </span>
        </div>
      </template>

      <el-form label-position="top" :model="modelValue" :disabled="disabled">
        <el-row :gutter="16">
          <el-col v-for="(field, fieldKey) in section.properties" :key="fieldKey" :span="field.span ?? 24">
            <el-form-item :error="issueOf(`${sectionKey}.${fieldKey}`)">
              <template #label>
                <span class="field-label">
                  {{ field.title }}
                  <el-tooltip v-if="field.description" :content="field.description" placement="top">
                    <el-icon class="field-help">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </span>
              </template>

              <!-- array: 数组列表编辑 -->
              <template v-if="field.type === 'array'">
                <div class="array-editor">
                  <div
                    v-for="(item, index) in getArrayValue(sectionKey as string, fieldKey as string)"
                    :key="getRowKey(item)"
                    class="array-editor__item"
                  >
                    <div class="array-editor__item-header">
                      <span class="array-editor__item-index">#{{ index + 1 }}</span>
                      <el-button
                        text
                        type="danger"
                        size="small"
                        @click="removeArrayItem(sectionKey as string, fieldKey as string, index)"
                      >
                        删除
                      </el-button>
                    </div>
                    <el-row :gutter="16">
                      <el-col v-for="(subField, subKey) in field.items" :key="subKey" :span="subField.span ?? 12">
                        <!-- 不用 el-form-item：它不支持嵌套，套在外层 form-item 里会让 label 与校验错乱 -->
                        <div class="array-editor__field">
                          <span class="array-editor__field-label">{{ subField.title }}</span>
                          <SchemaField
                            :field="subField"
                            :value="item[subKey as string]"
                            :uploader="uploader"
                            @change="
                              (val: unknown) =>
                                updateArrayItem(sectionKey as string, fieldKey as string, index, subKey as string, val)
                            "
                          />
                          <span
                            v-if="issueOf(`${sectionKey}.${fieldKey}[${index}].${subKey}`)"
                            class="array-editor__field-error"
                          >
                            {{ issueOf(`${sectionKey}.${fieldKey}[${index}].${subKey}`) }}
                          </span>
                        </div>
                      </el-col>
                    </el-row>
                  </div>
                  <el-button
                    type="primary"
                    plain
                    size="small"
                    :icon="Plus"
                    @click="addArrayItem(sectionKey as string, fieldKey as string, field.items)"
                  >
                    添加一项
                  </el-button>
                </div>
              </template>

              <!-- 基础字段：委托 SchemaField 渲染 -->
              <SchemaField
                v-else
                :field="field"
                :value="getFieldValue(sectionKey as string, fieldKey as string)"
                :uploader="uploader"
                @change="(val: unknown) => handleFieldChange(sectionKey as string, fieldKey as string, val)"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { QuestionFilled, Plus } from '@element-plus/icons-vue';
import { computed, toRaw } from 'vue';
import SchemaField from './SchemaField.vue';
import type { SiteSchema, IFieldSchema, IConfigIssue } from '@/plugins/site-config';

const props = defineProps<{
  schema: SiteSchema;
  modelValue: Record<string, Record<string, unknown>>;
  /**
   * 校验问题，由 validateConfig 产出
   *
   * 刻意不从 schema 生成 el-form 的 rules：那会把「什么算合法」复制成两份实现，
   * 且规则只在可视化模式生效。这里直接消费唯一那份校验结果，可视化和代码模式看到的是同一套判定。
   */
  issues?: IConfigIssue[];
  /** 文件上传器，透传给 SchemaField；不传则内联 base64 */
  uploader?: (file: File) => Promise<string>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, Record<string, unknown>>];
}>();

// path → 首条消息（同一字段可能产生多条，展示第一条即可）
const issueMap = computed(() => {
  const map = new Map<string, string>();
  for (const issue of props.issues ?? []) {
    if (!map.has(issue.path)) map.set(issue.path, issue.message);
  }
  return map;
});

/**
 * 取某个路径上的校验提示，交给 el-form-item 的 error 渲染
 */
function issueOf(path: string): string | undefined {
  return issueMap.value.get(path);
}

/**
 * 获取字段当前值
 */
function getFieldValue(sectionKey: string, fieldKey: string): unknown {
  return props.modelValue?.[sectionKey]?.[fieldKey];
}

/**
 * 获取数组字段的值
 */
function getArrayValue(sectionKey: string, fieldKey: string): Record<string, unknown>[] {
  return (getFieldValue(sectionKey, fieldKey) as Record<string, unknown>[]) ?? [];
}

/**
 * 为数组项生成稳定 key（基于对象身份的 WeakMap，不污染保存的配置数据）
 * 避免用下标作 key：删除中间项后下标前移会导致子组件（如 SchemaField 的 uploadedFileName 本地状态）串位。
 *
 * 一律以 toRaw 后的对象作键：modelValue 是响应式的，模板里拿到的是代理，而 updateArrayItem
 * 造出的新项是裸对象。两边不统一的话，emit 往返后代理换了一个，查不到键就会重新发号、整行重挂。
 */
let rowKeySeed = 0;
const rowKeyMap = new WeakMap<object, number>();
function getRowKey(item: Record<string, unknown>): number {
  const raw = toRaw(item);
  let key = rowKeyMap.get(raw);
  if (key === undefined) {
    key = ++rowKeySeed;
    rowKeyMap.set(raw, key);
  }
  return key;
}

/**
 * 字段变化，以不可变方式更新 modelValue
 */
function handleFieldChange(sectionKey: string, fieldKey: string, val: unknown): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [sectionKey]: {
      ...(props.modelValue?.[sectionKey] ?? {}),
      [fieldKey]: val,
    },
  });
}

/**
 * 添加数组项（取各字段 defaultValue）
 */
function addArrayItem(sectionKey: string, fieldKey: string, items: Record<string, IFieldSchema>): void {
  const newItem: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(items)) {
    // 深拷贝：defaultValue 可能是数组（多选枚举），直接引用会让每一行共享同一个实例，
    // 改其中一行会连带改掉所有行。口径与 site-config 的 extractDefaults 一致。
    newItem[k] = structuredClone(f.defaultValue);
  }
  const arr = [...getArrayValue(sectionKey, fieldKey), newItem];
  handleFieldChange(sectionKey, fieldKey, arr);
}

/**
 * 删除数组项
 */
function removeArrayItem(sectionKey: string, fieldKey: string, index: number): void {
  const arr = getArrayValue(sectionKey, fieldKey).filter((_, i) => i !== index);
  handleFieldChange(sectionKey, fieldKey, arr);
}

/**
 * 更新数组项的某个子字段
 */
function updateArrayItem(sectionKey: string, fieldKey: string, index: number, subKey: string, val: unknown): void {
  const arr = [...getArrayValue(sectionKey, fieldKey)];
  const oldItem = arr[index];
  const newItem = { ...oldItem, [subKey]: val };
  // 继承旧对象的稳定 key，保证编辑时该项不被 remount（否则正在输入的控件会失焦）
  const key = rowKeyMap.get(toRaw(oldItem));
  if (key !== undefined) rowKeyMap.set(newItem, key);
  arr[index] = newItem;
  handleFieldChange(sectionKey, fieldKey, arr);
}
</script>

<style lang="scss" scoped>
.schema-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .section-title {
    font-size: 14px;
    font-weight: 600;
  }

  .section-desc {
    color: var(--aix-colorTextSecondary);
    font-size: 12px;
  }
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  .field-help {
    color: var(--aix-colorTextSecondary);
    font-size: 14px;
    cursor: pointer;
  }
}

.array-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  &__item {
    padding: 16px;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 8px;
    background: var(--aix-colorBgContainer);
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--aix-colorBorderSecondary);
  }

  &__item-index {
    color: var(--aix-colorTextSecondary);
    font-size: 13px;
    font-weight: 600;
  }

  &__field {
    display: flex;
    flex-direction: column;
    margin-bottom: 18px;
    gap: 4px;
  }

  &__field-label {
    color: var(--aix-colorTextSecondary);
    font-size: 13px;
    line-height: 20px;
  }

  &__field-error {
    color: var(--aix-colorError);
    font-size: 12px;
    line-height: 16px;
  }
}
</style>
