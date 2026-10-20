<template>
  <ErrorPage
    :code="preset.code"
    :title="preset.title"
    :description="preset.description"
    :icon="preset.icon"
    :fullscreen="false"
  >
    <template #actions>
      <el-button type="primary" @click="goHome">返回首页</el-button>
      <el-button v-if="forbidden" :loading="loggingOut" @click="loginAgain">重新登录</el-button>
      <el-button v-else @click="goBack">返回上页</el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { Compass, Lock } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrorPage from '@/components/ErrorPage/index.vue';
import { matchesDeclaredRoute } from '@/router/routes';
import { useUserInfoStore } from '@/store';
import { handleError } from '@/utils/error-handler';

/**
 * 布局内兜底页：已登录且权限路由就绪后，所有没匹配上的路径都落到这里（地址栏保留原路径）
 *
 * - 路径是产品声明过的异步路由，或命中了已注册但角色不够的路由（守卫转来） → 403
 * - 其余 → 页面不存在 → 404
 *
 * 侧边栏仍在，用户随时可以点别的菜单离开；两种情况都保证「返回首页」可用，不存在死胡同。
 */
const route = useRoute();
const router = useRouter();
const userStore = useUserInfoStore();

const forbidden = computed(() => matchesDeclaredRoute(route.path) || router.resolve(route.path).name !== route.name);

const preset = computed(() =>
  forbidden.value
    ? {
        code: '403',
        title: '无访问权限',
        description: '当前账号没有访问此页面的权限，如有需要请联系管理员开通',
        icon: Lock,
      }
    : {
        code: '404',
        title: '页面不存在',
        description: '您访问的页面可能已被删除、改名或暂时不可用，请检查地址是否正确',
        icon: Compass,
      },
);

const goHome = () => router.push('/');

// 直接打开的链接没有可回退的历史记录，此时「返回上页」退到首页而不是原地不动
const goBack = () => {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push('/');
};

const loggingOut = ref(false);

/**
 * 不传回跳地址：换个有权限的账号登录后直接落回本页；仍无权限则再次进入本页，本页始终有「返回首页」可退出
 */
const loginAgain = async () => {
  loggingOut.value = true;
  try {
    await userStore.logoutAction();
  } catch (error) {
    handleError(error);
    loggingOut.value = false;
  }
};
</script>
