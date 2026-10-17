---
name: store-generator
description: 生成 Pinia Store（Composition API 风格、类型安全、可选持久化）。当用户说"建一个 XX Store""加状态管理""列表页要保留查询条件"时使用。用户与认证状态请复用已有的 useUserInfoStore，不要新建。
license: MIT
compatibility: Requires Vue 3, Pinia, TypeScript
metadata:
  author: "vue-admin-template"
  version: "2.0.0"
  category: development
---

# Store 生成器 Skill

## 功能概述

按项目规范生成 Pinia Store：Composition API 风格、完整 TypeScript 类型、可选持久化。

> 📌 **规范的真源是 [store-development.md](../../agents/store-development.md)，不是本文件。**
> 本 Skill 只负责「怎么问、生成到哪、生成后怎么验证」这套流程；Store 的写法、持久化选项、
> 命名与错误处理规范一律以该 agent 文档为准。生成前**先读它**，再照着项目里的真实 Store 写。

## 参考实现（照真实代码写，不要照文档里的示例写）

| 想学什么 | 看哪个真实文件 |
|---------|--------------|
| 完整的 Store 结构（state / computed / action / 持久化） | `src/store/modules/user-info.ts` |
| 纯计算逻辑、无 API 依赖的 Store | `src/store/modules/permission.ts` |
| 配置类 Store + 条件编译 | `src/store/modules/global.ts` |
| 持久化机制本身（localforage + syncCache） | `src/store/plugins/persist.ts` |

## 使用方式

```bash
/store-generator ProductStore              # 基础 Store
/store-generator SettingsStore --persist   # 带持久化
/store-generator ProductStore --smart      # 智能模式：自动分析并集成 API
/store-generator                           # 交互式
```

| 参数 | 说明 |
|------|------|
| `--smart` | 根据 Store 名推断需要的 API，自动生成 CRUD Actions |
| `--api a,b,c` | 手动指定要集成的 API 函数 |
| `--persist` | 启用持久化（`persist: true`；存储介质由插件统一决定，无需也不要指定 storage） |

---

## 执行流程

**本 Skill 是 AI 主导型**：没有配套脚本，由 AI 读规范后直接产出代码。

### 步骤 0：读规范

先读 [store-development.md](../../agents/store-development.md)，重点四节：

- **Store 设计原则** —— 单一职责、类型安全、按需持久化
- **状态重置规范** —— 用 `resetXxx()`；setup 语法的 Store **不支持** Pinia 的 `$reset()`
- **持久化配置** —— `persist: true` / `pick` / `omit` 三种形态的取舍
- **Actions 命名规范** —— `xxxAction` 后缀

