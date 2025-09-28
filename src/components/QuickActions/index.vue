<template>
  <div class="quick-actions">
    <h2>{{ title }}</h2>
    <el-row :gutter="20">
      <el-col v-for="action in actions" :key="action.key" :span="actionSpan">
        <div class="action-card" @click="handleAction(action.key)">
          <el-icon class="action-icon" :style="{ color: action.color || 'var(--colorPrimary)' }">
            <component :is="action.icon" />
          </el-icon>
          <div class="action-title">{{ action.title }}</div>
          <div class="action-desc">{{ action.description }}</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

/**
 * 快捷操作项接口
 * @description 定义单个快捷操作项的数据结构
 */
interface ActionItem {
  /**
   * 唯一标识
   * @description 用于区分不同操作项的唯一ID
   * @example key="create-user"
   */
  key: string;

  /**
   * 图标组件
   * @description 显示在操作卡片上的图标，支持Element Plus图标或自定义组件
   * @example icon="Plus" 或 icon={PlusIcon}
   */
  icon: string | Component;

  /**
   * 操作标题
   * @description 操作项的主标题文本
   * @example title="创建用户"
   */
  title: string;

  /**
   * 操作描述
   * @description 操作项的详细描述信息
   * @example description="快速创建新的用户账户"
   */
  description: string;

  /**
   * 图标颜色
   * @description 自定义图标颜色，默认使用主题色
   * @default 使用CSS变量 --colorPrimary
   */
  color?: string;
}

/**
 * 快捷操作组件属性接口
 * @description 定义快捷操作组件的所有属性类型
 */
interface Props {
  /**
   * 组件标题
   * @description 显示在操作列表上方的标题
   * @default "快捷操作"
   */
  title?: string;

  /**
   * 操作列表
   * @description 快捷操作项的数组，至少包含一个操作项
   * @example :actions="[{key: 'add', icon: 'Plus', title: '添加', description: '添加新项目'}]"
   */
  actions: ActionItem[];
}

/**
 * 组件事件接口
 * @description 定义组件可以触发的事件类型
 */
interface Emits {
  /**
   * 操作点击事件
   * @description 当用户点击某个操作项时触发
   * @param e - 事件名称
   * @param key - 被点击的操作项的key
   * @example @action-click="handleActionClick"
   */
  (e: 'action-click', key: string): void;
}

/**
 * 组件属性默认值
 */
const props = withDefaults(defineProps<Props>(), {
  title: '快捷操作',
});

/**
 * 组件事件发射器
 */
const emit = defineEmits<Emits>();

/**
 * 计算每个操作卡片的布局占位
 * @description 根据操作数量自动计算合适的列数，确保布局美观
 * @returns {number} Element Plus Grid 系统中的span值 (1-24)
 */
const actionSpan = computed(() => {
  const count = props.actions.length;
  // 如果操作数量少于等于4个，平均分配宽度
  if (count <= 4) return Math.floor(24 / count);
  // 超过4个时，默认显示4列，剩余的换行显示
  return 6;
});

/**
 * 处理操作项点击事件
 * @description 当用户点击操作卡片时，向父组件发送事件
 * @param {string} key - 被点击的操作项的唯一标识
 */
const handleAction = (key: string) => {
  emit('action-click', key);
};
</script>

<style scoped lang="scss">
.quick-actions {
  margin-bottom: 24px;

  h2 {
    margin: 0 0 16px;
    color: var(--colorTextHeading);
    font-size: 20px;
    font-weight: 600;
  }
}

.action-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 140px;
  padding: 24px;
  transition: all 0.3s ease;
  border: 1px solid var(--colorBorderSecondary);
  border-radius: 12px;
  background: var(--colorBgContainer);
  box-shadow: 0 2px 8px var(--colorFillContent);
  text-align: center;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    border-color: var(--colorPrimary);
    box-shadow: 0 8px 25px var(--colorFill);
  }
}

.action-icon {
  margin-bottom: 12px;
  font-size: 32px;
}

.action-title {
  margin-bottom: 8px;
  color: var(--colorTextHeading);
  font-size: 16px;
  font-weight: 600;
}

.action-desc {
  color: var(--colorTextSecondary);
  font-size: 14px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (width <= 768px) {
  .action-card {
    height: auto;
    margin-bottom: 16px;
    padding: 20px;
  }
}
</style>
