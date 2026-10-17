# qiankun 微前端接入指南

本脚手架已在 `src/micro/` 内置微前端能力。**同一份代码**可以三种模式运行，由环境变量开关控制：

- **HOST（主应用）**：注册并加载子应用（基于 `qiankun` 的 `loadMicroApp`）
- **GUEST（子应用）**：暴露 qiankun 生命周期，可被父级加载（基于 `vite-plugin-qiankun`）
- **STANDALONE（独立）**：既不作主也不作子，正常独立运行

> HOST 与 GUEST 能力正交：一个应用可以同时是某个父级的子应用、又作为主应用加载自己的子应用。

---

## 一、运行模式与环境变量

模式由 `src/micro/shared/env.ts` 读取的环境变量决定：

| 变量 | 作用 | 取值 |
|------|------|------|
| `VITE_AS_HOST` | 启用主应用能力（注册/加载子应用） | `'true'` 开启 |
| `VITE_AS_GUEST` | 启用子应用能力（暴露 qiankun 生命周期） | `'true'` 开启 |
| `VITE_APP_NAME` | 当前应用对外名称（**GUEST 模式必需**，需与父级注册的 `name` 一致） | 字符串 |
| `VITE_BASE_PATH` | 非 qiankun 环境下的 vue-router base | 路径，默认 `/` |

```bash
# .env.xxx
VITE_AS_HOST=true        # 作为主应用
VITE_AS_GUEST=true       # 作为子应用
VITE_APP_NAME=my-app     # 子应用名称
```

派生常量：`AS_HOST`、`AS_GUEST`、`IS_STANDALONE`（`!AS_HOST && !AS_GUEST`）、`APP_NAME`，以及运行时判定 `isInQiankun()`。

应用启动统一通过 `src/main.ts` 的 `bootstrapApp()` 分发（见下文「作为子应用（GUEST）」一节）。Vue 应用挂载点为 `#main-app`（见 `src/app/render.ts`）。

---

## 二、作为主应用（HOST）

主应用能力通过直接 `import` `@/micro` 的 API 使用，与 `bootstrapApp` 正交。

### 1. 注册子应用

静态注册写在 `src/micro/main/apps.ts` 的 `microApps` 数组；也可在运行时动态注册：

```typescript
import { registerMicroApp } from '@/micro';

registerMicroApp({
  name: 'example',                                   // 唯一名称，需与子应用 VITE_APP_NAME 一致
  entry: import.meta.env.DEV ? '//localhost:3001/' : '/sub-apps/example/',
  routerBase: '/example',                            // 子应用在主应用中的挂载路径（自动注入给子应用）
  // container / props / configuration 可选
});
```

`MicroAppConfig` 字段（`src/micro/shared/types.ts`）：

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 应用唯一名称，须与子应用 `VITE_APP_NAME` 一致 |
| `entry` | ✅ | 子应用 HTML 入口 URL |
| `container` | ❌ | 容器 CSS 选择器；留空由 `MicroAppContainer` 自动生成 |
| `routerBase` | ❌ | 子应用路由 base，由 manager 自动注入到 `mount(props.routerBase)` |
| `props` | ❌ | 透传给子应用 `mount(props)` 的数据 |
| `configuration` | ❌ | 单实例覆盖 qiankun `FrameworkConfiguration` |

注册相关 API：`registerMicroApp(config)`、`unregisterMicroApp(name)`、`getMicroAppConfig(name)`、`listMicroApps()`。

### 2. 声明式接入：`MicroAppContainer` 组件（推荐）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MicroAppContainer } from '@/micro';

const containerRef = ref<InstanceType<typeof MicroAppContainer>>();
// 需要手动控制时：containerRef.value?.start() / .stop()
</script>

<template>
  <MicroAppContainer
    app="example"
    :app-props="{ token: 'xxx' }"
    auto-start
    @mounted="onMounted"
    @error="onError"
  >
    <template #loading>自定义加载中…</template>
    <template #error="{ error }">加载失败：{{ error?.message }}</template>
  </MicroAppContainer>
