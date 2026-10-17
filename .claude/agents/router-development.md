---
name: router-development
description: Vue Router 路由开发指导,包括路由配置、权限控制、路由守卫和最佳实践
tools: Read, Grep, Glob, WebFetch, WebSearch
model: inherit
---

# 路由开发规范

## 职责
专门负责 Vue Router 路由开发指导,包括路由配置、权限控制、路由守卫、动态路由管理和最佳实践。

---

## 🏗️ 项目路由架构

### 路由目录结构

```
src/router/
├── index.ts                    # 路由入口,创建 router 实例
├── guards.ts                   # 路由守卫配置
└── routes/                     # 路由配置目录
    ├── index.ts                # 路由统一导出
    ├── static.ts               # 静态路由(初始直接注册，无需动态权限)
    ├── async.ts                # 异步路由(需要权限控制，登录后动态注册)
    ├── declared.ts             # 声明式全量表(已应用租户覆盖、未按角色过滤，守卫与兜底页共用)
    └── fallback.ts             # 兜底路由(守卫在权限路由之后注册，布局内区分 403 / 404)
```

> 布局容器组件的真实导出名是 `AppLayout`（`import { AppLayout } from '@/layout/constants'`），下文代码示例中出现的 `Layout` 均指代它；实际编写路由时请以 `AppLayout` 为准。

### 两层路由体系

项目采用**两层路由体系**,根据是否需要动态权限分层管理:

| 路由类型 | 文件 | 特点 | 适用场景 |
|---------|------|------|---------|
| **静态路由** | `static.ts` | 初始直接注册，无需动态权限 | 全屏 403、首页、个人中心 |
| **异步路由** | `async.ts` | 需要登录+权限,动态注册 | 管理页面、设置页面 |
| **全量表** | `declared.ts` | `resolveDeclaredRoutes()`：已应用租户覆盖、未按角色过滤的异步路由全量表（结果缓存） | 守卫过滤后注册；兜底页据此区分 403 / 404 |
| **兜底路由** | `fallback.ts` | 守卫在权限路由之后单独注册，不参与角色过滤 | 布局内 403 / 404（保留原 URL） |

---

## 📝 路由配置规范

### 路由配置模板

#### 1. 静态路由模板 (static.ts)

静态路由是**初始直接注册**的路由，包含无需登录的页面和所有登录用户可访问的页面。

```typescript
// static.ts 中的 staticRoutes 数组

// 无需登录的页面（直接添加在数组顶层，须同步加入 guards.ts 的 WHITE_LIST）
{
  path: '/403',
  name: 'Forbidden',
  component: () => import('@/views/exception/Forbidden.vue'),
  meta: { title: '无访问权限' },
}

// 所有登录用户可访问的页面（添加到 AppLayout children 下）
{
  path: '/',
  component: AppLayout,
  redirect: '/home',
  children: [
    {
      path: 'home',          // 子路由用相对路径，不带前导斜杠 → 实际路径 /home
      name: 'Home',
      component: () => import('@/views/home/index.vue'),
      meta: { title: '首页' },
    },
  ],
}
```

> 项目登录页由 SSO 统一托管（不是本仓库内的路由），登录跳转通过 `src/utils/auth.ts` 的 `jumpToLogin()`（内部调用 `@zhs/agent-course-kit` 的 `jumpToSsoLogin()`）整体离开当前应用完成，因此 `staticRoutes` 中不存在 `/login` 路由，也无需在白名单中配置它。

**适用场景:** 全屏 403、公开页面，以及首页、个人中心等所有登录用户可访问的功能。404 不是静态路由——见下方「兜底路由」

**完整示例:** 查看 `src/router/routes/static.ts`

---

#### 2. 异步路由模板 (async.ts)

异步路由是**需要特定角色权限**的页面,在登录后根据用户角色**动态注册**。

