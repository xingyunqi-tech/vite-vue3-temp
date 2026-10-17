# 测试指南

## 📋 概述

本项目使用 Vitest 做单元测试与轻量集成测试，覆盖请求层、路由守卫、Store、工具函数、指令与关键组件。

## 🛠️ 测试技术栈

- **测试框架**：[Vitest](https://vitest.dev/) 5.x
- **Vue 测试工具**：[@vue/test-utils](https://test-utils.vuejs.org/) 2.x
- **测试环境**：[jsdom](https://github.com/jsdom/jsdom)
- **覆盖率**：[@vitest/coverage-v8](https://vitest.dev/guide/coverage.html)
- **UI 界面**：[@vitest/ui](https://vitest.dev/guide/ui.html)

> ⚠️ **未安装**：`msw`、`@testing-library/vue`、`@testing-library/jest-dom` 以及任何 E2E 框架。
> 拦截 HTTP 用 axios `adapter` 或 `vi.mock`；断言 DOM 用 `@vue/test-utils` 的 `wrapper.text()` / `wrapper.find()`，不要用 `toBeInTheDocument()` 这类 jest-dom 匹配器。

## 🚀 快速开始

```bash
pnpm test            # 运行所有测试（单次）
pnpm test:watch      # 监听模式
pnpm test:coverage   # 生成覆盖率报告
pnpm test:ui         # 可视化界面
```

## 📁 目录结构

测试文件**只放 `tests/` 目录**（`include: ['tests/**/*.{test,spec}.*']`），目录镜像 `src/`：

```
tests/
├── setup.ts                         # 全局测试环境
├── api/request.test.ts              # 请求层：请求头、业务码、401、下载、便捷函数
├── app/render.test.ts               # 应用启动顺序与扩展钩子
├── components/error-boundary.test.ts
├── directives/role.test.ts          # v-role 指令
├── layout/menu-item.test.ts
├── plugins/
│   ├── sentry.test.ts               # Sentry 初始化与上报
│   ├── site-config.test.ts          # 站点配置合并 / 差分 / 校验
│   └── site-config-color.test.ts    # 颜色解析与比较
├── router/
│   ├── guards.test.ts               # 路由守卫
│   ├── redirect.test.ts             # 回跳地址解析（含开放重定向防护）
│   └── title.test.ts
├── store/
│   ├── permission.test.ts           # 权限路由过滤
│   └── user-info.test.ts            # 登录 / 用户信息 / 退出
├── utils/
│   ├── auth.test.ts                 # token 读写与登录页跳转
│   ├── datetime.test.ts
│   ├── error-handler.test.ts
│   └── login-redirect.test.ts       # redirectToLoginOnce 并发只跳一次
└── views/login.test.ts              # 登录页
```

新增时按被测文件位置放：`src/store/modules/permission.ts` → `tests/store/permission.test.ts`。

## ⚙️ 配置说明

### vitest.config.ts 复用 vite.config.ts

```typescript
const baseConfig = viteConfig({ mode: 'test', command: 'serve' });
delete baseConfig.server;
export default mergeConfig(baseConfig, defineConfig({ test: { /* ... */ } }));
```

测试复用 vite 的完整插件链与路径别名：UnoCSS、`unplugin-vue-components`（Element Plus 自动注册）、`vite-plugin-svg-icons` 的 `virtual:svg-icons-register`、`@` 别名。不要改成独立的 `defineConfig({ plugins: [vue()] })`。

⚠️ `vite.config.ts` 的默认导出必须保持**同步函数**，否则 `baseConfig` 是 Promise，`delete` 与 `mergeConfig` 会静默失效。

### setup.ts 提供的全局环境

| 对象 | 说明 |
|---|---|
| `matchMedia` | 返回 `matches: false` |
| `ResizeObserver` / `IntersectionObserver` | 空实现的 class，可被 `new` |
| `document.documentElement.style` | `setProperty` / `getPropertyValue` / `removeProperty` 为 `vi.fn()` |
| `localStorage` / `sessionStorage` | 内存版实现，每个测试后 `localStorage.clear()` |
| `fetch` | `vi.fn()`，另暴露为 `globalThis.mockFetch` |
| `URL.createObjectURL` / `revokeObjectURL` | 返回 `'blob:mock-url'` |

setup.ts 不 mock 任何业务模块，Cookie 由 jsdom 真实实现，`@/utils/auth` 的 `setToken / getToken / removeToken` 可直接使用。Element Plus 组件由 `unplugin-vue-components` 在编译期自动注册，无需全局 `stubs`。

## 🧪 Mock 指南

### 请求层：用 axios adapter 构造响应

测 `src/api/core/request.ts` 时不 mock axios，给单次请求传 `adapter` 返回伪造响应，拦截器照常执行：

```typescript
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { httpApi } from '@/api/core/request';
import { redirectToLoginOnce } from '@/utils/error-handler';

vi.mock('@/utils/error-handler', () => ({
  redirectToLoginOnce: vi.fn(),
  toFriendlyMessage: (msg: string) => msg,
}));
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

const respond =
  (data: unknown, status = 200): AxiosAdapter =>
  async config => {
    const response = { data, status, statusText: '', headers: {}, config: config as InternalAxiosRequestConfig };
    if (status >= 400) {
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };

it('非成功码提示后端文案并 reject', async () => {
  await expect(httpApi.get('/fail', { adapter: respond({ code: 500, message: '保存失败' }) })).rejects.toThrow('保存失败');
  expect(ElMessage.error).toHaveBeenCalledWith('保存失败');
});

it('业务码 401 跳登录页', async () => {
  await expect(httpApi.get('/me', { adapter: respond({ code: 401, message: '未登录' }) })).rejects.toThrow();
  expect(redirectToLoginOnce).toHaveBeenCalled();
});
```

### 手写接口与 Store：mock 接口模块

测 Store 时 mock `@/api/modules/auth`，不发真实请求：

```typescript
import { getUserInfo, login } from '@/api/modules/auth';

vi.mock('@/api/modules/auth', () => ({
  login: vi.fn(async () => ({ token: 'token-a' })),
  logout: vi.fn(async () => undefined),
  getUserInfo: vi.fn(async () => ({ id: 1, username: 'teacher', role: 'TEACHER' })),
}));

vi.mocked(getUserInfo).mockResolvedValueOnce({ id: 2, username: 'u', role: '' } as never);
```

Orval 生成函数 mock `@/api/generated/` 下的真实模块路径，从 `@/api` 导入时拿到的也是 mock 版本。`src/api/generated/` 要运行 `pnpm orval` 后才存在。

### `@/utils/auth`：部分 mock

保留真实的 token 读写，只替换会整页跳转的函数（jsdom 不支持 `window.location.assign` 导航）：

```typescript
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogout: vi.fn(),
}));
```

同样的写法适用于 `jumpToLogin`。测 `jumpToLogin / jumpToLogout` 本身时改为用 `Object.defineProperty` 替换 `window.location`，断言 `assign` 的参数（见 `tests/utils/auth.test.ts`）。断言登录跳转时检查 `jumpToLogin` / `redirectToLoginOnce` 是否被调用，不要断言 `router.push('/login')`。

### 需要重新求值模块时

模块级状态（如 `redirectToLoginOnce` 的「已跳转」标记）需要在用例间复位时，用 `vi.resetModules()` + 动态 `import()`；要在运行时替换 mock 用 `vi.doMock()`（`vi.mock` 会被提升到文件顶部）。参考 `tests/utils/login-redirect.test.ts`、`tests/plugins/sentry.test.ts`。

## 🧪 各层写法

### Store

- `useUserInfoStore` 的 `token` 是 Cookie 的镜像：用 `setToken()` 写 Cookie 后调 `store.refreshToken()` 同步，与路由守卫的做法一致
- 主要 action：`loginAction`、`getInfoAction`、`logoutAction`、`isAccountSwitched`、`refreshToken`
- Setup 语法的 Store 不支持 `$reset()`，每个用例在 `beforeEach` 里 `setActivePinia(createPinia())` 重建

```typescript
import { createPinia, setActivePinia } from 'pinia';
import { useUserInfoStore } from '@/store/modules/user-info';
import { getToken, removeToken } from '@/utils/auth';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  removeToken();
});

it('loginAction 写入 token 并同步登录态', async () => {
  const store = useUserInfoStore();
  await store.loginAction({ username: 'u', password: 'p' });

  expect(getToken()).toBe('token-a');
  expect(store.isLoggedIn).toBe(true);
});
```

### 工具函数

```typescript
import { formatDate, formatDateShort } from '@/utils/datetime';

it('格式化完整日期时间', () => {
  expect(formatDate('2024-01-15 13:45:30', 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 13:45:30');
});

it('输入为空时返回 -', () => {
  expect(formatDateShort(undefined)).toBe('-');
});
```

底层是 dayjs，格式串用大写 `YYYY-MM-DD HH:mm:ss`。

### 组件

```typescript
const wrapper = mount(UserCard, {
  props: { name: '张三' },
  global: { plugins: [createPinia()] },
});
expect(wrapper.text()).toContain('张三');
expect(wrapper.emitted('delete')?.[0]).toEqual(['u1']);
```

只测有分支逻辑的组件，纯展示组件不必补快照。

## 📊 覆盖率

`vitest.config.ts` **未设覆盖率阈值**，`pnpm test:coverage` 只出报告。需要门禁时在 `coverage` 中添加：

```typescript
coverage: {
  thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
  include: ['src/**/*.{ts,vue}'],
}
```

- `thresholds` 必须扁平写，套 `global: {...}` 会被当成 glob 匹配而静默失效
- 不配 `include` 时只统计被测试导入过的文件，数字偏高

报告输出到 `./coverage`：控制台文本、JSON、HTML（`coverage/index.html`）。

## 🎯 最佳实践

- 用例名只陈述行为，如 `it('未登录时不带 Authorization')`
- 按 Arrange / Act / Assert 组织用例
- `beforeEach` 中重建 Pinia 并 `vi.clearAllMocks()`，用例之间不共享状态
- 异步断言用 `await expect(fn()).rejects.toThrow(...)` / `resolves.toEqual(...)`
- 覆盖正常值、边界值（空、0、最大值）与异常三类输入
- 优先测：`src/utils/`、`src/api/core/`、`src/router/`、`src/store/modules/`（角色与权限逻辑出错会导致越权）

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [.claude/agents/testing.md](../.claude/agents/testing.md)：AI 测试指导
