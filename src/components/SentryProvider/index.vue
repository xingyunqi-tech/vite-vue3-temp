<template>
  <div class="sentry-provider">
    <!-- 错误边界功能 -->
    <div v-if="hasError" class="error-boundary-fallback">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3>页面出现错误</h3>
        <p>我们已经收到错误报告，正在处理中</p>
        <div class="error-actions">
          <el-button type="primary" @click="handleRetry"> 重试 </el-button>
          <el-button v-if="sentryEnabled && props.showFeedback" @click="handleFeedback"> 反馈问题 </el-button>
        </div>
      </div>
    </div>

    <!-- 正常内容 -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onErrorCaptured, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store';
import { ElButton } from 'element-plus';
import { isSentryEnabled } from '@/plugins/sentry/const';

/**
 * 用户信息接口
 */
interface UserInfo {
  id: string | number;
  username?: string;
  email?: string;
  avatar?: string;
  [key: string]: any;
}

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
  pageLoadTime?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
}

/**
 * 自定义事件接口
 */
interface CustomEvent {
  name: string;
  data?: Record<string, any>;
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  tags?: Record<string, string>;
}

/**
 * 组件属性
 */
interface Props {
  /** 是否显示反馈按钮 */
  showFeedback?: boolean;
  /** 采样率 */
  sampleRate?: number;
}

/**
 * 组件事件
 */
interface Emits {
  (e: 'error', error: Error, errorInfo: any, errorEventId?: string): void;
  (e: 'retry'): void;
  (e: 'userSet', user: UserInfo): void;
  (e: 'eventCaptured', event: CustomEvent): void;
  (e: 'performanceMetrics', metrics: PerformanceMetrics): void;
}

const props = withDefaults(defineProps<Props>(), {
  showFeedback: true,
  sampleRate: 1.0,
});

const emit = defineEmits<Emits>();
const route = useRoute();
const userStore = useUserStore();

// 组件状态
const hasError = ref(false);
const errorEventId = ref<string>('');
const performanceObservers = ref<PerformanceObserver[]>([]);
const sentryEnabled = ref(false);

// Sentry 实例（从外部初始化）
let Sentry: any = null;

// 内置配置
const autoConfig = {
  enabled: true,
  autoPageViews: true,
  autoUserInteractions: true,
  autoPerformance: true,
  autoHttpRequests: true,
  contextTags: { component: 'app-root', level: 'global' },
};

// 获取浏览器信息的辅助函数
const getBrowserInfo = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: '',
      language: '',
      platform: '',
      cookieEnabled: false,
    };
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
  };
};

// 内置的全局标签
const globalTags = computed(() => ({
  app: 'vite-vue3-template',
  version: '1.0.0',
  environment: import.meta.env.MODE,
  route: route?.name?.toString() || 'unknown',
}));

// 内置的全局上下文
const globalContext = computed(() => ({
  application: {
    name: 'Vite Vue3 Template',
    version: '1.0.0',
    environment: import.meta.env.MODE,
  },
  browser: getBrowserInfo(),
}));

// 内置的额外上下文
const extraContext = computed(() => ({
  route: route?.path,
  userAgent: getBrowserInfo().userAgent,
  timestamp: Date.now(),
}));

// 内置的用户信息
const currentUserInfo = computed(() => ({
  id: userStore.id || '',
  username: userStore.name || '',
  email: userStore.email || '',
  avatar: userStore.avatar || '',
}));

// 内置的错误处理函数
const handleGlobalError = (error: Error, errorInfo: any, errorEventId?: string) => {
  console.error('Global Sentry Error Boundary caught error:', error, errorInfo);
  console.log('Error Event ID:', errorEventId);
  // 可以在这里添加全局错误处理逻辑，比如显示通知、发送分析数据等
};

const handleGlobalRetry = () => {
  // 可以在这里实现全局重试逻辑
  window.location.reload();
};

/**
 * 获取 Sentry 实例
 */
const getSentryInstance = async () => {
  if (!isSentryEnabled()) {
    return false;
  }

  try {
    // 检查是否已经初始化
    const { loadSentry: loadSentryLib } = await import('@/plugins/sentry');
    Sentry = await loadSentryLib();

    if (Sentry && Sentry.getClient()) {
      sentryEnabled.value = true;
      return true;
    }

    console.warn('⚠️ Sentry not initialized');
    return false;
  } catch (error) {
    console.warn('⚠️ Failed to get Sentry instance:', error);
    sentryEnabled.value = false;
    return false;
  }
};

/**
 * 设置用户信息
 */
