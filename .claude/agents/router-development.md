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
├── index.ts                    # 路由入口：createAppRouter()，base 取 VITE_BASE_PATH
├── guards.ts                   # 路由守卫（登录态、白名单、动态路由）与 canAccess()
├── redirect.ts                 # 登录回跳纯函数：readSafeRedirect / resolveLoginReturnPath / routerBase
├── title.ts                    # 按 meta.title 设置页面标题
├── route-tree.ts               # 路由树工具（全路径解析等）
└── routes/                     # 路由配置目录
    ├── index.ts                # 路由统一导出
    ├── static.ts               # 静态路由(初始直接注册，无需动态权限)
    ├── async.ts                # 异步路由(需要权限控制，登录后动态注册)
    ├── declared.ts             # 声明式全量表(未按角色过滤的异步路由，守卫与兜底页共用)
    └── fallback.ts             # 兜底路由(守卫在权限路由之后注册，布局内区分 403 / 404)
```

> 布局容器组件的真实导出名是 `AppLayout`（`import { AppLayout } from '@/layout/constants'`），下文代码示例中出现的 `Layout` 均指代它；实际编写路由时请以 `AppLayout` 为准。

### 两层路由体系

项目采用**两层路由体系**,根据是否需要动态权限分层管理:

| 路由类型 | 文件 | 特点 | 适用场景 |
|---------|------|------|---------|
| **静态路由** | `static.ts` | 初始直接注册，无需动态权限 | 登录页、全屏 403、根路径重定向 |
| **异步路由** | `async.ts` | 需要登录+权限,动态注册 | 管理页面、设置页面 |
| **全量表** | `declared.ts` | `resolveDeclaredRoutes()`：未按角色过滤的异步路由全量表 | 守卫过滤后注册；兜底页据此区分 403 / 404 |
| **兜底路由** | `fallback.ts` | 守卫在权限路由之后单独注册，不参与角色过滤 | 布局内 403 / 404（保留原 URL） |

---

## 📝 路由配置规范

### 路由配置模板

#### 1. 静态路由模板 (static.ts)

静态路由是**初始直接注册**的路由，包含无需登录的页面与根路径重定向。

```typescript
// static.ts 中的 staticRoutes 数组

// 无需登录的页面（直接添加在数组顶层，须同步加入 guards.ts 的 WHITE_LIST）
{
  path: LOGIN_PATH,          // '/login'，常量来自 @/constants
  name: 'Login',
  component: () => import('@/views/login/index.vue'),
  meta: { title: '登录' },
},
{
  path: '/403',
  name: 'Forbidden',
  component: () => import('@/views/exception/Forbidden.vue'),
  meta: { title: '无访问权限' },
}

// 根路径：没有页面，只做重定向
{
  path: '/',
  redirect: resolveDefaultPage,
}
```

根路径落点由 `src/router/landing.ts` 的 `resolveLandingPath()` 决定，按顺序取第一个当前角色可访问的路径：

1. 站点配置的默认页 `basic.defaultPage`（校验时须命中已声明路由，无效值读取时剔除）；
2. 内置默认页 `DEFAULT_PAGE`（`/content/questions`，题目列表）；
3. 菜单中第一个可访问的页面（跳过隐藏、禁用与外链项）；
4. 都不可访问时回到 `DEFAULT_PAGE`，由兜底路由展示无权限。

`/` 自身不作为落点。权限路由尚未生成时直接返回候选页，守卫生成路由后从 `/` 重走一次重定向。

> 登录页是本仓库内的路由 `/login`（`src/views/login/`），与全屏 403 一起列在 `guards.ts` 的 `WHITE_LIST` 中。

**适用场景:** 登录页、全屏 403 等免登录页面，以及根路径重定向。404 不是静态路由——见下方「兜底路由」

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
  path: 'questions',
  name: 'ContentQuestions',
  component: () => import('@/views/content/questions/index.vue'),
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
  path: 'questions',
  name: 'ContentQuestions',
  component: () => import('@/views/content/questions/index.vue'),
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

> 当前角色是 `userStore.info.role`，来自 `getInfoAction()` 调用的 `GET /api/auth/current-user`（以接口为准，不持久化）。
> 接口返回的 `role` 不在 `ROLES` 取值内时会被置空，守卫随即跳 `/403?reason=no-role`。

### 路由与菜单权限

权限只在路由的 `meta.roles` 上声明一处，菜单和设置页导航都由路由推导：

- `usePermissionStore().generateRoutes(resolveDeclaredRoutes(), roles)` 按 `meta.roles` 过滤异步路由，守卫随后逐条 `addRoute`
- 路由注册完后，守卫调用 `generateMenus(roles, path => canAccess(router, path, roles))` 生成菜单
- `canAccess`（`src/router/guards.ts`）：路径命中已注册的真实路由（不是兜底），且每一层 `meta.roles` 都满足
- 内部菜单（`menuList` 中非外链、非禁用的项）**不要写 `roles`**，可见性跟随对应路由；外链与禁用项没有路由，才用自身 `roles`
- 分组菜单按子项过滤，子项全部不可见时整组隐藏
- 设置页左侧导航按声明顺序列出壳路由 `SETTING_SHELL_ROUTE_NAME` 下带 `meta.title` 的子路由，新增设置页只需在壳路由下加子路由，不想进导航的标 `meta.hidden`

---

## 🚦 路由守卫

### 全局前置守卫

项目在 `src/router/guards.ts` 中实现了完整的路由守卫逻辑，登录态来自本地登录页写入的 Cookie token：

```typescript
// src/router/guards.ts（项目真实实现，节选）
/** 免登录路径：登录页，以及「token 有效但拿不到权限」时的落点全屏 403 */
const WHITE_LIST = [LOGIN_PATH, FORBIDDEN_PATH];

