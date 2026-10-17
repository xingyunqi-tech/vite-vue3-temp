# Claude Code 配置指南

> 本项目的 Claude Code 完整配置，包括 Agents、Skills、Commands 和 Hooks

## 目录结构

```text
.claude/
├── README.md              # 本文件
├── settings.json          # 团队共享配置：permissions + hooks（提交）
├── settings.local.json    # 个人本地配置：额外权限、启用的 MCP 服务器（.gitignore 忽略）
├── agents/                # 深度指导（10 个 *.md）
├── commands/              # 快速提示（7 个 *.md，/命令名 调用）
└── skills/                # 代码生成（9 个 <name>/SKILL.md）

.mcp.json                  # 项目根目录：MCP 服务器定义
```

---

## 四层工具体系

| 层级 | 职责 | 触发方式 | 复杂度 |
|------|------|----------|--------|
| **Commands** | 快速提示/清单 | `/command-name` 手动调用 | 简单 |
| **Skills** | 代码生成/自动化 | Claude 自动发现，根据任务匹配 | 复杂 |
| **Agents** | 深度指导/规范 | Task 工具 `subagent_type` 参数 | 深入 |
| **Hooks** | 自动化规则 | 事件驱动，自动执行 | 确定性 |

**工作机制:**
- **Commands**: 用户输入 `/review-pr` 等命令，Claude 读取对应 `.md` 文件作为提示
- **Skills**: Claude 根据任务自动匹配 `.claude/skills/` 中的能力描述
- **Agents**: Claude 通过 Task 工具调用专业子代理处理复杂任务
- **Hooks**: `settings.json` 中配置，在特定事件时自动执行 shell 命令

**使用原则:**
- **日常开发**: 优先使用 Skills（快速自动化）
- **查看清单**: 使用 Commands（快速提醒）
- **学习规范**: 使用 Agents（深度指导）
- **强制规则**: Hooks 自动执行

---

## Skills - 代码生成和自动化

Skills 用于快速完成重复性开发任务。

> **触发方式**：Skills 由 Claude 根据任务描述**自动匹配触发**（推荐方式）。下方表格中的 `/skill-name` 形式是**可选的显式调用**，与 Commands 的斜杠语法相同但本质不同：
> - **Commands**：用户输入 `/review-pr` → 读取 `.claude/commands/review-pr.md` 作为提示
> - **Skills**：Claude 读取任务上下文 → 匹配 `description` → 自动调用对应 SKILL.md；显式 `/skill-name` 仅作为强制指定的快捷方式

### 完整 Skills 列表

#### 开发辅助类

| Skill | 功能 | 显式调用示例（可选） |
|-------|------|----------|
| `/architecture-designer` | PRD → 架构设计，生成完整开发计划和 Todo 清单 | `/architecture-designer docs/prd/user.md --create-todos` |
| `/component-generator` | 智能组件生成，支持基础/业务/页面组件 | `/component-generator UserList --type page --smart` |
| `/store-generator` | 智能 Pinia Store 生成，自动集成 API | `/store-generator UserStore --smart` |
| `/page-assembler` | 页面拼装器，组装组件为完整页面 | `/page-assembler src/views/user/index.vue` |
| `/api-generator` | 自定义 API 生成 (Orval 无法覆盖的 20% 场景) | `/api-generator uploadFile --type custom --with-progress` |
| `/figma-to-component` | 从 Figma 设计稿生成 Vue 组件 | `/figma-to-component <figma-url>` |

#### 质量保障类

| Skill | 功能 | 显式调用示例（可选） |
|-------|------|----------|
| `/test-coverage-checker` | 测试覆盖率检查，自动生成测试模板 | `/test-coverage-checker --auto-generate` |
| `/implementation-validator` | 代码实现一致性校验 (API + PRD) | `/implementation-validator --all docs/prd/feature.md src/views/feature/` |
| `/code-optimizer` | 识别重复代码（常量/函数/Composables/组件/指令/类型）并生成抽取建议 | `/code-optimizer src/views/user/ --full` |

### 命名规范

