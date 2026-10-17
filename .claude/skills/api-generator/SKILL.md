---
name: api-generator
description: 在 Orval 覆盖不到的 20% 场景生成自定义 API 代码。当用户要做文件上传/下载（带进度）、WebSocket、轮询、批量操作，或需要在生成的接口前后插入业务逻辑时使用。标准 RESTful 接口直接跑 pnpm orval，不用本 Skill。
license: MIT
compatibility: Requires Vue 3, TypeScript, Axios, Orval
metadata:
  author: "vite-vue3-temp"
  version: "2.0.0"
  category: development
---

# API 生成器 Skill

## 功能概述

为 Orval 覆盖不到的 **20% 场景**生成自定义 API 代码。

> 📌 **规范的真源是 [api-development.md](../../agents/api-development.md)，不是本文件。**
> 四层架构、实例选择、解包语义、请求去重、错误处理一律以该 agent 文档为准，**生成前先读**。
>
> ⚠️ **80% 的场景不需要本 Skill**：标准 RESTful 接口跑 `pnpm orval` 自动生成即可。

## 参考实现（照真实代码写）

| 想学什么 | 看哪个真实文件 |
|---------|--------------|
| 用便捷函数写接口（**最常用的形态**） | `src/api/modules/auth.ts` |
| 覆盖 Orval 生成的同名函数 | `src/api/modules/override.ts` |
| 实例定义、`get/post/put/del` 便捷函数 | `src/api/core/request.ts` |
| Orval 适配器、请求去重 | `src/api/core/mutator.ts` |

---

## 三种场景怎么选

| 场景 | 占比 | 做法 |
|------|------|------|
| 标准 RESTful，无额外逻辑 | 80% | `pnpm orval`，**不用本 Skill** |
| 需要在生成的接口前后插逻辑 | 15% | `--type override`：在 `modules/` 写同名函数包住生成版本 |
| OpenAPI 里没有 / 需要底层配置 | 5% | `--type custom`：上传下载、WebSocket、轮询、批量操作 |

```bash
/api-generator postAuthLogin --type override
/api-generator uploadFile --type custom --with-progress
/api-generator pollTaskStatus --type polling --interval 2000
/api-generator                                 # 交互式
```

---

## 执行流程

### 步骤 0：读规范

读 [api-development.md](../../agents/api-development.md)，四个必须掌握的点：

1. **🚫 绝不修改 `src/api/generated/`** —— Orval 生成物，会被覆盖（已有 PreToolUse hook 硬拦）
2. **统一从 `@/api` 导入**，不从 `generated/` 直接导（ESLint `no-restricted-imports` 会报错）
3. **两种调用形态的解包语义不同**（最常见的坑）：
   - `get/post/put/del` 便捷函数 → 已解好 `{ code, data, message }` 包络，**返回值就是业务数据**
   - `httpApi.xxx()` / `downloadApi.xxx()` 实例方法 → 返回完整 AxiosResponse，业务数据在 **`res.data.data`（两层）**
4. **请求去重只对 GET/HEAD 默认开启**，写方法默认不去重；防重复提交请在 UI 层做

### 步骤 1：收集信息

必需：函数名（camelCase）+ 类型（`override` / `custom`）。类型未指定时用 AskUserQuestion：

```json
{
  "question": "请选择 API 类型",
  "header": "API 类型",
  "options": [
    { "label": "覆盖生成的 API", "description": "在自动生成的接口上追加业务逻辑" },
    { "label": "完全自定义 API", "description": "OpenAPI 里没有，或需要进度回调等底层配置" }
  ],
  "multiSelect": false
}
```

### 步骤 2：确定文件路径

一律放 `src/api/modules/`，按功能模块分文件（`upload.ts` / `download.ts` / `polling.ts`）。
目前目录下只有 `auth.ts`（登录 / 当前用户接口）和 `override.ts`（覆盖示例）两个真实文件。

### 步骤 3：生成代码

**首选便捷函数**（不需要底层配置时一律用这个，语义与 Orval mutator 一致）：

```typescript
import { get, post } from '../core/request';

// 显式传泛型 —— 这些函数不经过 Orval 类型生成，不传就是 unknown
export const getUserDetail = (id: string) => get<UserDetail>(`/api/user/${id}`);
export const createUser = (data: CreateUserReq) => post<UserDetail>('/api/user', data);
```

