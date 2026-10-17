# Vue3 企业级前端模板

> 基于 Vue3 + TypeScript + Vite 构建的现代化前端开发模板，集成完整的开发工具链和最佳实践

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-green)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/vue-3.x-brightgreen)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-6.x-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-latest-646CFF)](https://vitejs.dev/)

## ✨ 特性

- 🚀 **现代化技术栈**: Vue3 + TypeScript + Vite + Pinia
- 🎨 **UI组件库**: Element Plus + UnoCSS，支持组件自动导入
<!-- #if i18n -->
- 🌍 **国际化**: vue-i18n 接入，语言切换联动 Element Plus 与 Dayjs；业务文案写明文，由 `pnpm i18n` 统一抽取翻译
<!-- #endif -->
<!-- #if qiankun -->
- 🧩 **微前端**: qiankun HOST / GUEST / 独立 三模式接入
<!-- #endif -->
<!-- #if overrides -->
- 🏫 **多租户定制**: 同一套代码交付多个学校/客户，租户差异集中声明式配置
<!-- #endif -->
- 📦 **状态管理**: Pinia 状态管理，支持持久化
- 💀 **骨架屏系统**: 组件级骨架屏（CardSkeleton、TableSkeleton），防闪烁设计
- 🔧 **开发工具**: ESLint + Prettier + Stylelint + Husky + lint-staged
- 🔒 **类型安全**: 完整的TypeScript类型定义
- ✅ **测试完善**: Vitest 单元测试，支持覆盖率报告
- 🤖 **API 自动生成**: Orval + PolymasApi，OpenAPI → 类型安全代码

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Vue 3 (Composition API + `<script setup>`)
- **构建工具**: Vite
- **语言**: TypeScript（严格模式）
- **状态管理**: Pinia
- **路由**: Vue Router（动态权限路由）
- **UI库**: Element Plus
- **样式**: UnoCSS + SCSS
- **HTTP客户端**: PolymasApi（`@zhs/agent-course-kit`）+ Orval 代码生成

### 开发工具
- **代码检查**: ESLint
- **代码格式化**: Prettier
- **样式检查**: Stylelint
- **Git钩子**: Husky
- **提交规范**: Commitizen + cz-git
- **拼写检查**: CSpell
- **测试框架**: Vitest + @vitest/ui

## 📁 项目结构

```
├── .husky/                    # Git hooks 配置
├── .vscode/                   # VS Code 编辑器配置
├── config/                    # Vite 开发服务器/代理配置（devServer / host / proxy）
├── docs/                      # 项目文档
│   └── api.md                 # API 层使用指南
├── public/                    # 静态资源
│   └── assets/                # theme.css（CSS 主题变量）、loading.css、logo.png
├── scripts/                   # 工具脚本（api / cssVars / husky）
├── src/
│   ├── api/                   # API 层（Orval + PolymasApi）
│   │   ├── core/              # 实例创建、Mutator、请求去重、类型
│   │   ├── generated/         # 🚫 Orval 自动生成（运行 pnpm orval 后出现，禁止手动修改）
│   │   ├── modules/           # 自定义/扩展 API（platform.ts、override.ts）
│   │   └── index.ts           # 统一导出
│   ├── app/                   # 应用入口（App.vue、render.ts 渲染/卸载）
│   ├── assets/                # 静态资源（icons、images）
│   ├── components/            # 全局公用组件（Skeleton、SvgIcon、ErrorBoundary）
│   ├── composables/           # 组合式函数（usePermission、useRole、useSkeleton、useSiteConfig）
│   ├── constants/             # 全局常量（角色、菜单、系统、站点配置）
│   ├── directives/            # 全局指令（v-role）
│   ├── interface/             # TypeScript 接口定义
│   ├── layout/                # 布局组件（LayoutMain、LayoutMenu、header 区组件）
│   ├── plugins/               # 全局插件（dayjs）与内核目录（site-config 等）
│   ├── router/                # 路由配置（两层路由 + 守卫）
│   │   └── routes/
│   │       ├── static.ts      # 静态路由（初始注册）
│   │       └── async.ts       # 异步路由（登录后按权限动态注册）
│   ├── store/                 # Pinia 状态管理
│   │   ├── modules/           # Store 模块（global、user-info、permission、site-config）
│   │   └── plugins/           # persist.ts 持久化（localforage + persistedstate）
│   ├── styles/                # 全局样式
│   ├── utils/                 # 工具函数（auth、datetime、error-handler）
│   ├── views/                 # 页面组件
│   └── main.ts                # 应用启动入口
├── tests/                     # Vitest 测试文件
├── typings/                   # TypeScript 全局类型声明
├── orval.config.ts            # Orval 代码生成配置
├── vite.config.ts
├── tsconfig.json
└── uno.config.ts
```

<!-- #if aiDocs -->
**AI 协作文档**：`.claude/`（agents / skills / commands 指令集）、`CLAUDE.md`（速查指南）、
`.mcp.json`（MCP server 声明）。

<!-- #endif -->
<!-- #if i18n -->
**国际化相关目录**：`src/locale/`（语言包，由 i18n-tools 生成）、`public/locale/`（运行时加载的
zh-CN / en-US）、`src/plugins/locale.ts`（全局注册）、`i18n.config.ts`（i18n-tools 配置）。

<!-- #endif -->
<!-- #if qiankun -->
**微前端相关目录**：`src/micro/`——`main/` 是 HOST 侧（apps 注册、manager、MicroAppContainer、
useMicroApp），`shared/` 是共享层（env 环境判断、state 全局状态、types）。
接入方式见 [docs/qiankun.md](./docs/qiankun.md)。

<!-- #endif -->
<!-- #if overrides -->
**多租户定制相关目录**：`src/plugins/override/`（内核，各维度管理器与合并算法，零第三方依赖）、
`src/overrides/`（租户注册表 + 各租户配置，业务侧只改这里）、`config/schoolFilter.ts`
（按 `VITE_BUILD_SCHOOL_CODE` 单校打包的 Vite 插件）。用法见 [docs/overrides.md](./docs/overrides.md)。

<!-- #endif -->
**示例页面相关目录**：`src/views/setting/`，以及它依赖的
`src/components/SchemaForm/`、`src/components/ConfigEditor/`。不需要时整组删除即可。

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 22.0.0
- **包管理器**: pnpm (推荐) / npm / yarn

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

### 开发模式

```bash
# 启动开发服务器（默认启用 HTTPS，由 VITE_ENABLE_HTTPS 控制）
pnpm start
```

### 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 构建并分析包大小
pnpm analyzer
```

## 🛠️ 开发工具配置

### VS Code 插件推荐

本项目推荐安装以下 VS Code 插件（已配置在 `.vscode/extensions.json`）：

#### 核心插件
- **Vue - Official** (`Vue.volar`): Vue 3 官方语言支持
- **Vue VSCode Snippets** (`sdras.vue-vscode-snippets`): Vue 代码片段

#### 代码质量
- **ESLint** (`dbaeumer.vscode-eslint`): JavaScript/TypeScript 代码检查
- **Stylelint** (`stylelint.vscode-stylelint`): CSS/SCSS 代码检查
- **Prettier** (`esbenp.prettier-vscode`): 代码格式化
- **Code Spell Checker** (`streetsidesoftware.code-spell-checker`): 拼写检查

#### 开发增强
<!-- #if i18n -->
- **i18n Ally** (`lokalise.i18n-ally`): 国际化开发辅助
<!-- #endif -->
- **CSS Variable Autocomplete** (`vunguyentuan.vscode-css-variables`): CSS 变量自动补全
- **UnoCSS** (`antfu.unocss`): UnoCSS 智能提示
- **VSC NVM** (`henrynguyen5-vsc.vsc-nvm`): Node 版本管理

**快速安装**: 打开项目后，VS Code 会自动提示安装推荐的插件

## 📜 脚本命令

### 开发相关
```bash
# 启动开发服务器（默认启用 HTTPS，由 VITE_ENABLE_HTTPS 控制）
pnpm start

# 类型检查
pnpm type-check
```

### 测试相关
```bash
# 运行所有测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 生成测试覆盖率报告
pnpm test:coverage

# 启动测试 UI 界面
pnpm test:ui
```

### 代码质量
```bash
# 完整代码检查
pnpm lint

# 分类检查
pnpm lint:script    # JavaScript/TypeScript 检查
pnpm lint:style     # 样式文件检查
pnpm lint:md        # Markdown 文档检查

# 代码格式化
pnpm format

# 拼写检查
pnpm cspell

# 规范化提交
pnpm commit
```

### API 相关
```bash
# 从 openapi.json 生成 API 代码
pnpm orval

# 检查代码中是否存在硬编码颜色（应使用 CSS 变量）
pnpm checkCssVars
```

### 骨架屏

项目提供组件级骨架屏方案，提升数据加载体验。

**内置组件**:
- `CardSkeleton` — 卡片网格占位（支持 `count`/`rows`/`columns`）
- `TableSkeleton` — 完整表格占位（搜索栏、工具栏、表格、分页可独立控制）
- `SkeletonWrap` — 状态切换容器，`loading=true` 时显示骨架屏，`false` 时渲染 slot 内容

**`useSkeleton` composable**:
- 管理 `loading` / `visible` 双状态
- `minDuration`：骨架屏最小展示时长（防闪烁）
- `delay`：延迟展示，短请求不触发骨架屏

```vue
<script setup lang="ts">
import { useSkeleton } from '@/composables/useSkeleton';

const skeleton = useSkeleton({ minDuration: 300 });
onMounted(() => skeleton.withLoading(async () => {
  list.value = await fetchList();
}));
</script>

<template>
  <SkeletonWrap :loading="skeleton.visible.value" type="table">
    <el-table :data="list" />
  </SkeletonWrap>
</template>
```

### 构建相关
```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 分析构建产物
pnpm analyzer


# 清理构建产物
pnpm clean
```

## 🔧 配置说明

### 环境变量

项目支持多环境配置，通过不同的 `.env` 文件管理：

**开发环境** (`.env.development`):
```bash
# API 基础地址
VITE_BASEURL=http://localhost:3001/
```

**生产环境** (`.env.production`):
```bash
# API 基础地址
VITE_BASEURL=//127.0.0.1:3001/

```

**本地覆盖配置** (`.env.local` - 可选):
```bash
# 是否启用 HTTPS
VITE_ENABLE_HTTPS=false

# 是否启用构建分析
VITE_ENABLE_ANALYZER=false

```

### 代理配置

在 `config/devServer.ts` 中配置开发服务器代理：

```typescript
export const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, '')
  }
};
```

### Vite 构建配置

项目在 `vite.config.ts` 中配置了以下功能：

- **插件系统**: Vue、JSX、自动导入、组件自动导入
- **开发工具**: HTTPS 支持、代码检查器
- **生产优化**: modern polyfill 按需注入（VITE_LEGACY）、Gzip/Brotli 压缩、vendor 分包
- **构建分析**: 可视化分析构建产物
- **测试配置**: Vitest 单元测试和覆盖率

### 测试配置

项目使用 Vitest 作为测试框架，配置了完整的测试环境：

**测试覆盖率要求**:
- 分支覆盖率: 80%
- 函数覆盖率: 80%
- 代码行覆盖率: 80%
- 语句覆盖率: 80%

**测试环境**:
- 基于 jsdom 模拟浏览器环境
- 支持 Vue 组件测试（@vue/test-utils）
- 内联 Element Plus 避免样式导入问题
- 测试文件放在 `tests/` 目录下
## 💡 最佳实践

### 代码组织
- **组件**: 全局公用组件放在 `src/components/`，页面级组件放在 `src/views/[page]/components/`
- **API**: 按功能模块划分，放在 `src/api/modules/` 目录下
- **状态管理**: 使用 Pinia，按功能划分 Store 模块
- **类型定义**: 全局类型放在 `typings/`，模块类型放在 `src/interface/`

### 开发规范
- **提交规范**: 使用 `pnpm commit` 进行规范化提交
- **代码检查**: 提交前自动运行 ESLint 和 Stylelint
- **类型安全**: 充分利用 TypeScript 类型系统
<!-- #if i18n -->
- **国际化**: 所有文本使用 i18n，支持多语言
<!-- #endif -->

### 性能优化
- **组件按需导入**: Element Plus 组件自动按需导入
- **路由懒加载**: 使用动态 import 进行路由懒加载
- **图片优化**: 小于 10KB 的图片自动转 base64
- **代码分割**: 自动按模块分割打包，控制包体积

## 🆘 常见问题

### 依赖安装问题

**依赖安装失败**:
```bash
# 清理缓存后重新安装
pnpm store prune
pnpm install
```

**Node 版本不匹配**:
```bash
# 检查 Node 版本 (需要 >= 22)
node -v

