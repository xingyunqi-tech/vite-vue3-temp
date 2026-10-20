---
name: code-optimizer
description: 重构辅助 - 识别重复代码（常量/函数/Composables/组件/指令/类型）并生成抽取建议。当用户提到"重构""抽取公共代码""消除重复""优化模块结构""提取常量""提取工具函数"等场景时使用。
license: MIT
compatibility: Requires Vue 3, TypeScript
metadata:
  author: "vite-vue3-temp"
  version: "1.0.0"
  category: quality
---

# Code Optimizer - 重构辅助 Skill

> **识别重复代码并生成抽取建议，辅助开发者完成重构**
>
> 注意：组件/指令的抽取依赖语义理解，本 Skill 仅给出建议位置和模板，是否真正抽取需由开发者确认。

## 🎯 识别维度 (6 类)

| 维度 | 目标目录 | 说明 |
|------|---------|------|
| **常量** | `src/constants/` | 魔法数字、硬编码字符串、状态值 |
| **函数** | `src/utils/` | 工具函数、格式化函数 |
| **Composables** | `src/composables/` | Vue 逻辑复用 |
| **组件** | `src/components/` | 可复用 UI 组件 |
| **指令** | `src/directives/` | 自定义 Vue 指令 |
| **类型** | `src/interface/` | 公共 TypeScript 类型 |

---

## 📋 使用方式

### 基本用法

```bash
# 分析指定目录
/code-optimizer src/views/user-management/

# 分析指定文件
/code-optimizer src/views/user-management/index.vue

# 分析整个项目
/code-optimizer src/
```

### 高级用法

```bash
# 完整优化 (所有 6 个维度)
/code-optimizer --full

# 只提取常量
/code-optimizer --extract-constants

# 只提取函数 (utils)
/code-optimizer --extract-utils

# 只提取 Composables (hooks)
/code-optimizer --extract-composables

# 只检测可复用组件
/code-optimizer --detect-components

# 只提取指令 (directives)
/code-optimizer --extract-directives

# 只提取类型 (interface)
/code-optimizer --extract-types

# 只生成报告，不自动修复
/code-optimizer --report-only
```

---

## 🔄 推荐工作流

```bash
# 步骤 1: 生成组件
/component-generator UserManagement --smart

# 步骤 2: 拼装页面
/page-assembler src/views/user-management/index.vue

# 步骤 3: 代码优化 ⭐
/code-optimizer src/views/user-management/ --full

# 步骤 4: 质量检查
/test-coverage-checker --auto-generate
pnpm type-check
```

---

## ⚠️ 注意事项

### 安全提取原则

- ✅ **保留原有功能** - 优化不改变业务逻辑
- ✅ **保留类型安全** - 提取后的代码保持类型完整
- ✅ **渐进式优化** - 先报告后执行，可分步进行
- ❌ **避免过度抽象** - 只提取真正重复的代码

### 跳过条件

- 只出现 1-2 次的代码模式
- 逻辑差异较大的相似代码
- 已使用 Composable 的代码
- 测试文件中的代码

### 手动确认项

- 某些常量是否应该提取
- 组件抽取的粒度

---

## 🎯 触发方式

用户可以这样请求优化:

- "优化竞赛管理模块的代码"
- "检查代码中的魔法数字"
- "提取可复用的工具函数"
- "提取可复用的 Composables"
- "检测可复用的组件"
- "使用 code-optimizer 完整优化代码"

---

## 🔍 检测模式

### 常量提取检测

```bash
# 检测数字常量 (排除 0, 1, 100 等常见值)
pattern: "=\\s*[2-9]\\d{2,}|=\\s*\\d{4,}"

# 检测硬编码状态值
pattern: "status\\s*[=!]==?\\s*['\"]\\w+['\"]"
```

**提取目标**:
- 状态常量 → `src/constants/status.ts`
- 配置常量 → `src/constants/config.ts`

### Composable 提取检测

```bash
# 检测分页逻辑
pattern: "pagination.*=.*ref|currentPage|pageSize"

# 检测 Loading 状态管理
pattern: "loading.*=.*ref.*true|false"

# 检测对话框状态管理
pattern: "dialogVisible.*=.*ref|showDialog|closeDialog"
```

**常见可提取模式**:
| 模式 | 出现阈值 | 提取为 |
|------|---------|--------|
| 权限判断 | ≥ 3 次 | 复用 `usePermission` / `v-role` |
| Loading 状态 | ≥ 5 次 | 复用 `useSkeleton` |

### 函数提取检测

```bash
# 检测重复的格式化函数
pattern: "function format|const format.*=.*=>"

# 检测重复的验证函数
pattern: "function validate|const validate.*=.*=>"
```

