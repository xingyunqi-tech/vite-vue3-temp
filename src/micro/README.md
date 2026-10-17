# 微前端（qiankun）集成

通过两个**正交**的环境变量开关 `VITE_AS_HOST` / `VITE_AS_GUEST` 决定运行能力。

| `VITE_AS_HOST` | `VITE_AS_GUEST` | 含义 |
|:--------------:|:---------------:|------|
| `false` | `false` | 普通独立应用（默认） |
| `true`  | `false` | 可加载子应用 |
| `false` | `true`  | 可被父级加载（含独立访问） |
| `true`  | `true`  | 多级嵌套中间层 |

两个开关**完全独立**：
- HOST 能力靠 import `startMicroApp` / `useMicroApp` / `MicroAppContainer` 自动获得；构建期不做任何事。
- GUEST 能力在构建期由 `vite-plugin-qiankun` 注入入口 HTML 生命周期，运行时根据 `window.__POWERED_BY_QIANKUN__` 决定走 qiankun mount 还是直接挂载。

## 启用方式

按需在 env 文件或命令行设置开关。例如：

```bash
# .env.development（开发时启用 host 能力）
VITE_AS_HOST = true

# 临时启动一个子应用调试（独立部署可用）
cross-env VITE_AS_GUEST=true VITE_APP_NAME=my-app VITE_BASE_PATH=/my-app/ vite

# 生产构建子应用产物
cross-env VITE_AS_GUEST=true VITE_APP_NAME=my-app VITE_BASE_PATH=/my-app/ vite build
```

## 环境变量

| 变量 | 适用 | 说明 |
|------|------|------|
| `VITE_AS_HOST` | 全部 | 声明本应用承担主应用角色，供业务侧按需读取（`AS_HOST` / `IS_STANDALONE`）；HOST 的 API 本身 import 即可用，不受此开关门控 |
| `VITE_AS_GUEST` | 全部 | `true` 启用子应用能力（导出生命周期） |
| `VITE_APP_NAME` | guest | 作为子应用时的唯一名称 |
| `VITE_BASE_PATH` | guest | 构建资源 base + 独立访问时的路由 base（如 `/my-app/`）；被父级加载时由 `props.routerBase` 接管 |

## HOST：注册与加载子应用

### 静态注册

```ts
// 在 src/micro/main/apps.ts 或运行时调用
import { registerMicroApp } from '@/micro';

registerMicroApp({
  name: 'example',
  entry: import.meta.env.DEV ? '//localhost:3001/' : '/sub-apps/example/',
  // routerBase 与子应用在主应用中的挂载路径对齐，由 manager 自动透传给子应用
  routerBase: '/example',
});
```

> **注意**：`entry` 是子应用资源地址（HTML 入口），`routerBase` 是子应用 vue-router 的 base，二者**概念不同**且**值通常不同**。
> 不要用 qiankun 内置的 `__INJECTED_PUBLIC_PATH_BY_QIANKUN__`（资源 public path）当 router base —— 它可能含 host，会让 vue-router 路径匹配失败。
> 本方案约定主应用通过 `props.routerBase` 透传，子应用 `resolveRouterBase()` 自动读取。

### 容器组件方式（声明式）

```vue
<template>
  <MicroAppContainer
    ref="microRef"
    app="example"
    :app-props="{ token }"
    :auto-start="false"
    @mounted="onMounted"
  />
  <button @click="microRef?.start()">挂载</button>
  <button @click="microRef?.stop()">卸载</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MicroAppContainer } from '@/micro';

const microRef = ref();
const token = 'xxx';
function onMounted() {
  console.log('子应用已挂载');
}
</script>
```

### Composable 方式（命令式）

```ts
import { useMicroApp } from '@/micro';

const { status, start, stop, reload } = useMicroApp('example', {
  container: '#sub-app-host',
  props: { token: 'xxx' },
});

await start();
// ...
await stop();
```

### 直接调用 manager（最底层）

```ts
import { startMicroApp, stopMicroApp, getMicroAppStatus } from '@/micro';

const inst = await startMicroApp('example', {
  container: '#sub-app-host',
  props: { token },
});
await inst.mountPromise;

await stopMicroApp('example');
```

## GUEST：被父级加载或独立部署

启用 `VITE_AS_GUEST=true` 后构建产物天然支持两种使用：

1. **被父级加载**：`window.__POWERED_BY_QIANKUN__` 为真时走 qiankun mount。
2. **独立部署/访问**：`__POWERED_BY_QIANKUN__` 为假时直接渲染，等同普通 SPA。

