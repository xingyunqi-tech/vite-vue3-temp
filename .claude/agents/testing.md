---
name: testing
description: 测试策略制定、测试用例编写、测试工具配置和质量保证
tools: Read, Grep, Glob, WebFetch, WebSearch
model: inherit
---

# 测试指导 Agent

## 职责
测试策略制定、测试用例编写、测试工具配置和质量保证，为 AI 生成高质量测试代码提供指导。

---

## 📌 项目测试基建（先读这段）

| 项 | 事实 |
|---|---|
| 测试框架 | Vitest 5 + jsdom + `@vue/test-utils` 2 |
| 测试文件位置 | **只在 `tests/` 目录**（`include: ['tests/**/*.{test,spec}.*']`），不放 `src/` 下 |
| 覆盖率 | `@vitest/coverage-v8`，**模板未设阈值**——`pnpm test:coverage` 不会因覆盖率不足而失败 |
| 未安装 | ❌ `msw` ❌ `@testing-library/vue` ❌ `@testing-library/jest-dom` ❌ E2E 框架 |
| 现有用例 | 18 个文件，按源码目录分布在 `tests/{api,app,components,directives,layout,plugins,router,store,utils,views}/` |

> 用未安装的库写测试会直接 `Cannot find module`。需要拦截 HTTP 时用 axios 的 `adapter` 构造响应，
> 或用 `vi.mock` 模块级 Mock，不要写 MSW。断言 DOM 用 `@vue/test-utils` 的 `wrapper.text()` / `wrapper.find()`，
> 不要用 `toBeInTheDocument()` 这类 jest-dom 匹配器。

**命令**：`pnpm test`（单次） / `test:watch` / `test:coverage` / `test:ui`

---

## 🛠️ 测试配置

### vitest.config.ts —— 复用 vite.config，不要另起炉灶

项目的测试配置**继承 `vite.config.ts` 的完整插件链**，这是刻意设计：

```typescript
// vitest.config.ts（项目真实实现）
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const baseConfig = viteConfig({ mode: 'test', command: 'serve' });
delete baseConfig.server;   // dev server 专属配置（proxy/host/CORS）对测试是死重量

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      setupFiles: ['./tests/setup.ts'],
      server: { deps: { inline: [/element-plus/] } },  // 正则匹配 element-plus 的样式子路径，避免 CSS 导入问题
      coverage: { provider: 'v8', reporter: ['text', 'json', 'html'], reportsDirectory: './coverage' },
    },
  }),
);
```

⚠️ **不要改写成独立的 `defineConfig({ plugins: [vue()] })`**。那样会丢掉：

- UnoCSS（原子类不生效）
- `unplugin-vue-components` 自动注册（Element Plus 组件解析不到，`el-button` 变成未知标签）
- `vite-plugin-svg-icons` 的 `virtual:svg-icons-register`（SvgIcon 报虚拟模块找不到）
- 路径别名 `@`

⚠️ `vite.config.ts` 的默认导出必须保持**同步函数**。改成 `async` 后 `baseConfig` 会变成 Promise，
`delete` 静默失效、`mergeConfig` 合出错配置，且全程不报错。

### 覆盖率阈值（需要时才加）

```typescript
coverage: {
  provider: 'v8',
  // ⚠️ thresholds 必须【扁平】写。套 `global: {...}` 在 Vitest 1+ 会被当成 glob
  //    文件模式去匹配（匹配不到任何文件），阈值静默失效、永远"通过"。
  thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
  // ⚠️ 不配 include 时，只统计"被测试导入过的文件"，未测文件不计入，数字虚高。
  include: ['src/**/*.{ts,vue}'],
}
```

### tests/setup.ts 已做的事

已全局 Mock：`matchMedia`、`ResizeObserver` / `IntersectionObserver`（class 实现，可 `new`）、`document.documentElement.style`、
`localStorage` / `sessionStorage`（内存实现，每个用例后清空 `localStorage`）、`fetch`、`URL.createObjectURL` / `revokeObjectURL`。
**不需要在单测里重复 Mock 这些**。另挂了全局辅助 `globalThis.mockFetch`、`globalThis.mockLocalStorage`。
未处理的 Promise rejection 会被 Vitest 报错，预期内的失败请在测试里自行 `catch` 或 `await expect(...).rejects`。

