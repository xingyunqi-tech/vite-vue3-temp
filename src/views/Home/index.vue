<template>
  <div class="home-container">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>欢迎回来！</h1>
        <p>今天是 {{ currentDate }}，祝您工作愉快！</p>
      </div>
      <div class="user-info">
        <el-avatar :size="60" :src="userStore.avatar || undefined">
          <el-icon><User /></el-icon>
        </el-avatar>
        <div class="user-details">
          <h3>{{ userStore.name || '管理员' }}</h3>
          <p>上次登录：{{ lastLoginTime }}</p>
        </div>
      </div>
    </div>

    <!-- Sentry测试按钮 -->
    <div
      class="sentry-test-section"
      style="
        margin-bottom: 24px;
        padding: 20px;
        border: 1px solid var(--colorBorderSecondary);
        border-radius: 8px;
        background-color: var(--colorBgContainer);
      "
    >
      <h3 style="margin-bottom: 16px">🔧 Sentry 测试</h3>
      <el-space>
        <el-button type="primary" @click="testSentryError">测试错误捕获</el-button>
        <el-button type="success" @click="testSentryMessage">测试消息发送</el-button>
        <el-button type="warning" @click="testPerformance">测试性能监控</el-button>
      </el-space>
    </div>

    <!-- Sentry 错误监控演示 -->
    <div class="sentry-section">
      <h2>Sentry 错误监控演示</h2>
      <SentryDemo />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { User } from '@element-plus/icons-vue';
import { useUserStore } from '@/store';
import SentryDemo from '@/components/SentryDemo/index.vue';

// Store
const userStore = useUserStore();

// 计算属性
const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
});

const lastLoginTime = computed(() => {
  return new Date().toLocaleString('zh-CN');
});

// Sentry测试函数
const testSentryError = () => {
  try {
    // 故意抛出一个错误来测试错误捕获
    throw new Error('这是一个Sentry测试错误，用于验证错误捕获功能');
  } catch (error) {
    console.error('Sentry测试错误已触发:', error);
    ElMessage.error('已触发测试错误，请检查控制台和Sentry面板');
  }
};

const testSentryMessage = async () => {
  try {
    // 动态导入Sentry并发送消息
    const Sentry = await import('@sentry/vue');

    Sentry.captureMessage('这是一个Sentry测试消息', 'info');
    ElMessage.success('测试消息已发送到Sentry');

    // 添加面包屑
    Sentry.addBreadcrumb({
      message: '用户手动触发Sentry消息测试',
      category: 'user-action',
      level: 'info',
      data: {
        timestamp: Date.now(),
        page: '首页',
      },
    });
  } catch (error) {
    console.warn('Sentry可能未启用或加载失败:', error);
    ElMessage.warning('Sentry未启用或加载失败');
  }
};

const testPerformance = async () => {
  try {
    // 动态导入Sentry并测试性能监控
    const Sentry = await import('@sentry/vue');

    // 创建一个性能跨度
    Sentry.startSpan(
      {
        name: 'manual-performance-test',
        op: 'test',
      },
      () => {
        // 模拟一些工作
        const start = Date.now();
        while (Date.now() - start < 100) {
          // 等待100ms
        }
        ElMessage.success('性能监控测试完成');
      },
    );
  } catch (error) {
    console.warn('Sentry性能监控测试失败:', error);
    ElMessage.warning('性能监控测试失败');
  }
};
</script>

<style scoped lang="scss">
.home-container {
  min-height: calc(100vh - 60px);
  padding: 24px;
  background-color: var(--colorBgLayout);
}

/* 欢迎区域 */
.welcome-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--blue-6) 0%, var(--purple-6) 100%);
  box-shadow: 0 4px 20px var(--colorBgMask);
  color: white;
}

.welcome-content h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 600;
}

.welcome-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-details h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 500;
}

.user-details p {
  margin: 0;
  opacity: 0.8;
  font-size: 14px;
}

/* Sentry 错误监控演示 */
.sentry-section {
  margin-bottom: 24px;

  h2 {
    margin: 0 0 16px;
    color: var(--colorTextHeading);
    font-size: 20px;
    font-weight: 600;
  }
}
</style>
