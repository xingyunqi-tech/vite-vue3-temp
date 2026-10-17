<template>
  <div class="table-skeleton">
    <!-- 搜索栏骨架 -->
    <div v-if="showSearchBar" class="table-skeleton__search">
      <el-skeleton-item
        v-for="i in searchFields"
        :key="i"
        variant="text"
        style="height: 40px; border-radius: 4px"
        class="table-skeleton__search-item"
      />
      <el-skeleton-item variant="button" style="width: 80px; height: 40px; border-radius: 4px" />
    </div>

    <!-- 操作栏骨架 -->
    <div v-if="showToolbar" class="table-skeleton__toolbar">
      <el-skeleton-item variant="button" style="width: 100px; height: 36px; border-radius: 4px" />
      <el-skeleton-item variant="button" style="width: 100px; height: 36px; border-radius: 4px" />
      <el-skeleton-item variant="button" style="width: 100px; height: 36px; border-radius: 4px" />
    </div>

    <!-- 表格骨架 -->
    <div class="table-skeleton__table">
      <!-- 表头 -->
      <div class="table-skeleton__header">
        <el-skeleton-item
          v-for="i in columns"
          :key="i"
          variant="text"
          style="height: 20px"
          class="table-skeleton__header-cell"
        />
      </div>

      <!-- 表格内容 -->
      <div class="table-skeleton__body">
        <div v-for="i in rows" :key="i" class="table-skeleton__row">
          <el-skeleton-item
            v-for="j in columns"
            :key="j"
            variant="text"
            :style="{ height: '16px', width: j === 1 ? '60%' : '80%' }"
            class="table-skeleton__cell"
          />
        </div>
      </div>
    </div>

    <!-- 分页骨架 -->
    <div v-if="showPagination" class="table-skeleton__pagination">
      <el-skeleton-item variant="text" style="width: 200px; height: 32px; border-radius: 4px" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TableSkeleton 表格骨架屏组件
 * 基于 Element Plus el-skeleton-item 组件
 *
 * 适用于数据表格页面的加载状态
 * 包含搜索栏、操作栏、表格内容和分页器骨架
 *
 * @example
 * ```vue
 * <!-- 基础表格（默认配置） -->
 * <TableSkeleton />
 *
 * <!-- 自定义列数和行数 -->
 * <TableSkeleton :columns="6" :rows="10" />
 *
 * <!-- 不显示搜索栏 -->
 * <TableSkeleton :show-search-bar="false" />
 *
 * <!-- 简单表格（无搜索栏、工具栏、分页） -->
 * <TableSkeleton
 *   :show-search-bar="false"
 *   :show-toolbar="false"
 *   :show-pagination="false"
 * />
 * ```
 *
 * Props 类型定义同步于 @/interface/skeleton.ts TableSkeletonProps
 */
interface Props {
  /** 表格列数 */
  columns?: number;
  /** 表格行数 */
  rows?: number;
  /** 是否显示搜索栏 */
  showSearchBar?: boolean;
  /** 搜索栏字段数量 */
  searchFields?: number;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示分页器 */
  showPagination?: boolean;
}

withDefaults(defineProps<Props>(), {
  columns: 5,
  rows: 8,
  showSearchBar: true,
  searchFields: 3,
  showToolbar: true,
  showPagination: true,
});
</script>

<style scoped lang="scss">
.table-skeleton {
  padding: 20px;
  background: var(--aix-colorBgContainer);

  /**
   * 搜索栏
   */
  &__search {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }

  &__search-item {
    flex: 1;
    max-width: 200px;
  }

  /**
   * 工具栏
   */
  &__toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  /**
   * 表格
   */
  &__table {
    overflow: hidden;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 4px;
  }

  /**
   * 表头
   */
  &__header {
    display: grid;
    gap: 16px;
    align-items: center;
    height: 55px;
    padding: 0 16px;
    border-bottom: 1px solid var(--aix-colorBorderSecondary);
    background: var(--aix-colorFillAlter);
  }

  &__header-cell {
    height: 20px;
  }

  /**
   * 表格内容
   */
  &__body {
    background: var(--aix-colorBgContainer);
  }

  &__row {
    display: grid;
    gap: 16px;
    align-items: center;
    height: 55px;
    padding: 0 16px;
    border-bottom: 1px solid var(--aix-colorBorderSecondary);

    &:last-child {
      border-bottom: none;
    }
  }

  &__cell {
    height: 16px;
  }

  /**
   * 分页器
   */
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  /**
   * 响应式布局：根据列数自动计算列宽
   */
  &__header,
  &__row {
    grid-template-columns: repeat(v-bind(columns), 1fr);
  }
}
</style>
