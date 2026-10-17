---
name: store-development
description: Pinia状态管理开发指导，包括Store设计原则、状态组织和最佳实践
tools: Read, Grep, Glob, WebFetch, WebSearch
model: inherit
---

# Store状态管理规范

## 职责
专门负责Pinia状态管理开发指导，包括Store设计原则、状态组织、最佳实践和性能优化。

> **通用模式参考**: 本文档中使用的通用开发模式详见 [common-patterns.md](common-patterns.md)，包括:
> - [Props 定义规范](common-patterns.md#props-定义规范) - TypeScript 类型定义模式
> - [错误处理模式](common-patterns.md#错误处理模式) - 异步函数错误处理

---

## 🎯 Store设计原则

### 1. 单一职责原则
- **模块化**: 每个Store负责一个业务领域
- **职责清晰**: State、Getters、Actions职责分明
- **避免冗余**: 不同Store间避免状态重复

### 2. 类型安全原则
- **完整类型**: 所有状态都有明确的TypeScript类型
- **类型推导**: 充分利用TypeScript的类型推导
- **避免any**: 不使用any类型

### 3. 性能优化原则
- **按需持久化**: 只持久化必要的状态
- **计算属性**: 使用computed缓存派生状态
- **避免深层嵌套**: State结构扁平化

## 📁 Store架构设计

### 目录结构
```
src/store/
├── index.ts                    # Store统一导出
├── plugins/
│   └── persist.ts              # localforage(IndexedDB) + pinia-plugin-persistedstate
└── modules/                    # Store模块（以下是项目全部 4 个 Store）
    ├── user-info.ts            # 用户信息（useUserInfoStore：登录 / 拉取用户信息 / 登出）
    ├── permission.ts           # 权限路由与菜单（usePermissionStore）
    ├── global.ts               # 全局状态（语言/主题/侧边栏）
    └── site-config.ts          # 站点配置（useSiteConfigStore）
```

## 🛠️ Store开发模板

### 用户Store示例（useUserInfoStore，项目真实实现）

> 登录走本地登录页：`loginAction` 调 `POST /api/auth/login` 拿到 token 并经 `setToken()` 写入 Cookie；
> 用户资料与角色由 `getInfoAction` 调 `GET /api/auth/current-user` 获取，以接口为准；`logoutAction` 清理后整页跳转登录页。
> token 的真源是 Cookie，Store 里的 `token` 只是响应式镜像。

```typescript
// store/modules/user-info.ts（节选）
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getUserInfo, login, logout, type LoginParams } from '@/api/modules/auth';
import { ROLES } from '@/constants';
import type { RoleType } from '@/constants';
import { removePersistedStore } from '@/store/plugins/persist';
import { getToken, jumpToLogout, setToken } from '@/utils/auth';

export interface UserInfo {
  id: number | undefined;
  username: string;
  realName: string;
  avatar: string;
  email: string;
  phone: string;
  /** 系统角色，统一使用 @/constants 的 ROLES（来自 getUserInfo 接口） */
  role: RoleType | '';
  // ... 其余字段详见 src/store/modules/user-info.ts
}

const isRole = (value: unknown): value is RoleType => (Object.values(ROLES) as unknown[]).includes(value);

export const useUserInfoStore = defineStore(
  'user',
  () => {
    const info = ref<UserInfo>(createInitialState());

    /** 登录 token 的响应式镜像，真源是 Cookie；读 Cookie 不产生响应式依赖，所以用 ref + 主动刷新 */
    const token = ref<string>(getToken());
    const refreshToken = (): string => {
      token.value = getToken();
      return token.value;
    };

    const isLoggedIn = computed(() => !!token.value);
    const isAdmin = computed(() => info.value.role === ROLES.ADMIN);
    const isTeacher = computed(() => info.value.role === ROLES.TEACHER || info.value.role === ROLES.ADMIN);
    const isStudent = computed(() => info.value.role === ROLES.STUDENT);

    /** 本页加载用户信息时的 token，换账号检测的基准；不持久化 */
    let loadedToken = '';

    const resetUserInfo = () => {
      info.value = createInitialState();
      loadedToken = '';
    };

    /** 账号密码登录：写入 token 并同步镜像 */
    const loginAction = async (params: LoginParams) => {
      const newToken = (await login(params))?.token;
      if (!newToken) throw new Error('登录失败：未获取到登录凭证');
      setToken(newToken);
      refreshToken();
    };

    /** 拉取当前用户资料与角色；role 不在 ROLES 内时留空，由路由守卫拦截到 403 */
    const getInfoAction = async () => {
      const user = await getUserInfo();
      info.value = { ...createInitialState(), ...user, role: isRole(user?.role) ? user.role : '' };
      loadedToken = getToken();
    };

    /** Cookie 里的 token 是否已不是本页加载用户信息时的 token（其他标签页换了账号） */
    const isAccountSwitched = (): boolean => {
      const current = getToken();
      return !!current && !!loadedToken && current !== loadedToken;
    };

    /** 退出登录：通知后端、清理本地用户数据后整页跳转登录页 */
    const logoutAction = async (redirect?: string) => {
      await logout().catch(error => console.warn('退出登录接口调用失败:', error));
      resetUserInfo();
      token.value = '';
      await removePersistedStore('user').catch(error => console.warn('清理用户持久化数据失败:', error));
      jumpToLogout(redirect);
    };

    return {
      info, token, isLoggedIn, refreshToken, isAdmin, isTeacher, isStudent,
      setUserInfo, resetUserInfo, loginAction, getInfoAction, isAccountSwitched, logoutAction,
    };
  },
  {
    // 只持久化身份资料，不含 role：角色每次进入应用都以接口为准；token 的真源是 Cookie
    persist: { pick: ['info.id', 'info.username', 'info.realName', 'info.avatar', 'info.email', 'info.phone'] },
  },
);
```

各 action 的调用方：

| Action | 调用方 | 说明 |
|---|---|---|
| `loginAction(params)` | `views/login/components/LoginForm.vue` | 登录接口带 `skipAuthRedirect: true`，失败只提示不跳转 |
| `getInfoAction()` | `router/guards.ts` 首次导航 | 失败时守卫跳 `/403?reason=fetch-failed` |
| `isAccountSwitched()` | `router/guards.ts` | 为真时整页刷新 |
| `logoutAction(redirect?)` | 头像菜单、异常页 | 登出接口带 `isIgnoreToast: true`，失败不阻断登出 |

用户认证相关逻辑请直接复用 `useUserInfoStore`，不要另建 Store；上面这段代码可作为字段定义、computed、持久化写法的参考模板。

### 全局Store示例
```typescript
// store/modules/global.ts
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
// ⚠️ 从 @/constants 导入，不是 @/constants/system
//    system.ts 导出的是 DEFAULT_LOCALE_VALUE / DEFAULT_THEME_STYLE_VALUE，
//    去掉 _VALUE 后缀的名字只在 constants/index.ts（唯一合并点）导出
import { DEFAULT_LOCALE, DEFAULT_THEME_STYLE } from '@/constants';
import type { LocaleKey, ThemeStyleKey } from '@/interface/system';

export const useGlobalStore = defineStore(
  'global',
  () => {
    // ==================== 语言相关 ====================
    const currentLocale = ref<LocaleKey>(DEFAULT_LOCALE as LocaleKey);

    /**
     * 切换语言
     */
    const switchLocale = (locale: LocaleKey) => {
      currentLocale.value = locale;
    };

    /**
     * 初始化语言设置
     */
    const initLocale = () => {
      if (!currentLocale.value) {
        currentLocale.value = DEFAULT_LOCALE as LocaleKey;
      }
    };

    // ==================== 主题相关 ====================
    // 三层：用户选择（可空，持久化）→ 站点声明的默认值 → 二者解析出的生效值。
    // 组件一律消费 currentTheme，不要直接读 userTheme（它可能是 null）。

    /** 用户显式选择的主题；null 表示从未选择过 */
    const userTheme = ref<ThemeStyleKey | null>(null);

    /** 站点声明的默认主题，由 App.vue 从 siteConfig 同步进来 */
    const siteDefaultTheme = ref<ThemeStyleKey>(DEFAULT_THEME_STYLE as ThemeStyleKey);

    /** 实际生效的主题 */
    const currentTheme = computed<ThemeStyleKey>(() => userTheme.value ?? siteDefaultTheme.value);

    /**
     * 设置主题
     */
    const setTheme = (theme: ThemeStyleKey) => {
      userTheme.value = theme;
    };

    /**
     * 切换主题
     */
    const toggleTheme = () => {
      setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
    };

    /**
     * 同步站点声明的默认主题（进站时调用，不影响用户已有选择）
     */
    const syncSiteDefaultTheme = (theme: ThemeStyleKey) => {
      siteDefaultTheme.value = theme;
    };

    /**
     * 应用新的站点默认主题（仅由设置页保存成功后调用）
     *
     * 新声明优先于用户此前的选择，故清空 userTheme 让其重新跟随。
     * 刻意不在「配置发生变化」时自动触发：接了服务端存储源后每次启动的 load()
     * 都会替换配置，那样会把用户自己的明暗选择反复抹掉。
     */
    const applySiteDefaultTheme = (theme: ThemeStyleKey) => {
      siteDefaultTheme.value = theme;
      userTheme.value = null;
    };

    // ==================== 侧边栏相关 ====================
    const sidebar = reactive({ opened: true, withoutAnimation: false });

    const toggleSidebar = () => {
      sidebar.opened = !sidebar.opened;
      sidebar.withoutAnimation = false;
    };

    const closeSidebar = (withoutAnimation: boolean) => {
      sidebar.opened = false;
      sidebar.withoutAnimation = withoutAnimation;
    };

    return {
      // 语言相关
      currentLocale,
      switchLocale,
      initLocale,

      // 主题相关
      userTheme,
      siteDefaultTheme,
      currentTheme,
      toggleTheme,
      setTheme,
      syncSiteDefaultTheme,
      applySiteDefaultTheme,

      // 侧边栏相关
      sidebar,
      toggleSidebar,
      closeSidebar,
    };
  },
  {
    persist: true,
  },
);
```

## 📖 Store开发最佳实践

### 1. 状态定义规范
```typescript
// ✅ 正确：明确的类型定义
const token = ref<string>('');
const userInfo = ref<IUserInfo | null>(null);
const roles = ref<string[]>([]);

// ❌ 错误：缺少类型定义
const token = ref('');
const userInfo = ref(null);
const roles = ref([]);
```

### 2. Computed使用规范
```typescript
// ✅ 正确：使用computed缓存派生状态
const isLoggedIn = computed(() => !!token.value);
const isAdmin = computed(() => info.value.role === ROLES.ADMIN);  // 单数 role + 大写常量

// ❌ 错误：每次调用都重新计算
const getIsLoggedIn = () => !!token.value;
```

### 3. Actions命名规范
Action 用 `xxxAction` 后缀，动词开头、语义明确（与项目现有 `loginAction` / `getInfoAction` / `logoutAction` 一致）：

```typescript
// ✅ 正确
const getInfoAction = async () => { /* 拉取信息 */ };
const logoutAction = async () => { /* 登出 */ };
const updateConfigAction = async (config: SiteConfig) => { /* 更新配置 */ };

// ❌ 错误：命名含糊 + 参数用 any
const doIt = async (data: any) => {};
```

> 登录 / 登出已由 `useUserInfoStore` 的 `loginAction` / `logoutAction` 实现，其他 Store 不要重复实现。

### 4. 状态重置规范
```typescript
// ✅ 正确：把初始状态抽成工厂函数，重置时整体替换
const createInitialState = (): UserInfo => ({
  id: undefined, username: '', realName: '', avatar: '', email: '', phone: '', role: '',
});

const info = ref<UserInfo>(createInitialState());

const resetState = () => {
  info.value = createInitialState();
};

// token 是 Cookie 的 ref 镜像，logoutAction 中与 resetUserInfo() 一起清空
```

> 清理持久化数据用 **`removePersistedStore('<storeId>')`**（storeId 是 `defineStore` 的第一个参数），
> 它会同时清掉 IndexedDB 和适配器的内存 `syncCache`。只重置内存状态、或只调
> `piniaStorage.removeItem()`，都会在下次 hydrate 时被另一处还原回来。

### 5. 持久化配置

**核心原则**: 使用 `pinia-plugin-persistedstate` 插件，默认存储在 IndexedDB

#### 5.1 基础配置
```typescript
// ✅ 配置1: 持久化所有状态（最简单）
export const useThemeStore = defineStore(
  'theme',
  () => {
    const mode = ref<string>('light');
    const preference = ref<Record<string, unknown> | null>(null);
    // ... 其他状态和方法
    return { mode, preference };
  },
  {
    persist: true, // 持久化所有返回的状态
  },
);
```

#### 5.2 选择性持久化 - pick（推荐）
```typescript
// ✅ 配置2: 只持久化指定字段（推荐）
export const useProductStore = defineStore(
  'product',
  () => {
    const productList = ref<ProductDTO[]>([]);
    const currentProduct = ref<ProductDTO | null>(null);
    const total = ref<number>(0);
    const loading = ref<boolean>(false);
    // ... 其他状态和方法

    return {
      productList,
      currentProduct,
      total,
      loading
    };
  },
  {
    persist: {
      pick: ['currentProduct'], // 只持久化当前产品详情
      // 不持久化 productList（列表数据）
      // 不持久化 total（派生数据）
      // 不持久化 loading（UI 状态）
    },
  },
);
```

**使用场景**:
- ✅ 持久化: 用户选择的当前项、配置项、缓存数据
- ❌ 不持久化: 列表数据、临时状态、UI 状态（loading、error）

#### 5.3 排除式持久化 - omit
```typescript
// ✅ 配置3: 排除指定字段（适合大部分字段都需要持久化的场景）
export const useSettingsStore = defineStore(
  'settings',
  () => {
    const theme = ref<string>('light');
    const language = ref<string>('zh-CN');
    const fontSize = ref<number>(14);
    const sidebarCollapsed = ref<boolean>(false);
    const tempCache = ref<any>(null); // 临时缓存，不需要持久化
    const isLoading = ref<boolean>(false); // UI 状态，不需要持久化

    return {
      theme,
      language,
      fontSize,
      sidebarCollapsed,
      tempCache,
      isLoading
    };
  },
  {
    persist: {
      omit: ['tempCache', 'isLoading'], // 排除这些字段，其余都持久化
    },
  },
);
```

**使用场景**:
- 当需要持久化的字段较多，不需要持久化的字段较少时使用
- 适合配置类 Store

#### 5.4 配置对比

| 配置方式 | 语法 | 适用场景 | 示例 |
|---------|------|---------|------|
| **全部持久化** | `persist: true` | 所有状态都需要持久化 | 用户偏好设置 Store |
| **pick (选择式)** | `persist: { pick: [...] }` | 少数字段需要持久化 | 列表页 Store（只持久化当前选中项） |
| **omit (排除式)** | `persist: { omit: [...] }` | 多数字段需要持久化 | 设置类 Store（只排除临时状态） |

#### 5.5 最佳实践

```typescript
// ❌ 错误：持久化所有状态（包括列表和临时状态）
export const useOrderStore = defineStore(
  'order',
  () => {
    const orderList = ref<OrderDTO[]>([]);      // 列表数据，不应持久化
    const currentOrder = ref<OrderDTO | null>(null);
    const loading = ref<boolean>(false);        // UI 状态，不应持久化
    const error = ref<Error | null>(null);      // 错误状态，不应持久化

    return { orderList, currentOrder, loading, error };
  },
  {
    persist: true, // ❌ 会持久化列表和临时状态，浪费存储空间
  },
);

// ✅ 正确：只持久化必要的状态
export const useOrderStore = defineStore(
  'order',
  () => {
    const orderList = ref<OrderDTO[]>([]);
    const currentOrder = ref<OrderDTO | null>(null);
    const loading = ref<boolean>(false);
    const error = ref<Error | null>(null);

    return { orderList, currentOrder, loading, error };
  },
  {
    persist: {
      pick: ['currentOrder'], // ✅ 只持久化当前订单详情
    },
  },
);
```

#### 5.6 持久化策略指南

**应该持久化**:
- ✅ 用户基本信息
- ✅ 当前选中/编辑的详情数据
- ✅ 用户配置项（主题、语言、偏好设置）
- ✅ 缓存的关键数据（避免重复请求）

**不应该持久化**:
- ❌ 外部真源的镜像（如登录 token，真源是 Cookie，持久化会还原出过期登录态）
- ❌ 列表数据（容易过期，占用空间）
- ❌ UI 状态（loading、error）
- ❌ 临时计算结果
- ❌ 分页信息（total、currentPage）
- ❌ 查询参数（queryParams）

#### 5.7 注意事项

⚠️ **重要提醒**:
- 只支持 `pick` 和 `omit` 两个参数，不支持 `paths`
- 插件自动处理 `key` 和 `storage`，无需手动配置
- 默认存储在 IndexedDB，无需指定存储类型

## 📂 Store组织结构

### 按业务领域划分
```
src/store/modules/
├── user-info.ts        # 用户信息（useUserInfoStore）
├── permission.ts       # 权限路由与菜单（usePermissionStore）
├── global.ts           # 全局配置状态（语言/主题/侧边栏）
└── site-config.ts      # 站点配置（useSiteConfigStore）
```

### Store导出
```typescript
// store/index.ts（项目真实实现）
import { createPersistedPinia } from './plugins/persist';

export * from './modules/user-info';
export * from './modules/global';
export * from './modules/permission';
export * from './modules/site-config';
export * from './plugins/persist';

// ⚠️ 默认导出是一个 Promise（持久化数据需先从 IndexedDB 预加载），
//    在 app/render.ts 里必须 await 之后再 app.use()，不能直接当 pinia 实例用。
export default createPersistedPinia();
```

## 📋 Store开发快速检查清单

### 状态定义检查
- [ ] 所有状态都有明确的TypeScript类型定义
- [ ] 状态初始值合理
- [ ] 避免深层嵌套的状态结构
- [ ] 相关状态组织在同一Store中

### Actions检查
- [ ] Actions有完整的JSDoc注释
- [ ] 异步Actions有完善的错误处理
- [ ] Actions命名清晰，描述明确
- [ ] 复杂逻辑拆分为多个Actions

### 计算属性检查
- [ ] 使用computed而不是函数
- [ ] 计算属性有明确的返回类型
- [ ] 避免在computed中执行副作用

### 性能优化检查
- [ ] 只持久化必要的状态
- [ ] 避免频繁的状态更新
- [ ] 大型对象使用shallowRef
- [ ] 合理使用computed缓存

## ❓ 常见问题

### Q: 什么时候应该创建新的Store？
**A**: 符合以下条件之一就应该创建新Store：
- 不同业务领域的状态
- 状态间没有强耦合关系
- Store文件超过200行
- 需要独立的持久化配置

### Q: 如何在组件中使用Store？
**A**:
```typescript
import { useUserInfoStore } from '@/store/modules/user-info';

const userStore = useUserInfoStore();

// 访问状态
console.log(userStore.token);        // Cookie 的响应式镜像，路由守卫每次导航调用 refreshToken() 同步
console.log(userStore.info.role);

// 调用 Actions
await userStore.loginAction({ username, password }); // 登录页使用
await userStore.getInfoAction();                     // 拉取用户资料与角色

// 使用 computed
const isLoggedIn = computed(() => userStore.isLoggedIn);
```

### Q: 如何在Store之间共享状态？
**A**:
```typescript
// store1中访问store2
import { useStore2 } from './store2';

export const useStore1 = defineStore('store1', () => {
  const store2 = useStore2();

  const someAction = () => {
    // 访问store2的状态
    console.log(store2.someState);
  };

  return { someAction };
});
```

### Q: 如何处理Store中的异步操作？
**A**:
```typescript
import { getUserInfo } from '@/api';

// ✅ 正确：完善的异步处理
const fetchDetail = async () => {
  loading.value = true;
  error.value = null;

  try {
    detail.value = await getUserInfo();
  } catch (err) {
    // API 错误已由请求层拦截器自动弹提示，这里只维护本地状态，不要重复 ElMessage.error
    error.value = err instanceof Error ? err.message : '获取失败';
    throw err;   // 重新抛出，让调用方能感知失败
  } finally {
    loading.value = false;
  }
};
```

### Q: 如何优化Store性能？
**A**:
```typescript
// 1. 使用shallowRef处理大型对象
const largeData = shallowRef<ILargeData | null>(null);  // 别用 {} 硬凑，类型对不上

// 2. 避免不必要的响应式
const config = markRaw({ /* 配置对象 */ });

// 3. 合理使用computed
const filteredData = computed(() => {
  return data.value.filter(item => item.active);
});

// 4. 按需持久化
export const useStore = defineStore('store', () => {
  // ...
}, {
  persist: {
    pick: ['currentId'], // 只持久化必要字段（登录 token 的真源是 Cookie，不要持久化）
  },
});
```

通过遵循这些Store开发规范，可以构建出清晰、高效、可维护的状态管理系统。
