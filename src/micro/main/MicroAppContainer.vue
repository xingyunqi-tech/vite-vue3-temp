<template>
  <div class="micro-app-container">
    <!-- qiankun 独占的挂载节点 -->
    <div v-show="status === 'loading' || status === 'mounted'" :id="containerId" class="micro-app-mount" />
    <slot v-if="status === 'idle' || status === 'unmounted'" name="placeholder" />
    <div v-if="status === 'loading'" class="micro-app-overlay">
      <slot name="loading">
        <div class="micro-app-loading">加载中...</div>
      </slot>
    </div>
    <slot v-if="status === 'error'" name="error" :error="error">
      <div class="micro-app-error">
        <span>加载失败：{{ error?.message }}</span>
        <el-button size="small" @click="reloadPage">刷新页面</el-button>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { ElButton } from 'element-plus';
import type { ObjectType } from 'qiankun';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { MicroAppConfig, MicroAppStatus } from '../shared/types';
import { getMicroAppStatus, startMicroApp, stopMicroApp } from './manager';

const props = withDefaults(
  defineProps<{
    /** 子应用名称（已通过 registerMicroApp 注册）或完整配置对象 */
    app: string | MicroAppConfig;
    /** 透传给子应用 mount 的 props */
    appProps?: ObjectType;
    /** 自定义容器 id，默认 micro-{name} */
    containerId?: string;
    /** 是否在挂载后自动启动（默认 false，由调用方手动控制） */
    autoStart?: boolean;
  }>(),
  {
    appProps: () => ({}),
    containerId: undefined,
    autoStart: false,
  },
);

const emit = defineEmits<{
  mounted: [];
  unmounted: [];
  error: [Error];
  statusChange: [MicroAppStatus];
}>();

const status = ref<MicroAppStatus>('idle');
const error = ref<Error | null>(null);

const appName = computed(() => (typeof props.app === 'string' ? props.app : props.app.name));
const containerId = computed(() => props.containerId ?? `micro-${appName.value}`);

watch(status, s => emit('statusChange', s));

// 运行轮次令牌：每次 start / stop / app 切换自增，使在途的旧一轮 start 在 await 落地后识别自己已失效，
// 避免 mountPromise resolve 后把陈旧 mounted 状态写回已卸载/已切换的实例。
let runToken = 0;

// 监听 app 就地切换：props.app 变化时必须卸载「旧名字」对应的实例，
// 否则旧实例会永久残留在 manager.instances 中成为孤立实例（内存泄漏），
// 且新实例不会自动启动。flush: 'post' 确保依赖 appName 的 containerId 已更新到
// 新容器后再 start，使 startMicroApp 能查到正确的 DOM 容器。
watch(
  appName,
  async (newName, oldName) => {
    if (newName === oldName) return;
    // 使针对「旧 app」在途的 start 失效，避免其后续把 status 改回 mounted
    runToken++;
    // 卸载旧子应用（stopMicroApp 对无实例/终态会安静返回）
    await stopMicroApp(oldName);
    // 重置状态，准备承接新子应用
    status.value = 'idle';
    error.value = null;
    if (props.autoStart) void start();
  },
  { flush: 'post' },
);

async function start(): Promise<void> {
  if (status.value === 'loading' || status.value === 'mounted') return;
  const token = ++runToken;
  status.value = 'loading';
  error.value = null;
  try {
    const instance = await startMicroApp(props.app, {
      container: `#${containerId.value}`,
      props: props.appProps,
    });
    await instance.mountPromise;
    // 本轮已被 stop / app 切换取代（实例已卸载），放弃写回，避免状态错乱
    if (token !== runToken) return;
    status.value = 'mounted';
    emit('mounted');
  } catch (err) {
    // 本轮已失效则不再清理/覆盖，以免误卸载新一轮实例
    if (token !== runToken) return;
    // 失败时清理已创建的实例（含 LOAD_ERROR 终态），避免下次 start 残留
    await stopMicroApp(appName.value);
    error.value = err as Error;
    status.value = 'error';
    emit('error', err as Error);
  }
}

async function stop(): Promise<void> {
  // 使在途的 start 失效，防止其后续写回 mounted（须先于下面的提前 return，否则在途 start 会漏杀）
  runToken++;
  // 与 useMicroApp 保持同一口径：以 qiankun 侧真实状态为准，而非本地 status。
  // 本地 status 在 start 尚未完成时仍是 loading，用它判断会漏掉 stop，留下已注册未卸载的应用。
  if (getMicroAppStatus(appName.value) === 'NOT_LOADED') {
    // 实例已被外部停掉（stopAllMicroApps、或别处对同名应用调了 stop）：不需要再 unmount，
    // 但本地 status 必须归位。停在 mounted 会让三个 slot 的 v-if 全不成立（容器一片空白），
    // 且 start() 首行的 loading/mounted 判断会把后续启动静默吃掉。
    if (status.value === 'mounted' || status.value === 'loading') {
      status.value = 'unmounted';
      emit('unmounted');
    }
    return;
  }
  await stopMicroApp(appName.value);
  status.value = 'unmounted';
  emit('unmounted');
}

/** 加载失败的结果会被 qiankun 缓存，只能刷新页面恢复 */
const reloadPage = () => window.location.reload();

onMounted(() => {
  if (props.autoStart) void start();
});

onBeforeUnmount(() => {
  // 使在途的 start 失效，避免组件卸载后仍写状态/触发 emit
  runToken++;
  void stopMicroApp(appName.value);
});

defineExpose({ start, stop, status, error });
</script>

<style lang="scss" scoped>
.micro-app-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.micro-app-mount {
  width: 100%;
  height: 100%;
}

.micro-app-overlay {
  position: absolute;
  inset: 0;
  background: var(--aix-colorBgContainer);
}

.micro-app-loading,
.micro-app-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--aix-colorTextSecondary);
}

.micro-app-error {
  flex-direction: column;
  gap: 12px;
  color: var(--aix-colorError);
}
</style>
