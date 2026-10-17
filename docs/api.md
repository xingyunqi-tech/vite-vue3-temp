# API 模块使用指南

> ⚠️ 下文的 `postAuthLogin` / `getAuthUserInfo` / `postAuthLogout` 是 Orval 生成函数的命名示意，本项目并不存在：
> 登录由 SSO 托管，用户资料由 `src/store/modules/user-info.ts` 从 Cookie 解析；
> 现有的手写接口在 `src/api/modules/platform.ts`。

## 概述

本项目 API 层基于 **PolymasApi**（`@zhs/agent-course-kit/services/base-request`）+ **Orval 自动生成**，核心特性：

- **自动代码生成**：从 OpenAPI 文档生成类型安全的 API 函数和类型定义
- **PolymasApi 插件体系**：模块化中间件（Auth、Error、Loading、去重）
- **多实例管理**：default（普通请求）、download（文件下载）
- **请求去重**：防止短时间内重复提交
- **类型安全**：完整的 TypeScript 支持，自动提取响应 data 字段

---

## 目录结构

```
src/api/
├── core/
│   ├── request.ts        # PolymasApi 实例创建、实例注册表、便捷函数（get/post/put/del）
│   ├── mutator.ts        # Orval 适配器（多实例切换、请求去重、提取 data）
│   ├── types.ts          # 核心类型（ApiResponse、CustomAxiosRequestConfig、ExtractResult 等）
│   └── index.ts          # 核心模块统一导出
│
├── generated/            # 🚫 Orval 自动生成（运行 pnpm orval 后出现，禁止手动修改）
│
├── modules/              # 自定义扩展层（手动编写）
│   ├── platform.ts       # 平台公共接口（用户/认证/IM/课程身份等）
│   └── override.ts       # 覆盖或补充生成的 API（示例）
│
└── index.ts              # API 模块统一导出（modules 优先于 generated）
```

> 注意：`generated/` 目录由 `pnpm orval` 生成后出现，未配置 `orval.config.ts` 的 `input.target` 时不存在；当前仓库的接口手写在 `modules/` 下。

---

## API 实例架构

### 实例创建（`core/request.ts`）

项目基于 PolymasApi 创建两个内置实例，并通过插件体系注册中间件：

```typescript
import PolymasApi, { AuthModule, ErrorModule, LoadingModule } from '@zhs/agent-course-kit/services/base-request';
import { getToken, getZHSUserId } from '@zhs/agent-course-kit/utils/auth';
import { redirectToLoginOnce } from '@/utils/error-handler';

// 401 统一处理：整体跳 SSO，并发只跳一次。回跳地址由 jumpToLogin 内部过滤
// （停在 /403 上时改取 query.redirect，避免登录后原地落回异常页），调用点不传
const handleUnauth = () => {
  redirectToLoginOnce();
};

// 默认实例（普通 API 请求）
export const polymasApi = PolymasApi.create({
  baseURL: window.location.origin,
  timeout: 120000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
})
  .use(AuthModule, { token: () => getToken(), unAuthHandler: handleUnauth, ZHSUserId: () => getZHSUserId() })
  .use(LoadingModule)      // 加载状态
  .use(ErrorModule, { successfulCode: 200, unauthorizedHandler: handleUnauth, toastHandler });
  // 注意：请求去重统一由 mutator 内的 RequestDeduplicator 负责（按实例名 + method + url + params + data + responseType + headers 精确匹配）。

// 下载实例（文件下载，120s 超时，仅 Auth + Error）
export const downloadApi = PolymasApi.create({
  baseURL: window.location.origin,
  timeout: 120000,
  withCredentials: true,
  responseType: 'blob',
})
  .use(AuthModule, { token: () => getToken(), unAuthHandler: handleUnauth, ZHSUserId: () => getZHSUserId() })
  .use(ErrorModule, { successfulCode: 200, unauthorizedHandler: handleUnauth, toastHandler });

// 实例注册表（mutator 按 config.instance 名称从这里取实例）
export const instances = {
  default: polymasApi,
  download: downloadApi,
};
```

