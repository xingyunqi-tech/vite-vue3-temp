import { ref, type Ref } from 'vue';

/**
 * 组件级骨架屏 composable
 *
 * 管理 loading/visible 状态，支持延迟展示和最小展示时长，防止骨架屏闪烁
 *
 * @example
 * ```typescript
 * const skeleton = useSkeleton();
 *
 * onMounted(() => skeleton.withLoading(async () => {
 *   data.value = await fetchData();
 * }));
 * ```
 */

interface UseSkeletonOptions {
  /** 初始加载状态，默认 true */
  initialLoading?: boolean;
  /** 最小展示时长(ms)，防闪烁，默认 300 */
  minDuration?: number;
  /** 延迟展示(ms)，短请求不显示骨架屏，默认 0 */
  delay?: number;
}

interface UseSkeletonReturn {
  /** 真实加载状态 */
  loading: Ref<boolean>;
  /** 骨架屏是否可见（考虑 delay + minDuration） */
  visible: Ref<boolean>;
  /** 开始加载 */
  startLoading: () => void;
  /** 停止加载 */
  stopLoading: () => void;
  /** 包装异步函数，自动管理加载状态 */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  /** 清理内部定时器，组件卸载时调用，避免定时器在卸载后仍修改 ref */
  cleanup: () => void;
}

export function useSkeleton(options: UseSkeletonOptions = {}): UseSkeletonReturn {
  const { initialLoading = true, minDuration = 300, delay = 0 } = options;

  const loading = ref(initialLoading);
  const visible = ref(delay === 0 && initialLoading);

  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let showTimestamp = 0;

  function clearDelayTimer() {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
  }

  function clearHideTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function startLoading() {
    loading.value = true;
    clearHideTimer();

    if (delay > 0) {
      clearDelayTimer();
      delayTimer = setTimeout(() => {
        visible.value = true;
        showTimestamp = Date.now();
        delayTimer = null;
      }, delay);
    } else {
      visible.value = true;
      showTimestamp = Date.now();
    }
  }

  function stopLoading() {
    loading.value = false;
    clearDelayTimer();

    // 如果骨架屏还没显示过（delay 内请求完成），直接隐藏
    if (!visible.value) {
      return;
    }

    const elapsed = Date.now() - showTimestamp;
    const remaining = minDuration - elapsed;

    if (remaining > 0) {
      // 还没到最小展示时长，延迟隐藏（保存引用，避免卸载后定时器仍修改 ref）
      clearHideTimer();
      hideTimer = setTimeout(() => {
        visible.value = false;
        hideTimer = null;
      }, remaining);
    } else {
      visible.value = false;
    }
  }

  /** 清理所有内部定时器 */
  function cleanup() {
    clearDelayTimer();
    clearHideTimer();
  }

  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    startLoading();
    try {
      return await fn();
    } finally {
      stopLoading();
    }
  }

  // 初始状态：如果 initialLoading 且无 delay，记录展示时间
  if (initialLoading && delay === 0) {
    showTimestamp = Date.now();
  }

  return {
    loading,
    visible,
    startLoading,
    stopLoading,
    withLoading,
    cleanup,
  };
}
