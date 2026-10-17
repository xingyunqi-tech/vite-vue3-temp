<template>
  <Transition :name="transition" mode="out-in">
    <component :is="resolvedComponent" v-if="loading" v-bind="skeletonProps" :key="'skeleton'" />
    <!-- Transition 只渲染单个根节点：插槽可能有多个根（如 v-for 出的列表项），包一层才能全部渲染 -->
    <div v-else :key="'content'" class="skeleton-wrap__content">
      <slot />
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * SkeletonWrap 骨架屏包装组件
 *
 * 根据 loading 状态切换骨架屏和真实内容
 * 支持内置类型映射和自定义骨架屏组件
 *
 * @example
 * ```vue
 * <SkeletonWrap :loading="skeleton.visible.value" type="table">
 *   <el-table :data="list">...</el-table>
 * </SkeletonWrap>
 * ```
 */
import { computed, type Component } from 'vue';
import CardSkeleton from '../CardSkeleton/index.vue';
import TableSkeleton from '../TableSkeleton/index.vue';

type SkeletonType = 'card' | 'table';

interface Props {
  /** 是否显示骨架屏 */
  loading: boolean;
  /** 骨架屏类型 */
  type?: SkeletonType;
  /** 传给骨架屏组件的 props */
  skeletonProps?: Record<string, any>;
  /** 自定义骨架屏组件（优先级高于 type） */
  component?: Component;
  /** 过渡动画名，默认 'skeleton-fade' */
  transition?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: undefined,
  skeletonProps: () => ({}),
  component: undefined,
  transition: 'skeleton-fade',
});

// 内置类型 → 组件映射
const SKELETON_MAP: Record<SkeletonType, Component> = {
  card: CardSkeleton,
  table: TableSkeleton,
};

const resolvedComponent = computed(() => {
  // 自定义组件优先
  if (props.component) {
    return props.component;
  }
  // 类型映射
  if (props.type && props.type in SKELETON_MAP) {
    return SKELETON_MAP[props.type];
  }
  return null;
});
</script>

<style>
.skeleton-fade-enter-active,
.skeleton-fade-leave-active {
  transition: opacity 0.25s ease;
}

.skeleton-fade-enter-from,
.skeleton-fade-leave-to {
  opacity: 0;
}
</style>
