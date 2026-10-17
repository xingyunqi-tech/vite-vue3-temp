<template>
  <div class="login-page">
    <div class="login-brand">
      <img :src="logoUrl" alt="Logo" class="login-brand__logo" />
      <h1 class="login-brand__title">{{ siteConfig.config.basic.systemTitle }}</h1>
    </div>

    <div class="login-card">
      <h2 class="login-card__title">管理员登录</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="handleLogin">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" autocomplete="username" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            show-password
          />
        </el-form-item>
        <el-button type="primary" class="login-card__submit" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logoUrl from '@/assets/images/common/logo.png';
import { useSiteConfig } from '@/composables/useSiteConfig';
import { readSafeRedirect, resolveLoginReturnPath } from '@/router/redirect';
import { useUserInfoStore } from '@/store';

const route = useRoute();
const router = useRouter();
const siteConfig = useSiteConfig();
const userStore = useUserInfoStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ email: '', password: '' });

const rules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

/** 登录成功回到 query.redirect 指向的站内页面 */
const handleLogin = async () => {
  if (!formRef.value || loading.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.loginAction({ ...form });
    router.replace(resolveLoginReturnPath(readSafeRedirect(route.query) ?? '/'));
  } catch (error) {
    // 请求失败的提示由请求层统一弹出
    if (!isAxiosError(error)) ElMessage.error(error instanceof Error ? error.message : '登录失败，请重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: url('@/assets/images/login/background.png') no-repeat center / cover;
}

.login-brand {
  display: flex;
  position: absolute;
  top: 20px;
  left: 20px;
  align-items: center;
  gap: 12px;

  &__logo {
    width: 48px;
    height: 48px;
  }

  &__title {
    margin: 0;
    color: var(--aix-colorTextHeading);
    font-size: 18px;
    font-weight: 500;
  }
}

.login-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 420px;
  padding: 40px;
  border-radius: 16px;
  background: color-mix(in sRGB, var(--aix-colorBgContainer) 85%, transparent);
  box-shadow: 0 20px 40px var(--aix-colorFillSecondary);
  backdrop-filter: blur(16px);

  &__title {
    margin: 0 0 32px;
    color: var(--aix-colorTextHeading);
    font-size: 28px;
    font-weight: 600;
  }

  &__submit {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