# 使用 nvm 切换版本
nvm install 22
nvm use 22
```

### 开发问题

**类型检查错误**:
```bash
# 运行类型检查
pnpm type-check

# VS Code 中重启 TypeScript 服务
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

**热更新失效**:
```bash
# 检查文件路径大小写
# 确保导入路径与文件名大小写一致

# 重启开发服务器
# Ctrl + C 停止，然后重新运行 pnpm start
```

### 构建问题

**构建失败**:
```bash
# 清理构建产物后重新构建
pnpm clean
pnpm build
```

**内存溢出**:
```bash
# 构建时已设置 max-old-space-size=16384
# 如果仍然失败，检查系统可用内存
```

## 🎯 核心功能

### 组件自动导入
- Element Plus 组件自动导入，无需手动注册
- Vue API 自动导入（ref、reactive、computed 等）
- 开发体验优化，减少样板代码

<!-- #if i18n -->
### 国际化系统
- 基于 vue-i18n 的完整国际化方案
- 支持动态语言切换

<!-- #endif -->
<!-- #if overrides -->
### 多租户定制体系（overrides）

面向「同一套代码交付给多个学校/客户」的场景：标准产品代码不动，租户差异集中在
`src/overrides/` 里声明式配置，覆盖 `router` / `constants` / `components` / `store` /
`api` / `layout` / `locale` / `directives` / `plugins` 九个维度。租户由 Cookie 中的
`schoolNid` / `userId` 识别，匹配不到时全部回落标准产品行为。

