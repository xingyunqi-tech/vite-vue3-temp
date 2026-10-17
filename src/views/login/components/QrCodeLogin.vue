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

    <p class="qr-tip">
      打开
      <span class="brand-highlight">企业微信</span>
      扫一扫登录
    </p>
    <button class="refresh-btn" :disabled="props.loading" @click="emit('refresh')">刷新二维码</button>
  </div>
</template>

<script setup lang="ts">
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

const emit = defineEmits<{
  /** 刷新二维码 */
  (e: 'refresh'): void;
}>();
</script>

<style scoped lang="scss">
.qr-code-login {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-title {
  align-self: flex-start;
  color: var(--aix-colorTextHeading);
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
  background: var(--aix-colorBgContainer);
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
    border: 2px solid var(--aix-colorFill);
    border-top: 2px solid var(--aix-colorPrimary);
    border-radius: 50%;
  }

  .loading-text {
    color: var(--aix-colorTextDescription);
    font-size: 14px;
  }
}

.qr-tip {
  margin-top: 15px;
  color: var(--aix-colorText);
  font-size: 14px;
  font-weight: 500;

  .brand-highlight {
    color: var(--aix-colorPrimary);
  }
}

.refresh-btn {
  margin-top: 15px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  border: 1px solid var(--aix-colorPrimary);
  border-radius: 4px;
  background: transparent;
  color: var(--aix-colorPrimary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: var(--aix-colorPrimary);
    color: var(--aix-colorTextLight);
  }

  &:disabled {
    border-color: var(--aix-colorBorder);
    background: var(--aix-colorFillQuaternary);
    color: var(--aix-colorTextDisabled);
    cursor: not-allowed;

    &:hover {
      background: var(--aix-colorFillQuaternary);
      color: var(--aix-colorTextDisabled);
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
