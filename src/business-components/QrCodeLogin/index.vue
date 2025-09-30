<template>
  <div class="qr-code-login">
    <h3 class="qr-title">扫码登录</h3>

    <div class="qr-code" :class="{ loading: props.loading }">
      <img v-if="props.qrCodeUrl && !props.loading" :src="props.qrCodeUrl" alt="二维码" class="qr-image" />
      <div v-else class="qr-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">加载中...</p>
      </div>
    </div>

    <p class="qr-tip">打开<span class="brand-highlight">企业微信</span>扫一扫登录</p>
    <button class="refresh-btn" :disabled="isRefreshing" @click="refreshQrCode">刷新二维码</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Props 定义
interface QrCodeLoginProps {
  /** 二维码图片URL */
  qrCodeUrl?: string;
  /** 是否正在加载 */
  loading?: boolean;
}

const props = withDefaults(defineProps<QrCodeLoginProps>(), {
  qrCodeUrl: '',
  loading: false,
});

// Emits 定义
interface QrCodeLoginEmits {
  /** 刷新二维码事件 */
  (e: 'refresh'): void;
  /** 扫码成功事件 */
  (e: 'success', token: string): void;
  /** 扫码失败事件 */
  (e: 'error', error: Error): void;
}

const emit = defineEmits<QrCodeLoginEmits>();

// 响应式数据
const isRefreshing = ref(false);

// 刷新二维码
const refreshQrCode = async () => {
  if (isRefreshing.value) return;

  try {
    isRefreshing.value = true;
    emit('refresh');

    // 模拟刷新延时
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    emit('error', error as Error);
  } finally {
    isRefreshing.value = false;
  }
};

// 模拟扫码状态轮询
const pollQrCodeStatus = () => {
  // 在实际项目中，这里应该轮询后端接口检查扫码状态
  console.log('开始轮询二维码状态...');
};

// 组件挂载时初始化
onMounted(() => {
  pollQrCodeStatus();
});
</script>

<style scoped lang="scss">
.qr-code-login {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-title {
  align-self: flex-start;
  color: var(--colorTextHeading);
  font-size: 36px;
  font-weight: 600;
}

.qr-code {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 280px;
  padding: 20px;
  border-radius: 6px;
  background: var(--colorBgContainer);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  .loading-spinner {
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    border: 2px solid var(--colorFill);
    border-top: 2px solid var(--colorPrimary);
    border-radius: 50%;
  }

  .loading-text {
    color: var(--colorTextDescription);
    font-size: 14px;
  }
}

.qr-tip {
  margin-top: 15px;
  color: var(--colorText);
  font-size: 14px;
  font-weight: 500;

  .brand-highlight {
    color: var(--colorPrimary);
  }
}

.refresh-btn {
  margin-top: 15px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  border: 1px solid var(--colorPrimary);
  border-radius: 4px;
  background: transparent;
  color: var(--colorPrimary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: var(--colorPrimary);
    color: var(--colorTextLight);
  }

  &:disabled {
    border-color: var(--colorBorder);
    background: var(--colorFillQuaternary);
    color: var(--colorTextDisabled);
    cursor: not-allowed;

    &:hover {
      background: var(--colorFillQuaternary);
      color: var(--colorTextDisabled);
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