Element Plus 组件由 `unplugin-vue-components` 在 SFC 编译期自动注册，
**不需要** `config.global.stubs` 逐个打桩；个别测试想屏蔽重组件时在该测试内局部 `stubs` 即可。

---

## 🧪 单元测试

### 工具函数（最该优先覆盖）

```typescript
// tests/utils/datetime.test.ts —— 项目现有用例，可作为范式
import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, formatDateTime } from '@/utils/datetime';

describe('Date Utils', () => {
  describe('formatDateShort', () => {
    it('应该正确格式化日期为 YYYY-MM-DD', () => {
      expect(formatDateShort('2023-12-25T15:30:45')).toBe('2023-12-25');
    });

    it('应该处理空值返回 -', () => {
      expect(formatDateShort(undefined)).toBe('-');
    });
  });

  describe('formatDate', () => {
    it('应该支持 Date 对象输入', () => {
      expect(formatDate(new Date('2024-01-15T13:45:30'), 'YYYY-MM-DD')).toBe('2024-01-15');
    });
  });
});
```

### Pinia Store

用户 Store（`src/store/modules/user-info.ts`）的真实 action：`loginAction(params)` / `getInfoAction()` / `isAccountSwitched()` / `logoutAction(redirect?)` / `setUserInfo()` / `resetUserInfo()`。

- `token` 是 Cookie 的 **ref 镜像**，由 `refreshToken()` 同步；测试里用 `@/utils/auth` 的真实 `setToken()` / `removeToken()` 操作 Cookie 即可
- 接口来自 `@/api/modules/auth`（`login` / `logout` / `getUserInfo`），整模块 `vi.mock`
- 整页跳转函数（`jumpToLogout` 等）在 jsdom 下不能真跳，用 `importOriginal` 只替换这一个导出

```typescript
// 写法参照 tests/store/user-info.test.ts
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUserInfo, login } from '@/api/modules/auth';
import { useUserInfoStore } from '@/store/modules/user-info';
import { getToken, jumpToLogout, removeToken } from '@/utils/auth';

vi.mock('@/api/modules/auth', () => ({
  login: vi.fn(async () => ({ token: 'token-a' })),
  logout: vi.fn(async () => undefined),
  getUserInfo: vi.fn(async () => ({ id: 1, username: 'teacher', realName: '张老师', avatar: '', email: '', phone: '', role: 'TEACHER' })),
}));
vi.mock('@/store/plugins/persist', () => ({ removePersistedStore: vi.fn(async () => {}) }));
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogout: vi.fn(),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  removeToken();
});

it('loginAction 写入 token 并同步登录态', async () => {
  const store = useUserInfoStore();
  await store.loginAction({ username: '13800000000', password: 'Abcd1234' });

  expect(login).toHaveBeenCalledWith({ username: '13800000000', password: 'Abcd1234' });
  expect(getToken()).toBe('token-a');
  expect(store.isLoggedIn).toBe(true);
});

it('接口返回的角色不在 ROLES 内时 role 为空', async () => {
  vi.mocked(getUserInfo).mockResolvedValueOnce({ id: 2, username: 'u', role: 'UNKNOWN' } as never);
  const store = useUserInfoStore();

  await store.getInfoAction();

  expect(store.info.role).toBe('');
});

it('logoutAction 清理后跳转登录页', async () => {
  const store = useUserInfoStore();
  await store.logoutAction();

  expect(jumpToLogout).toHaveBeenCalled();
});
```

### Vue 组件

```typescript
// tests/components/UserCard.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserCard from '@/components/UserCard/index.vue';

describe('UserCard', () => {
  it('应该渲染传入的用户名', () => {
    const wrapper = mount(UserCard, { props: { name: '张三', role: 'TEACHER' } });
    expect(wrapper.text()).toContain('张三');
  });

  it('点击应该 emit delete 事件并带上 id', async () => {
    const wrapper = mount(UserCard, { props: { id: 'u1', name: '张三' } });
    await wrapper.find('[data-testid="delete"]').trigger('click');

    expect(wrapper.emitted('delete')?.[0]).toEqual(['u1']);
  });
});
```

需要 Pinia 时：`mount(Comp, { global: { plugins: [createPinia()] } })`，
且 `setActivePinia` 与 `plugins` 用**同一个** pinia 实例，否则组件内取到的是另一个 store。

