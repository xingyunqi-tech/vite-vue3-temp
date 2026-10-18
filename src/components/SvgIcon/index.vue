<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * 图标名称
   * - 本地 SVG: 使用 "目录-文件名" 格式，如 "common-arrow-right"
   * - iconfont: 使用完整 id，如 "icon-Union"
   */
  name: string;
  /** 图标名称前缀，用于拼接 symbolId，须与 vite.config.ts 的 symbolId 前缀一致 */
  prefix?: string;
  /** 图标大小，同时设置宽高，优先级低于单独的 width/height */
  size?: string | number;
  /** 单独设置宽度 */
  width?: string | number;
  /** 单独设置高度 */
  height?: string | number;
  /** 图标颜色，默认继承父元素 */
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'vite-vue3-temp',
  size: '1em',
  width: undefined,
  height: undefined,
  color: 'currentColor',
});

/** iconfont.js 注入的 symbol id 前缀 */
const ICONFONT_PREFIX = 'icon-';
const symbolId = computed(() => {
  const { name, prefix } = props;
  return name.startsWith(ICONFONT_PREFIX) ? `#${name}` : `#${prefix}-${name}`;
});
const toUnit = (val: string | number) => (typeof val === 'number' ? `${val}px` : val);
const iconWidth = computed(() => toUnit(props.width ?? props.size));
const iconHeight = computed(() => toUnit(props.height ?? props.size));
</script>

<template>
  <svg class="svg-icon" :style="{ width: iconWidth, height: iconHeight, color }" aria-hidden="true">
    <use :xlink:href="symbolId" />
  </svg>
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  overflow: hidden;
  fill: currentColor;
  vertical-align: middle;
}
</style>