</template>
```

| Props | 默认 | 说明 |
|-------|------|------|
| `app` | — | 子应用名称（已注册）或完整 `MicroAppConfig` |
| `appProps` | `{}` | 透传给子应用 mount 的 props |
| `containerId` | `micro-{name}` | 自定义容器 id |
| `autoStart` | `false` | 挂载后是否自动启动 |

- **Emits**：`mounted` / `unmounted` / `error(Error)` / `statusChange(MicroAppStatus)`
- **Expose**：`start()` / `stop()` / `status` / `error`
- **Slots**：`placeholder`（idle/unmounted）/ `loading` / `error`
- 组件卸载时自动 `stopMicroApp`。

### 3. 命令式接入：`useMicroApp`

```typescript
import { useMicroApp } from '@/micro';

const { status, error, start, stop, reload, isMounted } = useMicroApp('example', {
  container: '#sub-app',          // 容器 CSS 选择器
  props: { token: 'xxx' },        // 默认 props
  autoStopOnUnmount: true,        // 组件卸载时自动 stop（默认 true）
});

await start();                    // start(overrideProps?) 可临时覆盖 props
await reload();                   // = stop() 再 start()
```

### 4. 底层 manager API

`MicroAppContainer` / `useMicroApp` 都基于 manager（`src/micro/main/manager.ts`），也可直接使用：

| 方法 | 说明 |
|------|------|
| `startMicroApp(target, options?)` | 启动子应用，返回 qiankun `MicroApp`；已挂载则复用，活跃中间态先 `await unmount` 再重建 |
| `stopMicroApp(name)` | 卸载子应用（无实例或错误终态时安静返回） |
| `stopAllMicroApps()` | 卸载全部 |
| `getMicroAppStatus(name)` | 获取状态，未加载返回 `'NOT_LOADED'` |
| `getMicroAppInstance(name)` | 获取 `MicroApp` 实例（可访问 `mountPromise` 等） |

`StartOptions`：`container` / `props` / `configuration` / `lifecycles`。默认框架配置启用样式隔离：`sandbox: { experimentalStyleIsolation: true }`。

### 5. 跨应用状态通信（可选）

主应用如需与子应用共享状态，在启动时调用一次 `setupGlobalState`（`src/micro/shared/state.ts`）：

```typescript
import { setupGlobalState, setGlobalState } from '@/micro';

setupGlobalState({ token: 'xxx', theme: 'light' }); // 仅主应用调用一次
setGlobalState({ theme: 'dark' });                  // 后续更新
```

一旦初始化，qiankun 会在 `mount(props)` 时给每个子应用注入独立的 `onGlobalStateChange` / `setGlobalState`，卸载时自动清理该子应用的监听，子应用直接从 mount props 取用即可。`GlobalState` 结构在 `state.ts` 中定义，可按需扩展。

---

## 三、作为子应用（GUEST）

子应用无需手写 qiankun 生命周期，`src/main.ts` 已统一通过 `bootstrapApp` 适配：

```typescript
// src/main.ts（已内置）
import { destroyApp, renderApp } from './app/render';
import { bootstrapApp } from './micro';

bootstrapApp({
  render: props => renderApp(props),
  destroy: destroyApp,
});
```

`bootstrapApp`（`src/micro/index.ts`）的分发逻辑：

- **`AS_GUEST` 且运行在 qiankun 容器内**：通过 `renderWithQiankun` 注册 `bootstrap` / `mount` / `unmount` 生命周期，等待父级调用；`update` 为 no-op（qiankun 的 update 语义是「传新 props 但不卸载」，需重启子应用请用 `stopMicroApp` + `startMicroApp`）。
- **其它情况**（独立运行 / 独立部署）：立即 `render()`。其中「在容器内但没开 `VITE_AS_GUEST`」是宿主误配，
  会先 `console.warn` 提示，再按独立模式渲染。

> **GUEST 形态下只认 mount 传来的 container。** `renderApp`（`src/app/render.ts`）的渲染闸门与上面的分发条件
> 同为 `AS_GUEST && isInQiankun()`：这一形态下不带 `props.container` 的调用被直接忽略，不创建应用、不占渲染锁。
> 子应用入口里除 `bootstrapApp` 之外的直调（模版真源中 `#else` 分支的 `void renderApp({})` 也是活代码）
> 因此不会抢在宿主 `mount(props)` 之前，用缺失的 container 与 routerBase 渲染一次。
>
> 两个条件必须一致：没开 `VITE_AS_GUEST` 的应用不暴露生命周期，宿主的 `mount(props)` 永远不会到达，
> 闸门若把它一并拦下就是不报错的白屏。

