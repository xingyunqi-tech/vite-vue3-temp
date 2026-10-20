---
name: architecture-designer
description: 把 PRD / 需求文档转成完整技术架构：目录结构、路由配置、Store 与数据流设计、开发计划。当用户给出 PRD 文档，或说"设计架构""这个需求怎么拆""从零搭一个模块""先出个方案"时使用。
license: MIT
compatibility: Requires Vue 3, Vue Router, Pinia, TypeScript
metadata:
  author: "vite-vue3-temp"
  version: "2.0.0"
  category: development
---

# 架构设计器 Skill

## 功能概述

读 PRD / 需求文档，产出可执行的技术方案：目录结构、路由、Store、数据流、分阶段开发计划。
本 Skill **只出方案不写业务代码**，实现交给下游的 generator skills。

> 📌 **架构约定的真源在 agents，不是本文件。**设计前先读：
> - [project-structure.md](../../agents/project-structure.md) —— 目录职责与落位规则
> - [router-development.md](../../agents/router-development.md) —— 两层路由体系、权限、meta 字段
> - [store-development.md](../../agents/store-development.md) —— Store 划分与持久化
> - [api-development.md](../../agents/api-development.md) —— API 分层与数据流
>
> 方案里出现的每条路径、每个 meta 字段、每种数据流形态，都必须能在上面四份文档里找到依据。

---

## 使用方式

```bash
/architecture-designer docs/prd/user.md
/architecture-designer docs/prd/user.md --create-todos      # 同时生成开发任务清单
/architecture-designer docs/prd/user.md --create-structure  # 同时创建目录骨架
/architecture-designer                                       # 交互式（无 PRD 时先问需求）
```

| 参数 | 说明 |
|------|------|
| `--create-todos` | 把开发计划落成 TodoWrite 任务清单 |
| `--create-structure` | 按设计创建目录与空文件骨架 |
| `--output <path>` | 设计文档输出位置（默认 `docs/architecture/<模块名>.md`） |

---

## 执行流程

### 步骤 1：读 PRD，抽出四类信息

| 抽取项 | 用途 |
|-------|------|
| 功能点清单 | 决定页面数量与组件拆分 |
| 用户角色 | 决定路由放 `static.ts` 还是 `async.ts`、`meta.roles` 怎么配 |
| 数据模型 | 对照 `src/api/generated/model/` 核实字段，缺什么接口 |
| API 需求 | 决定是跑 `pnpm orval` 还是要用 `/api-generator` 自定义 |

PRD 信息不足时用 AskUserQuestion 补齐，**不要替用户臆造需求**。

### 步骤 2：设计目录结构

落位规则以 [project-structure.md](../../agents/project-structure.md) 为准，要点：

```text
src/
├── views/<kebab-case>/          # 页面；私有组件放 components/ 子目录
├── components/<PascalCase>/     # 跨页面复用的组件才放这里
├── store/modules/<kebab-case>.ts
├── api/modules/<kebab-case>.ts  # 仅自定义扩展；生成物在 api/generated/（禁止手改）
└── router/routes/               # static.ts（无需动态权限）/ async.ts（需 meta.roles）
```

⚠️ 两个高频错误：

- **不要设计 `src/api/hooks/`** —— 项目用 `client: 'axios-functions'`，不生成 hooks；
  数据请求统一走 Store Action 调 API，不存在 `useXxxList()` 这类 Hook 式请求范式
- **不要设计 `store/modules/user.ts`** —— `'user'` 这个 store id 已被 `user-info.ts` 占用，
  用户与认证状态复用 `useUserInfoStore`

### 步骤 3：设计路由

规则以 [router-development.md](../../agents/router-development.md) 为准，要点：

| 判断 | 落到哪 |
|------|-------|
| 无需登录（全屏 403） 或 所有登录用户可访问 | `static.ts` |
| 需要特定角色 | `async.ts`，配 `meta.roles` |
| 404 / 无权限兜底 | 已由 `routes/fallback.ts` 承担，不要再加 catch-all |

