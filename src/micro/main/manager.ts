import {
  loadMicroApp,
  type FrameworkConfiguration,
  type FrameworkLifeCycles,
  type MicroApp,
  type ObjectType,
} from 'qiankun';
import type { MicroAppConfig } from '../shared/types';
import { getMicroAppConfig } from './apps';

/** 默认框架配置（含样式隔离） */
const DEFAULT_CONFIGURATION: FrameworkConfiguration = {
  sandbox: { experimentalStyleIsolation: true },
};

/** 处于错误终态的状态，无需也无法 unmount */
const ERROR_STATUSES = new Set(['LOAD_ERROR', 'SKIP_BECAUSE_BROKEN']);

/** 处于活跃中（已加载未销毁）的状态，需先 unmount 再创建新实例 */
const ACTIVE_STATUSES = new Set([
  'MOUNTED',
  'MOUNTING',
  'UPDATING',
  'UNMOUNTING',
  'NOT_MOUNTED',
  'NOT_BOOTSTRAPPED',
  'BOOTSTRAPPING',
  'LOADING_SOURCE_CODE',
]);

/** 已加载的实例索引：name -> MicroApp */
const instances = new Map<string, MicroApp>();

/**
 * 加载失败过的子应用
 *
 * qiankun 与 import-html-entry 会缓存失败的加载结果且不提供清除接口，同一页面内再次加载必定复用失败结果，
 * 只能刷新页面恢复。
 */
const failedApps = new Set<string>();

/**
 * 同名子应用生命周期操作的串行队列：name -> 该名当前操作链尾。
 * 保证 start/stop 对同一子应用不在 await 处交错，避免「检查 → await unmount → 重建」
 * 期间被并发操作插入，产生脱离索引、无法回收的孤立实例（双实例泄漏）。
 */
const operationChains = new Map<string, Promise<unknown>>();

/**
 * 将操作排入指定子应用的串行队列。
 * 上一操作无论成功或失败都接着执行本次；本次的结果/错误原样返回给调用方。
 */
function withLock<T>(name: string, op: () => Promise<T>): Promise<T> {
  const prev = operationChains.get(name) ?? Promise.resolve();
  const result = prev.then(op, op);
  // 链尾吞掉错误，避免上一次失败阻断后续排队；真正的结果/错误通过 result 透传
  operationChains.set(
    name,
    result.catch(() => undefined),
  );
  return result;
}

interface StartOptions {
  /** 覆盖默认 container（CSS 选择器） */
  container?: string;
  /** mount 时透传给子应用的 props */
  props?: ObjectType;
  /** 框架配置覆盖 */
  configuration?: FrameworkConfiguration;
  /** 生命周期钩子 */
  lifecycles?: FrameworkLifeCycles<ObjectType>;
}

/**
 * 构造透传给子应用 mount(props) 的 props
 * - 自动注入 routerBase（来自 config，业务可通过 options.props.routerBase 覆盖）
 * - 业务自定义 props（config.props + options.props）优先级更高，可覆盖自动注入项
 *
 * 全局通信桥不在这里注入：qiankun mount 时会给每个子应用注入独立的 onGlobalStateChange /
 * setGlobalState，卸载时自动清理该子应用的监听。
 */
function buildMountProps(config: MicroAppConfig, override: ObjectType | undefined): ObjectType {
  const auto: ObjectType = {};
  if (config.routerBase) auto.routerBase = config.routerBase;
  return { ...auto, ...config.props, ...override };
}

/**
 * 安静 unmount，吞掉任何异常（用于已坏实例的清理）
 */
async function safeUnmount(inst: MicroApp): Promise<void> {
  try {
    await inst.unmount();
  } catch {
    // 已损坏的实例 unmount 可能抛错，吞掉避免阻塞重建
  }
}

/**
 * 手动启动子应用
 * - 若已挂载（MOUNTED）直接复用
 * - 若处于活跃中间态（如 MOUNTING）先 await unmount 再重建，避免双实例 race
 * - 若处于错误终态直接清除索引重建
 * - 加载失败过的子应用直接 reject，需刷新页面才能重新加载
 *
 * @param target 子应用名称（已注册）或完整配置
 */
export function startMicroApp(target: string | MicroAppConfig, options: StartOptions = {}): Promise<MicroApp> {
  const config = typeof target === 'string' ? getMicroAppConfig(target) : target;
  if (!config) {
    return Promise.reject(new Error(`[micro] unknown micro app: ${String(target)}`));
  }
  // 同名生命周期操作串行化，避免并发 start/stop 在 await 处交错产生孤立实例
  return withLock(config.name, () => mountMicroApp(config, options));
}

/** 实际挂载逻辑（已由 withLock 保证同名串行，内部无需再防并发） */
async function mountMicroApp(config: MicroAppConfig, options: StartOptions): Promise<MicroApp> {
  const name = config.name;
  if (failedApps.has(name)) {
    throw new Error(`[micro] "${name}" 加载失败后无法在当前页面重新加载，请刷新页面重试`);
  }
  const existing = instances.get(name);
  if (existing) {
    const status = existing.getStatus();
    if (status === 'MOUNTED') return existing;
    if (ACTIVE_STATUSES.has(status)) {
      await safeUnmount(existing);
    }
    // 活跃 unmount 完毕、或 ERROR_STATUSES 直接清除
    instances.delete(name);
  }

  const container = options.container ?? config.container;
  if (!container) {
    throw new Error(`[micro] container is required for "${name}"`);
  }

  const instance = loadMicroApp(
    {
      name,
      entry: config.entry,
      container,
      props: buildMountProps(config, options.props),
    },
    {
      ...DEFAULT_CONFIGURATION,
      ...config.configuration,
      ...options.configuration,
    },
    options.lifecycles,
  );

  instance.loadPromise.catch(() => failedApps.add(name));
  instances.set(name, instance);
  return instance;
}

/** 卸载子应用（无实例或已是终态时安静返回） */
export function stopMicroApp(name: string): Promise<void> {
  // 与 startMicroApp 共用同名串行锁，确保 stop 不与在途 start 交错
  return withLock(name, async () => {
    const inst = instances.get(name);
    if (!inst) return;
    const status = inst.getStatus();
    if (!ERROR_STATUSES.has(status)) {
      await safeUnmount(inst);
    }
    instances.delete(name);
  });
}

/** 获取实例状态（未加载时返回 NOT_LOADED） */
export function getMicroAppStatus(name: string): string {
  return instances.get(name)?.getStatus() ?? 'NOT_LOADED';
}

/** 获取实例对象（用于直接调用 mountPromise / loadPromise 等） */
export function getMicroAppInstance(name: string): MicroApp | undefined {
  return instances.get(name);
}

/** 卸载全部子应用 */
export async function stopAllMicroApps(): Promise<void> {
  await Promise.all(Array.from(instances.keys()).map(name => stopMicroApp(name)));
}