export function setupRouterGuard(router: Router) {
  router.beforeEach(async to => {
    const userStore = useUserInfoStore();
    const permissionStore = usePermissionStore();

    // 登录态真源是 Cookie，每次导航重新读取并同步到 store
    const hasToken = userStore.refreshToken();

    // 已登录访问登录页：回到它带的目标页
    if (to.path === LOGIN_PATH && hasToken) return resolveLoginReturnPath(readSafeRedirect(to.query) ?? '/');

    if (isWhiteListed(to.path)) return true;

    if (!hasToken) {
      // 经过 redirect 的取原地址：默认页要等登录后按角色判定
      const redirect = resolveLoginReturnPath(to.redirectedFrom?.fullPath ?? to.fullPath);
      return { path: LOGIN_PATH, query: redirect === '/' ? {} : { [EXCEPTION_QUERY.REDIRECT]: redirect } };
    }

    if (permissionStore.isRoutesGenerated) {
      // 其他标签页换了账号：整页刷新按新账号重新初始化
      if (userStore.isAccountSwitched()) {
        window.location.reload();
        return false;
      }
      // 静态路由不经 generateRoutes 过滤，meta.roles 在这里逐层校验
      const roles = [userStore.info.role];
      return to.matched.every(record => permissionStore.hasRoutePermission(roles, record)) || toException(to);
    }

    try {
      await userStore.getInfoAction();
      const role = userStore.info.role;
      if (!role) return toForbidden(FORBIDDEN_REASON.NO_ROLE, to);

      const accessRoutes = permissionStore.generateRoutes(resolveDeclaredRoutes(), [role]);
      accessRoutes.forEach(route => router.addRoute(route));
      // 兜底最后注册：无权限与不存在的路径都落到布局内异常页
      router.addRoute(fallbackRoute);
      permissionStore.generateMenus([role], path => canAccess(router, path, [role]));

      const origin = to.redirectedFrom;
      if (origin) return { path: origin.path, query: origin.query, hash: origin.hash, replace: true };
      return { ...to, replace: true };
    } catch (error) {
      console.error('获取权限失败:', error);
      // 重置生成标记，异常页「重试」时会重新走本流程
      permissionStore.resetPermission();
      return toForbidden(FORBIDDEN_REASON.FETCH_FAILED, to);
    }
  });
}
```

`toForbidden(reason, to)` 跳 `/403?reason=<no-role|fetch-failed>&redirect=<原路径>`；`toException(to)` 落到布局内异常页并保留原地址。

> **回跳地址只走 `src/router/redirect.ts`。**
>
> - `readSafeRedirect(query)`：读取 `query.redirect`，只接受站内单斜杠开头的路径（排除 `//host`、`/\host` 与制表/换行字符），防止开放重定向
> - `resolveLoginReturnPath(target?, { inheritExceptionTarget })`：所有登录/登出跳转的唯一出口。站外地址、解析失败 → `/`；
>   登录页、全屏 403 → 按 `inheritExceptionTarget`（默认 `true`）取它带的 `query.redirect`，否则 `/`
> - `routerBase()`：归一后的 `VITE_BASE_PATH`，整页跳转拼地址时使用
>
> **异常页不能成为死胡同。** 守卫跳 403 时把原目标放进 `query.redirect`；全屏 403 页（`src/views/exception/Forbidden.vue`）
> 用 `readSafeRedirect()` 取出作为「重试」目标，「重新登录」走 `userStore.logoutAction()`（换账号，落到根路径落点）。
>
> **请求层 401 不经守卫。** 接口返回 401 时由 `redirectToLoginOnce()` 清 token 并调用 `jumpToLogin()`
> 整页跳 `${base}/login?redirect=<当前站内路径>`，动态路由与各 Store 随页面重建复位。

