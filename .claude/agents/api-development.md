---
name: api-development
description: API接口开发指导，基于Orval自动生成，聚焦API模块使用、自定义扩展和最佳实践
tools: Read, Grep, Glob, WebFetch, WebSearch
model: inherit
---

# API开发规范 (基于Orval自动生成)

## 职责
专门负责API接口开发指导，基于Orval自动生成机制，指导如何正确使用自动生成的API、进行自定义扩展和遵循最佳实践。

## ⚠️ 重要警告

**绝对不要修改 src/api/generated/ 目录下的任何文件！**

这些文件由 Orval 从 OpenAPI 文档自动生成，任何手动修改都会在下次运行 `pnpm orval` 时被覆盖。

✅ **正确做法**: 在 `src/api/modules/` 目录创建文件进行覆盖或扩展
❌ **错误做法**: 直接修改 `src/api/generated/` 目录下的文件

## 🎯 核心架构理解

### 四层架构设计

项目API模块采用四层架构，实现了**自动生成 + 灵活扩展**的完美结合：

```
src/api/
├── core/                      # 1️⃣ 核心基础设施层
│   ├── request.ts            # httpApi / downloadApi 实例 + get/post/put/del 便捷函数
│   ├── mutator.ts            # Orval适配器（请求去重、实例切换）
│   ├── types.ts              # ApiResponse / CustomAxiosRequestConfig / RequestOptions 等
│   └── index.ts              # 对外导出
│
├── generated/                 # 2️⃣ 代码生成层（Orval自动生成，首次 pnpm orval 后出现）
│   ├── auth/                 # 认证模块API
│   ├── config/               # 配置模块API
│   └── model/                # 类型定义（分文件存储）
│       ├── index.ts          # 统一导出
│       ├── loginRequest.ts   # 单个类型文件
│       └── ...
│
├── modules/                   # 3️⃣ 自定义扩展层（手动编写）
│   ├── auth.ts               # 真实示例：登录 / 登出 / 当前用户接口
│   └── override.ts           # 示例：覆盖生成的 API
│
└── index.ts                  # API模块统一导出（由 orval hook 自动生成，勿手写）
```

### 层级职责说明

| 层级 | 职责 | 是否手动修改 |
|------|------|-------------|
| **core/** | 提供HTTP客户端、拦截器、实例管理等基础能力 | ❌ 通常不需要 |
| **generated/** | 自动生成API函数和类型定义 | ❌ 禁止修改 |
| **modules/** | 覆盖或扩展生成的API，添加业务逻辑 | ✅ 这里编写代码 |

## 📋 OpenAPI驱动的工作流

### 标准开发流程

```
1. 后端更新API
   ↓
2. 拿到最新 OpenAPI 文档（本地 json 文件或线上 swagger 地址）
   ↓
3. 配置 orval.config.ts 的 input.target 指向它
   （⚠️ 模板里该字段为空字符串，不配置 pnpm orval 会直接失败。
     注意：本项目没有「把文档固定放在 api 目录下」的约定，路径完全由该字段决定）
   ↓
4. 运行 pnpm orval （自动生成代码 + 自动更新 src/api/index.ts 导出）
   ↓
5. 必要时在 modules/ 添加业务逻辑
   ↓
6. pnpm type-check （类型检查）
   ↓
7. pnpm test （测试验证）
```

### 常用命令

```bash
# 生成API代码（从openapi.json）
pnpm orval

# 类型检查
pnpm type-check

# 构建（= clean + vite build，【不】包含 orval 生成）
pnpm build
```

## 🎨 三种使用场景（重要！）

AI开发时必须根据场景选择正确的方式：

### 场景1: 直接使用自动生成（80%情况）

大部分接口直接使用Orval生成的代码即可。

> 本节及下文的 `postAuthLogin`、`getAuthUserInfo`、`LoginRequest` 等名称只是演示 Orval 生成物的形状，
> 实际函数名由 OpenAPI 文档决定。项目当前手写的登录接口是 `src/api/modules/auth.ts` 的 `login / logout / getUserInfo`。

```typescript
// ✅ 正确：直接从 @/api 导入
import { postAuthLogin, getAuthUserInfo, postAuthLogout } from '@/api';
import type { LoginRequest, UserInfo } from '@/api';

// 使用
const handleLogin = async () => {
  const loginData: LoginRequest = {
    username: 'admin',
    password: '123456',
  };

  const response = await postAuthLogin(loginData);
  console.log('Token:', response.token); // 类型自动推导
};

const getUserInfo = async () => {
  const userInfo = await getAuthUserInfo();
  console.log('User:', userInfo); // UserInfo 类型
};
```

**何时使用**:
- 接口已在OpenAPI文档中定义
- 不需要额外的业务逻辑
- 直接调用即可满足需求

---

### 场景2: 覆盖自动生成（15%情况）

需要在自动生成的基础上添加额外业务逻辑。

**示例：登录接口追加业务逻辑**

```typescript
import { postAuthLogin as generatedLogin } from '../generated/auth/auth';
import type { LoginRequest, LoginResponse } from '../generated/model';

/**
 * 登录接口（覆盖版本）
 */
