<template>
  <div class="sentry-demo" data-testid="sentry-demo">
    <div class="demo-header">
      <h3>Sentry 功能演示</h3>
      <p>以下按钮可以测试各种 Sentry 功能</p>
    </div>

    <div class="demo-sections">
      <!-- 错误测试部分 -->
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <el-icon><WarningFilled /></el-icon>
            <span>错误测试</span>
          </div>
        </template>

        <div class="demo-actions">
          <el-button type="danger" data-testid="trigger-error" @click="triggerError"> 触发JavaScript错误 </el-button>

          <el-button type="warning" @click="triggerPromiseRejection"> 触发Promise拒绝 </el-button>

          <el-button type="info" @click="triggerCustomError"> 触发自定义错误 </el-button>
        </div>
      </el-card>

      <!-- 事件测试部分 -->
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <el-icon><DataBoard /></el-icon>
            <span>事件采集</span>
          </div>
        </template>

        <div class="demo-actions">
          <el-button type="primary" @click="captureInfo"> 记录信息事件 </el-button>

          <el-button type="warning" @click="captureWarning"> 记录警告事件 </el-button>

          <el-button @click="captureBreadcrumb"> 添加面包屑 </el-button>
        </div>
      </el-card>

      <!-- 用户信息测试 -->
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>用户信息</span>
          </div>
        </template>

        <div class="user-form">
          <el-form :model="userForm" label-width="80px" size="small">
            <el-form-item label="用户ID">
              <el-input v-model="userForm.id" placeholder="输入用户ID" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="userForm.username" placeholder="输入用户名" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="userForm.email" placeholder="输入邮箱" />
            </el-form-item>
          </el-form>

          <div class="demo-actions">
            <el-button type="primary" :disabled="!userForm.id" @click="setUserInfo"> 设置用户信息 </el-button>

            <el-button @click="clearUserInfo"> 清除用户信息 </el-button>
          </div>
        </div>
      </el-card>

      <!-- 性能测试部分 -->
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <el-icon><Timer /></el-icon>
            <span>性能监控</span>
          </div>
        </template>

        <div class="demo-actions">
          <el-button type="success" :disabled="!!currentTransaction" @click="startPerformanceTransaction">
            开始性能事务
          </el-button>

          <el-button type="warning" :disabled="!currentTransaction" @click="endPerformanceTransaction">
            结束性能事务
          </el-button>

          <el-button @click="simulateSlowOperation"> 模拟慢操作 </el-button>
        </div>

        <div v-if="performanceMetrics.length > 0" class="metrics-display">
          <h4>性能指标：</h4>
          <ul>
            <li v-for="metric in performanceMetrics" :key="metric.name">{{ metric.name }}: {{ metric.value }}ms</li>
          </ul>
        </div>
      </el-card>

      <!-- 标签和上下文测试 -->
      <el-card class="demo-card">
        <template #header>
          <div class="card-header">
            <el-icon><PriceTag /></el-icon>
            <span>标签和上下文</span>
          </div>
        </template>

        <div class="tag-form">
          <el-form :model="tagForm" label-width="80px" size="small">
            <el-form-item label="标签键">
              <el-input v-model="tagForm.key" placeholder="输入标签键" />
            </el-form-item>
            <el-form-item label="标签值">
              <el-input v-model="tagForm.value" placeholder="输入标签值" />
            </el-form-item>
          </el-form>

          <div class="demo-actions">
            <el-button type="primary" :disabled="!tagForm.key || !tagForm.value" @click="addTag"> 添加标签 </el-button>

            <el-button @click="addTestContext"> 添加测试上下文 </el-button>
          </div>
        </div>

        <div v-if="activeTags.length > 0" class="tags-display">
          <h4>活跃标签：</h4>
          <el-tag v-for="tag in activeTags" :key="tag.key" closable class="tag-item" @close="removeTag(tag.key)">
            {{ tag.key }}: {{ tag.value }}
          </el-tag>
        </div>
      </el-card>
    </div>

    <!-- 事件日志 -->
    <el-card class="event-log-card">
      <template #header>
        <div class="card-header">
          <el-icon><DocumentCopy /></el-icon>
          <span>事件日志</span>
          <el-button size="small" type="danger" text @click="clearEventLog"> 清空日志 </el-button>
        </div>
      </template>

      <div class="event-log">
        <div v-for="(event, index) in eventLog" :key="index" class="event-item" :class="`event-${event.level}`">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-level">{{ event.level.toUpperCase() }}</span>
          <span class="event-message">{{ event.message }}</span>
        </div>

        <div v-if="eventLog.length === 0" class="no-events">暂无事件记录</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { WarningFilled, DataBoard, User, Timer, PriceTag, DocumentCopy } from '@element-plus/icons-vue';