| 类型 | 命名模式 | 示例 |
|------|----------|------|
| 生成类 | `/xxx-generator` | `/component-generator`, `/store-generator`, `/api-generator` |
| 检查类 | `/xxx-checker` / `/xxx-validator` | `/test-coverage-checker`, `/implementation-validator` |
| 设计类 | `/xxx-designer` | `/architecture-designer` |
| 优化类 | `/xxx-optimizer` | `/code-optimizer` |
| 拼装类 | `/xxx-assembler` | `/page-assembler` |

### 使用说明

**推荐方式：自然语言描述任务**（Claude 会自动匹配 Skill 并触发）

```text
# 示例 1: 生成组件
"帮我生成一个用户列表组件"          → 触发 component-generator

# 示例 2: 生成 Store
"创建用户管理的 Store"             → 触发 store-generator

# 示例 3: 代码优化
"重构 src/views/user/，消除重复"   → 触发 code-optimizer

# 示例 4: 从 PRD 开始设计
"根据 docs/prd/user.md 设计架构"  → 触发 architecture-designer
```

**进阶方式：显式 `/skill-name` 调用**（带参数控制精细行为）

```bash
/component-generator UserList --type page --smart
/store-generator UserStore --smart
/code-optimizer src/views/user/ --full
```

> 两种方式都会执行相同的 Skill 实现。自然语言模式更符合 Skills 的设计意图（让 Claude 自主选择最合适的工具）；显式调用适合参数固定的重复操作。

### 常用参数速查

| Skill | 参数 | 说明 |
|-------|------|------|
| `/component-generator` | `--type basic/business/page` | 组件类型 |
| `/component-generator` | `--smart` | 智能模式，自动分析依赖 |
| `/component-generator` | `--with-router` | 同时生成路由配置 |
| `/store-generator` | `--smart` | 智能模式，自动集成 API |
| `/code-optimizer` | `--full` | 全量识别并生成所有维度的抽取建议 |
| `/architecture-designer` | `--create-todos` | 生成 Todo 清单 |
| `/test-coverage-checker` | `--auto-generate` | 自动生成测试模板 |
| `/implementation-validator` | `--all` | 完整校验 (API + PRD) |

### 智能化工作流

```bash
# 完整开发流程: PRD → 实现
/architecture-designer docs/prd/user.md --create-todos  # 1. 架构设计
pnpm orval                                             # 2. API 同步
/store-generator UserStore --smart                       # 3. 生成 Store
/component-generator UserManagement --type page --smart  # 4. 生成页面
/page-assembler src/views/user/index.vue                 # 5. 页面拼装
/code-optimizer src/views/user/ --full                   # 6. 代码优化
/test-coverage-checker --auto-generate                   # 7. 质量检查
# 8. 停在工作区，等用户确认后再提交
```

---

## Commands - 快速提示和清单

Commands 是轻量级提示命令，用于快速查看清单和最佳实践。

### 完整 Commands 列表

| Command | 文件 | 功能 | 使用场景 |
|---------|------|------|----------|
| `/review-pr` | `review-pr.md` | PR 审查清单，包含代码质量、安全性、测试等检查项 | 代码审查前 |
| `/git-workflow` | `git-workflow.md` | Git 工作流规范，分支策略、提交规范、PR 流程 | 提交前查看规范 |
| `/quick-fix` | `quick-fix.md` | 快速问题修复索引，按错误类型分类解决方案 | 遇到问题时 |
| `/refactor` | `refactor.md` | 重构最佳实践，安全重构原则和步骤 | 重构代码前 |
| `/optimize` | `optimize.md` | 性能优化指南，Vue/API/构建优化技巧 | 优化性能前 |
| `/security-check` | `security-check.md` | 安全检查清单，覆盖 OWASP Top 10 | 安全审查时 |
| `/tools` | `tools.md` | 工具索引，快速查找所有可用工具 | 查找工具时 |

### 使用示例

```bash
/review-pr        # 提交前查看审查清单
/quick-fix        # 遇到问题时快速定位
/git-workflow     # 查看 Git 提交规范
/security-check   # 安全审查检查清单
```

---

## Agents - 深度指导

