import { createPersistedPinia } from './plugins/persist';

export * from './modules/user';
export * from './modules/global';
export * from './plugins/persist';

// 注意：这里导出的是一个 Promise，需要在 main.ts 中 await
export default createPersistedPinia();
