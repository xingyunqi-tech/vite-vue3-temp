<template>
  <div class="login-container">
    <div class="logo-header">
      <img :src="logoUrl" alt="Logo" class="logo-image" />
      <h1 class="logo-title">{{ siteConfig.config.basic.systemTitle }}</h1>
    </div>

    <div class="main-content">
      <div class="qr-section">
        <QrCodeLogin :qr-code-url="qrCodeUrl" :loading="qrLoading" @refresh="refreshQrCode" />
      </div>

      <div class="divider"></div>

      <div class="form-section">
        <h2 class="form-title">登录账号</h2>
        <LoginForm @success="handleLoginSuccess" />
        <div class="register-link">
          <a class="register-link-text" href="#" @click.prevent="handleRegister">注册账号</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoginForm from './components/LoginForm.vue';
import QrCodeLogin from './components/QrCodeLogin.vue';
import logoUrl from '@/assets/images/common/logo.png';
import qrCodeImage from '@/assets/images/login/qrcode.png';
import { useSiteConfig } from '@/composables/useSiteConfig';
import { readSafeRedirect, resolveLoginReturnPath } from '@/router/redirect';

const route = useRoute();
const router = useRouter();
const siteConfig = useSiteConfig();

const qrLoading = ref(false);
const qrCodeUrl = ref('');

/** 登录成功回到 query.redirect 指向的站内页面 */
const handleLoginSuccess = () => {
  router.replace(resolveLoginReturnPath(readSafeRedirect(route.query) ?? '/'));
};

const handleRegister = () => {
  ElMessage.info('注册功能暂未开放');
};

/** 二维码为静态占位图，接入扫码登录时改为请求后端生成 */
const refreshQrCode = async () => {
  qrLoading.value = true;
  await new Promise(resolve => setTimeout(resolve, 300));
  qrCodeUrl.value = `${qrCodeImage}?t=${Date.now()}`;
  qrLoading.value = false;
};

onMounted(refreshQrCode);
</script>

<style scoped lang="scss">
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: url('@/assets/images/login/background.png') no-repeat center;
  background-size: cover;
}

.logo-header {
  display: flex;
  position: absolute;
  z-index: 10;
  top: 20px;
  left: 20px;
  align-items: center;
  gap: 12px;

  .logo-image {
    width: 53px;
    height: 53px;
    object-fit: cover;
  }

  .logo-title {
    margin: 0;
    color: var(--aix-colorTextHeading);
    font-size: 18px;
    font-weight: 500;
    line-height: 1.32;
  }
}

.main-content {
  display: flex;
  position: absolute;
  z-index: 10;
  top: 50%;
  right: 100px;
  transform: translateY(-50%);
  border-radius: 20px;
  background: color-mix(in sRGB, var(--aix-colorBgContainer) 80%, transparent);
  box-shadow: 0 20px 40px var(--aix-colorFillSecondary);
  backdrop-filter: blur(16px);
}

.qr-section {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 425px;
  padding: 50px 70px;
}

.divider {
  width: 1px;
  background: var(--aix-colorSplit);
}

.form-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 440px;
  padding: 50px 60px;
}

.form-title {
  margin: 0 0 36px;
  color: var(--aix-colorTextHeading);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.25;
}

.register-link {
  margin-top: 8px;

  .register-link-text {
    transition: color 0.3s ease;
    color: var(--aix-colorPrimary);
    font-size: 14px;
    line-height: 1.4;
    text-decoration: none;

    &:hover {
      color: var(--aix-colorPrimaryHover);
      text-decoration: underline;
    }
  }
}
</style>