Agents 提供专业领域的深度指导，Claude 根据任务内容自动选择合适的 Agent。

### 完整 Agents 列表

#### 核心 Agents (日常必用)

| Agent | 文件 | 职责 | 适用场景 |
|-------|------|------|----------|
| `common-patterns` | `common-patterns.md` | 通用开发模式（单一真实来源），Props/Emits/CSS变量/盒模型/数据驱动/错误处理 | 查询通用模式和规范 |
| `api-development` | `api-development.md` | Orval API 开发，四层架构/自定义扩展/工作流 | API 使用和扩展 |
| `component-development` | `component-development.md` | 组件开发规范，设计原则/Figma 还原/样式规范 | 组件设计和开发 |
| `router-development` | `router-development.md` | 路由配置，两层路由体系/权限控制/路由守卫 | 路由和权限配置 |

#### 专业 Agents (按需使用)

| Agent | 文件 | 职责 | 适用场景 |
|-------|------|------|----------|
| `store-development` | `store-development.md` | Pinia 状态管理，Store 设计原则/持久化/最佳实践 | Store 设计和实现 |
| `coding-standards` | `coding-standards.md` | 编码规范，TypeScript/Vue/命名/导入规范 | 代码风格检查 |
| `code-review` | `code-review.md` | 代码审查，质量检查/安全审查/性能优化建议 | 代码审查和优化 |
| `testing` | `testing.md` | 测试策略，单元测试/集成测试/Mock/覆盖率 | 测试编写和策略 |
| `project-structure` | `project-structure.md` | 项目结构，目录组织规范/架构设计指导 | 架构设计和组织 |
| `figma-extraction-guide` | `figma-extraction-guide.md` | Figma MCP 技术专家，设计数据提取/资源下载 | Figma 设计还原 |

### Agent 依赖关系

```
common-patterns (单一真实来源：Props/Emits、CSS 变量、盒模型、数据驱动、错误处理)
    ├── component-development (引用 Props/CSS/盒模型/骨架屏)
    │   └── figma-extraction-guide
    ├── coding-standards (引用 Props/CSS/错误处理；另含文件命名规范)
    ├── api-development
    ├── router-development
    ├── store-development
    └── testing
```

### 使用说明

Agents 通过 Task 工具自动调用，你只需描述任务，Claude 会自动选择合适的 Agent：

```bash
# 示例 1: 直接描述任务，Claude 自动匹配 Agent
"帮我创建用户卡片组件"  → Claude 自动使用 component-development agent

# 示例 2: 询问规范问题
"Props 定义有什么规范?"  → Claude 自动使用 common-patterns agent

# 示例 3: 复杂任务
"如何扩展 Orval 生成的 API?"  → Claude 自动使用 api-development agent
```

> **技术细节**: Agents 是 Task 工具的 `subagent_type` 参数，Claude 根据任务内容自动选择。

---

## Hooks - 自动化规则

Hooks 是自动化执行机制，在特定事件触发时自动运行，配置在 `settings.json` 中。

### 当前配置

| Hook | 触发时机 | 作用 | 命令 |
|------|----------|------|------|
| `SessionStart` | 会话开始 | 显示当前分支和未提交文件数 | `printf` 输出信息 |
| `UserPromptSubmit` | 提交提示时 | 有未提交改动时才输出，且截断到 10 行（避免大改动灌满上下文） | `git status --short \| head -10` |
| `PreToolUse(Edit\|Write)` | 写文件前 | 拦截 Edit/Write 对 Orval 生成目录的修改（防止被误改后又被 `pnpm orval` 覆盖），仅精确匹配 `tool_input.file_path`，不误伤正文提到该路径的文档编辑；经 Bash 的写入不在拦截范围 | 见 `settings.json` |

> 以下事件目前**未配置**，仅作为可选扩展参考，见下方"可用的 Hook 事件"。

### 可用的 Hook 事件