const setUser = (userInfo: UserInfo) => {
  if (!Sentry) return;

  // 过滤空值
  const filteredUserInfo: any = {};
  if (userInfo.id) filteredUserInfo.id = userInfo.id;
  if (userInfo.username) filteredUserInfo.username = userInfo.username;
  if (userInfo.email) filteredUserInfo.email = userInfo.email;
  if (userInfo.avatar) filteredUserInfo.avatar = userInfo.avatar;

  // 只有当有有效用户信息时才设置
  if (Object.keys(filteredUserInfo).length > 0) {
    Sentry.setUser(filteredUserInfo);
  }

  emit('userSet', userInfo);

  // 添加面包屑
  Sentry.addBreadcrumb({
    message: `User set: ${userInfo.username || userInfo.id}`,
    category: 'auth',
    level: 'info',
  });
};

/**
 * 设置全局标签
 */
const setGlobalTags = (tags: Record<string, string>) => {
  if (!Sentry) return;

  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
};

/**
 * 设置全局上下文
 */
const setGlobalContext = (context: Record<string, any>) => {
  if (!Sentry) return;

  Object.entries(context).forEach(([key, value]) => {
    Sentry.setContext(key, value);
  });
};

/**
 * 捕获自定义事件
 */
const captureEvent = (event: CustomEvent) => {
  if (!Sentry) return;

  const shouldSample = Math.random() < props.sampleRate;
  if (!shouldSample) return;

  Sentry.withScope((scope: any) => {
    if (event.level) {
      scope.setLevel(event.level);
    }

    if (event.tags) {
      Object.entries(event.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (event.data) {
      scope.setContext('eventData', event.data);
    }

    Sentry.captureMessage(event.name, event.level || 'info');
  });

  emit('eventCaptured', event);
};

/**
 * 添加面包屑
 */
const addBreadcrumb = (message: string, category?: string, level?: string, data?: any) => {
  if (!Sentry) return;

  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: (level as any) || 'info',
    data,
  });
};

/**
 * 采集页面访问
 */
const trackPageView = (path: string, title?: string) => {
  if (!Sentry) return;

  addBreadcrumb(`Navigate to ${path}`, 'navigation', 'info', {
    to: path,
    title: title || document.title,
  });

  // 设置页面标签
  Sentry.setTag('page.path', path);
  Sentry.setTag('page.title', title || document.title);

  // 开始页面性能跟踪
  if (autoConfig.autoPerformance) {
    Sentry.startSpan(
      {
        name: `pageload${path}`,
        op: 'pageload',
        description: `Page load: ${path}`,
      },
      () => {
        // 页面加载跟踪逻辑
      },
    );
  }
};

/**
 * 采集用户交互
 */
const trackUserInteraction = (element: HTMLElement, action: string) => {
  if (!Sentry) return;

  const elementInfo = {
    tagName: element.tagName,
    className: element.className,
    id: element.id,
    textContent: element.textContent?.slice(0, 100),
  };

  addBreadcrumb(`User ${action}`, 'ui.interaction', 'info', elementInfo);
};

/**
 * 采集性能指标
 */
const collectPerformanceMetrics = () => {
  if (!Sentry) return;

  const metrics: PerformanceMetrics = {};

  // 采集导航时间
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
  }

  // 采集Web Vitals
  try {
    // FCP (First Contentful Paint)
    const fcpEntries = performance.getEntriesByName('first-contentful-paint');
    if (fcpEntries.length > 0) {
      metrics.fcp = fcpEntries[0].startTime;
    }

    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        metrics.lcp = lastEntry.startTime;
        emit('performanceMetrics', metrics);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      performanceObservers.value.push(lcpObserver);
    }
  } catch (error) {
    console.warn('Performance metrics collection failed:', error);
  }

  // 发送基础指标
  if (Object.keys(metrics).length > 0) {
    emit('performanceMetrics', metrics);

    // 发送到Sentry
    if (Sentry) {
      Sentry.setContext('performance', metrics);
    }
  }
};

/**
 * 设置HTTP请求拦截
 */
