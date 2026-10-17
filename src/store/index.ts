import { createPersistedPinia } from './plugins/persist';

export * from './modules/user-info';
export * from './modules/global';
export * from './modules/permission';
export * from './modules/site-config';
export * from './plugins/persist';

// 注意：这里导出的是一个 Promise，需要在 main.ts 中 await
export default createPersistedPinia();
