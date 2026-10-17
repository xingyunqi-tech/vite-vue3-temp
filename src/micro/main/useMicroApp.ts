import type { ObjectType } from 'qiankun';
import { onBeforeUnmount, ref, type Ref } from 'vue';
import type { MicroAppConfig, MicroAppStatus } from '../shared/types';
import { getMicroAppStatus, startMicroApp, stopMicroApp } from './manager';

interface UseMicroAppOptions {
  /** 容器 CSS 选择器 */
  container: string;
  /** 默认 props */
  props?: ObjectType;
  /** 卸载组件时是否自动 stop（默认 true） */
  autoStopOnUnmount?: boolean;
}

interface UseMicroAppReturn {
  status: Ref<MicroAppStatus>;
  error: Ref<Error | null>;
  start: (overrideProps?: ObjectType) => Promise<void>;
  stop: () => Promise<void>;
  reload: (overrideProps?: ObjectType) => Promise<void>;
  isMounted: Ref<boolean>;
}

/**
 * 在业务组件中手动控制子应用的生命周期
 *
 * @example
 * const { status, start, stop } = useMicroApp('example', { container: '#sub-app' });
 */
export function useMicroApp(app: string | MicroAppConfig, options: UseMicroAppOptions): UseMicroAppReturn {
  const status = ref<MicroAppStatus>('idle');
  const error = ref<Error | null>(null);
  const isMounted = ref(false);

  const name = typeof app === 'string' ? app : app.name;

  // 运行轮次令牌：每次 start/stop 自增，使「在途的旧一轮 start」在 await 落地后能识别自己已失效，
  // 避免 mountPromise resolve 后把陈旧的 mounted 状态写回已卸载的实例（start/stop 竞态）。
  let runToken = 0;

  async function start(overrideProps?: ObjectType): Promise<void> {
    if (status.value === 'loading' || status.value === 'mounted') return;
    const token = ++runToken;
    status.value = 'loading';
    error.value = null;
    try {
      const instance = await startMicroApp(app, {
        container: options.container,
        props: { ...options.props, ...overrideProps },
      });
      await instance.mountPromise;
      // 本轮已被 stop/reload 取代（实例已被卸载），放弃写回，避免状态机与真实状态不一致
      if (token !== runToken) return;
      status.value = 'mounted';
      isMounted.value = true;
    } catch (err) {
      // 本轮已失效则不再清理/覆盖状态，以免误卸载新一轮实例
      if (token !== runToken) return;
      // 失败清理实例，避免 LOAD_ERROR 终态残留
      await stopMicroApp(name);
      error.value = err as Error;
      status.value = 'error';
      isMounted.value = false;
      throw err;
    }
  }

  async function stop(): Promise<void> {
    // 使任何在途的 start 失效，防止其后续写回 mounted
    runToken++;
    isMounted.value = false;
    // 实例已不在 manager 索引中（如被 stopMicroApp 直接停掉）：无需再 unmount，
    // 但本地状态必须归位，否则会卡在 mounted 让后续 start/reload 静默变成 no-op
    if (getMicroAppStatus(name) === 'NOT_LOADED') {
      if (status.value === 'mounted' || status.value === 'loading') status.value = 'unmounted';
      return;
    }
    await stopMicroApp(name);
    status.value = 'unmounted';
  }

  async function reload(overrideProps?: ObjectType): Promise<void> {
    await stop();
    error.value = null;
    await start(overrideProps);
  }

  if (options.autoStopOnUnmount !== false) {
    onBeforeUnmount(() => {
      void stop();
    });
  }

  return { status, error, start, stop, reload, isMounted };
}
