# Overrides 学校定制系统

> **先辨析一个同名文件**：本仓库另有 `src/api/modules/override.ts`，那是「Orval 生成代码的手写覆盖示例」（在生成的接口函数上叠加业务逻辑），与本文档描述的多租户 Override 体系**没有任何关系**，只是名字撞了。本文档全程讨论的是 `src/overrides/` + `src/plugins/override/`。

## 概述

Overrides 系统实现了「标准产品 + 部署级覆盖 + 学校定制」的三层架构：

- **标准产品**（`src/`）：通用功能，适用于所有部署与学校
- **部署级覆盖**（`src/overrides/deployment.ts`）：对当前整个定制部署生效（不区分具体学校），目前用于常量覆盖
- **学校定制**（`src/overrides/{学校代码}/`）：针对特定学校/租户的个性化配置

**优先级（低 → 高）**：标准产品 < 部署级 < 学校级。

**设计原则**：定制层只覆盖差异，标准行为无需重写；匹配不到学校时，部署级覆盖仍生效，其余回退到标准产品行为。

**识别方式是纯同步的**：学校代码只从 Cookie 里的用户信息解析，没有接口请求、没有异步兜底、没有会话缓存。因此 `loadSchoolConfig()`、`applyConstantsOverrides()`、`customRoutes` 全都是模块加载期就能定下来的同步值，消费方不需要 `await`。

---

## 浏览器标题

项目默认标题在 `src/constants/system.ts` 的 `DEFAULT_APP_TITLE` 中配置，默认是「管理平台」。入口标题属于**常量维度**，启用 overrides 后在 `src/overrides/{学校代码}/constants.ts` 中覆盖，部署级 `deployment.ts` 同样可配：

```ts
import type { ConstantsOverride } from '@/plugins/override/override-constants';

const constants: ConstantsOverride = {
  appTitle: '学校管理平台',
};

export default constants;
```

合并后的值由 `@/constants` 导出为 `APP_TITLE`，`src/router/title.ts` 读取它。浏览器标题格式为 **入口标题-路由标题**，路由标题读取 `meta.title`，例如「学校管理平台-首页」。租户值为空串或仅空格时回退到 `DEFAULT_APP_TITLE`；路由标题未配置或为空白时仅显示入口标题。标题会去除首尾空格，嵌套路由可继承父级 `meta.title`。

创建路由时写入入口标题，成功导航后更新页面标题；导航取消时保留当前标题，重定向使用最终页面标题。`index.html` 不声明固定 `<title>`，避免启动时闪现与租户不符的标题。关闭 overrides 特性后仍使用默认标题与路由标题拼接。

作为 qiankun 子应用运行时不修改浏览器标题，由宿主统一管理。站点配置 `basic.systemTitle` 仍用于布局中的系统名称，与这里的浏览器标题独立。

## 目录结构

```text
src/overrides/
├── index.ts              # 运行时维度 + router 维度入口（eager 加载各学校 index.ts），并导出装配函数 setupOverrides()
├── constants.ts          # 常量维度入口（只 eager 加载各学校 constants.ts）
├── registry.ts           # 学校注册表（schoolNid / userId → 学校代码）+ Cookie 解析，不加载任何租户模块
├── deployment.ts         # 部署级常量覆盖（对所有学校生效）
│
└── {学校代码}/            # 学校定制目录（按需创建，仓库默认不含；目录名 = registry 映射出的代码）
    ├── index.ts          # 该学校的 OverrideConfig（运行时维度 + router，不含 constants）
    ├── constants.ts      # 常量覆盖（静态维度，默认导出 ConstantsOverride；独立于 index.ts）
    ├── router/           # 路由覆盖（静态维度）
    ├── components/       # 预埋组件替换
    ├── store/            # Store action 包装
    ├── api/              # API 实例 / 模块注入
    ├── layout/           # Layout 区域替换与默认配置
    ├── locale/           # 国际化覆盖（zh-CN.json / en-US.json）
    ├── directives/       # 指令新增 / 替换
    ├── plugins/          # 额外的 Vue 插件
    └── views/            # 学校专属页面（由 router 懒加载引入）

src/plugins/override/     # Override 系统核心实现（基础设施层，勿修改）
├── index.ts              # initOverrides() 入口、RuntimeOverrideConfig 类型、各子模块 re-export
├── override-component.ts # componentManager
├── override-router.ts    # routerManager
├── override-store.ts     # storeManager（Pinia 插件）
├── override-api.ts       # applyApiOverrides()
├── override-layout.ts    # layoutManager
├── override-directives.ts# applyDirectiveOverrides()
└── override-constants.ts # ConstantsOverride 类型 + mergeConstants()（零运行时依赖的叶子模块）
```