export const postAuthLogin = async (data: LoginRequest): Promise<LoginResponse> => {
  // 1. 调用原始生成的函数
  const response = await generatedLogin(data);

  // 2. 额外业务逻辑
  //    token 统一由 useUserInfoStore().loginAction 经 setToken() 写入 Cookie，这里不要自行保存
  if (response.data) {
    // 数据加工、缓存写入等
  }

  // 3. 记录登录日志（可选）
  console.log(`[Auth] User ${data.username} logged in at ${new Date().toISOString()}`);

  return response;
};

// ✅ 其他接口直接导出（不需要覆盖）
export { postAuthLogout, getAuthUserInfo } from '../generated/auth/auth';
```

**导出配置**：`src/api/index.ts` **不需要手写**。

`orval.config.ts` 的 `afterAllFilesWrite` hook 会调用 `scripts/api/update-api-exports.ts`
自动重写它：与 `modules/` 同名的函数会从 generated 的显式导出清单中剔除，`modules/` 再整体 `export *`，因此对外生效的是覆盖版本。
手动改这个文件会在下次 `pnpm orval` 时丢失。

**何时使用**:
- 需要在API调用前后添加业务逻辑
- 需要数据转换或增强
- 需要自动保存数据、记录日志等

**关键原则**:
- ✅ 保持函数名不变（如 `postAuthLogin`）
- ✅ 调用原始生成的函数
- ✅ 添加业务逻辑
- ✅ 保持类型一致

---

### 场景3: 完全自定义（5%情况）

OpenAPI文档中不存在的接口，或需要特殊处理的功能。

**示例：调用外部 API**

```typescript
// ✅ 正确：在 modules/ 目录中自定义（如 external.ts）
import { httpApi, post } from '../core/request';
import type { ApiResponse } from '../core/types';

/**
 * 文件上传（带进度）
 *
 * ⚠️ 实例方法返回完整 AxiosResponse，业务数据在 res.data.data，需自行解两层
 */
export const uploadWithProgress = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await httpApi.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60秒（文件上传需要更长时间）
    onUploadProgress: (event) => {
      if (event.total) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress?.(progress);
      }
    },
  });

  return (res.data as ApiResponse<{ url: string }>).data as { url: string };
};

/**
 * 文件下载（带进度）
 */
export const downloadFile = async (
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const { downloadApi } = await import('../core/request');

  const response = await downloadApi.get(url, {
    responseType: 'blob',
    onDownloadProgress: (event) => {
      if (event.total) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress?.(progress);
      }
    },
  });

  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * 批量删除
 */
