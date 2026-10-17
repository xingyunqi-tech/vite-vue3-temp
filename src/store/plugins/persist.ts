import localforage from 'localforage';
import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';

/**
 * localforage配置
 */
export const piniaStorage = localforage.createInstance({
  name: 'vite-vue3-temp',
  storeName: 'vite-vue3-temp-persist',
  description: 'Pinia 持久化存储',
  driver: localforage.INDEXEDDB,
});

/**
 * 同步缓存，用于存储从IndexedDB预加载的数据
 */
const syncCache = new Map<string, string>();

/**
 * 预加载IndexedDB数据到同步缓存
 */
export const preloadPersistedData = async (): Promise<void> => {
  try {
    const keys = await piniaStorage.keys();

    for (const key of keys) {
      const value = await piniaStorage.getItem(key);
      if (value !== null) {
        syncCache.set(key, JSON.stringify(value));
      }
    }
  } catch (error) {
    console.warn('Failed to preload IndexedDB data:', error);
  }
};

/**
 * 清除指定 store 的持久化数据（IndexedDB + 同步缓存）
 *
 * 两处都要清：只删 IndexedDB 的话，syncCache 里那份仍会被适配器的 getItem 读到，
 * 下次 hydrate 时把已登出的数据又还原回来。
 */
export const removePersistedStore = async (key: string): Promise<void> => {
  syncCache.delete(key);
  await piniaStorage.removeItem(key);
};

/**
 * 创建支持IndexedDB的同步适配器
 */
const createIndexedDBSyncStorage = () => {
  return {
    getItem: (key: string): string | null => {
      const value = syncCache.get(key);
      return value || null;
    },

    setItem: (key: string, value: string): void => {
      // 立即更新内存缓存
      syncCache.set(key, value);

      // 异步写入IndexedDB（fire-and-forget）
      //
      // 已知权衡：pinia-plugin-persistedstate 的 setItem 为同步签名，无法 await 写入完成。
      // 写入在状态变更时立即发起（非批量），丢失窗口仅限于「状态刚变更 → IndexedDB 事务尚未
      // 提交 → 用户在毫秒内关闭标签页」这一极小区间。对模板而言此风险可接受，故未引入
      // localStorage 同步兜底或 pagehide flush（收益有限且增加复杂度）。
      // 若业务对关键状态（如未提交的表单草稿）有强一致性要求，再按需补 flush 方案。
      try {
        const parsedValue = JSON.parse(value);
        piniaStorage.setItem(key, parsedValue).catch(error => {
          console.warn(`Failed to persist ${key} to IndexedDB:`, error);
        });
      } catch (error) {
        console.warn(`Failed to parse value for ${key}:`, error);
      }
    },
  };
};

/**
 * 创建配置好IndexedDB持久化的Pinia实例
 */
export const createPersistedPinia = async () => {
  const pinia = createPinia();

  const piniaPersistedState = createPersistedState({
    storage: createIndexedDBSyncStorage(),
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
  });

  // 添加持久化插件
  pinia.use(piniaPersistedState);

  return pinia;
};