const setupHttpTracking = () => {
  if (!Sentry) return;

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0] as string;
    const options = args[1] || {};

    const startTime = Date.now();

    try {
      const response = await originalFetch(...args);
      const duration = Date.now() - startTime;

      addBreadcrumb(`HTTP ${options.method || 'GET'} ${url}`, 'http', response.ok ? 'info' : 'warning', {
        url,
        method: options.method || 'GET',
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      addBreadcrumb(`HTTP ${options.method || 'GET'} ${url} failed`, 'http', 'error', {
        url,
        method: options.method || 'GET',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
};

/**
 * 错误边界处理
 */
onErrorCaptured((error: Error, instance, errorInfo) => {
  if (!Sentry) {
    console.error('Error caught but Sentry not available:', error);
    return false;
  }

  hasError.value = true;

  Sentry.withScope((scope: any) => {
    // 设置错误上下文
    scope.setContext('errorBoundary', {
      errorInfo,
      ...autoConfig.contextTags,
      ...extraContext.value,
      component: instance?.$?.type?.name || 'Unknown',
    });

    // 设置标签
    if (autoConfig.contextTags) {
      Object.entries(autoConfig.contextTags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // 捕获错误
    const eventId = Sentry.captureException(error);
    errorEventId.value = eventId;

    // 调用内置错误处理
    handleGlobalError(error, errorInfo, eventId);

    emit('error', error, errorInfo, eventId);
  });

  return false; // 阻止错误向上传播
});

/**
 * 重试处理
 */
const handleRetry = () => {
  hasError.value = false;
  errorEventId.value = '';

  // 调用内置重试处理
  handleGlobalRetry();

  emit('retry');
};

/**
 * 反馈处理
 */
const handleFeedback = () => {
  if (!Sentry || !Sentry.showReportDialog) return;

  Sentry.showReportDialog({
    eventId: errorEventId.value,
    user: currentUserInfo.value,
  });
};

/**
 * 监听路由变化
 */
watch(
  () => route.path,
  (newPath, oldPath) => {
    if (autoConfig.autoPageViews && newPath !== oldPath && Sentry) {
      trackPageView(newPath, route.meta?.title as string);
    }
  },
  { immediate: true },
);

/**
 * 监听用户信息变化
 */
watch(
  () => currentUserInfo.value,
  newUserInfo => {
    if (newUserInfo && Sentry) {
      setUser(newUserInfo);
    }
  },
  { immediate: true, deep: true },
);

/**
 * 监听全局标签变化
 */
watch(
  () => globalTags.value,
  newTags => {
    if (newTags && Sentry) {
      setGlobalTags(newTags);
    }
  },
  { immediate: true, deep: true },
);

/**
 * 监听全局上下文变化
 */
watch(
  () => globalContext.value,
  newContext => {
    if (newContext && Sentry) {
      setGlobalContext(newContext);
    }
  },
  { immediate: true, deep: true },
);

/**
 * 组件挂载
 */
// 保存清理函数的引用
let clickHandler: ((event: Event) => void) | null = null;

onMounted(async () => {
  // 获取 Sentry 实例
  await getSentryInstance();

  if (!sentryEnabled.value) return;

  // 设置用户交互监听
  if (autoConfig.autoUserInteractions) {
    clickHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target) {
        trackUserInteraction(target, 'click');
      }
    };

    document.addEventListener('click', clickHandler, { passive: true });
  }

  // 采集性能指标
  if (autoConfig.autoPerformance) {
    setTimeout(collectPerformanceMetrics, 1000);
  }

  // 设置HTTP请求追踪
  if (autoConfig.autoHttpRequests) {
    setupHttpTracking();
  }

  // 添加组件初始化面包屑
  addBreadcrumb('SentryProvider mounted', 'ui.lifecycle');
});

/**
 * 组件卸载清理
 */
onUnmounted(() => {
  // 清理点击事件监听器
  if (clickHandler) {
    document.removeEventListener('click', clickHandler);
    clickHandler = null;
  }

  // 清理性能观察器
  performanceObservers.value.forEach(observer => {
    observer.disconnect();
  });
  performanceObservers.value = [];

  // 添加组件卸载面包屑
  addBreadcrumb('SentryProvider unmounted', 'ui.lifecycle');
});

// 暴露方法给父组件
defineExpose({
  setUser,
  setGlobalTags,
  setGlobalContext,
  captureEvent,
  addBreadcrumb,
  trackPageView,
  trackUserInteraction,
  handleRetry,
  handleFeedback,
  sentryEnabled: sentryEnabled.value,
});
</script>

<style scoped lang="scss">
.sentry-provider {
  display: contents; // 不影响布局
}

.error-boundary-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 24px;
  border: 1px solid var(--colorBorderSecondary);
  border-radius: 8px;
  background-color: var(--colorBgContainer);
}

.error-content {
  max-width: 400px;
  text-align: center;
}

.error-icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.error-content h3 {
  margin: 0 0 8px;
  color: var(--colorTextHeading);
  font-size: 18px;
  font-weight: 600;
}

.error-content p {
  margin: 0 0 24px;
  color: var(--colorTextSecondary);
  font-size: 14px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
