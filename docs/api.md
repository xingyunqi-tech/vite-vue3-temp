# API 模块使用指南

> 下文的 `getUserList` 等 Orval 生成函数名仅作示意。`src/api/generated/` 纳入版本管理、运行时被依赖；后端接口变更后启动后端（开启 SWAGGER_ENABLED）运行 `pnpm orval` 重新生成并一起提交。
> 当前仓库的手写接口在 `src/api/modules/`：`auth.ts`（管理员登录、退出、当前用户）、`remote-config.ts`（远程配置读写）。

## 概述

API 层基于 **axios** + **Orval 自动生成**：

- **代码生成**：从 OpenAPI 文档生成类型安全的请求函数与类型定义
- **统一拦截**：注入 token 与界面语言、校验业务码、401 跳登录、失败自动提示
- **多实例**：`default`（普通请求）、`download`（文件下载）
- **请求去重**：mutator 层合并相同的在途 GET / HEAD 请求
- **自动解包**：生成函数与便捷函数直接返回业务数据（`res.data.data`）

---

## 目录结构

```
src/api/
├── core/
│   ├── request.ts        # axios 实例、拦截器、实例注册表、便捷函数（get/post/put/del）
│   ├── mutator.ts        # Orval 适配器（实例切换、请求去重、提取 data）
│   ├── types.ts          # ApiResponse、CustomAxiosRequestConfig、RequestOptions 等类型
│   └── index.ts          # 核心模块导出
├── generated/            # 🚫 Orval 生成（纳入版本管理，禁止手改）
├── modules/
│   ├── auth.ts           # 登录 / 退出 / 当前用户
│   └── override.ts       # 覆盖生成接口的示例
└── index.ts              # 统一导出（@/api）
```

---

## 响应约定

后端统一返回信封：

```typescript
interface ApiResponse<T> {
  code: number; // 200 为成功（API_CODE.SUCCESS）
  data?: T;
  message: string;
}
```

| 情况 | 请求层行为 |
|------|-----------|
| `code === 200` | resolve 完整 axios response |
| `code !== 200` | 弹出 `message`（`ElMessage.error`），reject `AxiosError`（`code: 'ERR_ERROR_MODULE'`） |
| 业务码 401 或 HTTP 401 | 先用刷新 token 调 `/api/v1/auth/refresh` 换新 token 并重放原请求（并发只刷新一次，每个请求只重放一次）；刷新失败则清除 token，整页跳转 `/login?redirect=<当前页>`（并发只跳一次），同时按上一行提示并 reject |
| HTTP / 网络错误 | 文案经 `toFriendlyMessage` 转换后提示，reject 原错误 |
| 请求被取消 | 不提示，直接 reject |
| 下载接口返回 JSON 业务错误 | 解析 Blob 后按业务码处理并 reject；正常文件 Blob 原样返回 |

---

## 实例（`core/request.ts`）

```typescript
const baseURL = import.meta.env.VITE_BASEURL || window.location.origin;

function createInstance(config: CreateAxiosDefaults): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 120000, withCredentials: true, ...config });
  instance.interceptors.request.use(attachHeaders);
  instance.interceptors.response.use(checkBusinessCode, handleResponseError);
  return instance;
}

export const httpApi = createInstance({ headers: { 'Content-Type': 'application/json;charset=utf-8' } });
export const downloadApi = createInstance({ responseType: 'blob' });

export const instances: Record<HttpInstanceType, AxiosInstance> = {
  default: httpApi,
  download: downloadApi,
};
```

- `attachHeaders`：`Authorization` 头为 `Bearer <getToken()>`，请求已显式指定 `Authorization` 时保持不变；`Accept-Language` 取当前界面语言
- 两个实例共用同一套拦截器，超时均为 120s

| 实例 | 注册名 | 用途 |
|------|--------|------|
| `httpApi` | `default` | 普通请求、文件上传 |
| `downloadApi` | `download` | 文件下载（`responseType: 'blob'`） |

### 请求配置扩展

`core/types.ts` 给 `AxiosRequestConfig` 增加了两个字段，任何调用方式都可以传：

| 字段 | 作用 |
|------|------|
| `isIgnoreToast: true` | 失败时不弹错误提示（轮询、静默上报等） |
| `skipAuthRedirect: true` | 401 时不清 token、不跳登录页（登录接口本身使用） |

---

## 发请求的三种方式

| 方式 | 返回值 | 适用场景 |
|------|--------|---------|
| Orval 生成函数（`@/api`） | 业务数据 `data` | 有 OpenAPI 文档的接口（首选） |
| 便捷函数 `get / post / put / del`（`@/api`） | 业务数据 `data` | 手写接口 |
| `httpApi.get() / .post()` 等实例方法 | 完整 axios response，`res.data` 是 `{ code, data, message }` 信封 | 需要响应头、状态码等原始信息 |

### 1. Orval 生成函数

```typescript
import { getUserList } from '@/api';

const list = await getUserList({ page: 1 });
const silent = await getUserList({ page: 1 }, { isIgnoreToast: true, signal: controller.signal });
```

生成函数的最后一个可选参数是 `RequestOptions`（不含 `url / method / params / data`），会合并进本次请求。

### 2. 便捷函数

签名：`get<T>(url, params?, config?)`、`del<T>(url, params?, config?)`、`post<T>(url, data?, config?)`、`put<T>(url, data?, config?)`，调用时显式传入泛型。

```typescript
// src/api/modules/auth.ts
import { get, post } from '../core/request';

export const login = (params: LoginParams) => post<LoginResult>('/api/auth/login', params, { skipAuthRedirect: true });

export const logout = () => post<void>('/api/auth/logout', undefined, { isIgnoreToast: true });

export const getUserInfo = () => get<CurrentUser>('/api/auth/current-user');
```