被父级加载时，`renderApp` 只接受 `mount(props)` 传来的带 `container` 调用；不带 `container`
的调用直接返回（不创建应用、不占渲染锁），保证首次挂载拿到的是宿主给的 container 与 routerBase。

该闸门的条件与 `bootstrapApp` 的分发条件同为 `AS_GUEST && isInQiankun()`。没开 `VITE_AS_GUEST` 的应用
不暴露生命周期、等不到 `mount(props)`，被宿主加载时会 `console.warn` 一句并按独立模式自行渲染。

## HOST + GUEST：多级嵌套中间层

中间层同时启用两个开关时：

1. **作为子应用被加载**：bootstrap 走 qiankun mount；`resolveRouterBase()` 自动使用上层通过 `props.routerBase` 注入的值。
2. **作为主应用加载下级**：业务代码任意时机调用 `startMicroApp`，下级 entry 用绝对 URL。
3. **独立访问 dist 入口**：直接渲染，HOST 能力可用，适合本地联调下级。

### 嵌套层的全局状态

中间层若想让下级也能用全局通信，只需在本层调用一次 `setupGlobalState`。qiankun 在 mount 时会给每个下级注入独立的通信桥，无需手动透传。

```ts
// 在被父级加载的 mount(props) 中
async mount(props) {
  // 1. 接收上层注入的通信桥
  props.onGlobalStateChange?.((state) => {
    // 同步到本层 pinia
  }, true);

  // 2. 本层初始化自己的全局状态（qiankun 会给下级注入通信桥）
  setupGlobalState({ /* ... */ });

  // 3. 加载下级，无需手动塞 bridge
  await startMicroApp('child-app', { container: '#child' });
}
```

## 单层主子通信

主应用初始化全局状态后，qiankun 在 mount 时会给每个子应用注入独立的 `onGlobalStateChange / setGlobalState`，并在卸载时自动清理该子应用的监听，业务侧无需手动透传。

```ts
import { setupGlobalState, setGlobalState } from '@/micro';

setupGlobalState({ user: null, theme: 'light' });
setGlobalState({ user: { id: 1, name: 'Tom' } });
```

子应用在 mount(props) 中直接解构使用：

```ts
async function renderApp(props = {}) {
  const { onGlobalStateChange, setGlobalState } = props;
  onGlobalStateChange?.((state) => {
    // 同步到 pinia
  }, true);
}
```

## 已知约束

- **JS 沙箱不可用**：vite-plugin-qiankun 不能完全沙箱化 ESM，多个子应用共享 `window`。请勿污染全局命名空间。
- **CSS 隔离**：默认开启 `experimentalStyleIsolation`；Element Plus 弹层（Message/MessageBox/Dropdown/Popper）会挂到 `document.body` 而逃逸隔离，需在子应用根用 `<el-config-provider :teleported="false">` 或为关键弹层显式指定 `appendTo`。
- **加载失败只能刷新页面重试**：qiankun 与 import-html-entry 会缓存失败的加载结果且无清除接口，同一页面内再次 `start` / `reload` 会直接 reject 并提示刷新页面。`MicroAppContainer` 默认错误界面提供「刷新页面」按钮，自定义 `error` 插槽时需自行提供刷新入口。
- **HMR**：guest 在 qiankun 容器中 HMR 受限，开发推荐先独立访问调试，最后再到主应用集成。
- **持久化命名空间**：子应用与主应用同源时 localStorage 会冲突，建议 pinia-plugin-persistedstate 的 key 加上 `VITE_APP_NAME` 前缀。
- **Router 实例每次 mount 重建**：为了让 `routerBase` 能在 `createWebHistory` 之前生效，router 改为工厂模式（`createAppRouter()`）。`destroyApp` 会自动 `resetPermission()`，让下次 mount 时 guard 重新生成异步路由表；其它 pinia 状态（如 user-info）保留。如需更彻底的状态重置，业务侧在 mount(props) 中显式处理。

## 目录结构

```
src/micro/
├── index.ts              # 统一入口（bootstrapApp + 全部导出）
├── shared/
│   ├── env.ts            # AS_HOST/AS_GUEST、isInQiankun、resolveRouterBase、applyInjectedRouterBase
│   ├── state.ts          # setupGlobalState / setGlobalState / getGlobalActions
│   └── types.ts          # MicroAppConfig、MicroAppStatus 等类型
└── main/
    ├── apps.ts           # 子应用注册表（registerMicroApp/listMicroApps/...）
    ├── manager.ts        # loadMicroApp 封装 + buildMountProps 自动注入 routerBase/通信桥
    ├── useMicroApp.ts    # composable
    └── MicroAppContainer.vue
```