错误处理见 [common-patterns.md#错误处理模式](../../agents/common-patterns.md#错误处理模式)：
**API 错误已由 `ErrorModule` 自动弹提示，Action 里不要再调 `ElMessage.error`**，
只维护本地 `error` 状态并把异常向上抛。

### 步骤 1：收集信息

必需：Store 名称（PascalCase，如 `ProductStore`）。

未指定持久化时用 AskUserQuestion 询问：

```json
{
  "question": "是否需要持久化存储？",
  "header": "持久化",
  "options": [
    { "label": "需要", "description": "数据存入 IndexedDB，刷新不丢失" },
    { "label": "不需要", "description": "只在内存中，刷新后重置" }
  ],
  "multiSelect": false
}
```

`--smart` 模式的推断顺序：

1. 按名称推断 API（`ProductStore` → `getProductList` / `getProductById` / `createProduct` …）
2. 扫描 `src/api/generated/` 确认这些函数**真实存在**；不存在就提示先跑 `pnpm orval`
3. 读 `src/api/generated/model/` 下对应的参数与 DTO 类型，**不要凭空造字段名**

### 步骤 2：确定文件路径

`src/store/modules/<kebab-case>.ts`，例如 `ProductStore` → `product.ts`。

- 文件名必须 **kebab-case**（ESLint `check-file` 强制，`productStore.ts` 直接 lint error）
- 生成前先看 `src/store/modules/` 有没有同名文件或同名 `defineStore` id
- ⚠️ **`'user'` 这个 id 已被 `user-info.ts` 占用**。用户 / 认证相关一律复用 `useUserInfoStore`，
  不要新建 `user.ts` —— 登录由 SSO 托管，token 是读 Cookie 的 computed，不存在 `loginAction`

### 步骤 3：生成代码

段落顺序固定为 State → Getters → Actions，用注释分隔；`return` 也按这个顺序列：

```typescript
export const useXxxStore = defineStore(
  'xxx',
  () => {
    // ========== State ==========
    // ========== Getters ==========
    // ========== Actions ==========
    return {
      /* 按上面三段的顺序列出 */
    };
  },
  { persist: true },
);
```

列表类 Store 的分页约定（**扁平参数，字段名是 `pageSize` 不是 `size`**）：

```typescript
const queryParams = ref<ListXxxParams>({ page: 1, pageSize: 10 });

function setQueryParams(params: Partial<ListXxxParams>) {
  queryParams.value = { ...queryParams.value, ...params };
}
```

其余一切（Action 写法、错误处理、持久化选项、重置方法）照
[store-development.md](../../agents/store-development.md) 与上表的参考实现写，不要另起一套。

**生成后自检：**

- [ ] 文件名 kebab-case；`defineStore` 的 id 不与现有 Store 冲突
- [ ] 三段式结构 + 注释分隔
- [ ] 重置方法叫 `resetXxx()`，不是 `$reset()`
- [ ] Action 有 `Action` 后缀；异步 Action 有 loading + try/catch/finally
- [ ] catch 里**没有** `ElMessage.error`（请求错误由 ErrorModule 提示，重复调用会弹两次）
- [ ] 分页字段是 `pageSize`
- [ ] 持久化只写 `persist: true` / `pick` / `omit`，不指定 storage
- [ ] `pnpm type-check` 通过

### 步骤 4：展示结果

```text
✅ Store 生成完成

📝 名称: ProductStore（useProductStore，id: 'product'）
📄 文件: src/store/modules/product.ts
🔗 集成 API: getProductList, getProductById
💾 持久化: pick: ['currentProduct']

📋 State:   productList / currentProduct / queryParams / total / loading / error
📋 Actions: fetchProductListAction / fetchProductByIdAction / setQueryParams / resetProduct

💬 下一步:
   1. pnpm type-check
   2. 在页面中接入（可用 /page-assembler）
```

---

## 与其他 Skills 配合

```bash
pnpm orval                                             # 1. 同步 API
/store-generator ProductStore --smart                  # 2. 生成 Store
/component-generator ProductList --type page --smart   # 3. 生成页面
/page-assembler src/views/product/index.vue            # 4. 拼装
```

---

## 相关文档

- **[store-development.md](../../agents/store-development.md)** —— Store 规范真源（必读）
- [common-patterns.md](../../agents/common-patterns.md) —— 错误处理、类型定义等通用模式
- [api-development.md](../../agents/api-development.md) —— `--smart` 集成 API 时看这里
- [coding-standards.md](../../agents/coding-standards.md) —— 文件命名与导入顺序
- [Pinia 官方文档](https://pinia.vuejs.org/)

---

## 常见问题

### Q1: 什么时候需要新建 Store？

单一职责：每个业务模块一个（product / order），或每个功能域一个（settings / cache）。
不要把所有状态堆进一个 Store。用户与认证状态**不新建**，复用 `useUserInfoStore`。

### Q2: 是否所有 Store 都要持久化？

不是。用户设置、主题、当前选中项值得持久化；列表数据、loading、error、分页总数不值得。
详见 [store-development.md](../../agents/store-development.md) 的持久化策略指南。

### Q3: 如何在组件外使用 Store？

```typescript
// ✅ 在函数内调用
function someFunction() {
  const userStore = useUserInfoStore();
  return userStore.info.role;
}

// ❌ 在模块顶层调用（pinia 实例可能尚未创建）
const userStore = useUserInfoStore();
```

### Q4: 生成的 Store 报类型错误怎么办？

跑 `pnpm type-check` 看具体信息。常见原因：导入路径写错、字段名与真实 DTO 对不上、漏了 `import type`。
**不要靠猜字段名**——去 `src/api/generated/model/` 读真实类型。

### Q5: 分页字段叫什么？

`pageSize`，不是 `size`。

### Q6: 怎么清掉持久化的数据？

`removePersistedStore('<storeId>')`，它会同时清掉 IndexedDB 和适配器的内存缓存。

---

**提示**: 本文件只讲流程；写法拿不准时回 [store-development.md](../../agents/store-development.md) 和 `src/store/modules/` 里的真实代码。
