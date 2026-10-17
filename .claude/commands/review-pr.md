---
description: 快速提醒 PR 审查清单，确保代码质量和项目规范
---

# Pull Request 审查清单

请按照以下清单全面审查 Pull Request，确保代码符合项目规范和质量标准。本清单是快速核对表；需要更深入的方法论（幻觉代码检测、性能/安全审查细则、质量指标）请参阅 [code-review agent](../agents/code-review.md)。

## 📋 审查清单

### 1. 代码质量

#### TypeScript 类型安全
- [ ] 所有函数、变量都有明确的类型定义
- [ ] 无 `any` 类型（除非有充分理由）
- [ ] Props/Emits 接口完整定义
- [ ] 运行 `pnpm type-check` 无错误

#### 代码规范
- [ ] 无 ESLint 错误和警告
- [ ] 代码格式符合 Prettier 规范
- [ ] 变量和函数命名清晰（camelCase）
- [ ] 无硬编码魔法数字（使用常量）
- [ ] 参考 `@coding-standards`

#### Vue 组件规范
- [ ] Props 定义使用 `defineProps<Props>()`
- [ ] Emits 定义使用 `defineEmits<Emits>()`
- [ ] 组件使用 `<script setup>` 语法
- [ ] 参考 `@component-development`

#### CSS 规范
- [ ] **所有颜色使用 CSS 变量**（`public/assets/theme.css`）
- [ ] 无硬编码颜色字面量（`#fff`、`rgb(21, 70, 242)` 等一律换成 `var(--aix-*)`；需要写颜色函数时用新语法 `rgb(r g b / alpha)`，禁止 `rgba()`）
- [ ] 运行 `pnpm checkCssVars` 检查 CSS 变量使用
- [ ] 使用语义化 class 名称
- [ ] 无直接标签选择器（h1、p、div）
- [ ] 参考 `@common-patterns`

---

### 2. 功能完整性

#### 功能实现
- [ ] 功能符合 PRD/需求文档
- [ ] 核心流程正常工作
- [ ] 边界情况处理完善
- [ ] 错误情况处理（try-catch）

#### 用户体验
- [ ] 加载状态提示（Loading）
- [ ] 错误提示友好（Toast/Message）
- [ ] 交互反馈及时
- [ ] 响应式适配（移动端/桌面端）

#### API 调用
- [ ] 使用 Orval 生成的 API（从 `@/api` 导入）
- [ ] 优先使用 Pinia Store
- [ ] 完整的错误处理
- [ ] 参考 `@api-development`

---

### 3. 测试和文档

#### 单元测试
- [ ] 关键组件有单元测试
- [ ] 覆盖率没有明显倒退（`pnpm test:coverage` 出报告；项目**未设阈值**，不会因覆盖率失败）
- [ ] 运行 `pnpm test` 全部通过
- [ ] 参考 `@testing`

#### 代码注释
- [ ] 复杂逻辑有注释说明
- [ ] 公共函数有 JSDoc 注释
- [ ] 必要的 TODO/FIXME 注释

#### 文档更新
- [ ] README.md 更新（如有新功能）
- [ ] API 文档更新（如有新接口）

---

### 4. 国际化和无障碍

#### 国际化 (i18n)
- [ ] **所有用户可见文本使用中文明文**（不使用 `$t()` API）
- [ ] 参考 `@coding-standards#国际化原则`

**注意:** 本项目使用 AI 自动翻译，禁止在代码中直接使用 `$t()` API

#### 无障碍支持
- [ ] 图片有 `alt` 属性
- [ ] 交互元素有 `aria-label`
- [ ] 键盘可访问（Tab 导航）

---

### 5. AI 生成代码专项检查

