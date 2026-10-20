# Vite Vue3 Template

> 基于 Vue 3 + TypeScript + Vite 的中后台前端模板：本地登录、角色权限路由、axios 请求层 + Orval 代码生成、站点配置、国际化与 Sentry 错误上报

[![Node.js](https://img.shields.io/badge/node-%3E%3D22.18-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220)](https://pnpm.io/)
[![Vue.js](https://img.shields.io/badge/vue-3.5-brightgreen)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-6.x-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-8.x-646CFF)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/vitest-5.x-6E9F18)](https://vitest.dev/)

## ✨ 特性

- 🚀 **技术栈**：Vue 3.5 + TypeScript 6 + Vite 8 + Pinia 4 + Vue Router 5
- 🎨 **UI**：Element Plus（组件按需自动注册）+ UnoCSS + SCSS，颜色统一走 `--aix-*` CSS 变量，支持明暗主题
- 🔐 **本地登录与鉴权**：登录页 + Cookie token，路由守卫拉取用户角色后动态注册权限路由
- 🌐 **请求层**：axios 实例 + 统一业务码校验 / 401 跳登录 / 错误提示，Orval 从 OpenAPI 生成类型安全接口
- 🌍 **国际化**：vue-i18n，语言切换联动 Element Plus、Dayjs 与 `html[lang]`，支持运行时远程语言包
- ⚙️ **站点配置**：系统标题、Logo、默认页、默认主题、水印等可在设置页可视化编辑
- 🛡️ **错误处理**：全局错误出口 + ErrorBoundary，配置 DSN 后自动接入 Sentry
- 💀 **骨架屏**：组件级骨架屏（CardSkeleton、TableSkeleton）与 `useSkeleton` 防闪烁
- ✅ **工程规范**：ESLint + Stylelint + Prettier + markdownlint + CSpell，Husky + lint-staged + commitlint，Vitest 单元测试

## 🏗️ 技术架构

### 核心技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建 | Vite 8 |
| 语言 | TypeScript 6（严格模式） |
| 状态管理 | Pinia 4 + pinia-plugin-persistedstate（localforage 存储） |
| 路由 | Vue Router 5（静态路由 + 按角色动态注册的异步路由） |
| UI | Element Plus + UnoCSS + SCSS |
| HTTP | axios + Orval 代码生成 |
| 国际化 | vue-i18n |
| 监控 | @sentry/vue（按需异步加载） |
| 测试 | Vitest + @vue/test-utils + jsdom |

### 工程工具

- **代码检查**：ESLint（`eslint.config.mjs`）、Stylelint（`stylelint.config.mjs`）、markdownlint-cli2
- **格式化**：Prettier（`prettier.config.js`：printWidth 120、单引号、`arrowParens: avoid`）
- **Git 钩子**：Husky（pre-commit 跑 lint-staged + type-check + test，commit-msg 跑 commitlint）
- **提交规范**：Conventional Commits（`commitlint.config.ts` + czg）
- **拼写检查**：CSpell

## 📁 项目结构

```
├── .claude/                   # AI 协作配置（agents / skills / commands / settings.json）
├── .github/                   # GitHub Actions（check-quality、build-deploy）与 dependabot
├── .husky/                    # Git hooks
├── .vscode/                   # VS Code 推荐插件与设置
├── config/
│   └── devServer.ts           # 开发服务器：端口、代理目标
├── deploy/                    # nginx.conf、manage.sh（容器部署）
├── docs/                      # 项目文档（api.md、deployment.md）
├── public/
│   ├── assets/                # theme.css（--aix-* 设计变量）、loading.css、logo.png
│   └── locale/                # 运行时远程语言包（zh-CN / en-US）
├── scripts/                   # 工具脚本（api / cssVars / husky）
├── src/
│   ├── api/
│   │   ├── core/              # axios 实例、Orval mutator、类型
│   │   ├── generated/         # 🚫 Orval 生成（运行 pnpm orval 后出现，禁止手改）
│   │   ├── modules/           # 手写接口（auth.ts）与覆盖示例（override.ts）
│   │   └── index.ts           # 统一导出
│   ├── app/                   # App.vue、render.ts（应用创建与挂载）
│   ├── assets/                # iconfont、icons（SvgIcon 源文件）、images
│   ├── components/            # 全局组件（ConfigEditor、ErrorBoundary、ErrorPage、SchemaForm、Skeleton、SvgIcon）
│   ├── composables/           # usePermission、useSiteConfig、useSkeleton、useThemeTransition
│   ├── constants/             # 系统常量、角色、菜单、站点配置 schema
│   ├── directives/            # 全局指令（v-role）
│   ├── interface/             # TypeScript 接口定义
│   ├── layout/                # 布局（LayoutHeader、LayoutMain、LayoutMenu、BlankLayout）
│   ├── locale/                # 内置语言包（zh-CN / en-US）
│   ├── plugins/               # dayjs、locale、sentry/、site-config/（站点配置内核）
│   ├── router/
│   │   ├── routes/            # static / async / declared / fallback
│   │   ├── guards.ts          # 路由守卫（登录校验、角色路由注册）
│   │   ├── redirect.ts        # 登录回跳地址解析
│   │   ├── route-tree.ts
│   │   └── title.ts           # 页面标题
│   ├── store/
│   │   ├── modules/           # global、permission、site-config、user-info
│   │   └── plugins/           # persist.ts（localforage + persistedstate）
│   ├── styles/                # 全局样式、theme.scss（Element 变量桥接）
│   ├── utils/                 # auth、datetime、error-handler
│   ├── views/                 # ai、content、exception、login、setting、system
│   └── main.ts                # 入口
├── tests/                     # Vitest 测试（目录镜像 src/）
├── typings/                   # 全局类型声明
├── Dockerfile / package.sh    # 镜像构建与打包
├── orval.config.ts
├── vite.config.ts / vitest.config.ts
└── uno.config.ts
```

**示例页面**：`src/views/setting/`（站点配置编辑）及其依赖的 `src/components/SchemaForm/`、`src/components/ConfigEditor/`，不需要时可整组删除。

## 🚀 快速开始

### 环境要求

- **Node.js** >= 22.18（见 `.nvmrc`）
- **pnpm** >= 11（见 `package.json` 的 `packageManager`）

### 安装与启动

```bash
pnpm install
pnpm start        # http://localhost:9091 起开发服务器（HTTPS，证书由 vite-plugin-mkcert 生成）
```

开发服务器把 `/api` 代理到 `config/devServer.ts` 的 `hostDict.API_SERVICE`（默认 `localhost:3002`），`/localService` 代理到 `hostDict.LOCAL_SERVICE`。接入真实后端时改这两个地址。

### 构建

```bash
pnpm build        # 产物输出到 dist/
pnpm preview      # 预览构建结果
pnpm analyzer     # 构建并输出包体分析
```

部署（Docker、package.sh、manage.sh、GitHub Actions）见 [docs/deployment.md](./docs/deployment.md)。

## 📜 脚本命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 启动开发服务器（HTTPS） |
| `pnpm build` | 清理 `dist/` 后构建生产包 |
| `pnpm preview` | 预览构建产物（HTTPS） |
| `pnpm analyzer` | 构建并生成包体分析（rollup-plugin-visualizer） |
| `pnpm uploadToSentry` | 构建并上传 sourcemap 到 Sentry（需 `SENTRY_AUTH_TOKEN`） |
| `pnpm clean` | 删除 `dist/` |
| `pnpm test` | 运行全部测试（单次） |
| `pnpm test:watch` / `test:coverage` / `test:ui` | 监听模式 / 覆盖率报告 / 可视化界面 |
| `pnpm type-check` | 类型检查（`type-check:app` + `type-check:node` + `type-check:test`） |
| `pnpm lint` | `lint:script` + `lint:style` + `lint:md`（均带自动修复） |
| `pnpm lint:check` | 只检查不修复（ESLint、Stylelint、markdownlint、Prettier） |
| `pnpm format` | Prettier 格式化全部文件 |
| `pnpm cspell` | 拼写检查 |
| `pnpm checkCssVars` | 列出未使用 CSS 变量的硬编码颜色 |
| `pnpm orval` | 根据 OpenAPI 文档生成 `src/api/generated/` |
| `pnpm commit` | 交互式规范化提交（czg） |

## 🔧 配置说明

### 环境变量

| 变量 | 所在文件 | 说明 |
|------|---------|------|
| `VITE_BASEURL` | `.env.development` / `.env.production` | 请求 baseURL；留空时取 `window.location.origin`，开发环境经 `/api` 代理转发 |
| `VITE_BASE_PATH` | `.env.production` | 部署路径，同时决定静态资源 base 与 vue-router base，默认 `/` |
| `VITE_LEGACY` | 命令行 / `.env.*` | 为 `'true'` 时给 modern 包注入 core-js polyfill |
| `VITE_ENABLE_HTTPS` | 由 `pnpm start` / `pnpm preview` 设置 | 为 `'true'` 时启用 mkcert HTTPS |
| `VITE_ENABLE_ANALYZER` | 由 `pnpm analyzer` 设置 | 为 `'true'` 时生成包体分析 |
| `VITE_SENTRY_DSN` | `.env.*` | Sentry DSN，留空则不初始化 Sentry |
| `SENTRY_ORG` / `SENTRY_PROJECT` | `.env.production` | sourcemap 上传的组织与项目（构建期） |
| `SENTRY_AUTH_TOKEN` | `.env.local` | sourcemap 上传凭证，不要提交到仓库 |

本地覆盖写在 `.env.local` / `.env.development.local`。

### 登录与鉴权

- **登录页**：`src/views/login/`（`index.vue` 单文件账号密码登录）
- **接口**：`src/api/modules/auth.ts` 的 `login`（`POST /api/auth/login`，返回 `{ token }`）、`logout`、`getUserInfo`（`GET /api/auth/current-user`，返回含 `role` 的用户资料）。路径与字段为约定形态，接入后端时按接口文档调整
- **token**：存在 Cookie（键名 `TOKEN_KEY`），读写用 `src/utils/auth.ts` 的 `getToken / setToken / removeToken`；请求层把它放进 `Authorization` 头
- **路由守卫**（`src/router/guards.ts`）：`/login`、`/403` 免登录；未登录跳 `/login?redirect=<原地址>`；首次导航调用 `useUserInfoStore().getInfoAction()` 拉取用户资料与角色，按角色注册异步路由；角色为空或拉取失败落到 `/403`；其他标签页换了账号时整页刷新
- **401**：业务码或 HTTP 状态为 401 时清除 token 并整页跳转登录页（并发只跳一次），登录后回到原页面
- **角色**：`ROLES`（`ADMIN` 管理员 / `EDITOR` 内容编辑 / `REVIEWER` 内容审核），对应后端角色 ID 1 / 3 / 4，其余角色不能登录后台。路由用 `meta.roles` 声明（`BACKOFFICE_ROLES` / `REVIEW_ROLES`），页面内用 `useUserInfoStore().canReview`、`usePermission` 或 `v-role` 指令判断

### 主题

- 设计变量定义在静态文件 `public/assets/theme.css`：浅色写在 `:root`，暗色写在 `:root[data-theme='dark']` 与 `.dark`
- 样式中的颜色一律使用 `var(--aix-xxx)`，`pnpm checkCssVars` 可列出硬编码颜色
- `src/styles/theme.scss` 把 Element Plus 的主色阶梯、状态色桥接到 `--aix-*`；换品牌色直接改 `theme.css` 中的变量
- 明暗模式由用户在头像菜单中切换，首次访问的默认模式取站点配置 `theme.defaultMode`

### 国际化

- 内置语言包 `src/locale/{zh-CN,en-US}.json` 随构建打包；`public/locale/*.json` 在运行时拉取并增量合并，改文案无需重新构建
- 文案手工维护在上述 JSON 中（flat key），组件内通过 `$t` / `t()` 使用；`src/plugins/locale.ts` 已全局注册 i18n 实例
- 语言切换联动 Element Plus 语言包、Dayjs 与 `html[lang]`，请求头 `Accept-Language` 同步当前语言

### Sentry

- `VITE_SENTRY_DSN` 非空时，`main.ts` 在挂载前异步加载 `@sentry/vue` 并初始化（`src/plugins/sentry/`），不阻塞首屏
- 未捕获错误统一经 `src/utils/error-handler.ts` 的 `setupGlobalErrorHandler({ onError })` 上报，并同步当前用户与角色
- 上传 sourcemap：在 `.env.local` 配置 `SENTRY_AUTH_TOKEN` 后运行 `pnpm uploadToSentry`

### 测试

- 测试文件统一放在 `tests/`，目录镜像 `src/`；`vitest.config.ts` 复用 `vite.config.ts` 的插件与别名
- 未设覆盖率阈值，`pnpm test:coverage` 只输出报告
- 写法与 Mock 约定见 [tests/README.md](./tests/README.md)

## 💡 开发约定

- **组件**：全局复用组件放 `src/components/`，页面专属组件放 `src/views/[page]/components/`
- **接口**：优先用 Orval 生成函数，统一从 `@/api` 导入；手写接口放 `src/api/modules/`，不手改 `src/api/generated/`
- **图标**：SVG 放 `src/assets/icons/[dir]/`，用 `<SvgIcon name="[dir]-[name]" />` 引用
- **文件命名**：`.vue` 用 PascalCase（`index.vue` 除外），`use*` 组合式函数用 camelCase，其余 `.ts` 用 kebab-case（ESLint 强制）
- **提交**：Conventional Commits，可用 `pnpm commit` 交互式生成

## 🆘 常见问题

**Node 版本不匹配**：项目要求 Node >= 22.18，可用 `nvm use`（读取 `.nvmrc`）切换。

**`pnpm orval` 失败**：`orval.config.ts` 的 `input.target` 默认留空，先填成本地 OpenAPI 文件路径或线上 swagger JSON 地址。

**类型检查报错但编辑器正常**：运行 `pnpm type-check`，必要时在 VS Code 中执行 "TypeScript: Restart TS Server"。

**构建内存溢出**：`pnpm build` 已设置 `--max-old-space-size=16384`，仍失败时检查机器可用内存。

## 📖 项目文档

| 文档 | 说明 |
|------|------|
| [docs/api.md](./docs/api.md) | API 层：axios 实例、便捷函数、Orval 生成与扩展、请求去重、错误处理 |
| [docs/deployment.md](./docs/deployment.md) | 部署：构建产物、Docker、package.sh、manage.sh、GitHub Actions、Sentry sourcemap |
| [tests/README.md](./tests/README.md) | 测试：目录约定、全局 Mock、各层测试写法 |
| [CLAUDE.md](./CLAUDE.md) | AI 协作约定与导航（`AGENTS.md` 为其符号链接） |

## 📚 外部参考

- [Vue 3](https://vuejs.org/) · [Vite](https://vitejs.dev/) · [TypeScript](https://www.typescriptlang.org/)
- [Element Plus](https://element-plus.org/) · [UnoCSS](https://unocss.dev/) · [Pinia](https://pinia.vuejs.org/)
- [Vitest](https://vitest.dev/) · [Orval](https://orval.dev/) · [Sentry for Vue](https://docs.sentry.io/platforms/javascript/guides/vue/)
