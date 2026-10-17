---
description: 快速查看所有可用工具的索引,包括 Skills、Commands、Agents
---

# 工具索引

快速查找项目中所有可用的开发工具。详细说明请查看 [.claude/README.md](../README.md)

---

## 工具速查表

### Skills (代码生成)

| Skill | 功能 |
|-------|------|
| `/architecture-designer` | PRD → 架构设计 |
| `/component-generator` | Vue 组件生成 (`--smart`) |
| `/store-generator` | Pinia Store 生成 (`--smart`) |
| `/page-assembler` | 页面拼装器 |
| `/api-generator` | 自定义 API 生成 |
| `/figma-to-component` | Figma → 组件 |
| `/test-coverage-checker` | 测试覆盖率检查 |
| `/implementation-validator` | 代码一致性校验 |
| `/code-optimizer` | 识别重复代码并生成抽取建议 |

### Commands (快速提示)

| Command | 功能 |
|---------|------|
| `/review-pr` | PR 审查清单 |
| `/git-workflow` | Git 工作流规范 |
| `/quick-fix` | 快速问题修复 |
| `/refactor` | 重构最佳实践 |
| `/optimize` | 性能优化指南 |
| `/security-check` | 安全检查清单 |
| `/tools` | 本工具索引 |

### Agents (深度指导)

| Agent | 功能 |
|-------|------|
| `@common-patterns` | 通用开发模式 (SSoT) |
| `@component-development` | 组件开发规范 |
| `@api-development` | API 开发指导 |
| `@router-development` | 路由配置指导 |
| `@store-development` | Pinia 状态管理 |
| `@coding-standards` | 编码规范 |
| `@code-review` | 代码审查标准 |
| `@testing` | 测试策略 |
| `@project-structure` | 项目结构解析 |
| `@figma-extraction-guide` | Figma MCP 指导 |

---

## 决策流程

```
问题 → 能自动修复?
        ├─ 是 → Skills (自动修复)
        └─ 否 → 知道解决方案?
                ├─ 是 → 手动修复
                └─ 否 → Commands (快速索引)
                        └─ 仍不清楚? → Agents (深度学习)
```

---

## 场景速查

| 场景 | 首选 | 备选 |
|------|------|------|
| TypeScript 类型错误 | `/quick-fix` → `pnpm type-check` | `@coding-standards` |
| Vue 组件问题 | `/quick-fix` → `pnpm lint` | `@component-development` |
| API 调用失败 | `pnpm orval` → `/quick-fix` | `@api-development` |
| 样式/CSS 问题 | `@common-patterns` | `pnpm lint` |
| 路由 404/403 | `/quick-fix` | `@router-development` |
| 代码提交前 | `/review-pr` → `pnpm type-check` | `/git-workflow` |
| 性能优化 | `/optimize` → `pnpm analyzer` | `@component-development` |
| 测试覆盖率不足 | `/test-coverage-checker` | `@testing` |

---

## 使用原则

- **日常开发**: 优先使用 Skills (快速自动化)
- **查看清单**: 使用 Commands (快速提醒)
- **学习规范**: 使用 Agents (深度指导)
- **强制规则**: Hooks 自动执行

**详细文档**: [.claude/README.md](../README.md)