// 不需要底层配置的接口，直接用便捷函数——它已经帮你解好两层包络
export const batchDelete = async (ids: string[]): Promise<void> => {
  return post<void>('/batch/delete', { ids });
};
```

**何时使用**:
- OpenAPI文档中不存在的接口
- 文件上传/下载（需要进度回调）
- 批量操作
- 外部API调用

---

## 🔌 HTTP 实例使用

### 多实例管理

`src/api/core/request.ts` 基于 axios 创建两个实例，并通过 `instances` 注册表供 mutator 按名称（`default` / `download`）选用：

| 实例 | 来源 | 配置特点 |
|------|------|----------|
| **httpApi** | `@/api/core/request` | 默认 API 实例，JSON 请求；成功时返回完整 axios response，`res.data` 为 `{ code, data, message }` |
| **downloadApi** | `@/api/core/request` | 下载专用实例，`responseType: 'blob'`；正常 Blob 原样返回，后端以 JSON 返回业务错误时按业务码 reject |

两个实例共用同一套拦截器（请求去重由 Orval mutator 内的 `RequestDeduplicator` 负责，不在实例层配置）：

- **请求头**：`Authorization` 直接放 `getToken()` 的值（不加 `Bearer` 前缀），`Accept-Language` 取当前界面语言
- **业务码**：`code` 等于 `API_CODE.SUCCESS`（200）视为成功，否则弹出后端 `message` 并 reject
- **401**：业务码 401 与 HTTP 401 都会调用 `redirectToLoginOnce()`——先清 token，再整页跳登录页（并发只跳一次）；
  请求配置带 `skipAuthRedirect: true` 时不跳（登录接口本身使用）
- **静默**：请求配置带 `isIgnoreToast: true` 时失败不弹提示（轮询、登出接口等）
- **取消**：被取消的请求直接 reject，不弹提示

### 使用示例

#### ⭐ 首选：`get / post / put / del` 便捷函数

绕过 Orval 手写接口时**一律用这四个函数**（`src/api/core/request.ts` 导出）。它们已经
帮你剥掉 `{ code, data, message }` 包络，返回值就是业务数据，与 Orval mutator 的语义一致：

```typescript
import { get, post } from '@/api/core/request';

// 显式传入泛型 T —— 这些函数不经过 Orval 类型生成，不传就是 unknown
export const getUserDetail = (id: string) => get<UserDetail>(`/console/v1/user/${id}`);
export const createUser = (data: CreateUserReq) => post<UserDetail>('/console/v1/user', data);
```

真实范例见 `src/api/modules/auth.ts`：

```typescript
export const login = (params: LoginParams) => post<LoginResult>('/api/auth/login', params, { skipAuthRedirect: true });
export const logout = () => post<void>('/api/auth/logout', undefined, { isIgnoreToast: true });
export const getUserInfo = () => get<CurrentUser>('/api/auth/current-user');
```

接口路径与字段是约定形态，接入真实后端时按接口文档调整。

#### 直接用实例（少数场景）

只有需要 `onUploadProgress`、`responseType: 'blob'`、覆盖 `baseURL` 这类底层配置时才直接用实例：

```typescript
import { httpApi, downloadApi } from '@/api/core/request';

// ⚠️ 实例方法返回的是完整 AxiosResponse，业务数据在 res.data.data（两层）
const res = await httpApi.get('/users/123');
const userInfo = res.data.data;          // ← 不是 res.data，更不是 res

// 文件下载：downloadApi 配了 responseType: 'blob'，res.data 直接就是 Blob
const res2 = await downloadApi.get('/files/report.pdf');
const blob = res2.data;

// 外部 API 调用（覆盖 baseURL）
const weather = await httpApi.get('/weather/beijing', { baseURL: 'https://api.weather.com' });
```

> 忘记解两层是最常见的错误——拿到的是 `{ code, data, message }` 而不是数据本身。
> 除非确实需要底层配置，否则用上面的便捷函数。

## 🎨 Pinia Store 状态管理（推荐）

### 优先使用 Store 管理状态

```vue
<script setup lang="ts">
import { useUserInfoStore } from '@/store/modules/user-info';
import { computed } from 'vue';

const userStore = useUserInfoStore();