构建期还提供单校打包能力：`config/schoolFilter.ts` 是一个 Vite 插件，设置 `VITE_BUILD_SCHOOL_CODE=<schoolCode>` 执行 `pnpm build` 时，会把其它学校的定制模块（`index.ts` 与 `constants.ts` 两个入口）替换为空虚拟模块，让其传递依赖一并被 tree-shake 掉；不设置该变量则打包全部学校。

同一个变量还有运行时的一半：`registry.ts` 的 `PINNED_SCHOOL_CODE` 让定向包对所有访问者恒按该学校识别，不再读 Cookie。两半必须成对 —— 只有构建期那半时，定向包里的未登录访客识别不出学校（Cookie 里没有身份信息），而免登录白名单（`router.whiteList`）声明在学校配置里，访客永远进不到那个公开页。

### ⚠️ 两条加载链必须分开

`index.ts` 与 `constants.ts` 是**两条互不相交的加载链**，这不是风格问题而是硬约束：

```text
@/constants        → overrides/constants.ts → 各学校 constants.ts   （常量链）
main.ts / router/  → overrides/index.ts     → 各学校 index.ts       （运行时 + router 链）
```

常量链在 `@/constants` 自身初始化完成前同步执行。学校的 `index.ts` 通常要引用 `@/constants`
（例如 `meta: { roles: [ROLES.TEACHER] }`），如果它被常量链 eager 加载进来，就会形成
「`@/constants` ↔ 学校模块」的循环依赖，`ROLES` 等导出在那一刻还是 `undefined`，
表现为启动即崩（`Cannot read properties of undefined`）。

由此得到两条规则：

- 学校的 **`constants.ts` 不得 import `@/constants`**（它本就是在定义常量）
- 学校的 **`index.ts` 可以自由 import `@/constants`**，常量维度不要写进 `index.ts`

这条方向由 `eslint.config.mjs` 的 `constantsChain` 护栏把守：链上的四类文件
（`overrides/constants.ts`、租户 `constants.ts`、`deployment.ts`、`plugins/override/override-constants.ts`）
import `@/constants`、`@/overrides` 或内核 barrel `@/plugins/override` 一律报错。
类型与 `mergeConstants()` 从叶子模块 `@/plugins/override/override-constants` 取，同链模块之间用相对路径。

`registry.ts` 只做「Cookie → 学校代码」，不加载任何租户模块，因此可以被两条链共用。

---

## 匹配机制

系统通过 Cookie 中的用户信息自动匹配学校，**无需手动切换**。

### 匹配优先级

```text
schoolNid（学校 ID）→ SCHOOL_MAP → 学校级定制
userId（用户 ID）    → USER_MAP   → 用户级定制（优先级低）
都没命中             → null       → 仅部署级覆盖 + 标准产品行为
```

### 注册学校（`registry.ts`）

```ts
// SCHOOL_MAP：整校级定制（schoolNid → 学校代码）
const SCHOOL_MAP: Record<string, string> = {
  '<schoolNid>': 'demo-tenant',
};

// USER_MAP：用户级定制（userId → 学校代码），适用于同校中只有特定用户需要定制
const USER_MAP: Record<string, string> = {
  '<userId>': 'demo-tenant',
};
```

> 仓库默认 `SCHOOL_MAP` / `USER_MAP` 均为空（只有注释占位），新增学校时追加一行即可。学校配置目录由 `import.meta.glob` 自动扫描，不需要手写 import：`overrides/index.ts` 扫 `./*/index.ts`，`overrides/constants.ts` 扫 `./*/constants.ts`。

### Cookie 解析

`registry.ts` 的 `parseCookieUser()` 不硬编码 Cookie 名，而是调用 `@/utils/auth` 导出的 `getUserInfoCookieRaw()`：该函数按 `USER_INFO_COOKIE_KEYS` 清单依次尝试多个候选 key，返回第一个命中的原始值，再由调用方 `decodeURIComponent` + `JSON.parse`。

`store/modules/user-info.ts` 的 `getInfoAction()` 走的是同一个函数，因此不会出现「两处各写一份 key 列表、其中一处漏配后静默失效」的问题。若部署环境写入用户信息的 Cookie key 不在清单内，正确做法是补进 `USER_INFO_COOKIE_KEYS`，而不是在 `registry.ts` 里另开一份解析逻辑。

---

## 九个定制维度

| 维度 | 类型 | 生效时机 | 适用场景 |
|------|------|---------|---------|
| **components** | 运行时 | `initOverrides()` | 替换预埋的 UI 组件 |
| **layout** | 运行时 | `initOverrides()` | 替换 Layout 区域、覆盖布局默认配置 |
| **store** | 运行时 | `initStoreOverrides()` | 包装已有 Store 的 action |
| **locale** | 运行时 | `initOverrides()` | 覆盖 / 追加国际化文本 |
| **api** | 运行时 | `initOverrides()` | 注入新 API 实例或插件模块 |
| **directives** | 运行时 | `initOverrides()` | 新增或替换全局指令 |
| **plugins** | 运行时 | `initOverrides()` | 注册额外的 Vue 插件 |
| **router** | 静态 | 路由初始化时 | 新增 / 替换 / 禁用路由、追加白名单 |
| **constants** | 静态 | 模块加载时 | 覆盖角色、菜单、API 码等常量（写在学校目录的 `constants.ts`，不进 `index.ts`） |