### 实例对比

| 实例 | 用途 | 超时 | 特点 |
|------|------|------|------|
| `polymasApi` (default) | 普通 API 请求、文件上传 | 120s | Auth + 去重 + Loading + Error |
| `downloadApi` (download) | 文件下载 | 120s | responseType: blob，无 Loading |

---

## Orval 适配器（`core/mutator.ts`）

Orval 生成的代码通过 `customMutator` 调用 PolymasApi 实例：

```typescript
export const customMutator = async <T>(
  baseConfig: CustomAxiosRequestConfig,
  options?: RequestOptions, // 生成函数的最后一个可选参数，合并进本次请求
): Promise<ExtractResult<T>> => {
  const { instance = 'default', disableDedup = false, ...requestConfig } = { ...baseConfig, ...options };

  // 请求去重（POST/PUT/PATCH/DELETE 默认启用）
  if (shouldDedup && deduplicator.has(requestConfig)) {
    return deduplicator.get(requestConfig) as Promise<ExtractResult<T>>;
  }

  const api = instances[instance]; // 选择实例
  const response = await api.request(requestConfig);

  // blob / arraybuffer 响应原样返回，其余提取 response.data.data
  return isBinary(response.config.responseType) ? response.data : response.data.data;
};
```

**类型说明：** `ExtractResult<T>` 自动从 `ApiResponse<T>` 中提取 `data` 字段类型，因此调用方直接得到业务数据，无需手动取 `.data`。

---

## 基础使用

### 1. 使用 Orval 生成的 API（80% 场景）

```typescript
import { postAuthLogin, getAuthUserInfo } from '@/api';
import type { LoginRequest } from '@/api';

// 类型安全的登录
const result = await postAuthLogin({ username: 'admin', password: '123456' });
// result 已自动提取 data 字段，直接是业务数据

// 获取用户信息
const userInfo = await getAuthUserInfo();
```

### 2. 结合 Pinia Store（推荐）

```typescript
import { useUserInfoStore } from '@/store/modules/user-info';

const userStore = useUserInfoStore();
// 登录由 SSO 托管，Store 只负责从 Cookie 解析用户资料、拉取角色
await userStore.getInfoAction();
```

---

## 三种扩展场景

### 场景 1：直接使用生成的 API（80%）

```typescript
import { postAuthLogin } from '@/api';
await postAuthLogin({ username, password });
```

### 场景 2：新增自定义 API（15%）

在 `src/api/modules/` 创建文件，使用 PolymasApi 实例：

```typescript
// src/api/modules/my-feature.ts
import { instances } from '@/api/core/request';

export const getMyFeatureData = async (id: string) => {
  const response = await instances.default.get(`/my-feature/${id}`);
  return response.data.data; // 手动提取 data（不经过 mutator）
};
```

**使用 mutator 的写法（自动提取 data）：**

```typescript
import { customMutator } from '@/api/core/mutator';

export const getMyFeatureData = (id: string) =>
  customMutator<MyDataType>({ method: 'get', url: `/my-feature/${id}` });
```

然后在 `src/api/index.ts` 导出：

```typescript
export * from './modules/my-feature';
```

### 场景 3：覆盖/扩展生成的 API（5%）

在 `src/api/modules/override.ts` 中覆盖生成的同名函数：

```typescript
// src/api/modules/override.ts
import { someApi as generatedSomeApi } from '@/api/generated/some-module/some-module';
import type { SomeRequest, SomeResponse } from '@/api/generated/model';

// 在生成的 API 基础上添加缓存 / 重试 / 日志等额外逻辑（保持函数名一致）
export const someApi = async (data: SomeRequest): Promise<SomeResponse> => {
  const response = await generatedSomeApi(data);
  // ...额外业务逻辑
  return response;
};
```

