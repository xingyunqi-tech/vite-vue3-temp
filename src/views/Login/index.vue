<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>系统登录</h2>
        <p>欢迎使用管理系统</p>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" prefix-icon="User" clearable />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="rememberMe">记住密码</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>还没有账号？<a href="#" @click="handleRegister">立即注册</a></p>
      </div>
    </div>

    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useUserStore } from '@/store';

// 路由和store
const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const loginFormRef = ref<FormInstance>();
const loading = ref(false);
const rememberMe = ref(false);

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
});

// 表单验证规则
const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
  ],
};

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    await loginFormRef.value.validate();
    loading.value = true;

    // 模拟登录成功（因为后端接口可能不可用）
    // 在实际项目中，这里应该调用真实的登录接口
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 设置用户信息
    userStore.setTokenValue('mock-token-' + Date.now());
    userStore.setId('user_' + Date.now());
    userStore.setName(loginForm.username);
    userStore.setEmail(loginForm.username + '@example.com');
    userStore.setAvatar('');
    userStore.setRoles(['admin']);

    ElMessage.success('登录成功！');

    // 跳转到首页
    await router.push('/Home');
  } catch (error: any) {
    console.error('登录失败:', error);
    ElMessage.error(error.message || '登录失败，请检查用户名和密码');
  } finally {
    loading.value = false;
  }
};

// 处理注册
const handleRegister = () => {
  ElMessage.info('注册功能暂未开放');
};

// 组件挂载时的操作
onMounted(() => {
  // 如果已经登录，直接跳转到首页
  if (userStore.token) {
    router.push('/home');
  }

  // 开发环境下预填充表单
  if (import.meta.env.DEV) {
    loginForm.username = 'admin';
    loginForm.password = '123456';
  }
});
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  position: relative;
  z-index: 10;
  width: 400px;
  padding: 40px;
  border-radius: 16px;
  background: rgb(255, 255, 255, 0.95);
  box-shadow: 0 20px 40px rgb(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.login-header {
  margin-bottom: 30px;
  text-align: center;

  h2 {
    margin: 0 0 8px;
    color: #333;
    font-size: 28px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .login-btn {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
  }
}

.login-footer {
  margin-top: 20px;
  text-align: center;

  p {
    margin: 0;
    color: #666;
    font-size: 14px;

    a {
      color: #409eff;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

// 背景装饰
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.circle {
  position: absolute;
  animation: float 6s ease-in-out infinite;
  border-radius: 50%;
  background: rgb(255, 255, 255, 0.1);
}

.circle-1 {
  top: 10%;
  left: 10%;
  width: 200px;
  height: 200px;
  animation-delay: 0s;
}

.circle-2 {
  top: 60%;
  right: 15%;
  width: 150px;
  height: 150px;
  animation-delay: 2s;
}

.circle-3 {
  bottom: 20%;
  left: 20%;
  width: 100px;
  height: 100px;
  animation-delay: 4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

// 响应式设计
@media (width <= 480px) {
  .login-box {
    width: 90%;
    padding: 30px 20px;
  }

  .login-header h2 {
    font-size: 24px;
  }
}
</style>