// 获取响应式状态（真实导出：info / token / isLoggedIn / isAdmin / isTeacher / isStudent）
const userInfo = computed(() => userStore.info);
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 重新拉取当前用户资料与角色（GET /api/auth/current-user）
const handleInit = async () => {
  try {
    await userStore.getInfoAction();
    console.log('用户信息已加载', userStore.info);
  } catch (error) {
    console.error('用户信息加载失败', error);
  }
};

const handleLogout = async () => {
  try {
    await userStore.logoutAction();
    console.log('登出成功');
  } catch (error) {
    console.error('登出失败', error);
  }
};
</script>

<template>
  <div v-if="!isLoggedIn">未登录</div>
  <div v-else>
    <p>用户名: {{ userInfo?.username }}</p>
    <button @click="handleInit">刷新用户信息</button>
    <button @click="handleLogout">登出</button>
  </div>
</template>
```

### Store 设计模式

```typescript
// ⚠️ 下面是【通用模板】，演示 loading 管理与 action 写法。
// 本项目的用户 Store 是 src/store/modules/user-info.ts（useUserInfoStore），
// 登录 / 登出 / 拉取用户信息已由它的 loginAction / logoutAction / getInfoAction 实现，
// 认证相关请复用现有 Store，不要照着这段新建 user.ts。
// src/store/modules/<your-module>.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useExampleStore = defineStore('example', () => {
  const userInfo = ref<UserInfo | null>(null);
  const loading = ref(false);

  const login = async (data: LoginRequest) => {
    loading.value = true;
    try {
      const response = await postAuthLogin(data);
      // 处理登录逻辑
      return response;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    loading.value = true;
    try {
      await postAuthLogout();
      userInfo.value = null;
    } finally {
      loading.value = false;
    }
  };

  const fetchUserInfo = async () => {
    loading.value = true;
    try {
      userInfo.value = await getAuthUserInfo();
    } finally {
      loading.value = false;
    }
  };

  return { userInfo, loading, login, logout, fetchUserInfo };
});
```

## 📖 类型定义最佳实践

### 类型导入规范

```typescript
// ✅ 正确：从 @/api 统一导入
import type { LoginRequest, UserInfo, ConfigValue } from '@/api';

// ❌ 错误：从 generated 直接导入
import type { LoginRequest } from '@/api/generated/model';
import type { LoginRequest } from '@/api/generated/model/loginRequest';
```

### 类型复用

```typescript
// ✅ 正确：使用生成的类型
import type { LoginRequest, UserInfo } from '@/api';

const loginData: LoginRequest = {
  username: 'admin',
  password: '123456',
};

// ❌ 错误：重复定义类型
interface MyLoginRequest {  // 不要这样做！
  username: string;
  password: string;
}
```

### 类型分文件存储

项目将类型定义拆分为独立文件，避免单文件过大：

```
generated/model/
├── index.ts              # 统一导出
├── loginRequest.ts       # 单个类型
├── loginResponse.ts
├── userInfo.ts
└── ...
```

**优势**:
- ✅ 避免单文件过大
- ✅ 类型更易查找
- ✅ Git diff 更清晰
- ✅ 减少合并冲突

## 🛡️ 高级特性

### 1. 统一错误处理

API 请求错误由 `src/api/core/request.ts` 的响应拦截器集中处理（弹提示、401 跳登录）；非请求类错误（未捕获异常、需要静默处理的场景）使用 `src/utils/error-handler.ts` 提供的 `handleError` / `handleErrorSilently`：

```typescript
import { postAuthLogin } from '@/api';