**运行时维度**中 store 由 `initStoreOverrides()` 在 router 安装前注册（Pinia 插件只作用于之后创建的 store，而 router 安装时首次导航的 redirect 就会创建 store），其余由 `initOverrides()` 按上表顺序注册（components → layout → locale → api → directives → plugins）；**静态维度**（router、constants）在模块加载阶段由各自的消费方直接读取，**不经过** `initOverrides()`。

`initStoreOverrides()` / `initOverrides()` 是幂等的：`store` / `locale` / `api` 作用在跨 `destroyApp` 存活的模块单例
（pinia 插件链、i18n 实例、`api/core/request` 的 `instances`）上，内核用模块级标志位保证只注册一次，
qiankun 反复 mount/unmount 不会把 Store 覆盖套娃、也不会让同一个 PolymasApi 实例重复 `.use(mod)`；
其余维度作用在 app 上，每个新 app 都会重新注册。

---

## 集成点：各维度是怎么接进标准产品的

### 运行时维度 —— `src/overrides/index.ts` 的 `setupOverrides()`

装配入口有两个：`setupStoreOverrides(pinia)` 挂在 `renderApp` 的 `beforeRouter` 钩子上，`setupOverrides({ app, pinia, router })` 挂在 `beforeMount` 钩子上：

```ts
// src/main.ts（节选）
const appHooks: AppSetupHooks = {};
appHooks.beforeRouter = (_app, store) => setupStoreOverrides(store);
appHooks.beforeMount = (app, store, router) => setupOverrides({ app, pinia: store, router });
```

`setupOverrides()` 内部才调用 `initOverrides()`。**为什么装配放在 overrides 目录里、而不是把 `initOverrides()` 直接写在 `main.ts`**：locale 维度需要 i18n 实例，而 i18n 是可以独立关闭的模版特性，于是 `main.ts` 里就会出现 `#if overrides` 与 `#if i18n` 两个条件块嵌套 —— 模版解析器不支持嵌套。放到 `src/overrides/index.ts`（整个目录随 overrides 特性裁剪）之后，`#if i18n` 就是顶层块，两个特性可以自由组合。

`index.ts` 里的 i18n 宿主默认是 `{ global: { mergeLocaleMessage: () => {} } }` 空实现，启用 i18n 特性时才替换成真实实例。**因此关闭 i18n 时 locale 维度自动降级为 no-op，其余八个维度照常工作。**

### router 维度 —— `src/router/`

- `routerManager.register(customRoutes)` 写在 `src/router/index.ts` 的**模块顶层**，模块加载时执行一次（工厂函数被多次调用也不会重复注册）
- **静态路由**：`createAppRouter()` 里先对 `staticRoutes` 过一遍 `routerManager.applyOverrides(routes)`，`createRouter` 之后再调 `routerManager.addCustomRoutes(router)` 把新增路由 `addRoute` 进去
- **异步路由**：`src/router/routes/declared.ts` 的 `resolveDeclaredRoutes()` 对 `asyncRoutes` 过一遍 `applyOverrides` 并缓存，守卫拿这份结果交给 `permissionStore.generateRoutes()` 按角色过滤——覆盖必须先于过滤，否则租户放宽的 `meta.roles` 不生效、租户追加的 `children` 又会绕开权限；兜底页的 `matchesDeclaredRoute()` 读的也是同一份。随后守卫在 DEV 下调用 `routerManager.warnUnmatched()`（此时静态 + 异步都已过完覆盖，未命中的 `overrideRoutes` 才算真的没匹配上）
- **白名单**：`guards.ts` 的 `isWhiteListed()` 是惰性合并 —— 先查内置 `WHITE_LIST`，再查 `routerManager.getWhiteList()`。写成函数而非模块加载时 push，是因为 `guards.ts` 被 `router/index.ts` 先 import，模块加载期读白名单只会读到空数组

### constants 维度 —— `src/constants/index.ts`

`src/constants/index.ts` 是常量的**唯一合并点**，它只认 `@/overrides/constants` 这一个入口（不 import `@/overrides`）：

```ts
const DEFAULTS = {
  roles: DEFAULT_ROLES,
  menuList: DEFAULT_MENU_LIST,
  apiCode: DEFAULT_API_CODE,
  proxyUri: DEFAULT_PROXY_URI,
  uri: {} as Record<string, string>,
  appTitle: DEFAULT_APP_TITLE,
  defaultLocale: DEFAULT_LOCALE_VALUE,
  defaultThemeStyle: DEFAULT_THEME_STYLE_VALUE,
};

const merged = { ...DEFAULTS };
Object.assign(merged, applyConstantsOverrides(DEFAULTS satisfies Required<ConstantsOverride>));
```