> **注意**：`index.ts` 中 `modules/` 的导出优先级高于 `generated/`，同名函数自动覆盖。

---

## 使用下载实例

```typescript
import { customMutator } from '@/api/core/mutator';

// 文件下载（使用 download 实例）
export const downloadReport = (id: string) =>
  customMutator<Blob>({
    method: 'get',
    url: `/report/${id}/download`,
    instance: 'download', // 切换到下载实例
  });
```

---

## 请求去重

### 去重机制（仅 Mutator 层）

请求去重由 `core/mutator.ts` 内的 `RequestDeduplicator` 统一负责：

| 项 | 说明 |
|----|------|
| 去重 key | `实例名 + method + url + params + data + responseType + headers`（FormData 按「字段名 + 文件名/大小」生成） |
| 生效范围 | 默认只对 `GET / HEAD` 启用；写方法默认不去重，需要时显式传 `enableDedup: true`；带 `signal` 的请求不参与 |
| 机制 | 相同 key 的在途请求共享同一个 Promise，不重复发起，请求结束后自动从队列移除 |

### 关闭 / 开启去重

```typescript
import { customMutator } from '@/api/core/mutator';

// GET 默认去重；轮询这类要每次都发的，显式关掉
await customMutator({ method: 'get', url: '/task/status', params, disableDedup: true });

// 写方法默认不去重；确需合并并发的相同提交时显式开启
await customMutator({ method: 'post', url: '/idempotent-op', data, enableDedup: true });
```

### 清空所有待处理请求

```typescript
import { clearPendingRequests } from '@/api/core/mutator';

// 路由切换时清理
router.beforeEach(() => {
  clearPendingRequests();
});
```

---

## 新增 API 实例

需要接入另一个后端（不同 baseURL / 鉴权 / 超时）时，在 `src/api/core/request.ts` 里创建实例并登记到 `instances`：

```typescript
// src/api/core/request.ts
export const reportApi = PolymasApi.create({ baseURL: 'https://report.example.com' })
  .use(AuthModule, { token: () => getToken() })
  .use(ErrorModule, { successfulCode: 200, toastHandler });

export const instances = {
  default: polymasApi,
  download: downloadApi,
  report: reportApi,
};
```

同步在 `src/api/core/types.ts` 的 `HttpInstanceType` 里加上实例名，之后调用时用 `instance` 指定：

```typescript
await customMutator({ url: '/report/list', method: 'get', instance: 'report' });
```

---

## 错误处理

ErrorModule 自动处理以下错误类型：

- **业务错误**（code !== 200）：自动调用 `toastHandler` 显示错误提示
- **未认证（401）**：调用 `unauthorizedHandler` 跳转登录页
- **网络错误**：由 PolymasApi 底层处理

在组件中只需处理成功后的业务逻辑，错误已被自动处理：

```typescript
try {
  const result = await postAuthLogin({ username, password });
  // 成功处理
} catch (error) {
  // 错误已由 ErrorModule 自动展示提示
  // 此处只处理组件特定逻辑（如重置表单、跳转等）
}
```

---

## 开发流程

### 后端 API 有更新

```bash
# 1. 将新的 openapi.json 放到 src/api/openapi.json（或从后端拉取）

# 2. 重新生成代码
pnpm orval

# 3. 查看生成的代码
ls src/api/generated/

# 4. 如需自定义某个接口，在 modules/ 创建覆盖文件
```

### 常用命令

```bash
pnpm orval          # 生成 API 代码
pnpm type-check     # TypeScript 类型检查
```

---

## 重要约定

| 规则 | 说明 |
|------|------|
| 🚫 禁止修改 `generated/` | Orval 自动生成，会被覆盖 |
| ✅ 统一从 `@/api` 导入 | 不直接从 `generated/` 导入 |
| ✅ 扩展在 `modules/` 编写 | 覆盖或新增接口 |
| ✅ 优先使用 Pinia Store | 状态管理推荐封装到 Store |