**只有需要 `onUploadProgress` / `responseType: 'blob'` / 覆盖 `baseURL` 时才直接用实例**，
此时**必须自己解两层**：

```typescript
import { httpApi } from '../core/request';
import type { ApiResponse } from '../core/types';

const res = await httpApi.post<ApiResponse<UploadResponse>>('/api/upload', formData, { onUploadProgress: … });
return res.data.data as UploadResponse;
//      ↑ 忘记这一层是本项目最高频的运行时 bug：拿到的是包络而不是数据
```

`--type override` 的形态：保持函数名不变、调用原始生成函数、前后加逻辑；token 不落 localStorage。

WebSocket / 轮询等更长的模板参考
[api-development.md 的场景 3](../../agents/api-development.md)。

### 步骤 4：刷新 index.ts 导出

`src/api/index.ts` 由 `orval.config.ts` 的 `afterAllFilesWrite` 调用 `scripts/api/update-api-exports.ts`
自动重写：generated 函数显式导出（与 `modules/` 同名的剔除），`modules/` 用 `export *`，
所以 `modules/` 里的同名函数覆盖生成版本。手写的内容下次 `pnpm orval` 会被整份覆盖。

```bash
pnpm orval                                    # 常规做法
npx tsx scripts/api/update-api-exports.ts     # 只刷新导出
```

> ⚠️ `src/api/generated/` 里还没有任何模块时（`orval.config.ts` 的 `input.target` 未配置），
> 脚本保持 `src/api/index.ts` 不变。此时在 `index.ts` 里手动补一行 `export * from './modules/xxx';`。

### 步骤 5：验证

```bash
pnpm type-check && pnpm lint
```

**生成后自检：**

- [ ] 文件在 `src/api/modules/`，没有碰 `generated/`
- [ ] 不需要底层配置的接口用了 `get/post/put/del` 便捷函数
- [ ] 直接用实例的地方**解了两层**（`res.data.data`）
- [ ] 返回类型与实际返回值一致（不要标 `ApiResponse<T>` 却返回 AxiosResponse）
- [ ] `override` 类型保持了函数名不变，并调用了原始生成函数
- [ ] 没有往 localStorage 写 token
- [ ] 新模块已进入 `src/api/index.ts` 的导出（脚本刷新或按上文手动补）
- [ ] `pnpm type-check` 通过

### 步骤 6：展示结果

```text
✅ API 代码生成完成

📄 函数: uploadFile
📁 文件: src/api/modules/upload.ts
🔧 类型: 文件上传（带进度）
📤 导出: 已进入 @/api

💬 下一步:
   1. pnpm type-check
   2. 在 Store Action 里调用（不要在组件里直接调 API）
```

---

## 与其他 Skills 配合

```bash
/api-generator uploadFile --type custom --with-progress
/store-generator UploadStore --smart      # Store 里包装这个 API
/component-generator FileUploader --type business
```

---

## 相关文档

- **[api-development.md](../../agents/api-development.md)** —— API 规范真源（必读）
- [common-patterns.md](../../agents/common-patterns.md) —— 错误处理模式
- [store-development.md](../../agents/store-development.md) —— 在 Store 里消费这些接口
- [orval.config.ts](../../../orval.config.ts) —— 生成配置
- [Orval 官方文档](https://orval.dev/)

---

## 常见问题

### Q1: 什么时候用 `pnpm orval`，什么时候用本 Skill？

80% 用 orval；15% 用 `--type override`（加业务逻辑）；5% 用 `--type custom`（上传下载 / WebSocket / 轮询）。

### Q2: 为什么拿到的数据是 `{ code, data, message }`？

用实例方法（`httpApi.get()`）时没解两层。要么改用便捷函数，要么取 `res.data.data`。

### Q3: 怎么防止重复提交？

**不要依赖请求去重**——写方法默认不去重（合并掉第二次会静默丢请求）。请在 UI 层做按钮
`disabled` / `loading`。确需去重时给 Orval 生成函数的请求参数显式传 `enableDedup: true`（只对走 mutator 的请求生效）。

### Q4: 怎么测试自定义 API？

`pnpm type-check` → 写测试放 `tests/`（Mock 目标是 `@/api/modules/xxx`）→ `pnpm test`。
详见 [testing.md](../../agents/testing.md)。

---

**提示**: 本文件只讲流程；写法拿不准时回 [api-development.md](../../agents/api-development.md) 和 `src/api/modules/auth.ts`。