`applyConstantsOverrides()` 在 `src/overrides/constants.ts` 里做两次 `mergeConstants`——
默认值 ← 部署级 ← 学校级。必须是两次而不是先把两层覆盖展开成一份：对象类字段（如 `proxyUri`）
展开时是整体替换，学校只写 `proxyUri: { EXTRA }` 会把部署级的 `proxyUri: { LOCAL }` 一并抹掉。

内联的 `satisfies Required<ConstantsOverride>` 保证 `ConstantsOverride` 新增字段时 `DEFAULTS` 必须同步补齐，漏一个就编译报错；写在调用处而不是 `DEFAULTS` 上，是为了把对该类型的引用关进条件块，未启用 overrides 特性时不留下悬空 import。特性裁掉后 `merged` 就是 `DEFAULTS` 本身，对外导出面完全一致。

新增一个可覆盖常量需要 3 步：在定义文件（`roles.ts` / `menu.ts` / `system.ts`）加默认值 → 在 `ConstantsOverride` 接口加字段 → 在 `DEFAULTS` 加映射并在文件底部 export。

---

## 快速上手：新增一个学校

### 步骤 1：注册

在 `src/overrides/registry.ts` 的 `SCHOOL_MAP` 中添加一行：

```ts
const SCHOOL_MAP: Record<string, string> = {
  '<schoolNid>': 'demo-tenant', // ← 新增：schoolNid → 学校代码
};
```

### 步骤 2：创建目录

```bash
mkdir -p src/overrides/demo-tenant
```

### 步骤 3：创建入口文件

```ts
// src/overrides/demo-tenant/index.ts
import type { OverrideConfig } from '@/plugins/override';

// 最小配置：不定制任何内容（等同于没注册这个学校）
const config: OverrideConfig = {};
export default config;
```

需要覆盖常量时，再单独加一个 `constants.ts`（**不要**把它挂到 `index.ts` 上）：

```ts
// src/overrides/demo-tenant/constants.ts
import type { ConstantsOverride } from '@/plugins/override/override-constants';

const constants: ConstantsOverride = {
  defaultThemeStyle: 'dark',
};
export default constants;
```

### 步骤 4：按需添加定制模块

参考下方各维度说明，只创建**实际用到的**子目录。

---

## 各维度详细说明

### 1. 组件覆盖（components）

替换标准产品中预埋的可替换组件，注册表由 `componentManager` 维护。

```ts
// src/overrides/demo-tenant/components/index.ts
import type { Component } from 'vue';

export function getCustomComponents(): Record<string, Component> {
  return {
    WelcomeCard: () => import('../views/TenantWelcomeCard.vue'),
  };
}
```

**生效需要注册 + 消费两步，缺一不可**：

1. 注册 —— 上面的配置由 `initOverrides()` 在 mount 前写入注册表
2. 消费 —— 预埋组件的渲染处必须写 `componentManager.getComponent(name, fallback)` 解析后用 `<component :is>` 渲染

> ⚠️ **当前状态**：本仓库的 `components` 维度是**预留扩展入口** —— 注册链路已就绪，但标准产品里还没有任何渲染处接入第 2 步。也就是说光配置 `components` 现在不会有任何效果，需要先在目标组件的渲染处接入 `getComponent()`。替换组件必须保持与原组件相同的 Props / Emits 接口。

### 2. Layout 覆盖（layout）

```ts
// src/overrides/demo-tenant/layout/index.ts
import type { CustomLayoutConfig } from '@/plugins/override';

export function getCustomLayout(): CustomLayoutConfig {
  return {
    // 替换 Layout 内部区域（本仓库已接的插槽：menu / main）
    components: {
      menu: () => import('../views/TenantMenu.vue'),
    },

    // 覆盖布局默认配置
    defaultConfig: {
      layoutVisible: { nav: true },
      headerVisible: { themeSwitch: false }, // 隐藏主题切换按钮
      logoConfig: { title: '实验教学平台' },
    },
  };
}
```

- `components` 插槽：`src/layout/index.vue` 接了 `LayoutSlot` 声明的全部三个——**`header` / `menu` / `main`**（`layoutManager.getSlotComponent('header', LayoutHeader)` / `('menu', LayoutMenu)` / `('main', LayoutMain)`）。其中 `header` 仅在路由 `meta.layout.layoutVisible.header` 为真时渲染
- `defaultConfig`：由 `src/layout/useLayoutContext.ts` 的 `createLayoutContext()` 消费 —— 在建立响应式状态前 `Object.assign` 合并进 `layoutVisible` / `headerVisible` / `logoConfig` 三份默认值，也就成了后续 `resetAll()` 回落到的基线。路由 `meta.layout` 的配置优先级高于它