import * as Sentry from '@sentry/vue';
import { ElMessage } from 'element-plus';

/**
 * 事件日志接口
 */
interface EventLogItem {
  time: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * 性能指标接口
 */
interface PerformanceMetric {
  name: string;
  value: number;
}

/**
 * 标签接口
 */
interface Tag {
  key: string;
  value: string;
}

// 响应式数据
const eventLog = ref<EventLogItem[]>([]);
const currentTransaction = ref<any>(null);
const performanceMetrics = ref<PerformanceMetric[]>([]);
const activeTags = ref<Tag[]>([]);

// 表单数据
const userForm = reactive({
  id: '',
  username: '',
  email: '',
});

const tagForm = reactive({
  key: '',
  value: '',
});

/**
 * 添加事件日志
 */
const addEventLog = (level: 'info' | 'warning' | 'error', message: string) => {
  eventLog.value.unshift({
    time: new Date().toLocaleTimeString(),
    level,
    message,
  });

  // 限制日志数量
  if (eventLog.value.length > 50) {
    eventLog.value = eventLog.value.slice(0, 50);
  }
};

/**
 * 触发JavaScript错误
 */
const triggerError = () => {
  addEventLog('error', '即将触发JavaScript错误');

  setTimeout(() => {
    // 这会触发一个未捕获的错误
    throw new Error('这是一个演示用的JavaScript错误！');
  }, 100);
};

/**
 * 触发Promise拒绝
 */
const triggerPromiseRejection = () => {
  addEventLog('error', '即将触发Promise拒绝');

  Promise.reject(new Error('这是一个未处理的Promise拒绝！')).catch(error => {
    // 手动发送到Sentry（通常会自动捕获）
    Sentry.captureException(error);
  });
};

/**
 * 触发自定义错误
 */
const triggerCustomError = () => {
  addEventLog('error', '发送自定义错误到Sentry');

  const error = new Error('这是一个自定义错误，包含额外上下文信息');

  Sentry.withScope(scope => {
    scope.setTag('errorType', 'custom');
    scope.setLevel('error');
    scope.setContext('customErrorContext', {
      component: 'SentryDemo',
      action: 'triggerCustomError',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });

    Sentry.captureException(error);
  });

  ElMessage.error('自定义错误已发送到Sentry');
};

/**
 * 捕获信息事件
 */
const captureInfo = () => {
  const message = '这是一个信息级别的事件';

  addEventLog('info', message);

  Sentry.withScope(scope => {
    scope.setLevel('info');
    scope.setTag('eventType', 'demo');
    scope.setContext('demoEvent', {
      type: 'info',
      source: 'SentryDemo',
      timestamp: Date.now(),
    });

    Sentry.captureMessage(message);
  });

  ElMessage.success('信息事件已发送');
};

/**
 * 捕获警告事件
 */
const captureWarning = () => {
  const message = '这是一个警告级别的事件';

  addEventLog('warning', message);

  Sentry.withScope(scope => {
    scope.setLevel('warning');
    scope.setTag('eventType', 'demo');
    scope.setContext('demoEvent', {
      type: 'warning',
      source: 'SentryDemo',
      timestamp: Date.now(),
    });

    Sentry.captureMessage(message);
  });

  ElMessage.warning('警告事件已发送');
};

/**
 * 添加面包屑
 */
const captureBreadcrumb = () => {
  const message = '用户点击了面包屑按钮';

  addEventLog('info', `添加面包屑: ${message}`);

  Sentry.addBreadcrumb({
    message,
    category: 'user.interaction',
    level: 'info',
    data: {
      component: 'SentryDemo',
      action: 'captureBreadcrumb',
      timestamp: Date.now(),
    },
  });

  ElMessage.success('面包屑已添加');
};

/**
 * 设置用户信息
 */
const setUserInfo = () => {
  const userInfo = {
    id: userForm.id,
    username: userForm.username,
    email: userForm.email,
  };

  Sentry.setUser(userInfo);

  addEventLog('info', `设置用户信息: ${userForm.username || userForm.id}`);
  ElMessage.success('用户信息已设置');
};

/**
 * 清除用户信息
 */
const clearUserInfo = () => {
  Sentry.setUser(null);

  // 重置表单
  userForm.id = '';
  userForm.username = '';
  userForm.email = '';

  addEventLog('info', '用户信息已清除');
  ElMessage.success('用户信息已清除');
};

/**
 * 开始性能事务
 */
const startPerformanceTransaction = () => {
  addEventLog('info', '性能事务已开始');
  ElMessage.success('性能事务已开始');

  currentTransaction.value = {
    name: 'Demo Performance Transaction',
    startTime: Date.now(),
  };
};

/**
 * 结束性能事务
 */
const endPerformanceTransaction = () => {
  if (currentTransaction.value) {
    const duration = Date.now() - currentTransaction.value.startTime;

    performanceMetrics.value.push({
      name: 'Demo Transaction',
      value: duration,
    });

    // 发送性能指标到Sentry
    Sentry.setMeasurement('demo.transaction.duration', duration, 'millisecond');

    currentTransaction.value = null;

    addEventLog('info', `性能事务已结束，耗时: ${duration}ms`);
    ElMessage.success('性能事务已结束');
  }
};

/**
 * 模拟慢操作
 */
const simulateSlowOperation = async () => {
  addEventLog('info', '开始模拟慢操作...');

  const startTime = Date.now();

  // 使用Sentry跟踪慢操作
  await Sentry.startSpan(
    {
      name: 'Slow Operation Simulation',
      op: 'demo.slow',
    },
    async () => {
      // 模拟慢操作
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  );

  const duration = Date.now() - startTime;

  performanceMetrics.value.push({
    name: 'Slow Operation',
    value: duration,
  });

  addEventLog('info', `慢操作完成，耗时: ${duration}ms`);
  ElMessage.success(`慢操作完成，耗时: ${duration}ms`);
};

/**
 * 添加标签
 */
const addTag = () => {
  const { key, value } = tagForm;

  // 设置Sentry标签
  Sentry.setTag(key, value);

  // 添加到本地显示
  const existingIndex = activeTags.value.findIndex(tag => tag.key === key);
  if (existingIndex >= 0) {
    activeTags.value[existingIndex].value = value;
  } else {
    activeTags.value.push({ key, value });
  }

  addEventLog('info', `添加标签: ${key} = ${value}`);

  // 重置表单
  tagForm.key = '';
  tagForm.value = '';

  ElMessage.success('标签已添加');
};

/**
 * 移除标签
 */
const removeTag = (key: string) => {
  activeTags.value = activeTags.value.filter(tag => tag.key !== key);
  addEventLog('info', `移除标签: ${key}`);
  ElMessage.success('标签已移除');
};

/**
 * 添加测试上下文
 */
const addTestContext = () => {
  const context = {
    environment: 'demo',
    feature: 'sentry-integration',
    timestamp: new Date().toISOString(),
    browser: {
      name: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    },
  };

  Sentry.setContext('demoContext', context);

  addEventLog('info', '测试上下文已添加');
  ElMessage.success('测试上下文已添加');
};

/**
 * 清空事件日志
 */
const clearEventLog = () => {
  eventLog.value = [];
  performanceMetrics.value = [];
  ElMessage.success('事件日志已清空');
};
</script>

<style scoped lang="scss">
.sentry-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.demo-header {
  margin-bottom: 32px;
  text-align: center;

  h3 {
    margin: 0 0 8px;
    color: var(--colorTextHeading);
    font-size: 24px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--colorTextSecondary);
    font-size: 14px;
  }
}

.demo-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.demo-card {
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
}

.demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.user-form,
.tag-form {
  margin-bottom: 16px;
}

.metrics-display {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  background: var(--colorFillQuaternary);

  h4 {
    margin: 0 0 8px;
    color: var(--colorTextHeading);
    font-size: 14px;
  }

  ul {
    margin: 0;
    padding-left: 16px;
    color: var(--colorTextSecondary);
    font-size: 12px;
  }
}

.tags-display {
  margin-top: 16px;

  h4 {
    margin: 0 0 8px;
    color: var(--colorTextHeading);
    font-size: 14px;
  }

  .tag-item {
    margin: 0 8px 8px 0;
  }
}

.event-log-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    > div {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
  }
}

.event-log {
  max-height: 300px;
  overflow-y: auto;

  .event-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    gap: 12px;

    &.event-info {
      background: var(--colorInfoBg);
      color: var(--colorInfoText);
    }

    &.event-warning {
      background: var(--colorWarningBg);
      color: var(--colorWarningText);
    }

    &.event-error {
      background: var(--colorErrorBg);
      color: var(--colorErrorText);
    }

    .event-time {
      min-width: 80px;
      font-weight: 500;
    }

    .event-level {
      min-width: 60px;
      font-weight: 600;
    }

    .event-message {
      flex: 1;
    }
  }

  .no-events {
    padding: 24px;
    color: var(--colorTextSecondary);
    font-size: 14px;
    text-align: center;
  }
}

@media (width <= 768px) {
  .demo-sections {
    grid-template-columns: 1fr;
  }

  .demo-actions {
    flex-direction: column;
  }
}
</style>