---

## 🔗 Mock 策略

### Mock API 模块

项目 API 有两个来源，Mock 的目标路径不同：

```typescript
// ① 手写模块（src/api/modules/*）—— 直接 mock 该模块
vi.mock('@/api/modules/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUserInfo: vi.fn(),
}));

// ② Orval 生成的函数 —— mock generated 下的真实模块路径。
//    因为 @/api 只是 re-export，mock 底层模块后从 @/api 导入拿到的也是 mock 版本。
vi.mock('@/api/generated/auth/auth', () => ({ postAuthLogin: vi.fn() }));
```

> `src/api/generated/` 要跑过 `pnpm orval` 才存在。模板状态下针对它写的测试会 `Cannot find module`。

### 测试请求层：用 axios adapter 构造响应

测 `src/api/core/request.ts` 的拦截器时不 mock axios，而是给单次请求传 `adapter` 直接返回构造好的响应
（参考 `tests/api/request.test.ts`）：

```typescript
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
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

it('业务码 401 时跳转登录页', async () => {
  await expect(httpApi.get('/x', { adapter: respond({ code: 401, message: '未登录' }) })).rejects.toThrow();
  expect(redirectToLoginOnce).toHaveBeenCalled();
});

it('skipAuthRedirect 时不跳转', async () => {
  await expect(
    httpApi.get('/x', { adapter: respond({ code: 401, message: '' }), skipAuthRedirect: true }),
  ).rejects.toThrow();
  expect(redirectToLoginOnce).not.toHaveBeenCalled();
});
```

### Mock Element Plus 消息

```typescript
vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal<object>()),
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
```

### 测试错误处理与登录跳转

API 错误由 `src/api/core/request.ts` 的响应拦截器统一处理（弹提示、401 调 `redirectToLoginOnce()` 清 token 后
`jumpToLogin()` 整页跳 `/login?redirect=...`）。`jumpToLogin` 是 `window.location.assign`，jsdom 下要 mock：

```typescript
vi.mock('@/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/auth')>()),
  jumpToLogin: vi.fn(),
}));
```

`redirectToLoginOnce` 带模块级「已跳转」标记，需要在用例间复位时用 `vi.resetModules()` + 动态 `import()`
（参考 `tests/utils/login-redirect.test.ts`）。守卫内的未登录跳转是返回 `/login` 路由，断言导航结果即可（参考 `tests/router/guards.test.ts`）。

---

## 📋 测试最佳实践

### 命名规范

```typescript
describe('模块名称', () => {
  describe('功能分组', () => {
    it('应该 + 期望行为', () => {});      // ✅
    it('test1', () => {});                // ❌
  });
});
```

### AAA 模式

```typescript
it('应该正确计算总价', () => {
  const items = [{ price: 10 }, { price: 20 }];   // Arrange
  const total = calculateTotal(items);            // Act
  expect(total).toBe(30);                         // Assert
});
```

### 测试隔离

- `beforeEach` 里 `setActivePinia(createPinia())` + `vi.clearAllMocks()`
- Setup 语法的 Store **不支持 `$reset()`**，靠重建 pinia 实例来重置
- 需要重新求值模块级副作用时用 `vi.resetModules()` + `vi.doMock()` + 动态 `import()`

### 异步与拒绝

```typescript
await expect(fn()).rejects.toThrow('错误');
await expect(fn()).resolves.toEqual({ ok: true });
```

---

## 🎯 优先测什么

新增测试按收益排序：

1. **`src/utils/`** —— 纯函数，成本最低收益最高
2. **`src/store/modules/`、`src/router/`** —— 角色校验、权限过滤、登录回跳这类逻辑错了会导致越权或开放重定向
3. **`src/api/modules/`** —— 请求参数拼装、响应解包
4. **组件** —— 只测有分支逻辑的，纯展示组件不值得测

不必追求覆盖率数字：`permission.ts` 的 `filterRoutesByRoles` 一个函数的价值，
远高于给十个纯展示组件补渲染快照。

---

## 📚 相关文档

- [tests/README.md](../../tests/README.md) - 测试目录说明
- [store-development.md](store-development.md) - Store 真实结构
- [api-development.md](api-development.md) - API 分层与导入规范