| 事件 | 触发时机 | 适用场景 |
|------|----------|----------|
| `PreToolUse` | 工具调用前 | 阻止危险操作、参数校验 |
| `PostToolUse` | 工具调用后 | 自动格式化、通知确认 |
| `UserPromptSubmit` | 提交提示时 | 显示状态、规范提醒 |
| `SessionStart` | 会话开始 | 初始化、欢迎信息 |
| `SessionEnd` | 会话结束 | 清理、状态保存 |
| `Notification` | 发送通知时 | 自定义通知 |
| `Stop` | 主回合结束时 | 收尾校验、汇总提醒 |
| `SubagentStop` | 子代理结束时 | 子任务收尾 |
| `PreCompact` | 上下文压缩前 | 保存关键状态 |

### Hook 配置示例

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "git status --short || true"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "input=$(cat); printf '✅ 已写入: %s\\n' \"$(printf '%s' \"$input\" | jq -r '.tool_input.file_path // empty')\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### 安全原则

```bash
# ✅ 安全：只读命令
git status --short || true
pnpm type-check || true

# ❌ 危险：修改操作 (禁止在 Hook 中使用)
rm -rf dist/
git reset --hard
git push  # 自动推送
```

⚠️ Hook 使用**当前环境的凭据**自动执行，没有确认环节。同样的标准也适用于
`permissions.allow`——放进去就等于免确认，外发和不可逆操作不要放。

**关键点:**
- **Hook 数据从 stdin 读 JSON**，没有 `$CLAUDE_FILE_PATH` 这类环境变量。
  取字段用 `input=$(cat)` + `jq -r '.tool_input.file_path'`（本项目的 `PreToolUse` 就是这么写的）
- `PreToolUse` 里 `exit 2` 表示**拦截该次工具调用**，stderr 的内容会回传给 Claude
- 使用 `|| true` 避免阻塞会话
- 使用 `printf` 替代 `echo` (跨平台兼容)
- 设置 `timeout` 防止长时间执行
- 只运行只读命令，不修改文件或仓库状态

---

## MCP 服务器配置

MCP (Model Context Protocol) 服务器扩展 Claude 的能力。

### 配置文件

| 文件 | 用途 |
|------|------|
| `.mcp.json` | 项目根目录，定义可用的 MCP 服务器（提交） |
| `.claude/settings.local.json` | 通过 `enabledMcpjsonServers` 或 `enableAllProjectMcpServers: true` 决定启用哪些（本地配置，不提交） |

### 当前实际配置

`.mcp.json` 定义了 4 个服务器：

| key | 包 | 用途 |
|-----|----|------|
| `Framelink Figma MCP` | `figma-developer-mcp` | 读取 Figma 设计稿、下载切图（`/figma-to-component` 依赖） |
| `context7` | `@upstash/context7-mcp` | 查询第三方库的最新文档 |
| `ESLint` | `@eslint/mcp` | 调用项目 ESLint 检查文件 |
| `chrome-devtools` | `chrome-devtools-mcp` | 驱动浏览器调试页面、截图、性能分析 |

在 `.claude/settings.local.json` 中启用，例如：

```json
{ "enabledMcpjsonServers": ["Framelink Figma MCP", "context7", "ESLint", "chrome-devtools"] }
```

> ⚠️ `enabledMcpjsonServers` 里的名字必须与 `.mcp.json` 的 key 完全一致，写不存在的名字既不报错也不生效。
>
> **安全提醒**: 不要把真实 API Key 提交到仓库，用环境变量或只写在不提交的本地配置里。

### MCP 工具命名

工具名形如 `mcp__<服务器名>__<工具名>`，**服务器名大小写敏感**，key 中的空格转换为 `_`。
例如 `Framelink Figma MCP` 的工具是 `mcp__Framelink_Figma_MCP__get_figma_data`、`mcp__Framelink_Figma_MCP__download_figma_images`。

---

## Permissions 权限配置

Permissions 控制 Claude 可以自动执行哪些命令（无需确认），配置在 `settings.json` 的 `permissions` 字段。

### 当前允许的命令