> **审查员宣言**: "LGTM 意味着我已验证逻辑，而非仅觉得代码格式漂亮。"
>
> 以下为精简版，完整的"AI 生成代码审查要点"（含更多幻觉代码模式和边界情况）见 [code-review.md](../agents/code-review.md#ai-生成代码审查要点)。

#### 幻觉代码验证 (最高优先级)
- [ ] **幻觉库检测**: 新增的 npm 包是否真实存在？版本是否过旧？
- [ ] **API 签名验证**: 调用的函数参数是否与当前版本匹配？
- [ ] **正则表达式实测**: 复杂正则是否在 [regex101](https://regex101.com) 验证过？

#### 凭证与敏感信息
- [ ] **无硬编码凭证**: 检查 API Key、Token、Password、内网 IP
- [ ] **无敏感日志**: console.log 中无用户 ID、Token 等敏感数据
- [ ] **环境变量使用**: 敏感配置通过 `.env` 文件管理

#### 逻辑完整性
- [ ] **边界情况**: null、空字符串、负数、超长输入是否处理？
- [ ] **循环终止**: while/递归是否有明确终止条件？
- [ ] **业务一致性**: 代码逻辑是否真正符合 PRD 需求？

#### 上下文一致性
- [ ] **轮子检测**: 是否重复实现了项目已有的工具函数？
  - 日期格式化 → `@/utils` (`formatDateShort`, `formatDateTime`, `formatRelativeTime`)
  - 角色/权限检查 → `@/composables/usePermission`（`hasRole`/`canEdit`/`canDelete`）、`@/composables/useRole`（教师/学生身份）
  - 骨架屏 loading → `@/composables/useSkeleton`（含防闪烁），不要另写一份 `useLoading`
  - 状态持久化 → Pinia Store `persist` 选项（参见 `src/store/plugins/persist.ts`）；清理时用 `removePersistedStore(storeId)`
  - Token 读写 → `@/utils/auth` 的 `setAuthTokenCookie()` + kit 的 `getToken()`，**不要**写进 `localStorage`
- [ ] **命名一致**: 命名风格是否与现有代码统一？
- [ ] **注释同步**: 注释是否与代码逻辑匹配（AI 常忘记更新注释）？

---

### 6. 性能和安全

#### 性能优化
- [ ] 无明显性能问题（大量计算、渲染）
- [ ] 列表使用虚拟滚动（长列表）
- [ ] 图片懒加载
- [ ] 组件懒加载（路由级别）

#### 安全检查
- [ ] 无 XSS 漏洞（避免使用 v-html）
- [ ] 无 SQL 注入风险
- [ ] 敏感数据不在前端存储
- [ ] Token 走 Cookie（`setAuthTokenCookie()`），不落 localStorage；不在日志里打印 token

#### 依赖和构建
- [ ] 无新增不必要的依赖
- [ ] 运行 `pnpm build` 成功
- [ ] 构建产物大小合理

---

### 7. Git 和提交规范

#### Commit Message
- [ ] 符合 Conventional Commits 规范
- [ ] 格式：`type(scope): subject`
- [ ] 类型正确（feat/fix/docs/style/refactor/test/chore）

#### 分支和合并
- [ ] 基于最新的 `main/master` 分支
- [ ] 无合并冲突
- [ ] 删除已合并的分支

---

## 🚀 自动化检查工具

在审查前，建议运行以下自动化检查：

```bash
# 1. 类型检查
pnpm type-check

# 2. 代码检查
pnpm lint

# 3. 运行测试
pnpm test

# 4. 构建检查
pnpm build
```

---

## 📝 审查结果模板

### ✅ 通过
代码质量优秀，符合所有规范，建议合并。

### ⚠️ 需要修改
发现以下问题，请修改后再合并：
- [ ] 问题 1：描述
- [ ] 问题 2：描述

### ❌ 拒绝
存在重大问题，需要重新设计/实现：
- 问题描述...

---

## 🔗 相关文档

- [Code Review](../agents/code-review.md)
- [Coding Standards](../agents/coding-standards.md)
- [Component Development](../agents/component-development.md)
- [API Development](../agents/api-development.md)
- [Common Patterns](../agents/common-patterns.md)
- [Testing](../agents/testing.md)

---

**开始审查吧！记得逐项检查，确保代码质量。**
