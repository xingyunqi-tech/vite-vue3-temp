<template>
  <div class="card-skeleton" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
    <el-skeleton v-for="i in count" :key="i" :rows="rows" animated class="card-skeleton__item">
      <template #template>
        <el-skeleton-item variant="h3" style="width: 60%" />
        <div style="margin: 16px 0">
          <el-skeleton-item
            v-for="j in rows"
            :key="j"
            variant="text"
            :style="{ width: j === rows ? '80%' : '100%', marginBottom: '8px' }"
          />
        </div>
        <el-skeleton-item variant="text" style="width: 80px" />
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
/**
 * CardSkeleton 卡片骨架屏组件
 * 基于 Element Plus el-skeleton 组件
 *
 * 支持自定义列数，适用于不同的卡片布局场景
 *
 * @example
 * ```vue
 * <!-- 2 列布局（默认） -->
 * <CardSkeleton :count="4" :rows="3" />
 *
 * <!-- 3 列布局 -->
 * <CardSkeleton :count="6" :rows="3" :columns="3" />
 *
 * <!-- 1 列布局 -->
 * <CardSkeleton :count="3" :rows="5" :columns="1" />
 * ```
 *
 * Props 类型定义同步于 @/interface/skeleton.ts CardSkeletonProps
 */
interface Props {
  /** 卡片数量 */
  count?: number;
  /** 每个卡片的行数 */
  rows?: number;
  /** 每行卡片列数 */
  columns?: number;
}

withDefaults(defineProps<Props>(), {
  count: 4,
  rows: 3,
  columns: 2,
});
</script>

<style scoped lang="scss">
.card-skeleton {
  display: grid;
  gap: 20px;
  padding: 20px;

  &__item {
    padding: 20px;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 8px;
    background: var(--aix-colorBgContainer);
  }
}
</style>
