<template>
  <ErrorPage code="403" :title="preset.title" :description="preset.description" :icon="preset.icon" :tone="preset.tone">
    <template #actions>
      <template v-if="fetchFailed">
        <el-button type="primary" :loading="retrying" @click="retry">重试</el-button>
        <el-button :loading="loggingOut" @click="loginAgain">重新登录</el-button>
      </template>
      <el-button v-else type="primary" :loading="loggingOut" @click="loginAgain">重新登录</el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { Lock, WarningFilled } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrorPage from '@/components/ErrorPage/index.vue';
import { EXCEPTION_QUERY, FORBIDDEN_REASON, readSafeRedirect } from '@/router/redirect';
import { useUserInfoStore } from '@/store';
import { handleError } from '@/utils/error-handler';

/**
 * 全屏 403：路由守卫在「token 有效但拿不到权限」时的落点（白名单，免登录）
 *
 * 此时没有角色、没有菜单，布局外壳没有意义，故不套 AppLayout。按 query.reason 区分两种情况：
 * - fetch-failed：拉用户信息 / 角色失败（网络、接口异常），主动作是「重试」
 * - no-role（默认）：账号未开通任何角色，重试无意义，只能换账号重新登录
 *
 * 「重试」回到 query.redirect（原目标页）；「重新登录」是换账号，落到应用首页。
 * 两者都不回本页，避免重新登录后原地落回 403 的死胡同。
 */
const route = useRoute();
const router = useRouter();
const userStore = useUserInfoStore();

const retrying = ref(false);
const loggingOut = ref(false);

const fetchFailed = computed(() => route.query[EXCEPTION_QUERY.REASON] === FORBIDDEN_REASON.FETCH_FAILED);

const preset = computed(() =>
  fetchFailed.value
    ? {
        title: '权限校验失败',
        description: '暂时无法获取您的访问权限，可能是网络波动或服务异常，请稍后重试',
        icon: WarningFilled,
        tone: 'error' as const,
      }
    : {
        title: '无访问权限',
        description: '当前账号尚未开通本系统的访问权限，请联系管理员开通后重新登录',
        icon: Lock,
        tone: 'primary' as const,
      },
);

/** 原目标路径：只信任站内相对路径，缺失或不合法时回首页 */
const redirectPath = computed(() => readSafeRedirect(route.query) ?? '/');

/**
 * 重试：回到原目标路由，守卫会因权限路由尚未生成而重新拉取角色；再次失败会带新 query 回到本页
 *
 * 导航本身也可能抛（守卫内未捕获的异常、组件加载失败）。此处必须兜住并复位 loading：
 * 本页是用户唯一的出口，按钮卡在 loading 上就成了死胡同。
 */
const retry = async () => {
  retrying.value = true;
  try {
    await router.replace(redirectPath.value);
  } catch (error) {
    handleError(error);
  } finally {
    retrying.value = false;
  }
};

/**
 * 重新登录：SSO 登出后引导登录，回跳到原目标页
 *
 * 不传回跳地址：jumpToLogout 会把异常页换成应用首页。这里是换账号的入口，
 * 上一个账号的目标页（query.redirect）不该交给下一个账号，故落点与「重试」不同。
 * 正常路径下浏览器会整体跳走、不会回到这里；出现异常时提示并复位按钮。
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