> ⚠️ **本仓库限制：`CustomLayoutConfig.layout`（整体 Layout 替换）没有接消费点。**
> `layoutManager.getLayoutComponent()` 存在但无人调用，原因是路由用的 `AppLayout`（`src/layout/constants.ts`）在**模块加载时**就求值完成，远早于 `beforeMount` 里的 `initOverrides()`，那时注册表还是空的，拿不到注册结果。
> **需要整体换布局请改用路由覆盖**：用 `overrideRoutes` 指定布局路由（如 `/`、`/setting`）的 `component`，把 `AppLayout` 换成自己的布局组件。

### 3. Store 覆盖（store）

通过 Pinia 插件机制**包装**已有 Store 的 action，key 为 `store.$id`。

```ts
// src/overrides/demo-tenant/store/index.ts
import type { StoreModuleConfig, StoreOverrideFn } from '@/plugins/override';
import type { useGlobalStore } from '@/store/modules/global';

const overrideGlobal: StoreOverrideFn<ReturnType<typeof useGlobalStore>> = store => ({
  toggleTheme() {
    console.log('[Override] 主题切换前的自定义逻辑');
    // store 上的方法是覆盖前的原实现，调这里不会递归调用到自己
    store.toggleTheme();
  },
});

export function getCustomStoreModules(): StoreModuleConfig {
  return {
    overrides: {
      global: overrideGlobal,
    },
  };
}
```

传给覆盖函数的是 store 的一个**视图**：方法固定为覆盖前的原实现，状态与 getter 实时读取 store。覆盖结果最终 `Object.assign` 回 store，若直接传 store，函数体里 `store.toggleTheme()` 在合并后会解析到覆盖后的新实现，导致无限递归爆栈。

> ⚠️ **不要覆盖 ref / computed**：覆盖 ref 会创建新的响应式引用，与 store 内部引用脱钩 —— store 内部逻辑仍操作旧 ref，外部拿到新 ref，数据不同步。系统会自动跳过 ref 覆盖并打警告。

### 4. 国际化覆盖（locale）

通过 `i18n.global.mergeLocaleMessage(locale, messages)` 合并，可覆盖已有 key 或新增 key。

```ts
// src/overrides/demo-tenant/locale/index.ts
import type { LocaleMessages } from '@/plugins/override';
import enUS from './en-US.json';
import zhCN from './zh-CN.json';

export function getCustomLocales(): LocaleMessages {
  return {
    'zh-CN': zhCN,
    'en-US': enUS,
  };
}
```

`src/overrides/demo-tenant/locale/zh-CN.json`：

```json
{
  "layout.systemTitle": "实验教学平台",
  "tenant.labName": "基础化学实验中心"
}
```

> 关闭 i18n 模版特性时，`src/overrides/index.ts` 的 i18n 宿主是空实现，本维度自动降级为 no-op —— 配了不报错，也不生效。

### 5. API 覆盖（api）

注册 / 替换 API 实例，或为已有实例注册插件模块。标准产品的实例注册表在 `src/api/core/request.ts`，默认有 `default` 和 `download` 两个。

```ts
// src/overrides/demo-tenant/api/index.ts
import PolymasApi from '@zhs/agent-course-kit/services/base-request';
import type { CustomApiConfig } from '@/plugins/override';

export function getCustomApiConfig(): CustomApiConfig {
  return {
    // 注册新实例（同名则替换已有实例）
    instances: {
      tenantApi: PolymasApi.create({
        baseURL: 'https://api.example.com',
        timeout: 10000,
      }),
    },

    // 为已有实例注册插件模块（key 为实例名）
    modules: {
      default: [myCustomModule],
    },
  };
}
```

注册后按名取用：

```ts
import { instances } from '@/api/core/request';

const data = await instances.tenantApi.get('/labs');
```

> DEV 下有两条保护性警告：`modules` 指向的实例名不存在，或该实例没有 `.use()` 方法时，会打日志并跳过而不是抛错。

⚠️ 模块里注册的请求拦截器**先于**内置 `AuthModule` 执行（axios 的请求拦截器后注册的先执行）：
在模块里写的 `Authorization` 会被 `AuthModule` 覆盖，基于完整请求头的签名也拿不到 token。
要换认证方式，用 `instances` 整体替换 `default` 实例（Orval 生成的接口经 mutator 按名取实例，替换后生效）；
`src/api/core/request.ts` 里的 `get` / `post` / `put` / `del` 直接绑定 `polymasApi`，不随替换生效。

### 6. 指令覆盖（directives）

新增全局指令，或同名覆盖内置指令（内置指令由 `setupDirectives` 独立注册，本维度在其之后执行，故同名即覆盖）。key 是指令名，**不含 `v-` 前缀**。

```ts
// src/overrides/demo-tenant/directives/index.ts
import type { Directive } from 'vue';

export function getCustomDirectives(): Record<string, Directive> {
  return {
    // 新增指令 v-lab-access
    'lab-access': {
      mounted(el, binding) {
        if (!checkLabAccess(binding.value)) el.style.display = 'none';
      },
    },
  };
}
```

