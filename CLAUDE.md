# AI 开发助手快速指南

## Git 提交规则
- **提交格式**: `type: subject` 或 `type(scope): subject`
- **示例**: `feat: 添加用户登录功能` 或 `fix(auth): 修复登录验证问题`
- **AI 标识**: 提交代码时不要添加 Co-Authored-By 签名，改为在 commit 末尾添加：🤖 Generated with AI

> 本文档专为 AI 助手设计，提供项目快速概览和文档导航。人类开发者请查看 [README.md](README.md)
>
> 📌 `CLAUDE.md` 与 `AGENTS.md` 是**同一个文件**（后者是前者的符号链接），改一处即生效，不必同步两份。

---

## 🚀 Skills（代码生成器）

| Skill | 说明 | 分类 |
|-------|------|------|
| **architecture-designer** | PRD → 架构设计 | Development |
| **component-generator** | 无设计稿时生成组件 (`--smart`) | Development |
| **figma-to-component** | 有 Figma 设计稿时还原组件 | Development |
| **store-generator** | 智能 Store 生成 (`--smart`) | Development |
| **page-assembler** | 组装已有组件、Store、API 到页面 | Development |
| **api-generator** | 自定义 API 生成（20% 场景；80% 场景用 `pnpm orval`） | Development |
| **code-optimizer** | 提取常量 / Composables / 工具函数 | Quality |
| **test-coverage-checker** | 覆盖率检查 + 自动生成测试 | Quality |
| **implementation-validator** | 代码实现与 PRD/API 一致性校验 | Quality |

**组件生成选择规则**：有 Figma 设计稿 → `figma-to-component`；无设计稿 → `component-generator`；两者不要混用。

**完整文档:** [.claude/README.md](.claude/README.md)

---

## 🔧 Skills / Agents / Commands 怎么选

| 维度 | Skills | Agents | Commands |
|------|--------|--------|----------|
| **定位** | 代码生成器 | 规范指导者 | 快速清单 |
| **触发场景** | "帮我生成 X" | "X 有什么规范?" | 审查/重构/排障前的清单 |
| **示例** | `/component-generator` | `@common-patterns` | `/review-pr` |

**Commands**: `/review-pr` `/refactor` `/optimize` `/security-check` `/tools` `/quick-fix` `/git-workflow`

**Hooks 当前配置**（`.claude/settings.json`）：`UserPromptSubmit`/`SessionStart` 显示 Git 状态；`PreToolUse` 拦截对 `src/api/generated/` 的 Edit/Write（不覆盖经 Bash 的写入，如 `sed -i`、重定向）。⚠️ Hooks 自动运行且使用当前环境凭据，只配置安全的只读或校验类命令。

---

## 📊 项目速读

- **框架**: Vue 3.5 (Composition API + `<script setup>`) + TypeScript 6（严格模式）+ Vite 8
- **状态**: Pinia 4（Composition API 风格，`localforage` + `pinia-plugin-persistedstate` 持久化）
- **路由**: Vue Router 5（静态 + 异步权限路由两层体系）
- **UI**: Element Plus + UnoCSS + SCSS
- **HTTP**: axios（`src/api/core/request.ts`）+ Orval（OpenAPI → 类型安全 API 自动生成）
- **登录**: 本地登录页 `/login`，token 存 Cookie，角色以 `getUserInfo` 接口为准
- **监控**: Sentry（`VITE_SENTRY_DSN` 非空才加载）
- **测试**: Vitest + Vue Test Utils；`vitest.config.ts` **未设覆盖率阈值**，`test:coverage` 只出报告不会失败（需要门禁时自行加 `coverage.thresholds`，注意必须扁平写）

中后台 Vue3 模板，强调**类型安全**、**自动化**和**开发规范**。

---

## 🏗️ 核心架构决策（必读）