try {
  const response = await postAuthLogin({ username, password });
  // 成功处理
} catch (error) {
  // ✅ 错误已被拦截器自动处理（显示提示、跳转等）
  // 这里只需处理组件特定逻辑
  console.error('Login failed:', error);
}
```

**自动处理的错误类型**:
- 🔴 网络错误：无法连接服务器
- 🟡 请求错误：超时、取消
- 🟠 认证错误：401 清 token 后整页跳转登录页（`skipAuthRedirect: true` 时不跳）
- 🟣 权限错误：403无权限
- 🔵 业务错误：400参数错误
- ⚫ 服务器错误：500+

### 2. 请求去重（仅 GET/HEAD 默认启用）

⚠️ **写方法默认不去重**。`src/api/core/mutator.ts` 的判定逻辑：

```typescript
const isIdempotent = ['get', 'head'].includes(method.toLowerCase());
const shouldDedup = !disableDedup && (enableDedup || isIdempotent);
```

设计意图（见 mutator.ts 注释）：两次内容相同的 POST 往往是用户有意为之（连点、批量循环），
合并掉第二次会**静默丢请求**，比重复提交更难排查。

```typescript
// ✅ GET/HEAD：默认去重，按实例名 + method + url + params + data + responseType + headers 复用在途 Promise
await getUserList({ page: 1 });   // 并发的相同请求会复用

// ⚠️ POST/PUT/DELETE：默认【不】去重，两次点击 = 两次请求
await postUserCreate({ username: 'test' });

// ✅ 写方法确实需要去重时，显式开启
await customMutator({ method: 'post', url: '/idempotent-op', data, enableDedup: true });

// ✅ 读方法需要关闭去重时
await customMutator({ method: 'get', url: '/logs', params, disableDedup: true });
```

> 🚨 **防重复提交不要依赖去重机制**——请在 UI 层做（按钮 `disabled` / `loading` 状态）。

### 3. 单次请求参数（取消、静默、指定实例）

Orval 生成的每个函数最后都有一个可选参数 `options`（类型 `RequestOptions`），原样合并进本次请求：

```typescript
const controller = new AbortController();
await getUserList({ page: 1 }, { signal: controller.signal }); // 可取消
controller.abort();

await getTaskStatus({ id }, { isIgnoreToast: true }); // 轮询失败不弹提示
await getUserList({ page: 1 }, { headers: { 'X-Trace': traceId } }); // 追加请求头，与生成代码自带的头逐项合并
```

> 带 `signal` 的请求不参与去重：共享的在途请求被一方取消，另一方会一起失败。
> 返回值是否提取业务数据按响应类型判断：`blob` / `arraybuffer` 原样返回，与实例名无关。

## 📋 AI开发快速检查清单

### 开始开发前

- [ ] 是否需要新接口？→ 确保OpenAPI文档已包含
- [ ] OpenAPI文档是否最新？→ 运行 `pnpm orval`

### 编写代码时

- [ ] 从 `@/api` 统一导入，不从 `generated/` 直接导入
- [ ] 优先使用 Pinia Store 管理状态
- [ ] 简单场景可直接调用生成的API函数
- [ ] 需要业务逻辑时，在 `modules/` 覆盖
- [ ] 完全自定义功能时，在 `modules/` 目录创建新文件编写

### 自定义扩展时

- [ ] **绝不修改** `generated/` 目录
- [ ] 在 `modules/` 创建文件
- [ ] 覆盖时保持函数名不变
- [ ] 调用原始生成的函数
- [ ] 跑 `pnpm orval` 刷新导出（`src/api/index.ts` 是生成物，不要手写）

### 类型定义时

- [ ] 使用生成的类型，不重复定义
- [ ] 从 `@/api` 导入类型
- [ ] 避免使用 `any` 类型

### 提交前

- [ ] 运行 `pnpm type-check` 检查类型
- [ ] 运行 `pnpm lint` 检查代码规范
- [ ] 运行 `pnpm test` 验证测试通过
- [ ] 确认没有修改 `generated/` 目录

## 🌳 开发决策树

```
需要使用API？
│
├─ 接口是否在OpenAPI中？
│  ├─ 否 → 场景3: 在 modules/ 目录完全自定义
│  └─ 是 → 是否需要额外业务逻辑？
│      ├─ 否 → 场景1: 直接使用生成的API
│      └─ 是 → 场景2: 在 modules/ 覆盖扩展
│
└─ 状态管理方式？
   ├─ 需要状态管理 → 使用 Pinia Store
   └─ 简单场景 → 直接调用API函数