- `path` 小写短横线，`name` 大驼峰且全局唯一，`meta.title` 用**中文明文**（不是 i18n key）
- `meta.roles` 用 `ROLES.XXX` 常量，从 `@/constants` 导入（**不是** `@/constants/roles`）
- 需要布局外壳时 `component: AppLayout`（来自 `@/layout/constants`）
- `RouteMeta` 只有 `typings/router.d.ts` 里那几个字段，**没有** `keepAlive` / `breadcrumb` / `skeleton`

### 步骤 4：设计数据流

项目只有一种数据流形态，方案里不要引入第二种：

```text
页面组件 onMounted
   └─> Store Action（loading / error 状态在这里维护）
         └─> @/api 的函数（Orval 生成）或 core/request 的 get/post 便捷函数
               └─> 写回 Store State
                     └─> 页面从 Store 读，computed 派生
```

- 页面组件**不直接调 API**，只调 Store Action
- 请求错误由请求层拦截器（`src/api/core/request.ts`）统一弹提示，Store 只维护本地 `error` 并向上抛
- 详见 [api-development.md](../../agents/api-development.md)、[store-development.md](../../agents/store-development.md)

### 步骤 5：生成开发计划

按阶段拆，每步都落到一条可执行命令：

```text
阶段 1 基础设施
  ☐ pnpm orval 同步 API（先确认 orval.config.ts 的 input.target 已配）
  ☐ /store-generator XxxStore --smart
阶段 2 页面与路由
  ☐ /component-generator XxxManagement --type page --smart --with-router --roles admin,editor
阶段 3 业务组件
  ☐ /component-generator XxxTable --type business
  ☐ /component-generator XxxForm --type business --with-form
阶段 4 集成
  ☐ /page-assembler src/views/xxx/index.vue
阶段 5 质量
  ☐ /test-coverage-checker --auto-generate
  ☐ pnpm lint && pnpm type-check && pnpm test
```

工时估算按阶段给区间，不要给精确到分钟的假精度。

### 步骤 6：输出设计文档

写到 `docs/architecture/<模块名>.md`，固定章节：

```text
1. 功能概述        5. 开发计划（分阶段 + 工时区间）
2. 目录结构        6. API 规范（已有 / 待新增）
3. 路由配置        7. Store 设计（state / getters / actions 草案）
4. 数据流设计      8. 风险与待确认项
```

**第 8 节不要省**：PRD 没说清、需要产品或后端确认的点，明确列出来，不要用默认值悄悄糊过去。

---

## 与其他 Skills 配合

```bash
/architecture-designer docs/prd/user.md --create-todos   # 1. 出方案
pnpm orval                                                # 2. 同步 API
/store-generator UserStore --smart                        # 3. Store
/component-generator UserManagement --type page --smart --with-router   # 4. 页面
/page-assembler src/views/user-management/index.vue       # 5. 拼装
/test-coverage-checker --auto-generate                    # 6. 测试
```

---

## PRD 模板（PRD 质量决定架构质量）

需要用户补 PRD 时，给这个骨架：

```text
1. 功能概述        —— 一句话说清做什么、给谁用
2. 用户角色        —— 哪些角色、各自能做什么（决定路由权限）
3. 功能详情        —— 逐个功能点：入口、交互、边界情况
4. 数据模型        —— 字段名 / 类型 / 是否必填
5. API 需求        —— 接口路径、方法、出入参
6. 非功能需求      —— 性能、权限、兼容性
```

「做一个用户管理功能」这种一句话需求，先问清楚再设计。

---

## 相关文档

- **[project-structure.md](../../agents/project-structure.md)** —— 目录职责（必读）
- **[router-development.md](../../agents/router-development.md)** —— 路由与权限（必读）
- **[store-development.md](../../agents/store-development.md)** —— 状态管理
- **[api-development.md](../../agents/api-development.md)** —— API 分层与数据流
- [common-patterns.md](../../agents/common-patterns.md) —— 通用模式

---

**提示**: 本文件只讲流程；架构约定拿不准时回上面四份 agent 文档，以及 `src/` 里的真实结构。
