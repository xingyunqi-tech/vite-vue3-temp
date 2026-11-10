---
name: project-structure
description: 项目目录结构分析、文件组织规范和架构设计指导
tools: Read, Grep, Glob
model: inherit
---

# 项目结构解析 Agent

## 职责
负责项目目录结构分析、文件组织规范和架构设计指导，帮助AI理解项目布局和各目录的作用。

## 🏗️ 项目整体架构

### 技术栈
- **前端框架**: Vue 3.5 (Composition API)
- **构建工具**: Vite 8
- **语言**: TypeScript 6
- **状态管理**: Pinia（`pinia-plugin-persistedstate` + localforage/IndexedDB 持久化）
- **路由**: Vue Router 5
- **UI库**: Element Plus
- **样式**: UnoCSS + SCSS，设计变量见 `public/assets/theme.css`（`--aix-*`）
- **国际化**: vue-i18n
- **HTTP客户端**: Axios（`src/api/core/request.ts`）+ Orval 代码生成
- **测试**: Vitest + jsdom + @vue/test-utils
- **错误上报**: Sentry（`VITE_SENTRY_DSN` 非空时启用）
- **工具链**: pnpm 11、Node >= 22.18

### 架构模式
- **分层架构**: 视图层 → 业务层 → 数据层
- **模块化设计**: 按功能模块组织代码
- **组件化开发**: 可复用的UI组件
- **类型驱动**: TypeScript严格类型检查

## 📁 目录结构详解

```
vite-vue3-temp/
├── .claude/                    # Claude AI 配置（agents / skills / commands / settings）
├── .github/                    # GitHub Actions（check、deploy、cleanup-registry）
├── .husky/                     # Git hooks（pre-commit / commit-msg）
├── config/
│   └── devServer.ts            # 开发服务器（端口、/api 代理、HTTPS）
├── deploy/                     # nginx.conf、manage.sh、README.md（容器部署）
├── docs/                       # 项目文档（api.md / deployment.md）
├── public/
│   ├── assets/
│   │   ├── theme.css           # 设计变量（--aix-*，静态文件，浅色 :root / 暗色 [data-theme='dark']、.dark）
│   │   ├── loading.css
│   │   └── logo.png
│   └── locale/                 # 运行时远程语言包（zh-CN / en-US，增量合并）
├── scripts/
│   ├── api/                    # transform-openapi.ts / update-api-exports.ts
│   ├── cssVars/                # checkCssVars.ts（硬编码颜色巡检）
│   └── husky/                  # commit-msg.ts / pre-commit.ts
├── src/
│   ├── api/                    # API 层（core / generated / modules）
│   ├── app/                    # 应用装配：App.vue、render.ts（renderApp 与 AppSetupHooks）
│   ├── assets/                 # icons / images / iconfont
│   ├── components/             # 全局公用组件（ConfigEditor / ErrorBoundary / ErrorPage / SchemaForm / Skeleton / SvgIcon）
│   ├── composables/            # 组合式函数（usePermission / useSiteConfig / useSkeleton / useThemeTransition）
│   ├── constants/              # 常量（index.ts 统一导出；roles / menu / system / site-config）
│   ├── directives/             # 自定义指令（role.ts → v-role）
│   ├── interface/              # TypeScript 接口定义
│   ├── layout/                 # 布局（index.vue / BlankLayout / LayoutHeader / LayoutMenu / LayoutMain）
│   ├── locale/                 # 内置语言包（zh-CN / en-US，随构建打包）
│   ├── plugins/                # dayjs.ts、locale.ts、sentry/、site-config/（站点配置内核）
│   ├── router/                 # 路由（index.ts / guards.ts / redirect.ts / title.ts / route-tree.ts / routes/）
│   ├── store/                  # Pinia（modules/ + plugins/persist.ts）
│   ├── styles/                 # 全局样式（theme.scss 把 Element 变量桥接到 --aix-*）
│   ├── utils/                  # 工具函数
│   ├── views/                  # 页面组件（home / login / setting / exception）
│   └── main.ts                 # 应用入口
├── typings/                    # TypeScript 类型声明
├── tests/                      # 测试文件（测试只放这里，不放 src/）
├── Dockerfile / package.sh     # 镜像构建与打包脚本，说明见 docs/deployment.md
└── 配置文件                    # vite / vitest / eslint / stylelint / prettier / commitlint / orval / uno 等
```

