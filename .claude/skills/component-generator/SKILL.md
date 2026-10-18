---
name: component-generator
description: 【无设计稿时使用】按项目规范纯代码生成 Vue 组件，支持基础/业务/页面组件，可同时生成路由配置。当用户说"生成一个 XX 组件""新建一个页面""做个列表页"且没有提供 Figma 链接时使用。有 Figma 设计稿请改用 figma-to-component。
license: MIT
compatibility: Requires Vue 3, TypeScript, Element Plus
metadata:
  author: "vite-vue3-temp"
  version: "2.0.0"
  category: development
---

# 组件生成器 Skill

## 功能概述

在**没有设计稿**的情况下，按项目规范生成 Vue 组件骨架，可选同时写入路由配置。

> 📌 **规范的真源是 [component-development.md](../../agents/component-development.md) 和
> [common-patterns.md](../../agents/common-patterns.md)，不是本文件。**
> 本 Skill 只负责「问什么、生成到哪、生成后怎么验证」这套流程。
> 组件分类、Props/Emits 写法、样式与嵌套规范、图标用法一律以 agent 文档为准，**生成前先读**。
>
> 有 Figma 设计稿时请改用 [figma-to-component](../figma-to-component/SKILL.md)，两者不要混用。

## 参考实现（照真实代码写）

| 想学什么 | 看哪个真实文件 |
|---------|--------------|
| 基础组件（Props/Emits/scoped 样式） | `src/components/SvgIcon/index.vue` |
| 带插槽与状态的组件 | `src/components/Skeleton/CardSkeleton/index.vue` |
| 页面组件 | `src/views/ai/usage/index.vue`、`src/views/setting/Frontend.vue` |
| 布局与嵌套组织 | `src/layout/LayoutMenu/` |

## 使用方式

```bash
/component-generator UserCard --type basic                    # 基础组件
/component-generator UserTable --type business                # 业务组件
/component-generator UserManagement --type page               # 页面组件
/component-generator UserManagement --type page --smart --with-router
```

| 参数 | 说明 | 默认 |
|------|------|------|
| `--type` | `basic` / `business` / `page` | 询问 |
| `--smart` | 自动分析并集成已有的 Store / API | `false` |
| `--api a,b` | 手动指定要用的 API 函数 | 无 |
| `--store a,b` | 手动指定要用的 Store | 无 |
| `--with-router` | 同时写入路由配置 | `false` |
| `--route-type` | `async`（需权限）/ `static`（所有登录用户） | `async` |
| `--roles` | 权限角色，会转成 `ROLES.XXX` 常量 | `admin` |
| `--with-form` | 包含表单校验 | `false` |

---

## 组件类型与落位

| 类型 | 落位 | 特点 |
|------|------|------|
| **basic** 基础组件 | `src/components/<PascalCase>/index.vue` | 纯 UI、无业务逻辑、跨项目可复用 |
| **business** 业务组件 | 单页面用 → `src/views/<page>/components/`；多页面复用 → `src/components/` | 含业务逻辑，可依赖 Store / API |
| **page** 页面组件 | `src/views/<kebab-case>/index.vue` | 路由对应的完整页面 |