```

## ❓ 常见问题 FAQ

### Q: 如何添加一个新接口？

**A**:
1. 在后端OpenAPI文档中定义接口
2. 确认 `orval.config.ts` 的 `input.target` 指向最新文档
3. 运行 `pnpm orval`
4. 接口会自动生成在 `generated/` 目录，`src/api/index.ts` 的导出由
   `scripts/api/update-api-exports.ts`（orval 的 afterAllFilesWrite hook）自动更新
5. 从 `@/api` 导入使用

---

### Q: 生成的接口不满足需求怎么办？

**A**: 在 `modules/` 目录创建同名函数覆盖：

```typescript
import { postAuthLogin as generatedLogin } from '../generated/auth/auth';

export const postAuthLogin = async (data) => {
  const response = await generatedLogin(data);
  // 添加业务逻辑
  return response;
};
```

---

### Q: 如何处理文件上传？

**A**: 在 `modules/` 目录中创建自定义函数，如 `upload.ts`：

```typescript
// src/api/modules/upload.ts
import { httpApi } from '../core/request';
import type { ApiResponse } from '../core/types';

export interface UploadResult {
  url: string;
}

export const uploadWithProgress = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await httpApi.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  // 解两层：res.data 是 { code, data, message } 包络
  return (res.data as ApiResponse<UploadResult>).data as UploadResult;
};

// 使用
import { uploadWithProgress } from '@/api';
const result = await uploadWithProgress(file, (progress) => {
  console.log(`上传进度: ${progress}%`);
});
console.log('文件 URL:', result.url);
```

---

### Q: 为什么要分四层架构？

**A**:
- **core/**: 提供基础能力（实例、mutator、便捷函数、类型）
- **generated/**: 自动生成，减少80%样板代码
- **modules/**: 灵活扩展，满足业务需求
- **index.ts**: 统一出口，屏蔽内部结构（由 orval hook 自动生成，勿手写）

---

### Q: OpenAPI文档怎么获取？

**A**:
1. 后端提供 `openapi.json` 文件，或访问后端 Swagger 文档导出
2. 放到仓库任意位置（如根目录 `./openapi.json`），或直接用线上 swagger JSON 地址
3. 把该路径/地址填进 `orval.config.ts` 的 `input.target`

---

### Q: 什么时候需要修改 core/ 目录？

**A**: 通常不需要，以下情况除外：
- 修改全局拦截器逻辑
- 添加新的HTTP实例
- 调整请求头、业务码判定或 401 处理

---

### Q: generated/ 目录可以提交到Git吗？

**A**:
- **推荐做法**: 提交到Git（团队成员直接使用）
- **备选方案**: 添加到 `.gitignore`（团队成员自行生成）

建议提交，避免团队成员忘记运行 `pnpm orval`。

---

### Q: 如何调试API请求？

**A**:
1. 浏览器DevTools → Network面板
2. 查看控制台日志（拦截器会打印）

## 🎯 总结

通过Orval自动化方案，可以：

1. ✅ **无需手写样板代码** - 自动生成，节省时间
2. ✅ **类型安全** - 编译时捕获错误
3. ✅ **多实例支持** - 不同场景不同配置
4. ✅ **请求去重** - 防止重复提交
5. ✅ **请求取消** - 通过 AbortController 主动取消
6. ✅ **灵活定制** - 覆盖或新增任意接口
7. ✅ **Pinia Store集成** - 响应式状态管理
8. ✅ **统一错误处理** - 自动显示提示、跳转登录
9. ✅ **团队协作** - 统一规范，减少沟通成本

**核心原则**: **不要修改 generated/ 目录，在 modules/ 扩展！**

---

## 🔗 参考文档

- Orval 配置: `orval.config.ts`
- HTTP 客户端: `src/api/core/request.ts`、`src/api/core/mutator.ts`
- 自定义模块示例: `src/api/modules/auth.ts`、`src/api/modules/override.ts`
- Store 开发规范: `.claude/agents/store-development.md`
