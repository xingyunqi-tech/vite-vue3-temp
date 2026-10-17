---
name: coding-standards
description: 编码规范和最佳实践，确保代码风格一致性、类型安全和高质量代码
tools: Read, Grep, Glob
model: inherit
---

# 编码规范 Agent

## 职责
负责制定和维护项目编码规范，确保代码风格一致性、类型安全和最佳实践，为 AI 生成高质量代码提供指导。

> **通用模式参考**: 样式规范和组件模式详见 [common-patterns.md](common-patterns.md)，包括:
> - [Vue 组件模式](common-patterns.md#vue-组件模式) - Props/Emits 定义规范
> - [CSS 变量使用规范](common-patterns.md#css-变量使用规范) - 颜色变量使用
> - [样式选择器规范](common-patterns.md#样式选择器规范) - BEM 命名和嵌套控制
> - [错误处理模式](common-patterns.md#错误处理模式) - 异步函数错误处理

---

## 🎯 编码原则

### 1. 类型优先原则
- **严格类型定义**: 所有变量、函数参数和返回值必须有明确的类型定义
- **避免 any 类型**: 除非特殊情况，禁止使用 `any` 类型
- **接口完整性**: 所有数据结构都要有对应的 TypeScript 接口
- **泛型合理使用**: 适当使用泛型提高代码复用性

### 2. 函数式原则
- **纯函数优先**: 工具函数应该是纯函数
- **副作用控制**: 明确标识和控制副作用
- **函数组合**: 通过函数组合构建复杂逻辑
- **错误处理**: 完善的错误处理机制

### 3. 国际化原则
- **默认使用明文文本**: 新增文案默认用中文明文编写，不主动引入 `$t`、`t()`
- **没有自动抽取工具**: 项目不提供文案扫描 / 翻译脚本，语言包全部手工维护
- **确需多语言时**: 在 `src/locale/{zh-CN,en-US}.json`（内置，随构建打包）中手工添加 flat key（层级用 `__` 分隔），
  两种语言同时补齐，再在代码中用 `t()` / `$t` 引用；需要免构建更新的文案写进 `public/locale/*.json`（运行时增量合并）

### 4. 全局插件使用原则（重要）

项目在 `src/plugins/` 目录下已配置全局插件，**禁止在组件或页面中重复配置**。

#### Dayjs 插件（日期处理）

```typescript
// ❌ 错误：在组件中重复配置 dayjs 插件
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isToday from 'dayjs/plugin/isToday';

dayjs.extend(isoWeek);  // 禁止！已在全局配置
dayjs.extend(isToday);  // 禁止！已在全局配置

// ✅ 正确：直接使用已配置的 dayjs
import dayjs from 'dayjs';

// dayjs 已在 src/plugins/dayjs.ts 中全局配置了：
// - RelativeTime 插件
// - utc 插件
// - isoWeek 插件
// - isToday 插件
// - zh-cn 语言包
// - en 语言包

const today = dayjs();
const formatted = dayjs().format('YYYY-MM-DD');
const relative = dayjs().fromNow();  // RelativeTime 插件已配置
const weekStart = dayjs().startOf('isoWeek');  // isoWeek 插件已配置
const isTodayCheck = dayjs().isToday();  // isToday 插件已配置
```

**全局 Dayjs 配置位置**: `src/plugins/dayjs.ts`

#### i18n 插件（国际化）

> 与上方「国际化原则」的边界：新文案默认使用中文明文；只有在语言包 JSON 中补齐了 key 的文案才用 `t()`/`$t()` 引用。下面的 `useI18n()` 用法用于切换语言等需要读写 i18n 实例状态的场景。

```typescript
// ❌ 错误：在组件中重新创建 i18n 实例
import { createI18n } from 'vue-i18n';

const i18n = createI18n({  // 禁止！已有全局实例
  locale: 'zh-CN',
  messages: {...}
});

// ✅ 正确：需要切换语言时，复用全局 i18n 实例，不要重新创建
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
locale.value = 'en'; // 切换语言

// ❌ 错误：引用语言包里不存在的 key（项目没有抽取工具，不会自动补齐）
// const title = t('common__submit');

// ✅ 正确：新文案默认直接写中文明文
const title = '提交';
```

**全局 i18n 配置位置**: `src/plugins/locale.ts`（导出 `i18n` 实例与便捷函数 `t`；语言切换联动 Element Plus、dayjs 与 `html[lang]`）

#### 持久化存储

项目**没有通用 Storage 封装**。请根据场景选择合适方案：

```typescript
// ✅ Pinia Store 持久化：在 Store 中通过 persist 选项启用（基于 localforage + IndexedDB）
// 详见 src/store/plugins/persist.ts
export const useUserStore = defineStore('user', () => { /* ... */ }, {
  persist: true,
});

// ✅ 一次性的非响应式 UI 偏好：直接使用原生 localStorage / sessionStorage
localStorage.setItem('table-density', 'compact');
const density = localStorage.getItem('table-density');

// 🚫 token 不落 localStorage：读写一律用 @/utils/auth 的 getToken() / setToken() / removeToken()（Cookie）
```

#### 全局插件使用检查清单

- [ ] 使用 dayjs 时不重复配置插件（RelativeTime、utc、isoWeek、isToday 已全局配置）
- [ ] 使用 i18n 时通过 `useI18n()` 获取实例，不重新创建
- [ ] Pinia 状态需要持久化时，优先使用 Store 的 `persist` 选项
- [ ] 查看 `src/plugins/` 目录了解已有的全局配置
- [ ] 新增全局插件时，添加到 `src/plugins/` 目录并导出

---

## 📝 TypeScript 编码规范

### 接口定义规范
```typescript
// ✅ 正确：完整的接口定义
interface IUserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatar?: string;  // 可选属性明确标识
}

// ❌ 错误：使用 any 类型
interface IBadUserInfo {
  data: any;  // 应该定义具体类型
}
```

### 函数类型定义规范
```typescript
// ✅ 正确：完整的函数类型定义
const getUserInfo = async (userId: string): Promise<IUserInfo> => {
  return (await UserApi.getInfo(userId)).data;
};

// ✅ 泛型函数
const apiRequest = async <T>(url: string): Promise<ApiResponse<T>> => {
  return (await instance.get(url)).data;
};
```

### 枚举和常量定义
```typescript
// ✅ 使用 const 断言
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// ✅ 使用枚举
export enum ApiErrorCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
}
```

### 类型守卫
```typescript
// ✅ 类型守卫（优于类型断言）
function isUserInfo(obj: unknown): obj is IUserInfo {
  return obj !== null &&
         typeof obj === 'object' &&
         'id' in obj &&
         'username' in obj;
}

// ❌ 错误：过度使用类型断言
const userInfo = response.data as IUserInfo;
```

---

## 🎨 Vue 组件编码规范

> **完整规范**: 详见 [common-patterns.md#vue-组件模式](common-patterns.md#vue-组件模式)

### 代码组织顺序
```vue
<script setup lang="ts">
// 1. 导入语句
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getAuthUserInfo } from '@/api';
import type { UserInfo } from '@/api';

// 2. 接口定义
interface Props { userId: string; }
interface Emits { (e: 'update', user: UserInfo): void; }

// 3. Props 和 Emits
const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 4. 响应式数据
const userInfo = ref<UserInfo | null>(null);
const loading = ref(false);

// 5. 计算属性
const displayName = computed((): string => userInfo.value?.username ?? '');

// 6. 方法定义
const fetchUserInfo = async (): Promise<void> => { /* ... */ };

// 7. 生命周期和监听器
onMounted(() => fetchUserInfo());
watch(() => props.userId, () => fetchUserInfo());

// 8. 暴露方法
defineExpose({ fetchUserInfo });
</script>
```

---

## 📁 文件命名规范（ESLint 强制）

`eslint.config.mjs` 用 `check-file` 插件强制文件名，违反会直接 lint error：

| 匹配 | 规则 | 示例 |
|------|------|------|
| `**/*.vue` | **PascalCase** | `Frontend.vue`、`UserCard/index.vue` |
| `src/**/use[A-Z]*.{ts,js}` | **camelCase** | `useSkeleton.ts`、`usePermission.ts` |
| 其余 `src/**/*.{ts,tsx,js,jsx}` | **kebab-case** | `user-info.ts`、`error-handler.ts` |
| `src/**/*.d.ts` | 不校验 | — |

⚠️ 新建 Store / 工具 / 常量文件用 **kebab-case**（`user-info.ts`，不是 `userInfo.ts`）。

### 导入方向限制（同样是 ESLint 硬规则）

| 禁止 | 原因 |
|------|------|
| 从 `@/api/generated/**` 导入 | 绕过 `modules/` 的覆盖逻辑，统一走 `@/api` |
| `views/` 子目录间用 `@/views/**` 互相引用 | 页面应彼此隔离；同目录内用相对路径 `./components/Foo.vue` |

---

## 📊 常量定义规范

```typescript
// src/constants/system.ts

// ✅ 正确：大写字母和下划线
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const DEFAULT_LOCALE = 'zh-CN';

// ✅ 对象常量使用 as const
export const PROXY_URI = {
  LOCAL: '/localService',
} as const;

// ❌ 错误：使用小写命名
export const maxFileSize = 10 * 1024 * 1024;
```

---

## 📥 导入规范

### 导入顺序

按以下顺序组织导入语句，每组之间空一行：

```typescript
// 1. Vue 核心
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// 2. 第三方库
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';

// 3. 项目 API（从 @/api 统一导入）
import { postAuthLogin, getAuthUserInfo } from '@/api';

// 4. 项目 Store
import { useUserInfoStore } from '@/store/modules/user-info';

// 5. 项目工具函数
import { formatDate, formatFileSize } from '@/utils';  // @/utils 只 re-export auth / datetime / error-handler

// 6. 项目组件
import ErrorBoundary from '@/components/ErrorBoundary/index.vue';
import UserCard from './components/UserCard/index.vue';

// 7. 类型导入（单独分组，使用 type 关键字）
import type { LoginRequest } from '@/api';
import type { UserInfo } from '@/store/modules/user-info';
// ⚠️ 同名类型不要从两处各导一次，会 TS2300 Duplicate identifier；
//    确需并存时用 as 重命名：import type { UserInfo as ApiUserInfo } from '@/api';
```

### 类型导入规范

```typescript
// ✅ 正确：类型导入使用 type 关键字
import type { UserInfo, LoginRequest } from '@/api';
import type { RouteLocationNormalized } from 'vue-router';

// ✅ 正确：混合导入时分开写
import { postAuthLogin } from '@/api';
import type { LoginRequest } from '@/api';

// ❌ 错误：类型和值混合导入
import { postAuthLogin, UserInfo } from '@/api';
```

### 路径别名规范

```typescript
// ✅ 正确：使用 @/ 别名
import { useUserInfoStore } from '@/store/modules/user-info';
import BaseButton from '@/components/BaseButton/index.vue';

// ❌ 错误：使用相对路径跨层级
import { useUserInfoStore } from '../../../store/modules/user';

// ✅ 正确：同目录使用相对路径
import UserCard from './components/UserCard/index.vue';
```

---

## 🌐 API 开发规范

> **完整规范**: 详见 [api-development.md](api-development.md)

### 核心原则
1. 🚫 **绝不修改** `src/api/generated/` 目录
2. ✅ **从 `@/api` 统一导入**（不直接从 `generated/` 导入）
3. ✅ **在 `src/api/modules/` 扩展**（需要时）
4. ✅ **优先使用 Pinia Store**（智能缓存）

### API 导入规范
```typescript
// ✅ 正确：从 @/api 统一导入
import { postAuthLogin, getAuthUserInfo } from '@/api';
import type { LoginRequest, UserInfo } from '@/api';

// ❌ 错误：直接从 generated 导入
import { postAuthLogin } from '@/api/generated/auth/auth';
```

---

## 🛠️ 工具函数规范

### 日期工具函数

项目已在 `src/utils/datetime.ts` 中提供常用日期处理函数：

```typescript
// 使用示例
import { formatDateShort, formatDateTime, formatRelativeTime, formatDateRange } from '@/utils/datetime';

// 格式化为 YYYY-MM-DD
formatDateShort('2023-12-25T15:30:45'); // '2023-12-25'

// 格式化为 YYYY-MM-DD HH:mm
formatDateTime('2023-12-25T15:30:45'); // '2023-12-25 15:30'

// 相对时间
formatRelativeTime('2023-12-25T15:30:45'); // '2小时前'

// 日期范围
formatDateRange('2023-12-25', '2023-12-30'); // '2023-12-25 ~ 2023-12-30'
```

### 验证工具函数

⚠️ 项目**目前没有** `src/utils/validation.ts`（`src/utils/` 下实际只有 `auth.ts`、`datetime.ts`、`error-handler.ts`、`index.ts`），不要凭空 import 它。如果任务确实需要邮箱/手机号/密码强度等校验，请先按下面的模板在 `src/utils/validation.ts` 新建该文件，再 import：

```typescript
// utils/validation.ts（需要时新建，当前不存在）
/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 获取密码强度
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';
  const score = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*]/].filter(r => r.test(password)).length;
  return score >= 3 ? 'strong' : score >= 2 ? 'medium' : 'weak';
}

/**
 * 验证身份证号
 */
export function isValidIdCard(idCard: string): boolean {
  return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard);
}
```

## 🌐 HTTP 实例使用规范

```typescript
// ✅ 普通请求：使用 Orval 生成或 modules/ 目录下的封装函数
import { getAuthUserInfo } from '@/api';

// ✅ 特殊场景：直接使用 axios 实例（返回完整 response，业务数据在 res.data.data）
import { httpApi, downloadApi } from '@/api/core/request';

// 文件上传
await httpApi.post('/upload', formData, { timeout: 60000 });

// 文件下载
await downloadApi.get('/files/report.pdf', { responseType: 'blob' });
```

## 🔍 错误处理规范

详见 [错误处理模式](common-patterns.md#错误处理模式)：API 请求错误由 `src/api/core/request.ts` 的响应拦截器自动弹出提示并处理 401 跳转（请求配置 `isIgnoreToast: true` 时静默），组件内通常无需重复调用 `ElMessage.error`；非请求类错误（未捕获异常、需要静默处理的场景）使用 `src/utils/error-handler.ts` 提供的 `handleError` / `handleErrorSilently`。

---

## 📋 代码注释规范

### JSDoc 注释
```typescript
/**
 * 用户管理服务类
 */
export class UserService {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns Promise<用户列表响应>
   */
  async getUserList(params: IUserListParams): Promise<IPaginationResponse<IUserInfo>> {
    // ...
  }
}
```

### 行内注释
```typescript
// ✅ 正确：解释复杂逻辑
const processUserData = (users: IUserInfo[]) => {
  // 过滤活跃用户并按创建时间排序
  return users.filter(u => u.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
};

// ❌ 错误：显而易见的注释
const count = users.length; // 获取用户数量
```

---

## 🎨 样式编码规范

> **完整规范**: 详见 [common-patterns.md](common-patterns.md)

### 快速参考

| 规范 | 要求 | 链接 |
|------|------|------|
| **CSS 变量** | 必须使用 `var(--aix-colorXxx)` | [CSS 变量使用规范](common-patterns.md#css-变量使用规范) |
| **选择器** | 禁止标签选择器，使用 BEM | [样式选择器规范](common-patterns.md#样式选择器规范) |
| **RGB 语法** | 使用 `rgb(r g b / alpha)` | [RGB 颜色函数规范](common-patterns.md#rgb-颜色函数规范) |
| **数值规范** | 不补零凑精度；Figma 亚像素值取整 | [CSS 数值规范](common-patterns.md#css-数值规范) |
| **嵌套层级** | 不超过 3 层（团队约定；stylelint 实配 `max-nesting-depth: 10`，不报错） | [样式选择器规范](common-patterns.md#样式选择器规范) |

### :deep() 选择器规范

`:deep()` 内部禁止使用 BEM 后缀（`&--modifier`、`&__element`），会导致编译错误。

```scss
// ❌ 错误：编译为 :deep(.el-button)--primary (无效)
:deep(.el-button) {
  &--primary { ... }
}

// ✅ 正确：BEM 变体单独写
:deep(.el-button) { ... }
:deep(.el-button--primary) { ... }
:deep(.el-button__icon) { ... }

// ✅ 允许：伪类、状态类、子选择器
:deep(.el-button) {
  &:hover { ... }      // ✅ 伪类
  &.is-active { ... }  // ✅ 状态类
  .icon { ... }        // ✅ 子选择器
}
```

### SCSS 组织规范

```scss
// ❌ 不要定义颜色变量，使用 public/assets/theme.css 中的CSS变量
// $primary-color: #409eff;  // 禁止！

// ✅ 可以定义非颜色的变量和混入
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;

@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin card-style {
  padding: $spacing-lg;
  border: 1px solid var(--aix-colorBorder);
  border-radius: 8px;
  background: var(--aix-colorBgContainer);
}

// ✅ 正确：组件样式使用BEM命名
.user-management {
  &__header {
    @include flex-center;
    justify-content: space-between;
  }

  &__content {
    @include card-style;
  }
}
```

---

## 📋 编码规范快速检查清单

### TypeScript 类型安全检查
- [ ] 所有变量都有明确的类型定义，避免使用 `any`
- [ ] 接口定义完整，包含所有必要字段和注释
- [ ] 函数参数和返回值类型明确
- [ ] 使用类型守卫而不是类型断言
- [ ] 泛型使用合理，提高代码复用性
- [ ] 导入类型时使用 `type` 关键字

### Vue 组件规范检查
- [ ] Props 和 Emits 有完整的类型定义
- [ ] 响应式数据类型明确，避免类型推断错误
- [ ] 计算属性有返回类型注解
- [ ] 异步函数有完善的错误处理
- [ ] 生命周期钩子使用合理
- [ ] `v-for` 列表渲染都带了 `:key`（是 `:key`，不是 `v-key`）
- [ ] 列表内容使用数据驱动而非硬编码

### API 接口规范检查
- [ ] **绝不修改** `generated/` 目录
- [ ] 从 `@/api` 统一导入
- [ ] 使用生成的类型，不重复定义
- [ ] 优先使用 Pinia Store
- [ ] 需要扩展时在 `modules/` 目录编写
- [ ] 跑 `pnpm orval` 刷新导出（`src/api/index.ts` 是生成物，不要手写）

### 样式编码检查（强化）
- [ ] 使用 `public/assets/theme.css` 中定义的 CSS 变量
- [ ] 所有颜色值使用 `var(--aix-colorXxx)` 而非硬编码（Figma 设计稿还原除外：优先使用 Figma 标注值）
- [ ] CSS 数值未补零凑精度；Figma 导出的亚像素值（如 14.375px）已取整
- [ ] 不直接使用标签名选择器（如 `h1`, `p`, `div`）
- [ ] 每个元素都有语义化的 class 名称
- [ ] 样式类名遵循 BEM 命名规范
- [ ] 避免深层嵌套选择器（不超过 3 层）

### 图片资源管理检查
- [ ] 图片按页面/功能分类存放在 `src/assets/images/` 目录
- [ ] 图标存放在 `src/assets/icons/` 目录
- [ ] 下载前检查本地是否已存在
- [ ] 使用导入方式加载图片而非硬编码路径
- [ ] 图片文件命名语义化

### 全局插件检查
- [ ] 使用 dayjs 时不重复配置插件（RelativeTime、utc、isoWeek、isToday 已全局配置）
- [ ] 使用 i18n 时通过 `useI18n()` 获取实例，不重新创建
- [ ] Pinia 状态需要持久化时，使用 Store 的 `persist` 选项

---

## 🛠️ 代码质量工具

```bash
# 全量检查（= lint:script + lint:style + lint:md，均自带 --fix）
pnpm lint

# 单项
pnpm lint:script    # ESLint
pnpm lint:md        # markdownlint

# TypeScript 类型检查
pnpm type-check

# Stylelint 样式检查（pnpm lint 已包含 script + style + md 三项）
pnpm lint:style
```

---

通过遵循这些编码规范，可以确保代码的一致性、可读性和可维护性，为 AI 编程提供清晰的指导标准。