新增一个租户：`create-app override add <code>` 生成目录骨架，再在 `src/overrides/registry.ts`
登记映射即可。完整用法与维度详解见 [docs/overrides.md](./docs/overrides.md)。

<!-- #endif -->
### 代码质量保障
- ESLint + TypeScript 静态代码检查
- Stylelint 样式代码检查
- Prettier 统一代码格式
- Husky Git 钩子自动化检查
- Commitizen 规范化提交
- CSpell 拼写检查

## 📖 项目文档

| 文档 | 说明 |
|------|------|
| **[docs/api.md](./docs/api.md)** | API 层使用指南：PolymasApi 实例、Orval 生成、请求去重、多实例扩展 |
<!-- #if qiankun -->
| **[docs/qiankun.md](./docs/qiankun.md)** | 微前端接入：HOST/GUEST/独立 三模式、MicroAppContainer 与 useMicroApp 用法 |
<!-- #endif -->
<!-- #if overrides -->
| **[docs/overrides.md](./docs/overrides.md)** | 多租户定制：九个维度详解、租户识别、新增租户步骤、单校打包 |
<!-- #endif -->

## 📚 外部参考文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Element Plus 官方文档](https://element-plus.org/)
- [UnoCSS 官方文档](https://unocss.dev/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vitest 官方文档](https://vitest.dev/)
- [Orval 官方文档](https://orval.dev/)

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`pnpm commit`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

**注意**:
- 确保所有测试通过 (`pnpm test`)
- 确保代码检查通过 (`pnpm lint`)
- 遵循项目的代码规范和提交规范