**国际化相关目录**：`src/locale/`（内置语言包）、`public/locale/`（运行时语言包）、
`src/plugins/locale.ts`（全局注册）。语言包手工维护，无自动抽取工具。

## 📂 核心目录详解

### `.claude/` - AI配置目录
```
.claude/
├── agents/                     # AI Agent 规范文档
│   ├── project-structure.md    # 项目结构解析（当前文件）
│   ├── coding-standards.md     # 编码规范和最佳实践
│   ├── code-review.md          # 代码审查清单和规范
│   ├── common-patterns.md      # 通用开发模式（单一真实来源）
│   ├── component-development.md # Vue 组件开发指导
│   ├── api-development.md      # API 接口开发规范
│   ├── router-development.md   # 路由开发指导
│   ├── store-development.md    # Pinia Store 开发指导
│   ├── figma-extraction-guide.md # Figma MCP 设计稿提取
│   └── testing.md              # 测试策略和规范
├── skills/<name>/SKILL.md      # Claude Code Skills（必须是目录 + SKILL.md）
├── commands/                   # 快速清单命令
├── README.md                   # .claude 配置总说明
├── settings.json               # 权限 + hooks（提交到仓库）
└── settings.local.json         # 本地覆盖（不提交）
```

**作用**:
- 存储AI编程助手的配置和指导文档
- 不同的AI任务读取对应的agent文档
- 提供项目特定的编程规范和最佳实践

### `config/` - 项目配置目录
```
config/
└── devServer.ts               # 开发服务器：localhost:9091，代理 /api → 本地后端、/localService；HTTPS 由 VITE_ENABLE_HTTPS 控制
```

**作用**:
- 集中管理开发服务器与代理配置
- 环境变量放在根目录 `.env.development` / `.env.production`

### `scripts/` - 自动化脚本目录
```
scripts/
├── api/                       # API/OpenAPI 转换脚本
│   ├── transform-openapi.ts   # Orval transformer（生成 tag 等）
│   └── update-api-exports.ts  # 生成后自动更新统一导出
├── cssVars/                   # CSS 变量检查脚本
│   └── checkCssVars.ts        # 扫描硬编码颜色
└── husky/                     # Git hooks 脚本
    ├── commit-msg.ts          # 提交信息检查（commitlint，conventional commits）
    └── pre-commit.ts          # lint-staged；改动涉及源码时再跑 type-check + test
```

**作用**:
- 自动化开发流程
- Orval 生成产物加工
- Git hooks 集成
- 代码质量保证

### `src/api/` - API接口层（Orval自动生成）

**重要**: 详细的Orval架构说明参考 [@api-development.md](api-development.md)

**目录结构**:
```
src/api/
├── core/          # 基础设施（手动维护）
├── generated/     # 自动生成（🚫 禁止修改）
├── modules/        # 自定义扩展（手动维护）
└── index.ts       # 统一导出
```

**核心原则**:
- 🚫 **绝不修改** `generated/` 目录
- ✅ 从 `@/api` 统一导入
- ✅ 扩展在 `modules/` 目录
- ✅ 导出优先级: custom > generated

**详细架构**: 参考 [@api-development.md](api-development.md)

### `src/components/` - 通用组件目录
```
src/components/
├── ConfigEditor/             # 站点配置编辑器（可视化 / 代码模式）
├── ErrorBoundary/            # 错误边界
├── ErrorPage/                # 异常页展示
├── SchemaForm/               # 按 schema 渲染表单
├── Skeleton/                 # 骨架屏组件（index.ts 统一导出）
└── SvgIcon/                  # 本地 SVG / iconfont 图标
```