### 7. 插件覆盖（plugins）

注册额外的 Vue 插件。与其他维度不同，本维度是**一个工厂函数**，接收运行时上下文、返回插件数组：

```ts
plugins?: (context: { router: Router; pinia: Pinia; i18n: I18nLike }) => Plugin[];
```

`initOverrides()` 的第 6 步（最后一步）调用该工厂，并按返回顺序逐个 `app.use()`。上下文里带 `router` / `pinia` / `i18n` 是为了那些初始化时需要这些实例的插件（如埋点、权限、监控 SDK）。

```ts
// src/overrides/demo-tenant/plugins/index.ts
import type { Pinia } from 'pinia';
import type { Plugin } from 'vue';
import type { Router } from 'vue-router';
import { createTrackerPlugin } from './tracker';

export function getCustomPlugins() {
  return ({ router, pinia }: { router: Router; pinia: Pinia }): Plugin[] => [
    createTrackerPlugin({ router }),
    myOtherPlugin,
  ];
}
```

> 执行时机是 `beforeMount`，即所有标准插件 `use()` 之后、`app.mount()` 之前 —— 想在 mount 前注册全局组件 / 指令 / provide 的插件都可以放这里。

### 8. 路由覆盖（router）

支持四种操作：

```ts
// src/overrides/demo-tenant/router/index.ts
import type { CustomRouteConfig } from '@/plugins/override';
import { AppLayout } from '@/layout/constants';

export function getCustomRoutes(): CustomRouteConfig {
  return {
    // 1. 新增路由（通过 addRoute 注册，不受权限系统过滤）
    customRoutes: [
      {
        path: '/tenant-lab',
        component: AppLayout,
        children: [
          {
            path: '',
            name: 'TenantLab',
            component: () => import('../views/LabManagement.vue'),
            meta: { title: '实验室管理' },
          },
        ],
      },
    ],

    // 2. 覆盖已有路由（必须用全路径）
    overrideRoutes: {
      '/home': () => import('../views/CustomHome.vue'), // 值为组件 → 只替换 component
      '/setting/frontend': {
        // 值为对象 → 浅合并到原路由；meta 逐 key 合并，原有 meta.roles 不受影响
        component: () => import('../views/CustomFrontend.vue'),
        meta: { title: '定制配置' },
      },
    },

    // 3. 禁用路由（全路径；禁用父路由会连带移除所有子路由）
    disabledRoutes: ['/setting'],

    // 4. 追加免登录白名单
    whiteList: ['/tenant-lab/public'],
  };
}
```

几个细节：

- `overrideRoutes` 的 key **必须是全路径**（如 `/setting/frontend`），不能用相对路径 —— 匹配时由 `resolveFullPath()` 逐级拼出全路径再比对
- 值是组件还是路由配置，**先按组件特征判定**（函数，或对象含 `setup` / `render` / `template` / `__name` / `__file`），再按路由键（`path` / `component` / `redirect` / `children` / `meta` / `name`）判定。`name` 两边都有——`defineOptions({ name })` 的 SFC 编译产物就带 `name`，若只看路由键会把组件误判成路由配置，结果 component 没被替换、`setup` 反被糊进路由记录、路由 `name` 还被改掉
- 值为对象时是浅合并，其中两个字段另有语义：`children` 是**追加**（原有子路由不会被覆盖掉），`meta` 是**逐 key 合并**（`{ ...原 meta, ...覆盖 meta }`）
- `meta` 逐 key 合并是权限相关的硬要求：整体替换会让只改 `title` 的覆盖顺手抹掉 `meta.roles`，而没有 `roles` 的路由对任何已登录用户开放。租户要放宽权限就显式写 `meta: { roles: [...] }`；DEV 下把原有 `roles` 清空会有一条警告
- `applyOverrides()` 始终对路由做浅拷贝，不改原始路由对象，因此 HMR / 多次调用都安全
- `customRoutes` 不经 `filterRoutesByRoles` 过滤，配了 `meta.roles` 由路由守卫逐层校验，角色不符落到布局内 403；DEV 下若某条自定义路由没配 `meta.roles`，会警告「任何已登录用户均可访问」

### 9. 常量覆盖（constants）

覆盖角色、菜单、API 码、代理前缀、入口标题等全局常量。可覆盖字段共 **8 个**：`roles` / `menuList` / `apiCode` / `proxyUri` / `uri` / `appTitle` / `defaultLocale` / `defaultThemeStyle`。

**本维度是唯一不经过 `index.ts` 的维度**：文件固定为学校目录下的 `constants.ts`，默认导出一个 `ConstantsOverride`。