分类判断标准详见
[component-development.md#组件分类体系](../../agents/component-development.md#组件分类体系)。

**类型定义位置**：默认写在组件内（就近原则）；Props ≥ 8 个时才拆出独立的 `types.ts`。

---

## 执行流程

**本 Skill 是 AI 主导型**：没有配套脚本，由 AI 读规范后直接产出代码。

### 步骤 0：读规范

| 要写什么 | 读哪一节 |
|---------|---------|
| Props / Emits 接口 | [common-patterns.md#props-定义规范](../../agents/common-patterns.md#props-定义规范) |
| 图标（**禁止内联 SVG**，首选 `SvgIcon`） | [common-patterns.md#图标使用规范](../../agents/common-patterns.md#图标使用规范) |
| 颜色（必须用 `var(--aix-*)`） | [common-patterns.md#css-变量使用规范](../../agents/common-patterns.md#css-变量使用规范) |
| 选择器、BEM、嵌套深度 | [common-patterns.md#样式选择器规范](../../agents/common-patterns.md#样式选择器规范) |
| 列表用 `v-for` + 数据数组 | [common-patterns.md#数据驱动模式](../../agents/common-patterns.md#数据驱动模式) |
| DOM 层级、冗余包装 | [component-development.md#组件嵌套深度规范](../../agents/component-development.md#组件嵌套深度规范) |
| 加载态 / 骨架屏 | [component-development.md#骨架屏开发规范](../../agents/component-development.md#骨架屏开发规范) |
| 文件与目录命名 | [coding-standards.md#文件命名规范eslint-强制](../../agents/coding-standards.md) |

### 步骤 1：收集信息

必需：组件名（PascalCase）+ 组件类型。类型未指定时用 AskUserQuestion 询问：

```json
{
  "question": "请选择组件类型",
  "header": "组件类型",
  "options": [
    { "label": "基础组件", "description": "纯 UI，无业务逻辑，可复用" },
    { "label": "业务组件", "description": "含业务逻辑，可依赖 Store / API" },
    { "label": "页面组件", "description": "完整页面，对应一条路由" }
  ],
  "multiSelect": false
}
```

`--smart` 模式：扫描 `src/store/modules/` 与 `src/api/generated/`，只集成**真实存在**的
Store 与 API；缺失时提示先跑 `pnpm orval` 或 `/store-generator`，不要凭空 import。

### 步骤 2：核对 API 类型 ⭐

组件要用到 API 数据时，**先读真实的 DTO 文件**（`src/api/generated/model/xxxDTO.ts`），
记下字段的精确拼写和 `?` 可选标记，然后：

- 只使用 DTO 里**确实存在**的字段
- 可选字段用可选链 + 默认值（`row.stock ?? 0`）
- 把可选值传给要求必填参数的函数前先做类型守卫

字段名靠猜是这个 Skill 最常见的失败方式——`type` / `quantity` 这类想当然的命名往往并不存在。

### 步骤 3：生成代码

`<script setup lang="ts">` 内部顺序（详见
[coding-standards.md#代码组织顺序](../../agents/coding-standards.md)）：

```text
导入 → 接口定义 → Props/Emits → 响应式数据 → 计算属性 → 方法 → 生命周期/监听 → defineExpose
```

页面组件的结构骨架：

```vue
<template>
  <div class="xxx-page">
    <div class="xxx-page__header">…标题 + 操作区…</div>
    <div class="xxx-page__content">…主体，loading / error / 数据三态…</div>
  </div>
</template>
```

样式一律 `<style scoped lang="scss">` + BEM + `var(--aix-*)`，具体写法照 agent 文档。

**文案用中文明文**，禁止写 `t('x.y')` 或 `title: 'route.xxx'` 这类 i18n key
（见 [coding-standards.md 的国际化原则](../../agents/coding-standards.md)）。

### 步骤 4：生成路由配置（`--with-router`）

1. 按 `--route-type` 读 `src/router/routes/async.ts` 或 `static.ts`
2. 用 Edit 把新路由**追加到数组末尾**（catch-all 由 `routes/fallback.ts` 提供，守卫在权限路由注册完成后单独 addRoute，不要在 async.ts 里加 `/:pathMatch(.*)*`）
3. 规则与字段以 [router-development.md](../../agents/router-development.md) 为准，要点：
   - `path` 小写短横线，`name` 大驼峰且全局唯一
   - `meta.title` 写**中文明文**
   - `meta.roles` 用 `ROLES.XXX` 常量（值为大写；写成 `['admin']` 会导致权限判断恒假且不报错）
   - 从 `@/constants` 导入 `ROLES`，**不是** `@/constants/roles`
   - 需要 Layout 外壳时 `component: AppLayout`（来自 `@/layout/constants`）
   - `RouteMeta` 只支持 `typings/router.d.ts` 里那几个字段，没有 `keepAlive` / `skeleton`

未使用 `--with-router` 时，只展示建议的路由配置，让用户自己贴。

### 步骤 5：验证 ⭐

```bash
pnpm lint && pnpm type-check
```

报错就改，改完重跑，直到通过再交付。

**生成后自检：**

- [ ] `.vue` 文件名 PascalCase 或 `index.vue`（ESLint 强制，`user-card.vue` 会报错）
- [ ] Props / Emits 有完整 TS 接口，且 Props 都在模板里用到了
- [ ] 没有内联 `<svg>` / `v-html`，图标走 `SvgIcon`
- [ ] 颜色全部 `var(--aix-*)`，无硬编码色值
- [ ] 无标签选择器，class 语义化，嵌套 ≤ 3 层
- [ ] 列表 `v-for` 带稳定 `:key`
- [ ] 文案是中文明文，没有 i18n key
- [ ] `pnpm lint && pnpm type-check` 通过

### 步骤 6：展示结果

```text
✅ 组件生成成功

📁 文件:
   - src/views/user-management/index.vue
   - src/router/routes/async.ts（追加 1 条路由）

📊 lint + type-check: ✅ 通过

💬 下一步:
   1. pnpm start 看效果
   2. 需要接 Store/API 时用 /page-assembler
```

---

## 质量标准

| 指标 | 标准 |
|------|------|
| DOM 嵌套 | ≤ 3 层 |
| 样式嵌套 | ≤ 3 层（团队约定；stylelint 实配 10，超出不报错） |
| 组件文件 | ≤ 300 行（硬上限）；超过 200 行即应评估拆分 |
| Props 数量 | ≤ 10 个 |

---

## 与其他 Skills 配合

```bash
/component-generator UserManagement --type page --with-router --roles admin,teacher
/store-generator UserStore --smart
/page-assembler src/views/user-management/index.vue
/code-optimizer src/views/user-management/ --full
```

---

## 相关文档

- **[component-development.md](../../agents/component-development.md)** —— 组件规范真源（必读）
- **[common-patterns.md](../../agents/common-patterns.md)** —— Props/图标/CSS 变量/数据驱动（必读）
- [router-development.md](../../agents/router-development.md) —— `--with-router` 时看这里
- [coding-standards.md](../../agents/coding-standards.md) —— 文件命名、代码组织顺序、i18n 原则
- [api-development.md](../../agents/api-development.md) —— `--smart` 集成 API 时看这里

---

## 常见问题

### Q1: 怎么选组件类型？

纯 UI、跨项目可复用 → basic；含业务逻辑、项目内复用 → business；对应一条路由 → page。

### Q2: 生成的代码可以改吗？

可以，它是起点不是终点。

### Q3: 有设计稿怎么办？

改用 [figma-to-component](../figma-to-component/SKILL.md)，它会额外做切图下载与设计 Token 提取。

### Q4: 怎么生成测试？

用 [test-coverage-checker](../test-coverage-checker/SKILL.md) 的 `--auto-generate`，
测试文件统一放 `tests/`，不放 `src/`。

---

**提示**: 本文件只讲流程；写法拿不准时回 [component-development.md](../../agents/component-development.md) 和 `src/components/` 里的真实代码。