**组件命名规范**:
- 目录名: PascalCase (如 `UserCard`)
- 文件名: `index.vue` (主文件)
- 类型文件: `types.ts` (可选)
- 文档文件: `README.md` (可选)

**作用**:
- 可复用的UI组件
- 业务无关的通用功能
- 提高开发效率
- 保持UI一致性

### `src/views/` - 页面组件目录
```
src/views/
├── home/                      # 首页（目录名小写短横线，与路由 path 对应）
│   └── index.vue             # 页面主文件
├── login/                     # 本地登录页（白名单路由 /login）
│   └── index.vue             # 账号密码登录
├── setting/
│   ├── index.vue
│   └── Frontend.vue          # .vue 文件名用 PascalCase（eslint 强制）
├── exception/
│   ├── Forbidden.vue         # 全屏 403（守卫落点、白名单）
│   └── index.vue             # 布局内兜底：按路径判 403 / 404，保留原 URL
└── ...
```

**页面组织原则**:
- 每个页面一个目录
- 复杂页面可包含私有组件
- 页面间不能直接引用
- 通过路由进行页面跳转

### `src/store/` - 状态管理目录
```
src/store/
├── index.ts                   # 统一导出；默认导出是 Promise，main 侧需 await
├── plugins/persist.ts         # localforage(IndexedDB) 持久化
└── modules/
    ├── user-info.ts           # useUserInfoStore（登录 / 用户信息 / 登出，token 真源是 Cookie）
    ├── permission.ts          # usePermissionStore（动态路由 + 菜单）
    ├── global.ts              # useGlobalStore（语言/主题/侧边栏）
    └── site-config.ts         # useSiteConfigStore
```

**状态管理原则**:
- 使用Pinia进行状态管理
- 按业务模块拆分Store
- 组合式API风格
- 类型安全的状态定义

### `src/utils/` - 工具函数目录
```
src/utils/
├── index.ts                   # 统一导出（只 re-export 下面三个）
├── auth.ts                    # token Cookie 读写（getToken / setToken / removeToken）、jumpToLogin / jumpToLogout
├── datetime.ts                # 日期/文件大小/名单格式化
└── error-handler.ts           # 非请求类错误处理（handleError / handleErrorSilently）
                               # + 未捕获错误统一出口（reportGlobalError / setupGlobalErrorHandler）
```

⚠️ 目前**只有这三个**工具文件。`date.ts` / `request.ts` / `storage.ts` / `validation.ts`
都不存在，不要凭空 import；确需新增时按 kebab-case 命名（见下方命名规范）。

**工具函数原则**:
- 纯函数，无副作用
- 单一职责
- 完整的类型定义
- 详细的JSDoc注释

### `typings/` - 类型声明目录
```
typings/
├── global.d.ts               # 全局类型声明
├── env.d.ts                  # 环境变量类型
├── router.d.ts               # RouteMeta 扩展
├── components.d.ts           # 自动注册组件类型（unplugin-vue-components 生成）
├── iconfont.d.ts             # iconfont 模块声明
└── vue.d.ts                  # .vue 文件模块声明
```

**类型声明原则**:
- 全局类型统一管理
- 第三方库类型补充
- 环境变量类型定义
- 资源文件类型声明

## 🔄 文件引用规范