1. **API 层**：`src/api/generated/` 是 Orval 生成产物，🚫 绝对禁止手动修改（已由 `PreToolUse` hook 强制拦截）；需要扩展时写在 `src/api/modules/`；统一从 `@/api` 导入，不直接从 `generated/` 导入。直接发请求时，`httpApi.get()/.post()` 返回完整 axios 响应（`res.data` 是 `{ code, data, message }` 信封）；要拿业务数据用 `@/api` 导出的 `get/post/put/del`（返回 `res.data.data`）。失败提示与 401 跳登录由请求层拦截器统一处理，`isIgnoreToast: true` 关闭提示，`skipAuthRedirect: true` 关闭 401 跳转（仅登录接口使用）。详见 [docs/api.md](docs/api.md) 与 [api-development.md](.claude/agents/api-development.md)。
2. **登录与鉴权**：token 只通过 `src/utils/auth.ts` 的 `getToken/setToken/removeToken` 读写；跳登录页用 `jumpToLogin()` / `jumpToLogout()`（整页跳转，回跳地址经 `src/router/redirect.ts` 过滤）；用户与角色状态复用 `useUserInfoStore`，不要新建用户 Store。
3. **两层路由**：`router/routes/static.ts`（无需权限，初始注册）+ `async.ts`（`meta.roles` 控制，登录后按权限动态注册）。守卫拉取用户信息后按角色过滤 `routes/declared.ts` 的 `resolveDeclaredRoutes()` 再 `addRoute`。详见 [router-development.md](.claude/agents/router-development.md)。
4. **全局插件禁止重复配置**：`src/plugins/` 下的插件已全局注册——Dayjs (`dayjs.ts`，含 relativeTime/utc/isoWeek/isToday + zh-cn/en) 与 i18n (`locale.ts`)。组件内直接 `import` 使用，不要重新 `extend` 或 `createI18n`。
5. **CSS 主题系统**：所有颜色必须用 `public/assets/theme.css` 中的 CSS 变量（`var(--aix-colorXxx)`），禁止硬编码色值。`theme.css` 是静态文件，浅色写在 `:root`、暗色写在 `:root[data-theme='dark']` 与 `.dark`，换品牌色直接改其中的变量；Element 组件通过 `styles/theme.scss` 的桥接与 `color-mix` 阶梯跟随 `--aix-colorPrimary`，不要只改 `--el-color-primary`。详见 [common-patterns.md#css-变量使用规范](.claude/agents/common-patterns.md#css-变量使用规范)。

---

## 📁 关键目录速查

| 目录 | 职责 | 注意事项 |
|------|------|---------|
| `src/api/generated/` | Orval 生成产物 | 🚫 **禁止修改**（运行 `pnpm orval` 后才存在，写入已被 hook 拦截） |
| `src/api/modules/` | 自定义/扩展 API | ✅ 手写 API 的位置（`auth.ts`、`override.ts`） |
| `src/api/core/` | axios 实例 / mutator | 手动维护，Orval 通过 mutator 接入 |
| `src/components/` | 全局公用组件 | 多页面复用的纯 UI 组件和业务组件 |
| `src/components/Skeleton/` | 骨架屏组件 | CardSkeleton / TableSkeleton / SkeletonWrap |
| `src/composables/useSkeleton.ts` | 骨架屏 Composable | 组件级骨架屏控制（loading/visible + 防闪烁）；**无路由级骨架屏** |
| `src/views/[page]/components/` | 页面级组件 | 特定页面的专属组件 |
| `src/views/login/` | 登录页 | `index.vue` 单文件账号密码登录 |
| `src/views/exception/` | 异常页 | `Forbidden.vue` 全屏 403（守卫落点、白名单）；`index.vue` 布局内兜底（403/404，保留原 URL）；共用 `components/ErrorPage` |
| `src/router/routes/` | 路由配置 | 两层路由体系（static + async）；`declared.ts` 的 `resolveDeclaredRoutes()` 给出未按角色过滤的全量表（守卫过滤后注册、兜底页据它区分 403/404）；`fallback.ts` 兜底路由由守卫最后注册 |
| `src/router/guards.ts` | 路由守卫 | 白名单 `/login`、`/403`；未登录跳 `/login?redirect=`；角色为空或拉取失败跳 `/403` |
| `src/store/modules/` | Pinia Store | Composition API 风格；`user-info.ts` 管登录态与用户资料 |
| `src/store/plugins/persist.ts` | Pinia 持久化方案 | localforage + pinia-plugin-persistedstate |
| `src/plugins/` | 全局插件与内核 | Dayjs、locale；`sentry/` 错误上报；`site-config/` 站点配置内核（非 Vue 插件） |
| `src/plugins/site-config/` | 站点配置内核 | `types.ts`（零依赖类型）/ `index.ts`（合并·差分·校验）/ `color.ts`（颜色解析与比较）/ `source.ts`（存储源接缝）；schema 本体在 `src/constants/site-config.ts` |
| `src/utils/error-handler.ts` | 全局错误处理 | `handleError`/`handleErrorSilently` 用于非请求类错误；`reportGlobalError` 是未捕获错误的统一出口（`app.config.errorHandler` 与 window 的 `error`/`unhandledrejection` 监听都走它，Sentry 通过 `setupGlobalErrorHandler` 的 `onError` 接入） |
| `src/locale/`、`public/locale/` | 语言包 | 手工维护；前者随构建打包，后者运行时增量合并 |
| `tests/` | 测试文件目录 | 目录镜像 `src/`，写法见 [tests/README.md](tests/README.md) |
| `public/assets/theme.css` | CSS 主题变量 | 所有颜色必须使用变量 |
| `.claude/agents/` | AI 专业指导文档 | 详细的开发规范 |
| `.claude/skills/` | Claude Code Skills | 自动化工具 |

---

## 🤖 AI Agent 导航

Agents 通过 Task 工具的 `subagent_type` 自动匹配，直接描述任务或用 `@agent-name` 显式调用均可。

### 核心 Agent（优先使用）

| Agent | 适用场景 | 文档链接 |
|-------|---------|---------|
| **common-patterns** | 通用开发模式（单一真实来源）：Props、CSS 变量、数据驱动、错误处理 | [查看文档](.claude/agents/common-patterns.md) |
| **api-development** | Orval API 使用、自定义扩展 | [查看文档](.claude/agents/api-development.md) |
| **component-development** | 组件开发、Figma 还原、样式规范 | [查看文档](.claude/agents/component-development.md) |
| **router-development** | 路由配置、权限控制、路由守卫 | [查看文档](.claude/agents/router-development.md) |

### 专业 Agent（按需使用）

| Agent | 适用场景 | 文档链接 |
|-------|---------|---------|
| **store-development** | Pinia 状态管理、Store 设计 | [查看文档](.claude/agents/store-development.md) |
| **coding-standards** | 编码规范、代码风格检查 | [查看文档](.claude/agents/coding-standards.md) |
| **code-review** | 代码审查、质量检查、性能优化 | [查看文档](.claude/agents/code-review.md) |
| **testing** | 测试策略、单元测试、集成测试 | [查看文档](.claude/agents/testing.md) |
| **project-structure** | 项目结构、目录组织、架构设计 | [查看文档](.claude/agents/project-structure.md) |
| **figma-extraction-guide** | Figma MCP 使用、设计稿提取 | [查看文档](.claude/agents/figma-extraction-guide.md) |

---

## 🚀 常见开发任务

| 任务 | 步骤概览 | 详细指导 |
|------|---------|---------|
| 新增页面 | 创建 `src/views/[page]/index.vue` → 在 `router/routes/` 配置路由 | [router-development.md](.claude/agents/router-development.md) |
| 新增组件 | 全局组件放 `src/components/`，页面级放 `src/views/[page]/components/`，Props/Emits 用 TS 接口 | [component-development.md](.claude/agents/component-development.md) |
| 调用 API | 80% 场景直接用 Orval 生成函数或接入 Pinia Store；20% 场景在 `modules/` 用 `get/post/put/del` 扩展 | [api-development.md](.claude/agents/api-development.md) |
| 配置路由权限 | 在 `async.ts` 中设置 `meta.roles: [ROLES.ADMIN, ...]`；页面内用 `usePermission` 或 `v-role` | [router-development.md](.claude/agents/router-development.md) |
| 对接登录接口 | 按后端接口调整 `src/api/modules/auth.ts` 的路径与字段，`login` 保留 `skipAuthRedirect: true` | [docs/api.md](docs/api.md) |

---

## ⚠️ 重要约定和禁忌

### 🚫 禁止事项

| 禁止操作 | 说明 | 后果 |
|---------|------|------|
| 🚫 修改 `src/api/generated/` | Orval 生成目录，运行 `pnpm orval` 会覆盖 | 修改会丢失（已被 hook 拦截） |
| 🚫 直接从 `generated/` 导入 | 破坏导出优先级 | 自定义扩展不生效 |
| 🚫 另建 axios 实例 | 绕过统一拦截器 | 丢失 token 注入、错误提示与 401 处理 |
| 🚫 组件内自行处理 401 / 跳登录 | 请求层已统一处理 | 重复跳转、回跳地址未过滤 |
| 🚫 使用内联 SVG 标签 | 直接用 `<svg>` 或 `v-html` 插入 SVG | 维护困难、无法复用、体积增大 |
| 🚫 硬编码颜色值 | 不使用 CSS 变量（**例外**：Figma 还原阶段优先用设计稿标注值，后续再替换；`pnpm checkCssVars` 的输出是待替换清单，非门禁） | 主题切换失效 |
| 🚫 重复配置全局插件 | Dayjs、i18n 已全局配置 | 浪费资源，可能冲突 |
| 🚫 使用标签选择器 | 直接用 `h1`, `p`, `div` | 样式污染，维护困难 |

### ✅ 必须遵守

| 规范 | 说明 | 参考文档 |
|------|------|---------|
| ✅ SVG 用 SvgIcon 组件 | 下载为文件后 `<SvgIcon name="[dir]-[name]" />`（可 currentColor 换色）；纯装饰不换色才用 `<img>` | [common-patterns.md](.claude/agents/common-patterns.md#图标使用规范) |
| ✅ Props/Emits 类型定义 | 完整的 TypeScript 接口 | [common-patterns.md](.claude/agents/common-patterns.md#props-定义规范) |
| ✅ 使用 CSS 变量 | `var(--aix-colorXxx)` | [common-patterns.md](.claude/agents/common-patterns.md#css-变量使用规范) |
| ✅ 数据驱动 | `v-for` + 数据数组 | [common-patterns.md](.claude/agents/common-patterns.md#数据驱动模式) |
| ✅ 错误处理 | API 错误由请求层拦截器自动提示；非请求错误用 `error-handler.ts` | [common-patterns.md](.claude/agents/common-patterns.md#错误处理模式) |
| ✅ RGB 新语法 | `rgb(r g b / alpha)` | [common-patterns.md](.claude/agents/common-patterns.md#rgb-颜色函数规范) |
| ✅ 文案默认写中文明文 | 需要多语言时手工在 `src/locale/*.json`（及 `public/locale/*.json`）加 key 后用 `$t`/`t()`；项目没有自动抽取翻译工具 | [README.md](README.md#国际化) |
| ✅ 文件命名 | `.vue` PascalCase（`index.vue` 除外）、`use*` camelCase、其余 `.ts` kebab-case（ESLint 强制） | [coding-standards.md](.claude/agents/coding-standards.md) |

---

## 📚 文档地图

- **AI 助手导航路径**：本文档（导航）→ `.claude/agents/*.md`（详细规范）→ `.claude/skills/*/SKILL.md`（生成细节）
- 人类开发者请看 [README.md](README.md)；Agent 全量索引见上方"AI Agent 导航"
- API 层：[docs/api.md](docs/api.md)；部署：[docs/deployment.md](docs/deployment.md)；测试：[tests/README.md](tests/README.md)；Orval 生成配置：[orval.config.ts](orval.config.ts)

---

## 📋 常用命令

```bash
pnpm start              # 启动开发服务器（localhost:9091，HTTPS）
pnpm build              # 构建生产版本
pnpm orval              # 根据 OpenAPI 文档生成 API 代码到 src/api/generated/
pnpm lint               # ESLint + Stylelint + markdownlint（自动修复）
pnpm type-check         # TypeScript 类型检查
pnpm test               # 运行测试（test:watch / test:coverage / test:ui 同理）
pnpm checkCssVars       # 检查 CSS 变量使用
pnpm cspell             # 拼写检查
pnpm uploadToSentry     # 构建并上传 sourcemap（需 SENTRY_AUTH_TOKEN）
```