### 路由守卫执行流程

```
用户访问路由
    ↓
1. 同步登录态（refreshToken：读 Cookie 并写入 store 镜像，白名单路径同样执行）
    ↓
2. 已登录访问 /login → 回到 readSafeRedirect(query) 指向的页面（经 resolveLoginReturnPath 过滤）
    ↓
3. 白名单（/login、/403） → 直接放行
    ↓
4. 未登录 → /login?redirect=<目标>（经过 redirect 的路由取原地址）
    ↓
5. 权限路由已生成 → 换账号则整页刷新；否则逐层校验 meta.roles，不满足落布局内异常页
    ↓
6. 首次导航：getInfoAction() 拉取用户资料与角色（以接口为准）
    ↓
7. 角色为空 → /403?reason=no-role；拉取失败 → resetPermission() 后 /403?reason=fetch-failed
    ↓
8. generateRoutes(resolveDeclaredRoutes(), [role]) → addRoute → 最后追加 fallbackRoute → generateMenus
    ↓
9. 重新导航到目标路由（replace: true）
```

### 路由守卫最佳实践

#### 白名单管理
```typescript
// ✅ 正确:集中管理白名单，不要在守卫里散落判断
const WHITE_LIST = [LOGIN_PATH, FORBIDDEN_PATH];

// ❌ 错误:分散判断
if (to.path === '/403') return true;
if (to.path === '/public') return true;

// ❌ 错误:把 404 放进白名单——未登录用户应先登录，登录后由布局内的兜底路由渲染 404
```

> 新增免登录页面时，同时加到 `static.ts` 顶层与 `WHITE_LIST`。

#### 未登录跳转
```typescript
// ✅ 正确:守卫内返回登录页路由，回跳地址经 resolveLoginReturnPath 过滤后放进 query.redirect
if (!hasToken) {
  const redirect = resolveLoginReturnPath(to.redirectedFrom?.fullPath ?? to.fullPath);
  return { path: LOGIN_PATH, query: redirect === '/' ? {} : { redirect } };
}

// ✅ 正确:守卫之外（请求层、工具函数）需要回登录页时整页跳转
import { jumpToLogin } from '@/utils/auth';
jumpToLogin(); // 缺省回跳当前页面

// ❌ 错误:把未经校验的 query.redirect 直接交给 router.push / location.href（开放重定向）
router.push(route.query.redirect as string);
```

#### 路由守卫中的错误处理
```typescript
// ✅ 正确:获取权限失败时跳 403（带原因与原路径），并重置生成标记
try {
  await userStore.getInfoAction();
  // ... 生成路由逻辑
} catch (error) {
  console.error('获取权限失败:', error);
  permissionStore.resetPermission();
  return toForbidden(FORBIDDEN_REASON.FETCH_FAILED, to);
}

// ❌ 错误:失败后直接登出——网络抖动也会把用户踢回登录页，且丢失原目标
try {
  await userStore.getInfoAction();
} catch (error) {
  await userStore.logoutAction();
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
    component: AppLayout,
    redirect: resolveDefaultPage,
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
  path: '/content',
  redirect: '/content/exams',  // 访问 /content 重定向到 /content/exams
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
（未按角色过滤，与守卫同源）再匹配一次：命中说明「有这个页面但当前账号没权限」→ 展示 403；否则 → 404。无权限的路由本身不会
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
router.replace({ name: 'ContentQuestions' });

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
- [ ] 无需动态权限的路由（登录页、全屏 403、所有登录用户可访问页面）在 `static.ts` 中配置；404 由 `fallback.ts` 的兜底路由承担
- [ ] 需要角色权限的路由在 `async.ts` 中配置
- [ ] 角色常量使用 `ROLES.XXX`
- [ ] 免登录路由已添加到 `guards.ts` 的 `WHITE_LIST`（当前为 `/login` 与 `/403`）

### 路由守卫检查
- [ ] 路由守卫中有完整的错误处理
- [ ] 守卫内未登录时返回 `/login?redirect=<目标>`；守卫之外用 `jumpToLogin()` 整页跳转
- [ ] 回跳地址不在调用点自己过滤：读 query 用 `readSafeRedirect()`，算落点用 `resolveLoginReturnPath()`（`jumpToLogin` / `jumpToLogout` 内部已调用）
- [ ] 动态路由生成后调用了 `router.addRoute()`，并最后注册 `fallbackRoute`
- [ ] 退出登录统一走 `userStore.logoutAction()`（整页跳转登录页，动态路由随页面重建复位）

---

## ❓ 常见问题

### Q: 什么时候使用 static.ts 和 async.ts?

**A**:
- **static.ts**: 无需动态权限的路由——含无需登录的页面（`/login`、全屏 403）以及根路径重定向
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