### 3. 实例方法

```typescript
import { httpApi } from '@/api';
import type { ApiResponse } from '@/api/core/types';

const res = await httpApi.get<ApiResponse<User>>('/api/user/1');
const user = res.data.data;
```

---

## Orval 适配器（`core/mutator.ts`）

Orval 生成的代码通过 `customMutator` 调用实例：

```typescript
export const customMutator = async <T>(
  baseConfig: CustomAxiosRequestConfig,
  options?: RequestOptions,
): Promise<ExtractResult<T>> => {
  const config = { ...baseConfig, ...options };
  const { method = 'get', instance: instanceName = 'default', disableDedup = false, enableDedup = false } = config;

  const isIdempotent = ['get', 'head'].includes(method.toLowerCase());
  const shouldDedup = !disableDedup && !config.signal && (enableDedup || isIdempotent);
  if (shouldDedup && deduplicator.has(requestConfig, instanceName)) {
    return deduplicator.get(requestConfig, instanceName);
  }

  const requestPromise = instances[instanceName].request(requestConfig).then(response =>
    BINARY_RESPONSE_TYPES.has(response.config?.responseType ?? '') ? response.data : response.data.data,
  );
  if (shouldDedup) deduplicator.set(requestConfig, instanceName, requestPromise);
  return requestPromise;
};
```

以上为简化示意，完整实现见源码。

`ExtractResult<T>` 从 `ApiResponse<T>` 中提取 `data` 的类型，调用方直接拿到业务数据；`blob / arraybuffer / stream` 响应原样返回。

---

## 扩展场景

### 新增手写接口

在 `src/api/modules/` 新建文件，用便捷函数或 `customMutator`：

```typescript
// src/api/modules/report.ts
import { get } from '../core/request';
import { customMutator } from '../core/mutator';

export const getReport = (id: string) => get<Report>(`/api/report/${id}`);

export const getReportDetail = (id: string) => customMutator<Report>({ method: 'get', url: `/api/report/${id}/detail` });
```

然后在 `src/api/index.ts` 导出：

```typescript
export * from './modules/report';
```

### 覆盖生成的接口

在 `src/api/modules/override.ts` 中定义同名函数，在生成函数前后加缓存、重试等逻辑：

```typescript
import { someApi as generatedSomeApi } from '../generated/some-module/some-module';
import type { SomeRequest, SomeResponse } from '../generated/model';

export const someApi = async (data: SomeRequest): Promise<SomeResponse> => {
  const response = await generatedSomeApi(data);
  return response;
};
```

`scripts/api/update-api-exports.ts` 生成 `src/api/index.ts` 时，会把与 `modules/` 同名的函数从 generated 的显式导出中剔除，因此对外生效的是 `modules/` 的覆盖版本。

### 文件下载

```typescript
import { customMutator } from '@/api/core/mutator';

export const downloadReport = (id: string) =>
  customMutator<Blob>({ method: 'get', url: `/api/report/${id}/download`, instance: 'download' });
```

### 新增实例

需要接入另一个后端时，在 `core/request.ts` 中用 `createInstance` 创建实例并登记到 `instances`，同时在 `core/types.ts` 的 `HttpInstanceType` 中加上实例名：

```typescript
// src/api/core/request.ts
export const reportApi = createInstance({ baseURL: 'https://report.example.com' });

export const instances: Record<HttpInstanceType, AxiosInstance> = {
  default: httpApi,
  download: downloadApi,
  report: reportApi,
};
```

```typescript
await customMutator({ method: 'get', url: '/list', instance: 'report' });
```

---

## 请求去重

由 `core/mutator.ts` 内的 `RequestDeduplicator` 负责，只作用于经过 `customMutator` 的请求（生成函数与直接调用 mutator），便捷函数和实例方法不去重。

| 项 | 说明 |
|----|------|
| 去重 key | 实例名 + method + url + params + data + responseType + headers（FormData 按字段名与文件名 / 大小生成） |
| 生效范围 | 默认只对 GET / HEAD 生效；写方法需显式传 `enableDedup: true`；带 `signal` 的请求不参与 |
| 机制 | 相同 key 的在途请求共享同一个 Promise，请求结束后自动移除 |

```typescript
await customMutator({ method: 'get', url: '/api/task/status', params, disableDedup: true });

await customMutator({ method: 'post', url: '/api/idempotent-op', data, enableDedup: true });
```

---

## 错误处理

请求失败已由拦截器提示，组件里只处理自身逻辑：

```typescript
try {
  await userStore.loginAction({ username, password });
  router.replace(redirect);
} catch {
  submitting.value = false;
}
```

- 不想要自动提示时传 `isIgnoreToast: true`，再自行 `handleError(error)`（`src/utils/error-handler.ts`）或给出定制提示
- 不要在组件里自行判断 401 或跳登录页，统一由请求层处理

---

## 开发流程

```bash
# 1. 在 orval.config.ts 的 input.target 填写 OpenAPI 文档地址或本地路径
# 2. 生成代码
pnpm orval
# 3. 需要定制的接口在 src/api/modules/ 覆盖
pnpm type-check
```

---

## 重要约定

| 规则 | 说明 |
|------|------|
| 🚫 禁止修改 `generated/` | Orval 生成目录，重新生成会覆盖（已由 hook 拦截编辑） |
| ✅ 统一从 `@/api` 导入 | 不直接从 `generated/` 导入，否则 `modules/` 的覆盖不生效 |
| ✅ 手写接口放 `modules/` | 用便捷函数或 `customMutator`，不要另建 axios 实例 |
| ✅ 登录类接口传 `skipAuthRedirect` | 避免账号密码错误返回 401 时被跳回登录页 |