**常见可提取函数**:
- 日期格式化 → 复用 `src/utils/datetime.ts` 的 `formatDate` / `formatDateTime`
- 金额格式化 → `formatMoney`
- 手机号脱敏 → `maskPhone`

### 类型提取检测

```bash
# 检测重复的分页类型
pattern: "interface.*Pagination|type.*Pagination"

# 检测重复的选项类型
pattern: "interface.*Option|type.*SelectOption"
```

---

## 📋 执行流程

### Phase 0: 初始化

**创建 TodoList 跟踪进度**

```typescript
TodoWrite([
  { content: "扫描目标文件", status: "in_progress", activeForm: "扫描目标文件" },
  { content: "检测常量 (constants)", status: "pending", activeForm: "检测常量" },
  { content: "检测函数 (utils)", status: "pending", activeForm: "检测函数" },
  { content: "检测 Composables (hooks)", status: "pending", activeForm: "检测 Composables" },
  { content: "检测组件 (components)", status: "pending", activeForm: "检测组件" },
  { content: "检测指令 (directives)", status: "pending", activeForm: "检测指令" },
  { content: "检测类型 (interface)", status: "pending", activeForm: "检测类型" },
  { content: "生成优化报告", status: "pending", activeForm: "生成优化报告" },
  { content: "执行自动优化", status: "pending", activeForm: "执行自动优化" }
])
```

**识别目标范围**

```bash
Glob: src/views/[模块名]/**/*.{vue,ts}
Glob: src/components/[模块名]/**/*.{vue,ts}
Glob: src/store/modules/*.ts
```

---

## 📊 优化报告模板

```markdown
# 🔧 代码优化报告 - [模块名]

## 📊 优化概览

| 维度 | 发现问题 | 已优化 |
|------|---------|--------|
| 常量 | X 处 | Y 处 |
| 函数 | X 处 | Y 处 |
| Composables | X 个模式 | Y 个 |
| 组件 | X 个模式 | Y 个 |
| 指令 | X 处 | Y 处 |
| 类型 | X 处 | Y 处 |

**优化前代码行数**: X 行
**优化后代码行数**: Y 行
**代码量减少**: Z%

## ✅ 已完成优化

### 新增文件
- `src/constants/[module].ts`
- `src/composables/use[Name].ts`
- ...

### 修改文件
- `src/views/[module]/list.vue`
- ...

## ⚠️ 待处理项

| 项目 | 位置 | 原因 |
|------|------|------|
| ... | ... | 需要确认 |

## 🎯 下一步建议

1. 运行 `pnpm type-check` 确保类型正确
2. 运行 `pnpm test` 确保功能正常
```

---

## 🧩 常用代码模板

> ⚠️ **先查再抽**：下面这些能力项目里已经有了，重复实现属于"造轮子"，是本 Skill 要消除的目标而不是产出。
> 抽取前先 `Glob: src/composables/*.ts` 确认。

### 已有 Composables（直接复用，不要重写）

| 能力 | 已有实现 | 关键接口 |
|------|---------|---------|
| 角色 / 资源权限 | `src/composables/usePermission.ts` | `usePermission(config?)` → `currentRole` / `isAdmin` / `canReview` / `hasRole(roles)` / `hasAnyRole` / `isRole` / `canView` / `canCreate` / `canEdit` / `canDelete` / `canExport` / `canAudit` |
| 模板内按角色显隐 | `src/directives/role.ts` | `v-role="ROLES.ADMIN"` / `v-role="[ROLES.ADMIN, ROLES.EDITOR]"`，跟随 `info.role` 响应式更新 |
| 加载态 / 骨架屏 | `src/composables/useSkeleton.ts` | `useSkeleton({ delay, minDuration })` → `loading` / `visible` / `withLoading` / `cleanup`，**已含防闪烁，不要另写 `useLoading`** |
| 站点配置 | `src/composables/useSiteConfig.ts` | — |
| 主题切换动画 | `src/composables/useThemeTransition.ts` | `useThemeTransition()` → `toggleThemeWithTransition` |
| 日期 / 文件大小格式化 | `src/utils/datetime.ts` | `formatDate` / `formatDateTime` / `formatRelativeTime` / `formatDateRange` / `formatFileSize` 等 |

```typescript
// ✅ 复用：角色判断统一走 usePermission，角色字段是 info.role（单数、大写）
import { usePermission } from '@/composables/usePermission';
import { ROLES } from '@/constants';

const { hasRole, canDelete } = usePermission({ delete: [ROLES.ADMIN] });
const canManage = hasRole([ROLES.ADMIN, ROLES.EDITOR]);

// ✅ 复用：带防闪烁的加载态
import { useSkeleton } from '@/composables/useSkeleton';

const skeleton = useSkeleton({ delay: 200, minDuration: 300 });
await skeleton.withLoading(() => fetchList());
```