```typescript
// 权限路由模板
{
  path: '/路径',
  component: Layout,
  redirect: '/路径/子路径',
  meta: {
    title: '模块标题',
    roles: [ROLES.ADMIN, ROLES.TEACHER], // 角色权限
  },
  children: [
    {
      path: '子路径',
      name: 'RouteName',
      component: () => import('@/views/路径/子路径.vue'),
      meta: {
        title: '页面标题',
        roles: [ROLES.ADMIN],
      },
    },
  ],
}
```

**适用场景:** 管理员专属功能、需要权限控制的功能、不同角色看到不同菜单

**完整示例:** 查看 `src/router/routes/async.ts`

---

## 🎯 路由配置最佳实践

### 路由命名规范

#### Path 命名规范
```typescript
// ✅ 正确:使用小写和短横线
{
  path: '/lab-reservation',        // 路径使用小写 + 短横线
  path: '/user-management',
  path: '/setting/frontend',
}

// ❌ 错误:使用驼峰或其他格式
{
  path: '/userManagement',        // 不要使用驼峰
  path: '/User_Management',       // 不要使用下划线
  path: '/USERMANAGEMENT',        // 不要使用全大写
}
```

#### Name 命名规范
```typescript
// ✅ 正确:使用大驼峰(PascalCase)
{
  name: 'ProductManagement',     // 大驼峰
  name: 'UserManagement',
  name: 'Frontend',
}

// ❌ 错误:使用其他格式
{
  name: 'productManagement',     // 不要使用小驼峰
  name: 'product-management',    // 不要使用短横线
  name: 'product_management',    // 不要使用下划线
}
```

#### Name 唯一性要求
```typescript
// ✅ 正确:全局唯一的 name
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/setting',
    name: 'Setting',              // 父路由名称
    children: [
      {
        path: 'frontend',
        name: 'Frontend',         // 子路由名称,全局唯一
      },
      {
        path: 'theme',
        name: 'Theme',            // 子路由名称,全局唯一
      },
    ],
  },
];

// ❌ 错误:重复的 name
export const routes1 = [
  { path: '/user/list', name: 'UserList' },
];
export const routes2 = [
  { path: '/admin/user-list', name: 'UserList' }, // 重复!
];
```

### Meta 元信息配置

#### 完整的 Meta 定义
```typescript
// ✅ 正确:完整的 meta 配置
{
  path: '/home',
  name: 'Home',
  component: () => import('@/views/home/index.vue'),
  meta: {
    title: '功能名称',                    // 页面标题(必需)
    roles: [ROLES.ADMIN, ROLES.STUDENT],   // 允许访问的角色(可选)
    requiresAuth: true,                    // 是否需要登录(可选)
    icon: House,                           // 菜单图标(可选)——是 Vue 组件，不是字符串
    hidden: false,                         // 是否在菜单中隐藏(可选)
    activeMenu: '/parent',                 // 子页面高亮父菜单(可选)
    layout: { layoutVisible: { nav: false } },  // 布局区域显隐(可选)
  },
}

// ❌ 错误:缺少 meta.title
{
  path: '/home',
  name: 'Home',
  component: () => import('@/views/home/index.vue'),
  // 缺少 meta
}
```

#### Meta 类型定义

以 `typings/router.d.ts` 为准，**只有下列字段可用**，写别的字段在严格模式下会报类型错误：

```typescript
// typings/router.d.ts（真实定义）
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string;
    /** 角色权限 */
    roles?: string[];
    /** 是否需要认证 */
    requiresAuth?: boolean;
    /** Layout 配置：区域显隐 / 头部显隐 / Logo */
    layout?: LayoutConfig;
    /** 菜单图标——注意是 Vue 组件（Component），不是字符串 */
    icon?: Component;
    /** 是否在菜单中隐藏 */
    hidden?: boolean;
    /** 外链地址 */
    link?: string;
    /** 激活菜单的路径（子页面高亮父菜单） */
    activeMenu?: string;
  }
}
```

⚠️ 以下字段**不存在**，不要使用：

