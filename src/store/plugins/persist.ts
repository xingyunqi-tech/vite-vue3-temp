import { createPinia } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import localforage from 'localforage';
import { isSentryEnabled } from '@/plugins/sentry/const';

/**
 * localforage配置
 */
const piniaStorage = localforage.createInstance({
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

      // 异步写入IndexedDB
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
 * 动态加载 Sentry Pinia 插件
 */
const loadSentryPiniaPlugin = async () => {
  if (!isSentryEnabled()) {
    return null;
  }

  try {
    const { createSentryPiniaPlugin } = await import('@sentry/vue');

    return createSentryPiniaPlugin({
      // 是否将Pinia状态附加到Sentry事件
      attachPiniaState: false,
      // 是否向Sentry事件添加面包屑导航
      addBreadcrumbs: false,
      // 配置需要跟踪的操作类型
      actionTransformer: (action: string) => {
        // 过滤敏感信息
        if (action.includes('password') || action.includes('token')) {
          return '[Filtered]';
        }
        return action;
      },
      // 配置需要跟踪的状态
      stateTransformer: (state: any) => {
        // 创建状态的副本，移除敏感信息
        const cleanState = { ...state };
        if (cleanState.password) delete cleanState.password;
        if (cleanState.token) delete cleanState.token;
        if (cleanState.apiKey) delete cleanState.apiKey;
        return cleanState;
      },
    });
  } catch (error) {
    console.warn('Failed to load Sentry Pinia plugin:', error);
    return null;
  }
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

  // 动态加载并添加 Sentry 插件
  const sentryPiniaPlugin = await loadSentryPiniaPlugin();
  if (sentryPiniaPlugin) {
    pinia.use(sentryPiniaPlugin);
  }

  return pinia;
};
