<template>
  <div class="error-boundary">
    <!-- 错误边界UI：复用通用异常页骨架，与 403/404 保持同一套视觉 -->
    <ErrorPage
      v-if="hasError"
      code="500"
      :title="props.errorTitle"
      :description="props.errorMessage"
      :icon="WarningFilled"
      tone="error"
    >
      <template #actions>
        <el-button type="primary" @click="handleRetry">{{ props.retryText }}</el-button>
        <el-button v-if="props.showHomeButton" @click="handleGoHome">{{ props.homeText }}</el-button>
      </template>

      <!-- 开发环境显示错误详情 -->
      <template v-if="isDev && errorDetails && props.showDetails" #extra>
        <div class="error-details">
          <el-collapse>
            <el-collapse-item title="错误详情" name="details">
              <div class="error-stack-wrapper">
                <div class="error-stack-header">
                  <span>错误堆栈</span>
                  <el-button size="small" text @click="copyErrorDetails">复制</el-button>
                </div>
                <pre class="error-stack">{{ errorDetails }}</pre>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </ErrorPage>

    <!-- 正常内容 -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { WarningFilled } from '@element-plus/icons-vue';
import { ElButton, ElCollapse, ElCollapseItem, ElMessage } from 'element-plus';
import { ref, onErrorCaptured, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { isFatalRenderError } from './fatal-error';
import ErrorPage from '@/components/ErrorPage/index.vue';
import { reportGlobalError } from '@/utils/error-handler';

/**
 * 组件属性
 */
interface Props {
  /** 错误标题 */
  errorTitle?: string;
  /** 错误消息 */
  errorMessage?: string;
  /** 重试按钮文本 */
  retryText?: string;
  /** 首页按钮文本 */
  homeText?: string;
  /** 是否显示首页按钮 */
  showHomeButton?: boolean;
  /** 是否显示错误详情（仅开发环境） */
  showDetails?: boolean;
  /** 是否自动重试 */
  autoRetry?: boolean;
  /** 自动重试延迟（毫秒） */
  autoRetryDelay?: number;
  /**
   * 自定义重试逻辑，传入后替代默认的整页刷新
   *
   * 父组件写 `@retry` 等价于传它（Vue 把 `@retry` 编译成 `onRetry` prop），不另设 retry 事件，否则会被调用两次
   */
  onRetry?: () => void;
  /**
   * 自定义「是否接管整页」的判定。返回 true 才显示错误页。
   * 不传时默认仅对渲染/生命周期等致命错误接管，事件处理器/watcher 等非致命错误只记录不接管。
   */
  shouldCatch?: (error: Error, errorInfo: string) => boolean;
}

/**
 * 组件事件
 *
 * 错误只经由 `error` 事件通知使用方：同名的 `onError` prop 会让父组件的 `@error`
 * 触发两次（Vue 把 `@error` 编译成 `onError` prop），两条出口只能留一条。
 */
interface Emits {
  (e: 'error', error: Error, errorInfo: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  errorTitle: '页面出现错误',
  errorMessage: '抱歉，页面遇到了一些问题。请尝试刷新页面或返回首页。',
  retryText: '重试',
  homeText: '返回首页',
  showHomeButton: true,
  showDetails: true,
  autoRetry: false,
  autoRetryDelay: 3000,
  onRetry: undefined,
  shouldCatch: undefined,
});

const emit = defineEmits<Emits>();
const router = useRouter();

// 组件状态
const hasError = ref(false);
const errorDetails = ref('');
const retryTimer = ref<number | null>(null);

const clearError = () => {
  if (retryTimer.value !== null) {
    clearTimeout(retryTimer.value);
    retryTimer.value = null;
  }
  hasError.value = false;
  errorDetails.value = '';
};

/** 导航成功提交后撤掉错误页，此时 slot 按新路由渲染 */
const removeAfterEach = router.afterEach((_to, _from, failure) => {
  if (!failure && hasError.value) clearError();
});

// 是否为开发环境
const isDev = computed(() => import.meta.env.DEV);

/**
 * 错误边界处理
 *
 * 返回 false 即截断冒泡，只在接管整页时这么做，否则 app.config.errorHandler 收不到组件错误。
 */
onErrorCaptured((error: Error, instance, errorInfo) => {
  // 接管与否都先通知使用方
  emit('error', error, errorInfo);

  // 非致命错误（事件处理器/watcher 等）：组件仍可用，不接管整页
  const isFatal = props.shouldCatch ? props.shouldCatch(error, errorInfo) : isFatalRenderError(errorInfo);
  if (!isFatal) {
    // 错误继续冒泡，由全局兜底记录与上报
    return;
  }

  hasError.value = true;

  // 构建错误详情
  errorDetails.value = `${error.stack}\n\nComponent: ${instance?.$?.type?.name || 'Unknown'}\nError Info: ${errorInfo}`;

  // 接管后错误不向上冒泡，主动交给全局上报出口
  reportGlobalError(error, 'vue', errorInfo);

  // 自动重试
  if (props.autoRetry && props.autoRetryDelay > 0) {
    retryTimer.value = window.setTimeout(() => {
      handleRetry();
    }, props.autoRetryDelay);
  }

  return false; // 已渲染错误页接管整页，阻止错误继续向上传播
});

/**
 * 重试处理
 */
const handleRetry = () => {
  // 清除自动重试定时器
  if (retryTimer.value !== null) {
    clearTimeout(retryTimer.value);
    retryTimer.value = null;
  }

  hasError.value = false;
  errorDetails.value = '';

  if (props.onRetry) {
    props.onRetry();
  } else {
    // 默认重新加载页面
    window.location.reload();
  }
};

/**
 * 返回首页
 */
const handleGoHome = async () => {
  await router.push('/');
  clearError();
};

/**
 * 复制错误详情
 */
const copyErrorDetails = async () => {
  try {
    await navigator.clipboard.writeText(errorDetails.value);
    ElMessage.success('错误详情已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败');
  }
};

/**
 * 组件卸载清理
 */
onUnmounted(() => {
  removeAfterEach();
  // 清理自动重试定时器
  if (retryTimer.value !== null) {
    clearTimeout(retryTimer.value);
    retryTimer.value = null;
  }
});

// 暴露方法给父组件
defineExpose({
  handleRetry,
  hasError,
});
</script>

<style scoped lang="scss">
.error-boundary {
  display: contents; // 不影响布局
}

.error-details {
  padding-top: 24px;
  border-top: 1px solid var(--aix-colorBorderSecondary);
  text-align: left;

  :deep(.el-collapse) {
    border: none;

    .el-collapse-item__header {
      padding: 0;
      border: none;
      background: transparent;
      color: var(--aix-colorTextTertiary);
      font-size: 13px;

      &:hover {
        color: var(--aix-colorText);
      }
    }

    .el-collapse-item__wrap {
      border: none;
      background: transparent;
    }

    .el-collapse-item__content {
      padding: 0;
    }
  }
}

.error-stack-wrapper {
  .error-stack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 8px 0;

    span {
      color: var(--aix-colorTextSecondary);
      font-size: 13px;
      font-weight: 500;
    }

    :deep(.el-button) {
      min-width: 0;
      color: var(--aix-colorPrimary);
      font-size: 12px;

      &:hover {
        color: var(--aix-colorPrimaryHover);
      }
    }
  }

  .error-stack {
    max-height: 240px;
    padding: 16px;
    overflow: auto;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 8px;
    background: var(--aix-colorFillAlter);
    color: var(--aix-colorTextSecondary);
    font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.8;
    word-break: break-all;
    white-space: pre-wrap;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      border-radius: 3px;
      background: var(--aix-colorFillTertiary);
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: var(--aix-colorFillSecondary);

      &:hover {
        background: var(--aix-colorFill);
      }
    }
  }
}

@media (width <= 640px) {
  .error-stack-wrapper .error-stack {
    max-height: 180px;
    padding: 12px;
    font-size: 11px;
  }
}
</style>
