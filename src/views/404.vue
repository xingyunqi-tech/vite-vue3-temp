<template>
  <div>
    <div class="app-container">
      <el-col :span="12">
        <img :src="img_404" alt="404" class="img-style" />
      </el-col>
      <el-col :span="12">
        <div style="margin-top: var(--spacing-5xl); margin-left: 100px">
          <h1 class="color-main">OOPS!</h1>
          <h2 style="color: var(--color-text-regular)">很抱歉，页面它不小心迷路了！</h2>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm)">
            请检查您输入的网址是否正确，请点击以下按钮返回主页或者发送错误报告
          </div>
          <el-button style="margin-top: var(--spacing-lg)" type="primary" round @click="handleGoMain"
            >返回首页</el-button
          >
        </div>
      </el-col>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import img_404 from '@/assets/images/404.png';

const router = useRouter();

const handleGoMain = (): void => {
  router.push({ path: '/' });
};
</script>

<style scoped>
.app-container {
  width: 80%;
  margin: 120px auto;
}

.img-style {
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 100%;
}
</style>
