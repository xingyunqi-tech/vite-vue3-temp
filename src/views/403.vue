<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">403</div>
      <div class="error-title">无访问权限</div>
      <div class="error-description">抱歉，您没有权限访问此页面</div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome"> 返回首页 </el-button>
        <el-button @click="goBack"> 返回上页 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.back();
};
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.error-content {
  color: white;
  text-align: center;
}

.error-code {
  margin-bottom: 20px;
  font-size: 120px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgb(0, 0, 0, 0.3);
}

.error-title {
  margin-bottom: 12px;
  font-size: 24px;
  font-weight: 600;
}

.error-description {
  margin-bottom: 30px;
  opacity: 0.9;
  font-size: 16px;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
</style>