```ts
// src/overrides/demo-tenant/constants.ts
import type { ConstantsOverride } from '@/plugins/override/override-constants';

const constants: ConstantsOverride = {
  // 纯对象 → 浅合并（追加 ASSISTANT，保留原有角色）
  roles: { ASSISTANT: 'ASSISTANT' },

  // 数组 → 整体替换
  menuList: [{ title: '实验管理', path: '/tenant-lab', icon: 'common-menu-home' }],

  // 原始值 → 直接替换
  appTitle: '学校管理平台',
  defaultLocale: 'zh-CN',
  defaultThemeStyle: 'dark',

  // 覆盖代理前缀
  proxyUri: { LOCAL: '/tenant-service' },
};

export default constants;
```

> ⚠️ 这个文件**不能 import `@/constants`**（它自己就在参与 `@/constants` 的构建，引用即成环）。
> 需要用到 `ROLES` 之类的地方几乎都在路由 / 页面里，那些文件挂在 `index.ts` 链上，不受此限。

**合并策略**（见 `mergeConstants()`）：

- 纯对象（`roles` / `apiCode` / `proxyUri` / `uri`）→ 浅合并，未提供的 key 保留原值
- 数组（`menuList`）→ 整体替换
- 原始值（`appTitle` / `defaultLocale` / `defaultThemeStyle`）→ 直接替换
- 值为 `undefined` 的字段直接跳过，不会把默认值擦成 undefined

部署级覆盖（`deployment.ts`）与学校级覆盖在 `src/overrides/constants.ts` 的 `applyConstantsOverrides()` 里**分两次** `mergeConstants()` 叠加：默认值 ← 部署级 ← 学校级。分两次是必须的——把两层覆盖先展开成一份会让对象类字段整体替换，学校写个 `proxyUri: { EXTRA }` 就把部署级的 `proxyUri: { LOCAL }` 顶没了。

---

## 配置示例

> 仓库默认不含任何学校目录，以下为新增学校时的入口写法（`demo-tenant` 换成 registry 里映射出的实际代码）。

### 最小定制（只覆盖一个维度）

只新增一个专属页面，其余全用标准产品行为：

```ts
// src/overrides/demo-tenant/index.ts
import { getCustomRoutes } from './router';
import type { OverrideConfig } from '@/plugins/override';

const config: OverrideConfig = {
  router: getCustomRoutes(),
};

export default config;
```

### 完整定制（覆盖九个维度）

```ts
// src/overrides/demo-tenant/index.ts
import { getCustomApiConfig } from './api';
import { getCustomComponents } from './components';
import { getCustomDirectives } from './directives';
import { getCustomLayout } from './layout';
import { getCustomLocales } from './locale';
import { getCustomPlugins } from './plugins';
import { getCustomRoutes } from './router';
import { getCustomStoreModules } from './store';
import type { OverrideConfig } from '@/plugins/override';

const config: OverrideConfig = {
  // 运行时维度
  components: getCustomComponents(),
  layout: getCustomLayout(),
  store: getCustomStoreModules(),
  locale: getCustomLocales(),
  api: getCustomApiConfig(),
  directives: getCustomDirectives(),
  plugins: getCustomPlugins(),
  // 静态维度（constants 除外，它在同级的 constants.ts 里单独默认导出）
  router: getCustomRoutes(),
};

export default config;
```

---

## 这是一个可裁剪的模版特性

`overrides` 是 `create-app` 生成项目时可选的模版特性，**默认关闭**。不选时会被整体裁掉的内容：

| 类型 | 内容 |
|------|------|
| 目录 | `src/overrides/`、`src/plugins/override/` |
| 文件 | `docs/overrides.md`（本文档）、`config/schoolFilter.ts` |
| 依赖 | 无 —— Override 内核零第三方依赖 |
| 脚本 | 无 |

标准产品侧的接入点（`main.ts`、`router/index.ts`、`router/routes/declared.ts`、`router/guards.ts`、`constants/index.ts`、`layout/index.vue`、`layout/useLayoutContext.ts`）在生成时随该特性裁剪，裁剪后这些文件回落到不带 Override 的形态，对外行为与导出面保持一致。

一个例外：`eslint.config.mjs` 里的 **overrides 反向依赖规则无条件保留**。该规则用 `no-restricted-imports` 禁止核心代码 import `@/overrides`（只放行 `src/main.ts`、`src/router/**`、`src/constants/**`、`src/overrides/**` 自身），用来守住依赖方向。目录被裁掉后规则永不命中，留着无害，所以不参与裁剪。

---

## 开发建议

### 调试技巧

- DEV 下路由覆盖会警告**未匹配的覆盖路径**：`[Override] Route override "/non-existent" did not match any route.` —— 检测点在 `guards.ts` 生成异步路由之后，静态 + 异步都过完覆盖才判定
- DEV 下 `customRoutes` 缺 `meta.roles` 会警告该路由不受权限保护
- DEV 下 `api.modules` 指向不存在的实例名、或实例没有 `.use()` 时会警告并跳过
- Store 覆盖命中 ref / computed 时会警告并跳过该字段

