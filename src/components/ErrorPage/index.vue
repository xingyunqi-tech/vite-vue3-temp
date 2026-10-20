<template>
  <div class="error-page" :class="[`is-${props.tone}`, { 'is-fullscreen': props.fullscreen }]">
    <div class="error-content">
      <div v-if="props.icon" class="error-icon">
        <el-icon :size="28">
          <component :is="props.icon" />
        </el-icon>
      </div>
      <div class="error-code">{{ props.code }}</div>
      <h1 class="error-title">{{ props.title }}</h1>
      <p class="error-desc">{{ props.description }}</p>
      <div v-if="$slots.actions" class="error-actions">
        <slot name="actions" />
      </div>
      <div v-if="$slots.extra" class="error-extra">
        <slot name="extra" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

/**
 * 通用异常页（403 / 404 / 500 等）的纯展示骨架：图标 → 状态码 → 标题 → 说明 → 动作 → 附加内容
 *
 * 无背景、无卡片，内容在容器内垂直居中。全屏时铺满一屏；放在布局主区域内时撑满主区域剩余高度；
 * 内容超高（如横屏小窗）时随容器自然滚动，不裁切。
 */
interface Props {
  /** HTTP 状态码，作为视觉锚点展示 */
  code: string | number;
  /** 标题 */
  title: string;
  /** 说明文字 */
  description: string;
  /** 图标组件（@element-plus/icons-vue），不传则不渲染图标位 */
  icon?: Component;
  /** 视觉基调：primary 用于权限 / 路径类异常，error 用于程序或服务异常 */
  tone?: 'primary' | 'error';
  /** 全屏展示；放在布局主区域内时传 false */
  fullscreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  tone: 'primary',
  fullscreen: true,
});
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  box-sizing: border-box;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 48px 24px;

  &.is-fullscreen {
    min-height: 100dvh;
  }
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 520px;
  animation: content-appear 0.4s ease-out both;
  text-align: center;
}

@keyframes content-appear {
  from {
    transform: translateY(12px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 20px;
  border-radius: 50%;
  background: var(--aix-colorPrimaryBg);
  color: var(--aix-colorPrimary);

  .is-error & {
    background: var(--aix-colorErrorBg);
    color: var(--aix-colorError);
  }
}

// 状态码是页面的视觉锚点：足够大、足够实，不再做成几乎与底色同色的水印
.error-code {
  margin-bottom: 8px;
  color: var(--aix-colorTextHeading);
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
}

.error-title {
  margin: 0 0 12px;
  color: var(--aix-colorTextHeading);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.error-desc {
  margin: 0;
  color: var(--aix-colorTextSecondary);
  font-size: 14px;
  line-height: 1.7;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-top: 32px;

  :deep(.el-button) {
    min-width: 104px;
    margin-left: 0;
    border-radius: 8px;
    font-weight: 500;
  }
}

.error-extra {
  width: 100%;
  margin-top: 32px;
}

@media (width <= 768px) {
  .error-page {
    padding: 32px 16px;
  }

  .error-code {
    font-size: 52px;
  }

  .error-title {
    font-size: 18px;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;

    :deep(.el-button) {
      width: 100%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-content {
    animation: none;
  }
}
</style>
