<template>
  <el-form
    ref="loginFormRef"
    :model="loginForm"
    :rules="loginRules"
    label-position="top"
    class="login-form"
    @keyup.enter="handleLogin"
  >
    <el-form-item label="手机号" prop="phone">
      <el-input v-model="loginForm.phone" placeholder="请输入手机号" size="large" clearable />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="loginForm.password"
        type="password"
        placeholder="8-16位密码（大写字母+小写字母+数字）"
        size="large"
        show-password
        clearable
      />
    </el-form-item>

    <div class="form-actions">
      <el-checkbox v-model="agreedToTerms" class="agreement-checkbox">我已阅读并同意《用户协议》</el-checkbox>
      <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">立即登录</el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useUserInfoStore } from '@/store';

const emit = defineEmits<{
  /** 登录成功 */
  (e: 'success'): void;
}>();

const userStore = useUserInfoStore();

const loginFormRef = ref<FormInstance>();
const loading = ref(false);
const agreedToTerms = ref(false);

const loginForm = reactive({
  phone: '',
  password: '',
});

const loginRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
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

const handleLogin = async () => {
  if (!loginFormRef.value || loading.value) return;

  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议');
    return;
  }

  const valid = await loginFormRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.loginAction({ username: loginForm.phone, password: loginForm.password });
    ElMessage.success('登录成功');
    emit('success');
  } catch (error) {
    // 请求失败的提示由请求层统一弹出
    if (!isAxiosError(error)) ElMessage.error(error instanceof Error ? error.message : '登录失败，请重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-form {
  width: 440px;

  :deep(.el-form-item) {
    margin-bottom: 36px;
  }

  :deep(.el-form-item__label) {
    color: var(--aix-colorTextHeading);
    font-size: 14px;
  }

  :deep(.el-input__wrapper) {
    height: 48px;
    border-radius: 6px;
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  .agreement-checkbox {
    height: 16px;

    :deep(.el-checkbox__label) {
      color: var(--aix-colorTextHeading);
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
    background: linear-gradient(92deg, rgb(131 255 228) 0%, rgb(4 203 255) 100%);
    box-shadow: inset 0 -2px 0 0 var(--aix-colorFillContent);
    color: var(--aix-colorTextLight);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 -2px 0 0 var(--aix-colorFillContent),
        0 4px 12px var(--aix-colorPrimaryBorder);
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
