<template>
  <div class="login-input-container">
    <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form" @keyup.enter="handleLogin">
      <el-form-item prop="phone">
        <BaseInput v-model="loginForm.phone" label="手机号" placeholder="请输入手机号" />
      </el-form-item>

      <el-form-item prop="password">
        <BaseInput
          v-model="loginForm.password"
          label="密码"
          type="password"
          placeholder="8-16位密码（大写字母+小写字母+数字）"
        />
      </el-form-item>

      <!-- 用户协议和登录按钮区域 -->
      <div class="form-actions">
        <el-checkbox v-model="agreedToTerms" class="agreement-checkbox">我已阅读并同意《用户协议》</el-checkbox>

        <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">立即登录</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import BaseInput from '@/components/BaseInput/index.vue';
import { useUserStore } from '@/store';

const userStore = useUserStore();

// emits类型
interface LoginInputEmits {
  /** 登录成功事件 */
  (e: 'login-success', token: string): void;
  /** 登录失败事件 */
  (e: 'login-error', error: Error): void;
}

// emits定义
const emit = defineEmits<LoginInputEmits>();

// 响应式数据
const loginFormRef = ref<FormInstance>();
const loading = ref(false);
const agreedToTerms = ref(false);

// 登录表单数据
const loginForm = reactive({
  phone: '',
  password: '',
});

// 表单验证规则
const loginRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,16}$/,
      message: '密码需要8-16位，包含大写字母、小写字母和数字',
      trigger: 'blur',
    },
  ],
};

// 处理账号密码登录
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议');
    return;
  }

  try {
    await loginFormRef.value.validate();
    loading.value = true;

    const token = await userStore.loginAction({
      username: loginForm.phone,
      password: loginForm.password,
    });

    emit('login-success', token);
    ElMessage.success('登录成功！');
  } catch (error: any) {
    emit('login-error', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-input-container {
  width: 440px;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 36px;
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  .agreement-checkbox {
    height: 16px;

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
    width: 100%;
    height: 48px;
    margin-top: 12px;
    transition: all 0.3s ease;
    border: none;
    border-radius: 6px;
    background: linear-gradient(92deg, var(--cyan-2) 0%, var(--blue-4) 100%);
    box-shadow: inset 0 -2px 0 0 var(--colorFillContent);
    color: var(--colorTextLight);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    backdrop-filter: blur(43.4px);

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 -2px 0 0 var(--colorFillContent),
        0 4px 12px var(--colorPrimaryBorder);
    }

    &:active {
      transform: translateY(0);
    }

    &.is-loading {
      opacity: 0.8;
    }
  }
}
</style>