| 分类 | 命令 | 说明 |
|------|------|------|
| **只读查看** | `ls`, `find`, `rg`, `grep`, `cat`, `head`, `tail`, `wc`, `echo` | 浏览与搜索 |
| **开发脚本** | `pnpm start:*`, `pnpm build:*` | 启动和构建 |
| **代码生成** | `pnpm orval` | Orval API 生成 |
| **代码质量** | `pnpm lint:*`, `pnpm type-check:*` | ESLint / Stylelint / markdownlint 与 TypeScript 检查 |
| **测试** | `pnpm test:*` | 单元测试（项目未配置 E2E） |
| **Git 只读** | `git status`, `git diff`, `git log`, `git fetch` | 查看状态 |

> **不放进 allow 的**：`git add` / `git commit` / `pnpm commit`（提交需要人确认）、`git merge` / `git pull`（会改动分支历史）、
> `git push`（外发，推出去就收不回）、`git rebase`（改写历史）、`git rm` / `git mv`（改动文件与暂存区）、`git checkout` / `git switch` / `git stash` / `git branch`（改动工作区或分支）。这些每次都需要你确认，与下方「安全说明」一致。

### 配置示例

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm start:*)",
      "Bash(pnpm lint:*)",
      "Bash(git status:*)"
    ],
    "deny": []
  }
}
```

### 安全说明

- **allow**: 列出的命令 Claude 可以直接执行，无需用户确认
- **deny**: 明确禁止的命令（当前为空）
- 使用 `*` 通配符匹配命令参数
- 未列出的命令需要用户手动确认
- 个人额外放行的命令写在 `.claude/settings.local.json`，不要写进共享的 `settings.json`

---

## 问题诊断决策树

```
问题 → 能自动修复?
        ├─ 是 → Skills (自动修复)
        └─ 否 → 知道解决方案?
                ├─ 是 → 手动修复
                └─ 否 → Commands (快速索引)
                        └─ 仍不清楚? → Agents (深度学习)
```

### 常见场景速查

| 场景 | 首选工具 | 备选 |
|------|----------|------|
| TypeScript 类型错误 | `/quick-fix` → `pnpm type-check` | coding-standards agent |
| Vue 组件问题 | `/quick-fix` → `pnpm lint` | component-development agent |
| API 调用失败 | `pnpm orval` → `/quick-fix` | api-development agent |
| 样式/CSS 问题 | common-patterns agent | `pnpm lint` |
| 路由 404/403 | `/quick-fix` | router-development agent |
| 代码提交前 | `/review-pr` → `pnpm type-check` | `/git-workflow` |
| 性能优化 | `/optimize` → `pnpm analyzer` | component-development agent |
| 测试覆盖率不足 | `/test-coverage-checker` | testing agent |

---

## 快速开始

```bash
# 1. 查看工具索引
/tools

# 2. 使用 Command 查看清单
/review-pr

# 3. 直接描述任务，Claude 自动选择 Skill 或 Agent
"帮我创建一个用户列表组件"      # → 自动使用 component-generator skill
"Props 定义有什么规范?"         # → 自动查阅 common-patterns agent
"如何扩展 Orval 生成的 API?"   # → 自动查阅 api-development agent
```

---

## 自定义扩展

### 新增 Command

在 `commands/` 目录创建 `.md` 文件:

```markdown
---
description: 命令描述 (必需)
---

# 命令标题

命令内容...
```

### 新增 Skill

⚠️ Skill **必须是「目录 + SKILL.md」**：`skills/<skill-name>/SKILL.md`。
直接在 `skills/` 下放一个 `.md` 文件不会被识别。

```markdown
---
name: skill-name
description: Skill 功能描述（写清「什么时候用」，这是自动匹配的唯一依据）
---

# Skill 标题

## 功能概述
...

## 使用方式
...

## 执行流程
...
```

### 新增 Agent

在 `agents/` 目录创建 `.md` 文件:

```markdown
---
name: agent-name
description: Agent 职责描述
---

# Agent 标题

## 职责
...

## 规范详情
...
```

### 新增 Hook

在 `settings.json` 的 `hooks` 字段中添加配置:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName",  // 可选，仅 PreToolUse/PostToolUse 使用
        "hooks": [
          {
            "type": "command",
            "command": "your-command || true",
            "timeout": 10  // 可选，单位秒
          }
        ]
      }
    ]
  }
}
```