| 字段 | 说明 |
|------|------|
| `keepAlive` | 项目未实现路由级缓存。需要缓存请在 Layout 里用 `<keep-alive :include>` 自行管理 |
| `breadcrumb` | 未实现 |
| `skeleton` | **不存在路由级骨架屏**。骨架屏只有组件级，见 [common-patterns.md#骨架屏模式](common-patterns.md#骨架屏模式) |

---

## 🛡️ 权限控制

### 角色常量定义

```typescript
// ✅ 统一从 @/constants 导入（constants/index.ts 是唯一合并点，
//    不要直接从 @/constants/roles 导——那里导出的是 DEFAULT_ROLES）
import { ROLES } from '@/constants';
import type { RoleType } from '@/constants';

// 值是【大写】：
//   ROLES.ADMIN === 'ADMIN'
//   ROLES.TEACHER === 'TEACHER'
//   ROLES.STUDENT === 'STUDENT'
```

⚠️ 常见错误：写成小写 `roles: ['admin']`。角色比对是严格相等，大小写不匹配会让权限判断
**恒为假**——路由被过滤掉、菜单不显示，且不会有任何报错，极难排查。一律用 `ROLES.XXX` 常量。

> `ADMIN` 是**预留角色**：身份接口 `get-current-user-identity` 只返回教师/学生
> （`identityType` 1/0，见 `mapIdentityToRole`），当前流程下 `info.role` 不会是 `ADMIN`。
> 路由 `meta.roles` 里写 `ROLES.ADMIN` 目前恒不命中，属预留占位，非 bug。

### 路由与菜单权限

权限只在路由的 `meta.roles` 上声明一处，菜单和设置页导航都由路由推导：

- `usePermissionStore().generateRoutes(asyncRoutes, roles)` 按 `meta.roles` 过滤异步路由，守卫随后逐条 `addRoute`
- 路由注册完后，守卫调用 `generateMenus(roles, path => canAccess(router, path, roles))` 生成菜单
- `canAccess`（`src/router/guards.ts`）：路径命中已注册的真实路由（不是兜底），且每一层 `meta.roles` 都满足
- 内部菜单（`menuList` 中非外链、非禁用的项）**不要写 `roles`**，可见性跟随对应路由；外链与禁用项没有路由，才用自身 `roles`
- 分组菜单按子项过滤，子项全部不可见时整组隐藏
- 设置页左侧导航按声明顺序列出壳路由 `SETTING_SHELL_ROUTE_NAME` 下带 `meta.title` 的子路由，新增设置页只需在壳路由下加子路由，不想进导航的标 `meta.hidden`

---

## 🚦 路由守卫

### 全局前置守卫

项目在 `src/router/guards.ts` 中实现了完整的路由守卫逻辑，登录态由 **SSO** 驱动（不是本地 `/login` 页面 + 用户名密码）：

```typescript
// src/router/guards.ts（项目真实实现）
import type { RouteLocationNormalized, Router } from 'vue-router';
import {
  EXCEPTION_QUERY,
  FORBIDDEN_PATH,
  FORBIDDEN_REASON,
  toAbsoluteUrl,
  type ForbiddenReason,
} from './redirect';
import { fallbackRoute, resolveDeclaredRoutes } from './routes';
import { usePermissionStore } from '@/store/modules/permission';
import { useUserInfoStore } from '@/store/modules/user-info';
import { jumpToLogin } from '@/utils/auth';
// #if overrides
import { routerManager } from '@/plugins/override';
// #endif

// 白名单：无需登录即可访问。只有全屏 403——它是守卫在「token 有效但拿不到权限」时的落点；
// 404 不在其中，未登录用户先走 SSO 登录，登录后由布局内的兜底路由渲染
const WHITE_LIST = ['/403'];

/** 判断路径是否免登录 */
function isWhiteListed(path: string): boolean {
  if (WHITE_LIST.includes(path)) return true;
  // #if overrides
  // 惰性读取而非模块加载时合并：routerManager 的注册发生在 router/index.ts 的模块体，
  // 而本模块被它先 import，模块加载时合并只会读到空数组。
  if (routerManager.getWhiteList().includes(path)) return true;
  // #endif
  return false;
}

// 跳全屏 403：带上原因与原目标路径，异常页据此决定给「重试」还是「重新登录」，以及之后回到哪里
function toForbidden(reason: ForbiddenReason, to: RouteLocationNormalized) {
  return {
    path: '/403',
    query: { [EXCEPTION_QUERY.REASON]: reason, [EXCEPTION_QUERY.REDIRECT]: to.fullPath },
    replace: true,
  };
}

export function setupRouterGuard(router: Router) {
  // 注意：使用「返回值决定导航结果」的写法（Vue Router 4 推荐方式），不是 (to, from, next) 回调风格
  router.beforeEach(async to => {
    const userStore = useUserInfoStore();
    const permissionStore = usePermissionStore();

    // 1. 同步登录态：真源是 Cookie，refreshToken() 重新读取并同步到 store 的响应式镜像。
    // 放在白名单判断之前，免登录页拿到的镜像同样是最新的
    const hasToken = userStore.refreshToken();

    // 2. 白名单直接放行
    if (isWhiteListed(to.path)) {
      return true;
    }

    // 3. 未登录：整体跳 SSO
    if (!hasToken) {
      // 整体跳转到 SSO 统一登录页（离开当前应用，不是 router.push）。
      // 回跳地址传目标路由：本次导航随后被取消，地址栏还停在出发页，直接取 location.href 会回错页
      jumpToLogin(toAbsoluteUrl(to.fullPath));
      return false;
    }

    // 4. 已生成权限路由，直接放行
    if (permissionStore.isRoutesGenerated) {
      return true;
    }

    // 5. 首次访问：获取用户信息 + 角色，生成权限路由
    try {
      // Cookie 中只有身份资料，不含 role；role 需单独拉取或走 Cookie 已带的兜底值
      await userStore.getInfoAction();
      let role = userStore.info.role;
      if (!role) {
        role = await userStore.fetchUserRole();
      }

      if (!role) {
        // 关键：token 已存在说明 SSO 认为已登录，此时再 jumpToLogin 会被 SSO 直接回弹造成无限刷新，
        // 因此角色拿不到时跳白名单内的 403，而不是重新登录
        return toForbidden(FORBIDDEN_REASON.NO_ROLE, to);
      }

      // resolveDeclaredRoutes()：已应用租户覆盖、未按角色过滤的全量表（routes/declared.ts）。
      // 覆盖必须先于过滤，租户放宽的 meta.roles 才能生效、追加的 children 才受角色约束
      const accessRoutes = permissionStore.generateRoutes(resolveDeclaredRoutes(), [role]);

      accessRoutes.forEach(route => router.addRoute(route));
      // 最后注册兜底路由：布局内渲染 403/404，所有没匹配上的路径（含无权限的路径）都落到这里
      router.addRoute(fallbackRoute);

      // #if overrides
      if (import.meta.env.DEV) routerManager.warnUnmatched();  // 提示没匹配上的 overrideRoutes 配置
      // #endif

      // { ...to } 保留原始 path/query/params；replace 避免后退回到路由未生成的状态
      return { ...to, replace: true };
    } catch (error) {
      console.error('获取权限失败:', error);
      permissionStore.resetPermission();
      // 同理不跳登录页，避免 SSO 回弹死循环；异常页据 reason 给出「重试」，重试导航会重新走本流程
      return toForbidden(FORBIDDEN_REASON.FETCH_FAILED, to);
    }
  });
}
```

> **异常页不能成为死胡同。** SSO 登录/登出的回跳地址默认取 `window.location.href`，在 `/403` 上点「重新登录」
> 会原地回到 `/403`（白名单直接放行，不会重新拉权限）。因此：守卫跳 403 时把原目标路径放进 `query.redirect`，
> 全屏 403 页（`src/views/exception/Forbidden.vue`）用 `readSafeRedirect()` 校验后作为重试目标 /
> `logoutAction(redirect)` 的回跳地址；布局内异常页始终提供「返回首页」。`readSafeRedirect` 只接受站内
> 相对路径，防止开放重定向。
>
> **`?auth=` 回调不在守卫里处理。** SSO 登录成功后回跳形如 `/xxx?auth=<JWT>`，这个参数由
> `writeTokenFromAuthQuery()`（`src/utils/auth.ts`）消费，在 `src/app/render.ts` 中于
> **`createAppRouter()` 之前**调用——那时还没有 router 实例，所以它直接读 `window.location.search`
> 而不是 `to.query`。不要在守卫里再写一遍 `?auth=` 处理逻辑。
>
> **不要**用 `Cookies.set(TOKEN_AI_POLY, auth, { domain: '.polymas.com', path: '/' })` 硬编码域名写 token，统一调用 `setAuthTokenCookie()`（`src/utils/auth.ts`）。该函数会根据 `window.location.hostname` 判断：命中 `KNOWN_SSO_DOMAINS`（当前为 `polymas.com`、`zhihuishu.com`）时按对应顶级域共享 Cookie，命中不到时落成当前域名下的 host-only Cookie。硬编码域名在自定义部署域名（如学校 `edu.cn` 域名）下会被浏览器静默丢弃 Cookie，导致 `userStore.token` 一直读不到值，在守卫第 2 步反复判定未登录、无限重跳 SSO 登录页（表现为页面无限刷新）。
>
> 同理，`jumpToLogin()` 也不要直接调用包内 `jumpToSsoLogin()` 默认值——它会固定打到 `SSO_CONFIG.POLYMAS_HOST`（cloudapi.polymas.com）的 `/oauth/login/checkLogin` 路径，这只是 polymas 的业务接口域，不是登录页，在非 polymas.com 部署下（如 zhihuishu.com）会被直接弹回、无法登录，同样造成无限刷新。`jumpToLogin()` 内部已按 `KNOWN_SSO_DOMAINS` 直接跳转对应的 `login.<顶级域>/?service=<回跳地址>`（真正的登录页地址；回跳地址由调用方显式传入，守卫传目标路由、异常页传原目标页，缺省才取当前地址），命中不到时才回退包内默认行为。新增可共享的自有顶级域（同时决定 Cookie 共享域和登录 host）时，去 `KNOWN_SSO_DOMAINS` 里加一项即可，不要在守卫或工具函数里散落写死域名。

### 路由守卫执行流程

```
用户访问路由
    ↓
1. 同步登录态（refreshToken：读 Cookie 并写入 store 镜像，白名单路径同样执行）
    ↓
2. 检查白名单（isWhiteListed：WHITE_LIST + overrides 提供的白名单） → 直接放行
    ↓
3. 未登录 → 调用 jumpToLogin(目标路由绝对地址) 整体跳转 SSO
    ↓
4. 检查权限路由是否已生成 → 已生成直接放行
    ↓
5. 获取用户信息 + 角色（Cookie 兜底 / 接口拉取）
    ↓
6. 角色为空 → 跳 /403?reason=no-role&redirect=<原路径>（不跳登录页，避免 SSO 回弹死循环）
    ↓
7. 按角色过滤 resolveDeclaredRoutes()（已应用租户覆盖的全量表）生成可访问路由
    ↓
8. 动态添加路由到 router，最后追加 fallbackRoute（布局内 403/404）
    ↓
9. 重新导航到目标路由（replace: true）
```

### 路由守卫最佳实践

#### 白名单管理
```typescript
// ✅ 正确:集中管理白名单，不要在守卫里散落判断
const WHITE_LIST = ['/403'];

if (WHITE_LIST.includes(to.path)) {
  return true;
}

// ❌ 错误:分散判断
if (to.path === '/403') return true;
if (to.path === '/public') return true;

// ❌ 错误:把 404 放进白名单——未登录用户应先走 SSO 登录，登录后由布局内的兜底路由渲染 404
```

> 登录页不在白名单里——它根本不是本应用内的路由，登录态缺失时是整体跳转离开当前应用，不存在"访问 /login 直接放行"这一分支。

#### 未登录跳转
```typescript
// ✅ 正确:未登录时整体跳转 SSO 登录，回跳地址传目标路由（SSO 登录后会带 ?auth= 回跳该地址）
if (!userStore.refreshToken()) {
  jumpToLogin(toAbsoluteUrl(to.fullPath));
  return false;
}

// ❌ 错误:不传回跳地址——本次导航随后被取消，地址栏停在出发页，用户登录后落回出发页而不是要去的页
if (!userStore.refreshToken()) {
  jumpToLogin();
  return false;
}

// ❌ 错误:本项目没有本地 /login 路由，不要用 router.push('/login') 或 next('/login')
if (!userStore.refreshToken()) {
  next('/login');
}
```

#### 路由守卫中的错误处理
```typescript
// ✅ 正确:获取权限失败时跳 403（带原因与原路径），而不是跳登录页
try {
  await userStore.getInfoAction();
  // ... 生成路由逻辑
} catch (error) {
  console.error('获取权限失败:', error);
  permissionStore.resetPermission();
  return toForbidden(FORBIDDEN_REASON.FETCH_FAILED, to);
}

// ❌ 错误:失败后跳登录页——token 仍然存在，SSO 会直接回弹，造成无限刷新循环
try {
  await userStore.getInfoAction();
  // ... 生成路由逻辑
} catch (error) {
  await userStore.logoutAction();
  next('/login');
}
```

---

## 📋 新增路由开发流程

### 步骤 1: 创建页面组件

```bash
# 创建页面目录和文件
mkdir src/views/lab-reservation
touch src/views/lab-reservation/index.vue
```

```vue
<!-- src/views/lab-reservation/index.vue -->
<template>
  <div class="lab-reservation-page">
    <h1>功能名称</h1>
    <!-- 页面内容 -->
  </div>
</template>

<script setup lang="ts">
// 页面逻辑
</script>

<style scoped lang="scss">
.lab-reservation-page {
  padding: 24px;
}
</style>
```

### 步骤 2: 配置路由

#### 场景 A: 静态路由(所有登录用户可访问)

在 `src/router/routes/static.ts` 的 Layout children 中添加:

```typescript
// src/router/routes/static.ts
export const staticRoutes: RouteRecordRaw[] = [
  // ... 无需登录的路由

  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      // ... 其他路由

      // ✅ 新增:产品管理页面
      {
        path: 'product-management',
        name: 'ProductManagement',
        component: () => import('@/views/product-management/index.vue'),
        meta: {
          title: '产品管理',
        },
      },
    ],
  },
];
```

#### 场景 B: 异步路由(需要权限控制)

在 `src/router/routes/async.ts` 中添加:

```typescript
// src/router/routes/async.ts
export const asyncRoutes: RouteRecordRaw[] = [
  // ... 其他路由

  // ✅ 新增:实验室管理页面(仅管理员和教师)
  {
    path: '/lab',
    component: Layout,
    redirect: '/lab/management',
    meta: {
      title: '实验室管理',
      roles: [ROLES.ADMIN, ROLES.TEACHER],
    },
    children: [
      {
        path: 'management',
        name: 'LabManagement',
        component: () => import('@/views/lab-management/index.vue'),
        meta: {
          title: '实验室管理',
          roles: [ROLES.ADMIN, ROLES.TEACHER],
        },
      },
    ],
  },
];
```

### 步骤 3: 验证路由

```bash
# 启动开发服务器（注意是 start，不是 dev；已开启 HTTPS）
pnpm start

# 访问新路由（端口以启动日志输出为准）
https://localhost:<port>/lab/management
```

---

## 🎯 常见路由场景

### 1. 嵌套路由

```typescript
// ✅ 正确:使用嵌套路由
{
  path: '/setting',
  component: Layout,
  redirect: '/setting/frontend',
  meta: {
    title: '设置',
    roles: [ROLES.ADMIN],
  },
  children: [
    {
      path: 'frontend',                    // 相对路径,实际路径:/setting/frontend
      name: 'Frontend',
      component: () => import('@/views/setting/Frontend.vue'),
      meta: {
        title: '前端配置',
        roles: [ROLES.ADMIN],
      },
    },
    // 需要第二个子页面时按同样方式追加（相对 path + 独立 name）
  ],
}

// ❌ 错误:子路由使用绝对路径
children: [
  {
    path: '/setting/frontend',  // 不要用绝对路径,应该用 'frontend'
    // ...
  },
]
```

### 2. 动态路由参数

```typescript
// ✅ 正确:动态路由参数
{
  path: '/user/:id',
  name: 'UserDetail',
  component: () => import('@/views/user-detail/index.vue'),
  meta: {
    title: '用户详情',
  },
}

// 在组件中使用
<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const userId = route.params.id as string;
</script>
```

### 3. 路由重定向

```typescript
// ✅ 正确:路由重定向
{
  path: '/',
  redirect: '/home',  // 访问 / 重定向到 /home
}

// ✅ 正确:父路由重定向到第一个子路由
{
  path: '/setting',
  component: Layout,
  redirect: '/setting/frontend',  // 访问 /setting 重定向到 /setting/frontend
  children: [
    {
      path: 'frontend',
      name: 'Frontend',
      component: () => import('@/views/setting/Frontend.vue'),
    },
  ],
}
```

### 4. 兜底路由（布局内 403 / 404）

```typescript
// src/router/routes/fallback.ts —— 不放进 asyncRoutes，由守卫在权限路由全部 addRoute 之后单独注册
export const fallbackRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'Fallback',
  component: AppLayout,
  children: [{ path: '', name: 'Exception', component: () => import('@/views/exception/index.vue') }],
};

// ❌ 错误:redirect 到 /404——地址栏丢失原路径，用户看不到自己敲错了什么
{ path: '/:pathMatch(.*)*', redirect: '/404' }
```

兜底页（`src/views/exception/index.vue`）用 `matchesDeclaredRoute(route.path)` 拿 `resolveDeclaredRoutes()`
（已应用租户覆盖、未按角色过滤，与守卫同源）再匹配一次：命中说明「有这个页面但当前账号没权限」→ 展示 403；否则 → 404。无权限的路由本身不会
注册到 router，所以不要指望在守卫里靠 `to.matched` 区分这两种情况。

---

## 🔧 路由工具函数

### 路由跳转

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

// ✅ 正确:使用 name 跳转
router.push({ name: 'ProductManagement' });

// ✅ 正确:使用 path 跳转
router.push('/product-management');

// ✅ 正确:带参数跳转
router.push({
  name: 'UserDetail',
  params: { id: '123' },
});

// ✅ 正确:带查询参数跳转
router.push({
  name: 'UserList',
  query: { page: '2', keyword: 'admin' },
});

// ✅ 正确:替换当前路由(不留历史记录)
router.replace({ name: 'Home' });

// ✅ 正确:返回上一页
router.back();
router.go(-1);
```

### 获取路由信息

```typescript
import { useRoute } from 'vue-router';

const route = useRoute();

// ✅ 获取路由参数
const userId = route.params.id as string;

// ✅ 获取查询参数
const page = route.query.page as string;
const keyword = route.query.keyword as string;

// ✅ 获取路由元信息
const title = route.meta.title as string;
const roles = route.meta.roles as string[];

// ✅ 获取当前路径
const currentPath = route.path;
const currentName = route.name;
```

---

## 📋 路由开发快速检查清单

### 路由配置检查
- [ ] 路由 `path` 使用小写和短横线(如 `/product-management`)
- [ ] 路由 `name` 使用大驼峰(如 `ProductManagement`)
- [ ] 路由 `name` 全局唯一
- [ ] 必须设置 `meta.title`
- [ ] 异步路由必须设置 `meta.roles`
- [ ] 使用懒加载 `() => import()`

### 权限控制检查
- [ ] 无需动态权限的路由（全屏 403、所有登录用户可访问页面）在 `static.ts` 中配置——登录页由 SSO 整体托管，不是本仓库内的路由；404 由 `fallback.ts` 的兜底路由承担
- [ ] 需要角色权限的路由在 `async.ts` 中配置
- [ ] 角色常量使用 `ROLES.XXX`
- [ ] 白名单路由已添加到 `guards.ts` 的 `WHITE_LIST`（overrides 特性下也可由 `routerManager.getWhiteList()` 提供）

### 路由守卫检查
- [ ] 路由守卫中有完整的错误处理
- [ ] 未登录时调用 `jumpToLogin(toAbsoluteUrl(to.fullPath))` 整体跳转 SSO（回跳目标路由；SSO 登录后自带 `?auth=` 回跳该地址）
- [ ] 回跳地址不在调用点自己过滤：`jumpToLogin` / `jumpToLogout` 内部统一过 `resolveLoginReturnUrl()`（站外地址、异常页都会换成站内目标）
- [ ] 动态路由生成后调用了 `router.addRoute()`
- [ ] 退出登录时调用了 `permissionStore.resetPermission()`

---

## ❓ 常见问题

### Q: 什么时候使用 static.ts 和 async.ts?

**A**:
- **static.ts**: 无需动态权限的路由——含无需登录的公开页面（全屏 403）以及所有登录用户可访问的页面（首页、个人中心）。登录页不在其中，登录由 SSO 整体托管，不是本仓库内的路由
- **fallback.ts**: 兜底路由，守卫在权限路由之后注册，在布局内渲染 403 / 404 并保留原 URL
- **async.ts**: 需要特定角色权限的页面(管理页面、设置页面)

### Q: 为什么路由配置后无法访问?

**A**: 检查以下几点:
1. 异步路由需要在登录后才能访问
2. 检查用户角色是否匹配 `meta.roles`
3. 确认路由是否被正确添加到 router
4. 查看控制台是否有路由守卫报错

### Q: 如何实现多级菜单?

**A**: 使用嵌套路由:
```typescript
{
  path: '/system',
  component: Layout,
  meta: { title: '系统管理' },
  children: [
    {
      path: 'user',
      name: 'UserManagement',
      component: () => import('@/views/user-management/index.vue'),
      meta: { title: '用户管理' },
    },
    {
      path: 'role',
      name: 'RoleManagement',
      component: () => import('@/views/role-management/index.vue'),
      meta: { title: '角色管理' },
    },
  ],
}
```

### Q: 如何在路由跳转时传递复杂数据?

**A**: 有三种方式:
```typescript
// 方式1: 使用 query(URL 可见)
router.push({
  name: 'UserDetail',
  query: { id: '123', tab: 'profile' },
});

// 方式2: 使用 params(需要 name,URL 不可见)
router.push({
  name: 'UserDetail',
  params: { id: '123' },
});

// 方式3: 使用 state(刷新会丢失)
router.push({
  name: 'UserDetail',
  state: { user: userInfo },
});
```

### Q: 如何实现路由缓存?

**A**: 项目**未实现**路由级缓存，`RouteMeta` 里没有 `keepAlive` 字段。确有需要时在 Layout
里自行管理一份要缓存的路由 name 列表：

```vue
<router-view v-slot="{ Component }">
  <keep-alive :include="cachedViews">
    <component :is="Component" />
  </keep-alive>
</router-view>
```

用 `:include` 而不是在 `<keep-alive>` 内部用 `v-if` 切换——后者会让缓存失效并触发警告。
`cachedViews` 存路由 `name`，所以被缓存组件的 `name` 必须与路由 `name` 一致。

---

## 📚 相关文档

- [project-structure.md](project-structure.md) - 项目目录结构
- [store-development.md](store-development.md) - 状态管理(Permission Store)
- [coding-standards.md](coding-standards.md) - 编码规范

---

通过遵循这些路由开发规范,可以构建出清晰、安全、易维护的路由系统。