### 路由 base 注入与解析

主应用通过 `props.routerBase` 透传子应用挂载路径，子应用据此设置 vue-router 的 base：

- `renderApp` 在创建 router **之前**调用 `applyInjectedRouterBase(props.routerBase)`（`src/app/render.ts`），把值写入子应用 window。
- 路由工厂内通过 `resolveRouterBase()`（`src/micro/shared/env.ts`）解析：qiankun 容器内用注入值，否则用 `VITE_BASE_PATH`。

> 注意：`resolveRouterBase` 使用自定义键 `__INJECTED_ROUTER_BASE_BY_QIANKUN__`，刻意区别于 qiankun 内置的 `__INJECTED_PUBLIC_PATH_BY_QIANKUN__`（资源 public path，可能含 host，**不能**用作 router base）。

### vite-plugin-qiankun 配置

子应用构建需启用 `vite-plugin-qiankun`，插件名与 `VITE_APP_NAME` 一致，并按部署调整 `base`：

```typescript
import qiankun from 'vite-plugin-qiankun';

export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : '/sub-apps/example/',
  plugins: [vue(), qiankun(process.env.VITE_APP_NAME!, { useDevMode: mode === 'development' })],
  server: { cors: true, origin: '//localhost:3001' }, // 必须 cors，主应用才能跨域加载
}));
```

---

## 四、关键类型

```typescript
// src/micro/shared/types.ts
interface MicroAppConfig {
  name: string;
  entry: string;
  container?: string;
  routerBase?: string;
  props?: ObjectType;
  configuration?: FrameworkConfiguration;
}

// wrapper 层（Container / composable）对业务暴露的状态机
type MicroAppStatus = 'idle' | 'loading' | 'mounted' | 'unmounted' | 'error';
```

`@/micro` 统一导出：`bootstrapApp`、manager（`startMicroApp` 等）、apps（`registerMicroApp` 等）、`useMicroApp`、`MicroAppContainer`，以及 `shared/env`、`shared/state`、`shared/types`。

---

## 五、注意事项

| 项目 | 说明 |
|------|------|
| **应用名称一致** | `MicroAppConfig.name` 必须与子应用 `VITE_APP_NAME` 一致 |
| **端口跨域** | 子应用 `server.cors: true`，主应用才能加载其资源 |
| **路由 base** | 主应用通过 `routerBase` 注入，子应用用 `resolveRouterBase` 读取，勿手写死 base |
| **样式隔离** | 默认开启 `experimentalStyleIsolation`，弹窗类组件（`ElMessage`/`ElDialog`）建议指定挂载点避免逃逸 |
| **重启子应用** | qiankun `update` 为 no-op，需重启请用 `stopMicroApp` + `startMicroApp`（或 `useMicroApp().reload`） |
| **加载失败后重试** | qiankun 与 import-html-entry 会缓存失败的加载结果且无清除接口，同一页面内再次 `start` / `reload` 会直接 reject 并提示刷新页面；`MicroAppContainer` 默认错误界面提供「刷新页面」按钮 |
| **独立运行能力** | 子应用须能在 STANDALONE 模式下独立启动，便于单独开发调试 |
| **依赖** | HOST 侧依赖 `qiankun`，GUEST 侧依赖 `vite-plugin-qiankun` |
