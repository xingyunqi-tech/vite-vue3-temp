<template>
  <div class="login-container">
    <!-- Logo 头部 -->
    <div class="logo-header">
      <img src="@/assets/images/Login/logo.png" alt="Logo" class="logo-image" />
      <div class="logo-text">
        <h1 class="logo-text-title">生命科学学院</h1>
        <h1 class="logo-text-title">实验教学示范中心管理平台</h1>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧扫码登录 -->
      <div ref="qrSectionRef" class="qr-section">
        <QrCodeLogin
          :qr-code-url="qrCodeUrl"
          :loading="qrLoading"
          @refresh="handleRefreshQrCode"
          @success="handleQrSuccess"
          @error="handleQrError"
        />
      </div>

      <!-- 分割线 -->
      <div class="divider"></div>

      <!-- 右侧账号密码登录 -->
      <div class="form-section">
        <h2 class="form-title">登录账号</h2>

        <LoginInput @login-success="handleLoginSuccess" @login-error="handleLoginError" />

        <div class="register-link">
          <a class="register-link-text" href="#" @click="handleRegister">注册账号</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store';
import QrCodeLogin from '@/business-components/QrCodeLogin/index.vue';
import LoginInput from '@/business-components/LoginInput/index.vue';

// 路由和store
const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const qrSectionRef = ref<HTMLElement | null>(null);
const qrLoading = ref(false);
const qrCodeUrl = ref('');

// 处理登录成功
const handleLoginSuccess = (token: string) => {
  // 设置用户信息
  userStore.setTokenValue(token);
  // 跳转到首页
  router.push('/Home');
};

// 处理登录失败
const handleLoginError = (error: Error) => {
  ElMessage.error('登录失败，请重试');
};

// 处理注册
const handleRegister = () => {
  ElMessage.info('注册功能暂未开放');
};

// 刷新二维码
const handleRefreshQrCode = async () => {
  try {
    qrLoading.value = true;
    // 这里应该调用后端接口获取新的二维码
    await new Promise(resolve => setTimeout(resolve, 1000));
    qrCodeUrl.value = '/src/assets/images/Login/qrcode.png?' + Date.now();
  } catch (error) {
    ElMessage.error('刷新二维码失败');
  } finally {
    qrLoading.value = false;
  }
};

// 扫码成功
const handleQrSuccess = (token: string) => {
  ElMessage.success('扫码登录成功！');

  handleLoginSuccess(token);
};

// 扫码失败
const handleQrError = (error: Error) => {
  ElMessage.error('扫码登录失败，请重试');
};

// 组件挂载时的操作
onMounted(() => {
  // 如果已经登录，直接跳转到首页
  if (userStore.token) {
    router.push('/Home');
  }

  // 初始化二维码
  handleRefreshQrCode();
});
</script>

<style scoped lang="scss">
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: url('@/assets/images/Login/background.png') no-repeat center;
  background-size: cover;
}

// Logo 头部
.logo-header {
  display: flex;
  position: absolute;
  z-index: 10;
  top: 20px;
  left: 20px;
  gap: 12px;

  .logo-image {
    width: 53px;
    height: 53px;
    object-fit: cover;
  }

  .logo-text {
    .logo-text-title {
      margin: 0;
      color: var(--colorTextHeading);
      font-size: 18px;
      font-weight: 500;
      line-height: 1.32;
    }
  }
}

// 主内容区域
.main-content {
  display: flex;
  position: absolute;
  z-index: 10;
  top: 50%;
  right: 100px;
  transform: translateY(-50%);
  border-radius: 20px;
  background: rgb(255, 255, 255, 0.8);
  box-shadow: 0 20px 40px rgb(0, 0, 0, 0.1);
  backdrop-filter: blur(16.2px);
}

// 左侧扫码登录区域
.qr-section {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 425px;
  padding: 50px 70px;
}

// 分割线
.divider {
  width: 0.5px;
  background: var(--colorSplit);
}

// 右侧表单区域
.form-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 440px;
  padding: 50px 60px;
}

.form-title {
  margin: 0 0 36px;
  color: var(--colorTextHeading);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.25;
}

.login-form {
  flex: 1;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  .agreement-checkbox {
    margin-bottom: 12px;

    :deep(.el-checkbox__input) {
      .el-checkbox__inner {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        border-color: var(--colorPrimary);
        background: var(--colorBgContainer);

        &::after {
          border-width: 1px;
          border-color: var(--colorBgContainer);
        }
      }

      &.is-checked .el-checkbox__inner {
        border-color: var(--colorPrimary);
        background: var(--colorPrimary);
      }
    }

    :deep(.el-checkbox__label) {
      color: var(--colorTextHeading);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }
  }

  .login-btn {
    width: 440px;
    height: 48px;
    transition: all 0.3s ease;
    border: none;
    border-radius: 6px;
    background: linear-gradient(92deg, rgb(131, 255, 228, 1) 0%, rgb(4, 203, 255, 1) 100%);
    box-shadow: inset 0 -2px 0 0 rgb(0, 0, 0, 0.25);
    color: var(--colorBgContainer);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    backdrop-filter: blur(43.4px);

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 -2px 0 0 rgb(0, 0, 0, 0.25),
        0 4px 12px rgb(42, 202, 210, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    &.is-loading {
      background: linear-gradient(92deg, rgb(131, 255, 228, 0.8) 0%, rgb(4, 203, 255, 0.8) 100%);
    }
  }
}

.register-link {
  margin-top: 8px;
  text-align: left;

  .register-link-text {
    transition: color 0.3s ease;
    color: var(--colorPrimary);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.4;
    text-decoration: none;

    &:hover {
      color: var(--colorPrimaryHover);
      text-decoration: underline;
    }
  }
}
</style>
