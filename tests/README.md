# 测试指南

## 📋 概述

本项目使用 Vitest 进行单元测试和集成测试，专注于核心逻辑层（Utils、Store、API）的测试覆盖。

## 🛠️ 测试技术栈

- **测试框架**: [Vitest](https://vitest.dev/) 5.x
- **Vue 测试工具**: [@vue/test-utils](https://test-utils.vuejs.org/) 2.x
- **测试环境**: [jsdom](https://github.com/jsdom/jsdom)
- **覆盖率工具**: [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html)
- **UI 界面**: [@vitest/ui](https://vitest.dev/guide/ui.html)

> ⚠️ **未安装**：`msw`、`@testing-library/vue`、`@testing-library/jest-dom`，以及任何 E2E 框架。
> 需要拦截 HTTP 时用 `vi.mock` 做模块级 Mock；断言 DOM 用 `@vue/test-utils` 的
> `wrapper.text()` / `wrapper.find()`，不要用 `toBeInTheDocument()` 这类 jest-dom 匹配器。

## 🚀 快速开始

```bash
pnpm test            # 运行所有测试（单次）
pnpm test:watch      # 监听模式
pnpm test:coverage   # 生成覆盖率报告
pnpm test:ui         # 可视化界面
```

## 📁 目录结构

测试文件**只放 `tests/` 目录**（`include: ['tests/**/*.{test,spec}.*']`），不放在 `src/` 下。
目录结构镜像 `src/`：

模板只带四份示例测试，每份对应一种写法：

```
tests/
├── README.md                      # 本文档
├── setup.ts                       # 测试环境设置（全局 Mock）
├── directives/
│   └── role.test.ts               # 自定义指令 + DOM 断言
├── router/
│   └── redirect.test.ts           # 纯函数（含开放重定向防护）
├── store/
│   └── permission.test.ts         # Pinia Store（权限路由过滤）
└── utils/
    └── datetime.test.ts           # 工具函数
```

新增时按被测文件的位置放：`src/store/modules/permission.ts` → `tests/store/permission.test.ts`。

## ⚙️ 配置说明

### vitest.config.ts 复用 vite.config.ts

```typescript
const baseConfig = viteConfig({ mode: 'test', command: 'serve' });
delete baseConfig.server;              // dev server 专属配置对测试是死重量
export default mergeConfig(baseConfig, defineConfig({ test: { /* ... */ } }));
```

这是刻意设计——测试要复用 vite 的完整插件链，**不要改成独立的 `defineConfig({ plugins: [vue()] })`**，
那样会丢掉：

- UnoCSS（原子类不生效）
- `unplugin-vue-components` 自动注册（Element Plus 组件解析不到）
- `vite-plugin-svg-icons` 的 `virtual:svg-icons-register`（SvgIcon 报虚拟模块找不到）
- 路径别名 `@`

⚠️ `vite.config.ts` 的默认导出必须保持**同步函数**。改成 `async` 后 `baseConfig` 会变成
Promise，`delete` 静默失效、`mergeConfig` 合出错配置，且全程不报错。

### setup.ts 已做的全局 Mock

不需要在单个测试里重复 Mock 这些：

| 对象 | 说明 |
|---|---|
| `matchMedia` | 返回 `matches: false` |
| `ResizeObserver` / `IntersectionObserver` | 空实现 |
| `localStorage` / `sessionStorage` | 内存版实现，每个测试后自动 `clear()` |
| `fetch` | `vi.fn()`，另暴露为 `globalThis.mockFetch` |
| `URL.createObjectURL` / `revokeObjectURL` | 返回 `'blob:mock-url'` |
| `@zhs/agent-course-kit`（及 `/utils/auth`、`/constants`、`/services/base-request` 子路径） | 整包打桩：SDK 是浏览器产物，jsdom 下加载即报错；`getToken` 等导出都是 `vi.fn()`，测试里直接 `vi.mocked(getToken).mockReturnValue(...)` 即可 |

Element Plus 组件由 `unplugin-vue-components` 在 SFC 编译期自动注册，
**不需要** `config.global.stubs` 逐个打桩；个别测试想屏蔽重组件时在该测试内局部 `stubs` 即可。

## 🧪 测试类型

### 1. 工具函数测试

纯函数，成本最低收益最高，优先覆盖。

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort } from '@/utils/datetime';

describe('Date Utils', () => {
  it('应该正确格式化完整日期时间', () => {
    // ⚠️ 底层是 dayjs，格式串用大写 YYYY-MM-DD HH:mm:ss
    //    小写 yyyy 在 dayjs 中无效会原样输出，hh 是 12 小时制
    expect(formatDate('2024-01-15 13:45:30', 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 13:45:30');
  });

  it('应该在输入为空时返回 -', () => {
    expect(formatDateShort(undefined)).toBe('-');
  });
});
```

### 2. Store 测试

本项目用户 Store 由 **SSO + Cookie** 驱动：

- `token` 是 Cookie 的 **ref 镜像**（初值来自 `getToken()`）。测试里不要直接写 `store.token`，
  而是 mock `@zhs/agent-course-kit` 的 `getToken` 再调 `store.refreshToken()` 驱动——
  这与生产链路一致（路由守卫每次导航调一次 `refreshToken()`）
- 真实 action：`getInfoAction()` / `fetchUserRole()` / `refreshToken()` / `logoutAction()` / `setUserInfo()`
- **不存在** `login()` / `loginAction()` / `fetchUserInfo()`
- Setup 语法的 Store **不支持 `$reset()`**，靠重建 pinia 实例重置

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { getToken } from '@zhs/agent-course-kit';
import { useUserInfoStore } from '@/store/modules/user-info';
import { ROLES } from '@/constants';

vi.mock('@/api/modules/platform', () => ({ getCurrentUserIdentity: vi.fn() }));
import { getCurrentUserIdentity } from '@/api/modules/platform';

describe('useUserInfoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('Cookie 过期后 refreshToken 应把登录态刷成未登录', () => {
    vi.mocked(getToken).mockReturnValue('tok-1');
    const store = useUserInfoStore();          // 构造时取一次 Cookie
    expect(store.isLoggedIn).toBe(true);

    vi.mocked(getToken).mockReturnValue('');   // 改 Cookie 不会自动同步
    expect(store.refreshToken()).toBe('');     // 要显式刷一次，和守卫的做法一致
    expect(store.isLoggedIn).toBe(false);
  });

  it('fetchUserRole 应把 identityType 映射为大写角色常量', async () => {
    vi.mocked(getCurrentUserIdentity).mockResolvedValueOnce([{ identityType: 1 }]);

    const store = useUserInfoStore();
    expect(await store.fetchUserRole()).toBe(ROLES.TEACHER);   // 'TEACHER'，大写
  });

  it('身份都不匹配时应返回空角色，不得向高权限兜底', async () => {
    vi.mocked(getCurrentUserIdentity).mockResolvedValueOnce([]);

    const store = useUserInfoStore();
    expect(await store.fetchUserRole()).toBe('');   // 路由守卫依赖这个空值拦截到 403
  });
});
```

### 3. API 层测试

HTTP 客户端是 `src/api/core/request.ts` 导出的 `polymasApi` / `downloadApi`
（基于 `@zhs/agent-course-kit` 的 `PolymasApi`），Mock 目标按来源区分：

```typescript
// 手写模块
vi.mock('@/api/modules/platform', () => ({ getUserRoleDetail: vi.fn() }));

// Orval 生成的函数——mock generated 下的真实模块路径。
// @/api 只是 re-export，mock 底层后从 @/api 导入拿到的也是 mock 版本。
vi.mock('@/api/generated/auth/auth', () => ({ postAuthLogin: vi.fn() }));
```

> `src/api/generated/` 要跑过 `pnpm orval` 才存在，模板状态下针对它的测试会 `Cannot find module`。

测试 401 时注意：项目**没有本地 `/login` 路由**，401 由 `ErrorModule` 调
`jumpToLogin()` 整体跳 SSO，不要断言 `router.push('/login')`。

### 4. 组件测试

```typescript
const wrapper = mount(UserCard, {
  props: { name: '张三' },
  global: { plugins: [createPinia()] },   // 与 setActivePinia 用同一个实例
});
expect(wrapper.text()).toContain('张三');
expect(wrapper.emitted('delete')?.[0]).toEqual(['u1']);
```

## 📊 覆盖率配置

模板**不设覆盖率阈值**，`pnpm test:coverage` 只出报告，不会因覆盖率不足而失败。
需要门禁的项目自行在 `vitest.config.ts` 的 `coverage` 里加：

```typescript
coverage: {
  // ⚠️ thresholds 必须【扁平】写。套 `global: {...}` 在 Vitest 1+ 会被当成 glob
  //    文件模式去匹配（匹配不到任何文件），阈值静默失效、永远"通过"。
  thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
  // ⚠️ 不配 include 时只统计"被测试导入过的文件"，未测文件不计入，数字虚高。
  include: ['src/**/*.{ts,vue}'],
}
```

报告输出到 `./coverage`：文本（控制台）、JSON、HTML（`coverage/index.html`）。

## 🎯 测试最佳实践

### 命名规范

```typescript
describe('模块名称', () => {
  describe('功能分组', () => {
    it('应该 + 期望行为', () => {});   // ✅
    it('test1', () => {});             // ❌
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
- 需要重新求值模块级副作用时：`vi.resetModules()` + `vi.doMock()` + 动态 `import()`
  （`vi.mock` 会被提升到文件顶部，`vi.doMock` 不会——需要在运行时改 Mock 时用后者）
- 避免测试间相互依赖

### 异步与拒绝

```typescript
await expect(fn()).rejects.toThrow('错误');
await expect(fn()).resolves.toEqual({ ok: true });
```

### 边界测试

覆盖正常值、边界值（空、0、最大值）、异常情况三类。

## 🎯 优先测什么

1. **`src/utils/`** —— 纯函数，最划算
2. **`src/store/modules/`** —— 角色映射、权限过滤，错了会导致越权
3. **`src/api/modules/`** —— 请求参数拼装、响应解包
4. **组件** —— 只测有分支逻辑的，纯展示组件不值得测

不必追求覆盖率数字：`permission.ts` 的 `filterRoutesByRoles` 一个函数的价值，
远高于给十个纯展示组件补渲染快照。

## 📈 当前测试情况

| 测试类别 | 文件数 | 测试用例 |
|---------|-------|----------|
| 指令 (`tests/directives/`) | 1 | 9 |
| 路由 (`tests/router/`) | 1 | 16 |
| Store (`tests/store/`) | 1 | 15 |
| Utils (`tests/utils/`) | 1 | 29 |
| **总计** | **4** | **69** |

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Vue 3 测试指南](https://vuejs.org/guide/scaling-up/testing.html)
- [.claude/agents/testing.md](../.claude/agents/testing.md) - AI 测试指导（含更多示例）
