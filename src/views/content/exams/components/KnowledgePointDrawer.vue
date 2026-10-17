<template>
  <el-drawer
    :model-value="modelValue"
    :title="subject ? `知识点 · ${subject.name}` : '知识点'"
    size="640px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="load(subject?.id ?? '')"
  >
    <div class="kp-drawer__toolbar">
      <el-button type="primary" @click="openCreate(null)">新增一级知识点</el-button>
      <el-button :loading="loading" @click="load()">刷新</el-button>
      <span class="kp-drawer__hint">最多三级；题目只能关联叶子节点，括号内为已发布题目数</span>
    </div>

    <el-tree
      v-loading="loading"
      :data="tree"
      node-key="id"
      :props="{ label: 'name', children: 'children' }"
      default-expand-all
      :expand-on-click-node="false"
      empty-text="暂无知识点"
      class="kp-drawer__tree"
    >
      <template #default="{ data }">
        <div class="kp-node">
          <span class="kp-node__name">{{ data.name }}</span>
          <span class="kp-node__count">（{{ data.questionCount }}）</span>
          <el-tag v-if="data.isLeaf" size="small" type="success" class="kp-node__tag">叶子</el-tag>
          <span class="kp-node__actions" @click.stop>
            <el-button
              v-if="data.level < MAX_KNOWLEDGE_LEVEL"
              link
              type="primary"
              :disabled="data.isLeaf && data.questionCount > 0"
              :title="data.isLeaf && data.questionCount > 0 ? '已关联题目，请先迁移题目' : ''"
              @click="openCreate(data)"
            >
              子节点
            </el-button>
            <el-button link type="primary" @click="openEdit(data)">编辑</el-button>
            <el-button link type="primary" @click="openMove(data)">移动</el-button>
            <el-button v-if="data.isLeaf" link type="primary" @click="openMigrate(data)">迁移题目</el-button>
            <el-button link type="danger" @click="handleRemove(data)">删除</el-button>
          </span>
        </div>
      </template>
    </el-tree>

    <KnowledgePointFormDialog
      v-model="formVisible"
      :title="formTarget.node ? '编辑知识点' : '新增知识点'"
      :initial="formTarget.node ? { name: formTarget.node.name, sort: formTarget.node.sort } : null"
      :parent-name="formTarget.parent?.name ?? ''"
      :saving="saving"
      @submit="handleFormSubmit"
    />
    <KnowledgePointPickDialog
      v-model="pickVisible"
      :title="pickMode === 'move' ? '移动知识点' : '迁移题目'"
      :description="pickDescription"
      :options="pickOptions"
      :allow-root="pickMode === 'move'"
      :saving="saving"
      @submit="handlePickSubmit"
    />
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import { confirmAction, runAction } from '../../shared/actions';
import {
  MAX_KNOWLEDGE_LEVEL,
  migrateTargets,
  moveTargets,
  toTreeOptions,
  type KnowledgeNode,
  type TreeOption,
} from '../../shared/knowledge-tree';
import { useKnowledgeTree, type KnowledgePointDraft } from '../useKnowledgeTree';
import KnowledgePointFormDialog from './KnowledgePointFormDialog.vue';
import KnowledgePointPickDialog from './KnowledgePointPickDialog.vue';
import type { Subject } from '@/api';

interface Props {
  modelValue: boolean;
  subject: Subject | null;
}

defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { tree, loading, load, create, update, move, migrate, remove } = useKnowledgeTree();

const saving = ref(false);
const formVisible = ref(false);
const formTarget = reactive<{ node: KnowledgeNode | null; parent: KnowledgeNode | null }>({ node: null, parent: null });
const pickVisible = ref(false);
const pickMode = ref<'move' | 'migrate'>('move');
const pickNode = ref<KnowledgeNode | null>(null);

/** 只保留可选节点及其祖先，其余祖先置灰 */
function filterOptions(nodes: KnowledgeNode[], allowed: Set<string>): TreeOption[] {
  return toTreeOptions(nodes).flatMap(function keep(option): TreeOption[] {
    const children = (option.children ?? []).flatMap(keep);
    if (!allowed.has(option.value) && children.length === 0) return [];
    return [{ ...option, disabled: !allowed.has(option.value), children: children.length ? children : undefined }];
  });
}

const pickOptions = computed(() => {
  const node = pickNode.value;
  if (!node) return [];
  const targets = pickMode.value === 'move' ? moveTargets(tree.value, node) : migrateTargets(tree.value, node);
  return filterOptions(tree.value, new Set(targets.map(target => target.id)));
});

const pickDescription = computed(() => {
  const node = pickNode.value;
  if (!node) return '';
  return pickMode.value === 'move'
    ? `将「${node.name}」及其下级移动到所选节点下，移动后总层级不超过三级；已关联题目（含草稿题）的叶子节点不能作为目标，选择后会被拒绝`
    : `将「${node.name}」关联的全部题目迁移到所选叶子知识点`;
});

const openCreate = (parent: KnowledgeNode | null) => {
  formTarget.node = null;
  formTarget.parent = parent;
  formVisible.value = true;
};

const openEdit = (node: KnowledgeNode) => {
  formTarget.node = node;
  formTarget.parent = null;
  formVisible.value = true;
};

const openMove = (node: KnowledgeNode) => {
  pickMode.value = 'move';
  pickNode.value = node;
  pickVisible.value = true;
};

const openMigrate = (node: KnowledgeNode) => {
  pickMode.value = 'migrate';
  pickNode.value = node;
  pickVisible.value = true;
};

const withSaving = async (task: () => Promise<unknown>, message?: string) => {
  saving.value = true;
  const ok = await runAction(task, message);
  saving.value = false;
  return ok;
};

const handleFormSubmit = async (draft: KnowledgePointDraft) => {
  const node = formTarget.node;
  const ok = node
    ? await withSaving(() => update(node.id, draft), '已保存')
    : await withSaving(() => create(formTarget.parent?.id ?? null, draft), '已新增');
  if (ok) formVisible.value = false;
};

const handlePickSubmit = async (targetId: string | null) => {
  const node = pickNode.value;
  if (!node) return;
  if (pickMode.value === 'move') {
    if (await withSaving(() => move(node.id, targetId), '已移动')) pickVisible.value = false;
    return;
  }
  if (!targetId) return;
  const ok = await withSaving(async () => {
    const result = await migrate(node.id, targetId);
    ElMessage.success(`已迁移 ${result.migrated} 道题目`);
  });
  if (ok) pickVisible.value = false;
};

const handleRemove = async (node: KnowledgeNode) => {
  if (!(await confirmAction(`删除知识点「${node.name}」？仍有下级或关联题目时无法删除`, '删除知识点'))) return;
  await runAction(() => remove(node.id), '已删除');
};
</script>

<style scoped lang="scss">
.kp-drawer {
  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}

.kp-node {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  padding-right: 8px;

  &__name {
    overflow: hidden;
    color: var(--aix-colorText);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    color: var(--aix-colorTextTertiary);
  }

  &__tag {
    margin-left: 6px;
  }

  &__actions {
    margin-left: auto;
  }
}
</style>