> **详细的 API 导入规范**: 详见 [api-development.md#类型导入规范](api-development.md#类型导入规范)
> **完整的代码风格规范**: 详见 [coding-standards.md#api-导入规范](coding-standards.md#api-导入规范)

### 导入路径规范

```typescript
// ✅ 正确：使用路径别名导入
import { postAuthLogin, getAuthUserInfo } from '@/api';  // API 从 @/api 统一导入
import type { LoginRequest, UserInfo } from '@/api';      // 类型也从 @/api 导入
import { useUserInfoStore } from '@/store/modules/user-info';

// ❌ 错误：直接从 generated 导入（破坏 Orval 架构）
import { postAuthLogin } from '@/api/generated/auth/auth';

// ❌ 错误：相对路径过长
import { postAuthLogin } from '../../../api';
```

> **完整的导入顺序规范**: 详见 [coding-standards.md#导入顺序](coding-standards.md#导入顺序)

### 组件引用规范
```typescript
// ✅ 正确：页面组件引用通用组件
import ErrorBoundary from '@/components/ErrorBoundary/index.vue';

// ✅ 正确：页面组件引用自己的私有组件
import UserForm from './components/UserForm.vue';

// ❌ 错误：页面间直接引用
import UserList from '@/views/User/components/UserList.vue';
```

## 📋 目录创建指导

### 新增页面
```bash
# 1. 在 views 下创建页面目录（小写短横线，与路由 path 一致）
mkdir src/views/user-management

# 2. 创建页面主文件
touch src/views/user-management/index.vue

# 3. 如需私有组件，创建 components 目录
mkdir src/views/user-management/components

# 4. 到 src/router/routes/static.ts 或 async.ts 注册路由
```

### 新增组件
```bash
# 1. 在components目录下创建组件目录
mkdir src/components/NewComponent

# 2. 创建组件主文件
touch src/components/NewComponent/index.vue

# 3. 可选：创建类型定义文件
touch src/components/NewComponent/types.ts

# 4. 可选：创建组件文档
touch src/components/NewComponent/README.md
```

### 新增/扩展API

**Orval架构下有三种方式**:

```bash
# 方式1: 直接使用自动生成的API（推荐80%场景）
# 无需任何操作，执行 pnpm orval 即可获得最新API

# 方式2: 覆盖/扩展自动生成的API（15%场景）
# 在 src/api/modules/ 目录下创建同名文件

# 方式3: 完全自定义API（5%场景）
# 在 src/api/modules/ 目录中添加自定义接口文件
# 适用于：文件上传、WebSocket、第三方API等
```

**注意**:
- ✅ 类型定义从 `@/api` 导入，由Orval自动生成
- ❌ 不要在 `interface/` 目录创建重复的API类型
- ❌ 绝对不要修改 `src/api/generated/` 目录

## 🎯 AI编程指导原则

### 1. 目录选择原则
- **通用组件** → `src/components/`
- **页面组件** → `src/views/`
- **API接口** → `src/api/modules/` (自定义扩展)
- **API类型** → 从 `@/api` 导入（自动生成）
- **其他类型** → `src/interface/` 或 `typings/`
- **工具函数** → `src/utils/`
- **状态管理** → `src/store/modules/`

### 2. 文件命名原则（ESLint `check-file` 强制，违反会 lint error）

| 匹配 | 规则 | 示例 |
|------|------|------|
| `**/*.vue` | **PascalCase** | `Frontend.vue`、`UserCard/index.vue` |
| `src/**/use[A-Z]*.{ts,js}` | **camelCase** | `useSkeleton.ts`、`usePermission.ts` |
| 其余 `src/**/*.{ts,tsx,js,jsx}` | **kebab-case** | `user-info.ts`、`error-handler.ts`、`site-config.ts` |
| `src/**/*.d.ts` | 不校验 | — |

- 组件目录名用 PascalCase（`src/components/SvgIcon/`），页面目录名用小写短横线（`src/views/setting/`）
- ⚠️ 新建工具/Store/常量文件时**用 kebab-case**（`user-info.ts` 而非 `userInfo.ts`）

### 3. 代码组织原则
- **单一职责**: 每个文件只负责一个功能
- **模块化**: 按业务功能组织代码
- **类型安全**: 所有代码都要有类型定义
- **文档化**: 复杂逻辑要有注释说明

### 4. 引用关系原则
- **向上引用**: 可以引用上层或同层模块
- **禁止循环引用**: 避免模块间循环依赖
- **页面隔离**: 页面间不能直接引用
- **组件复用**: 通用组件可被任意引用

通过遵循这些目录结构和组织原则，可以确保项目的可维护性和可扩展性，同时为AI编程提供清晰的指导。