### 新增 Composable 模板

确认项目里确实没有同类能力后，再按下面的形态新建（文件名 camelCase：`useXxx.ts`）：

```typescript
// src/composables/useSelection.ts
import { ref, computed } from 'vue';

/**
 * 列表多选状态管理
 */
export function useSelection<T extends { id: string | number }>() {
  const selected = ref<T[]>([]);

  const selectedIds = computed(() => selected.value.map(item => item.id));
  const hasSelection = computed(() => selected.value.length > 0);

  function setSelection(rows: T[]) {
    selected.value = rows;
  }

  function clearSelection() {
    selected.value = [];
  }

  return { selected, selectedIds, hasSelection, setSelection, clearSelection };
}
```

### 常量模板

```typescript
// src/constants/[module].ts
export const STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
} as const;

export type Status = typeof STATUS[keyof typeof STATUS];

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
} as const;
```

### 工具函数模板

```typescript
// src/utils/format.ts

/**
 * 手机号脱敏
 */
export function maskPhone(phone: string | undefined): string {
  if (!phone || phone.length !== 11) return phone || '-';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
```

### 自定义指令模板

角色显隐已有 `v-role`（`src/directives/role.ts`），不要另写权限指令。新指令照它的形态写，
并在 `src/directives/index.ts` 的 `setupDirectives` 里注册：

```typescript
// src/directives/focus.ts
import type { Directive } from 'vue';

export const focus: Directive<HTMLElement> = {
  mounted(el) {
    el.focus();
  },
};
```

### 公共类型模板

```typescript
// src/interface/common.ts

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 选项类型 (下拉框等)
 */
export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}
```

---

## 🔄 与项目现有代码集成

### 检查现有 Composables

在优化前，先扫描项目中已有的 Composables：

```bash
# 扫描现有 Composables
Glob: src/composables/*.ts

# 检查 Store 中的通用模式
Grep: pattern="function use" glob="src/store/modules/*.ts"
```

**集成原则**:
- ✅ 优先使用项目已有的 Composables
- ✅ 新增 Composables 放入 `src/composables/`，文件名 camelCase（`useXxx.ts`，ESLint 强制）
- ❌ 不重复造轮子（`usePermission` / `useSkeleton` / `useSiteConfig` / `useThemeTransition` 与 `v-role` 指令已存在）

### 导入方式

项目**没有** `src/composables/index.ts` 这个 barrel 文件，按路径直接导入即可，不要新建统一导出：

```typescript
// ✅ 正确
import { useSkeleton } from '@/composables/useSkeleton';
import { usePermission } from '@/composables/usePermission';

// ❌ 错误：该文件不存在
import { useSkeleton } from '@/composables';
```

---

## 📊 优化效果评估

### 代码复用率计算

```
复用率 = 提取后复用的代码行数 / 原始重复代码行数 × 100%
```

### 优化效果指标

| 指标 | 优秀 | 良好 | 需改进 |
|------|------|------|--------|
| 代码行数减少 | > 20% | 10-20% | < 10% |
| 重复代码消除 | > 90% | 70-90% | < 70% |
| Composable 复用率 | > 3 处/个 | 2-3 处/个 | < 2 处/个 |

---

## 常见问题

### Q1: 什么时候应该提取 Composable？

**A:** 满足以下条件之一：
- 相同逻辑在 **3 个以上** 组件中出现
- 逻辑复杂度高 (超过 20 行)
- 涉及状态管理 (ref/reactive)
- 需要单独测试

### Q2: 常量应该放在组件内还是提取？

**A:**
- ✅ **提取**: 多个组件使用、业务状态值、配置项
- ❌ **保留**: 仅当前组件使用、UI 相关常量

### Q3: 如何避免过度抽象？

**A:**
- 只提取确实重复的代码
- 不为"可能复用"预先抽象
- 遵循 "Rule of Three" (三次重复再提取)

### Q4: 优化后如何验证？

**A:**
```bash
# 1. 类型检查
pnpm type-check

# 2. 运行测试
pnpm test

# 3. 代码检查
pnpm lint

# 4. 手动测试功能
```

---

## 📚 相关文档

**编码规范和开发模式请参考:**

- [coding-standards.md](../../agents/coding-standards.md) - 编码规范、类型定义规范
- [common-patterns.md](../../agents/common-patterns.md) - 通用开发模式和规范
- [store-development.md](../../agents/store-development.md) - Store 开发规范