### 代码组织

- 每个定制维度独立一个子目录（`router/`、`components/` 等），入口 `index.ts` 只做汇总
- 页面组件放到 `views/` 子目录，用懒加载引入，避免影响主 bundle 体积
- 只创建**实际使用到的**模块，不必照搬完整目录结构
- 定制代码引用标准产品用 `@/` 别名（如 `@/layout/constants`）；反向不成立 —— 核心代码不允许 import `@/overrides`（ESLint 会报错）

### 常见问题

**Q：修改 `SCHOOL_MAP` 后不生效？**
A：Cookie 在模块加载时读取一次，刷新页面后生效。

**Q：注册了学校但定制完全不生效，且无任何报错？**
A：匹配依赖从 Cookie 解析 `schoolNid` / `userId`。先确认部署环境写入用户信息的 Cookie key 在 `@/utils/auth` 的 `USER_INFO_COOKIE_KEYS` 清单内 —— 不在就补进清单（别在 `registry.ts` 里另写一份解析）。其次确认 `src/overrides/{学校代码}/index.ts` 存在，目录名与 map 的值**完全一致**（glob 是按 `./{代码}/index.ts` 精确取的）。

**Q：配了 `components` 却没反应？**
A：`components` 维度目前是预留入口，标准产品里还没有渲染处调用 `componentManager.getComponent()`。需要先在目标组件的渲染处接入。

**Q：配了 `layout.layout` 想整体换布局，没反应？**
A：本仓库没接这个消费点（`AppLayout` 在模块加载期就求值了，早于 `initOverrides()`）。改用 `overrideRoutes` 覆盖布局路由的 `component`。

**Q：Override 覆盖了 Store 的 ref 却没有效果？**
A：系统会跳过 ref / computed 覆盖（DEV 有警告），改用包装 action 的方式实现行为变更。

**Q：租户目录里 import 了 `@/constants`，页面一打开就报 `Cannot read properties of undefined`？**
A：检查是不是写在了 `constants.ts`（或它 import 的文件）里。常量链上的模块不能回头引用 `@/constants`，
把这段逻辑挪到 `index.ts` 那一侧（router / views / store 等）即可。

**Q：`overrideRoutes` 的路径必须怎么写？**
A：必须用**全路径**（如 `/setting/frontend`），不能用相对路径。

**Q：关闭了 i18n 特性，locale 维度会报错吗？**
A：不会。`src/overrides/index.ts` 的 i18n 宿主此时是 `mergeLocaleMessage` 空实现，locale 维度降级为 no-op，其余维度不受影响。

---

## 相关文件

### 配置层（可改）

- `src/overrides/index.ts` — 运行时维度 + router 维度入口（加载学校 `index.ts`）+ 装配入口 `setupOverrides()`
- `src/overrides/constants.ts` — 常量维度入口（加载学校 `constants.ts` + 三层合并）
- `src/overrides/registry.ts` — 学校注册表 + Cookie 解析（不加载租户模块）
- `src/overrides/deployment.ts` — 部署级常量覆盖

### 内核层（勿改）

- `src/plugins/override/index.ts` — `initOverrides()`、`OverrideConfig` / `RuntimeOverrideConfig` 类型
- `src/plugins/override/override-router.ts` — `RouterManager`
- `src/plugins/override/override-layout.ts` — `LayoutManager`
- `src/plugins/override/override-store.ts` — `StoreManager`（Pinia 插件）
- `src/plugins/override/override-component.ts` — `ComponentManager`
- `src/plugins/override/override-api.ts` — `applyApiOverrides()`
- `src/plugins/override/override-directives.ts` — `applyDirectiveOverrides()`
- `src/plugins/override/override-constants.ts` — `ConstantsOverride` 类型 + `mergeConstants()`

### 标准产品侧接入点

- `src/main.ts` — `beforeRouter` 钩子调用 `setupStoreOverrides()`，`beforeMount` 钩子调用 `setupOverrides()`
- `src/router/index.ts` — `routerManager.register()` + 静态路由 `applyOverrides` + `addCustomRoutes`
- `src/router/routes/declared.ts` — 异步路由 `applyOverrides`（缓存的全量表，供守卫过滤与兜底页判定共用）
- `src/router/guards.ts` — 消费 `resolveDeclaredRoutes()` + `warnUnmatched` + 白名单惰性合并
- `src/constants/index.ts` — 常量唯一合并点
- `src/layout/index.vue` — `menu` / `main` 插槽解析
- `src/layout/useLayoutContext.ts` — `defaultConfig` 合并
- `src/utils/auth.ts` — `USER_INFO_COOKIE_KEYS` / `getUserInfoCookieRaw()`

### 其他

- `eslint.config.mjs` — overrides 反向依赖规则 + 常量链 `constantsChain` 护栏
- `config/schoolFilter.ts` — 单校打包的构建期过滤插件
