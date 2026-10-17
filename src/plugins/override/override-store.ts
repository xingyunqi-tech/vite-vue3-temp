import type { PiniaPluginContext } from 'pinia';
import { isRef } from 'vue';

/**
 * Store 覆盖函数，接收 store 视图（方法是覆盖前的原实现，状态与 getter 实时读取），返回要合并的属性
 *
 * 支持泛型以获得类型提示：
 * @example
 * ```ts
 * import type { StoreOverrideFn } from '@/plugins/override';
 * import { useGlobalStore } from '@/store/modules/global';
 *
 * // 方式 1: 泛型指定 store 类型（推荐）
 * const overrideGlobal: StoreOverrideFn<ReturnType<typeof useGlobalStore>> = (store) => ({
 *   toggleTheme() {
 *     console.log('before toggle');
 *     store.toggleTheme(); // ← 调用的是覆盖生效前的原始实现，不会递归调用到自己
 *   },
 * });
 *
 * // 方式 2: 不指定泛型，store 为 any（简单场景）
 * const overrideGlobal: StoreOverrideFn = (store) => ({ ... });
 * ```
 */
export type StoreOverrideFn<T = any> = (store: T) => Record<string, unknown>;

export interface StoreModuleConfig {
  /** 扩展/覆盖已有 Store 的函数，key 为 store.$id */
  overrides?: Record<string, StoreOverrideFn>;
}

/**
 * Store 覆盖管理器
 * 通过 Pinia 插件机制扩展已有 Store
 *
 * 覆盖限制：
 * - action: 可安全覆盖（推荐包装原 action 实现行为变更）
 * - ref/computed: 有 state 分裂风险，不建议覆盖
 *   覆盖 ref 会创建新的响应式引用，与原 store 内部引用脱钩，
 *   导致 store 内部逻辑仍操作旧 ref，而外部使用新 ref，数据不同步。
 * - 推荐模式: 通过包装 action 来改变行为，而非直接替换 state
 */
class StoreManager {
  private overrides = new Map<string, StoreOverrideFn>();

  /** 注册 Store 配置 */
  register(config: StoreModuleConfig): void {
    if (config.overrides) {
      Object.entries(config.overrides).forEach(([id, fn]) => {
        this.overrides.set(id, fn);
      });
    }
  }

  /**
   * 创建 Pinia 插件
   * 在每个 Store 初始化时检查是否有覆盖函数
   * 返回值会通过 Object.assign 合并到 store 实例上
   */
  createPlugin() {
    const overrides = this.overrides;
    return ({ store }: PiniaPluginContext) => {
      const overrideFn = overrides.get(store.$id);
      if (!overrideFn) return;

      // 方法固定为覆盖前的原实现（覆盖结果会合并回 store，直接引用会递归调用自身），
      // 状态与 getter 透传到 store 实时读取
      const originalMethods = new Map(
        Object.entries(store).filter((entry): entry is [string, unknown] => typeof entry[1] === 'function'),
      );
      const storeView = new Proxy(store, {
        get: (target, key, receiver) =>
          typeof key === 'string' && originalMethods.has(key)
            ? originalMethods.get(key)
            : Reflect.get(target, key, receiver),
      });
      const result = overrideFn(storeView);

      // 过滤掉 ref/computed 覆盖，防止响应式引用脱钩
      const safeResult: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(result)) {
        if (isRef(value)) {
          console.warn(
            `[Override] Store "${store.$id}": 跳过 "${key}"（ref/computed 会与 store 内部引用脱钩导致数据不同步，请改用包装 action 的方式）`,
          );
          continue;
        }
        safeResult[key] = value;
      }

      return safeResult;
    };
  }
}

export const storeManager = new StoreManager();
