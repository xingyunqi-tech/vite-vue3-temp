<template>
  <div class="stat-card">
    <div class="stat-icon" :style="iconStyles">
      <el-icon :style="iconColorStyle">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
    <div class="stat-trend" :class="trendType">
      <el-icon>
        <ArrowUp v-if="trendType === 'up'" />
        <ArrowDown v-else />
      </el-icon>
      <span>{{ trend }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import type { Component } from 'vue';

/**
 * 统计卡片组件属性接口
 * @description 定义统计卡片组件的所有属性类型
 */
interface Props {
  /**
   * 图标组件
   * @description 显示在卡片左侧的图标，可以是Element Plus图标或自定义组件
   * @example <StatisticsCard :icon="User" />
   */
  icon: string | Component;

  /**
   * 统计数值
   * @description 主要显示的统计数据，支持字符串和数字类型
   * @example value="1,234" 或 :value="1234"
   */
  value: string | number;

  /**
   * 标签文本
   * @description 统计数据的描述标签
   * @example label="总用户数"
   */
  label: string;

  /**
   * 趋势数值
   * @description 显示数据变化趋势的数值，通常为百分比
   * @example trend="+12.5%"
   */
  trend: string;

  /**
   * 趋势类型
   * @description 数据趋势方向，影响图标和颜色显示
   * @example trendType="up" 显示上升箭头和绿色
   */
  trendType: 'up' | 'down';

  /**
   * 图标颜色
   * @description 自定义图标颜色，默认使用主题色
   * @default 使用CSS变量 --colorPrimary
   */
  iconColor?: string;

  /**
   * 图标背景色
   * @description 自定义图标背景色，默认使用主题背景色
   * @default 使用CSS变量 --colorPrimaryBg
   */
  iconBg?: string;
}

/**
 * 组件属性默认值
 * @description 为可选属性提供默认值，使用CSS变量确保主题一致性
 */
const props = withDefaults(defineProps<Props>(), {
  iconColor: undefined, // 使用CSS变量默认值
  iconBg: undefined, // 使用CSS变量默认值
});

/**
 * 图标样式计算属性
 * @description 根据传入的props动态计算图标容器的样式
 */
const iconStyles = computed(() => ({
  background: props.iconBg || 'var(--colorPrimaryBg)',
  color: props.iconColor || 'var(--colorPrimary)',
}));

/**
 * 图标颜色样式计算属性
 * @description 根据传入的props动态计算图标的颜色样式
 */
const iconColorStyle = computed(() => ({
  color: props.iconColor || 'var(--colorPrimary)',
}));
</script>

<style scoped lang="scss">
.stat-card {
  display: flex;
  align-items: center;
  padding: 24px;
  transition: all 0.3s ease;
  border: 1px solid var(--colorBorderSecondary);
  border-radius: 12px;
  background: var(--colorBgContainer);
  box-shadow: 0 2px 8px var(--colorFillContent);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px var(--colorFill);
  }
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-right: 16px;
  border-radius: 12px;

  .el-icon {
    font-size: 24px;
  }
}

.stat-content {
  flex: 1;
}

.stat-value {
  margin-bottom: 4px;
  color: var(--colorTextHeading);
  font-size: 24px;
  font-weight: 600;
}

.stat-label {
  color: var(--colorTextSecondary);
  font-size: 14px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;

  &.up {
    color: var(--colorSuccess);
  }

  &.down {
    color: var(--colorError);
  }
}
</style>
