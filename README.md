# Vue3 企业级前端模板

> 基于 Vue3 + TypeScript + Vite 构建的现代化前端开发模板，集成完整的开发工具链和最佳实践

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-green)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/vue-3.5.21-brightgreen)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9.2-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.3.5-646CFF)](https://vitejs.dev/)

## ✨ 特性

- 🚀 **现代化技术栈**: Vue3 + TypeScript + Vite + Pinia
- 📱 **响应式设计**: 支持移动端和桌面端
- 🎨 **UI组件库**: Element Plus + TailwindCSS
- 🌍 **国际化**: 完整的i18n解决方案，支持AI自动翻译
- 📦 **状态管理**: Pinia状态管理
- 🔧 **开发工具**: ESLint + Prettier + Husky + lint-staged
- 📊 **监控集成**: Sentry错误监控
- 🐳 **容器化**: Docker部署支持
- 🔒 **类型安全**: 完整的TypeScript类型定义

## 🏗️ 技术架构

### 核心技术栈
- **框架**: Vue 3.5.21 (Composition API)
- **构建工具**: Vite 6.3.5
- **语言**: TypeScript 5.9.2
- **状态管理**: Pinia 3.0.3
- **路由**: Vue Router 4.5.1
- **UI库**: Element Plus 2.11.2
- **样式**: TailwindCSS 4.1.13 + SCSS
- **HTTP客户端**: Axios 1.11.0

### 开发工具
- **代码检查**: ESLint 9.35.0
- **代码格式化**: Prettier 3.6.2
- **样式检查**: Stylelint 16.24.0
- **Git钩子**: Husky 9.1.7
- **提交规范**: Commitizen + cz-git
- **拼写检查**: CSpell 9.2.1

## 📁 项目结构

```md
vite-vue3-temp/
├── .claude/                    # Claude AI 配置和文档
│   └── agents/                 # AI Agent 配置文件
├── .husky/                     # Git hooks 配置
├── config/                     # 项目配置文件
│   ├── devServer.ts           # 开发服务器配置
│   ├── host.ts                # 主机配置
│   └── proxy.ts               # 代理配置
├── public/                     # 静态资源
│   ├── favicon.ico            # 网站图标
│   ├── loading.css            # 加载样式
│   └── theme.css              # 主题样式
├── scripts/                    # 构建和工具脚本
│   ├── i18n/                  # 国际化自动化脚本
│   ├── commit-msg/            # 提交信息检查
│   ├── pre-commit/            # 提交前检查
│   └── pre-push/              # 推送前检查
├── src/                        # 源代码目录
│   ├── api/                   # API 接口层
│   │   ├── instance.ts        # Axios 实例配置
│   │   └── modules/           # API 模块
│   ├── assets/                # 静态资源
│   │   ├── images/            # 图片资源
│   │   └── styles/            # 样式文件
│   ├── components/            # 通用组件
│   │   ├── BaseInput/         # 基础输入组件
│   │   └── SentryDemo/        # Sentry示例组件
│   ├── business-components/   # 业务组件
│   │   ├── LoginInput/        # 登录输入组件
│   │   └── QrCodeLogin/       # 二维码登录组件
│   ├── constants/             # 常量定义
│   ├── interface/             # TypeScript 接口定义
│   ├── layout/                # 布局组件
│   ├── router/                # 路由配置
│   ├── store/                 # 状态管理 (Pinia)
│   │   └── modules/           # 状态模块
│   ├── utils/                 # 工具函数
│   ├── views/                 # 页面组件
│   │   ├── home/              # 首页
│   │   ├── login/             # 登录页
│   │   └── 404.vue            # 404页面
│   ├── App.vue                # 根组件
│   └── main.ts                # 应用入口
├── typings/                    # TypeScript 类型声明
├── tests/                      # 测试文件
├── package.json               # 项目依赖配置
├── vite.config.ts             # Vite 构建配置
├── tsconfig.json              # TypeScript 配置
├── eslint.config.ts           # ESLint 配置
├── tailwind.config.ts         # TailwindCSS 配置
└── Dockerfile                 # Docker 配置
```

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
# 启动开发服务器
pnpm start

# 启动 HTTPS 开发服务器
pnpm start:https
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

安装以下插件以获得最佳开发体验：

- **Vue Language Features (Volar)**: Vue 3 语言支持
- **TypeScript Vue Plugin (Volar)**: Vue 中的 TypeScript 支持
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Stylelint**: CSS/SCSS 代码检查
- **Tailwind CSS IntelliSense**: TailwindCSS 智能提示
- **GitLens**: Git 增强功能

## 📜 脚本命令

### 开发相关
```bash
# 启动开发服务器
pnpm start

# 启动 HTTPS 开发服务器  
pnpm start:https

# 类型检查
pnpm type-check

# 运行测试
pnpm test
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

### 国际化
```bash
# 交互式国际化处理
pnpm i18n

# 导出语言包
pnpm i18n:exportLocale
```

### 构建相关
```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 分析构建产物
pnpm analyzer

# 上传到 Sentry
pnpm uploadToSentry

# 清理构建产物
pnpm clean
```

## 🐳 Docker 部署

### 构建镜像
```bash
# 使用脚本构建
sh package.sh

# 或手动构建
docker build -t vite-vue3-temp .
```

### 运行容器
```bash
# 加载镜像
docker load -i vite-vue3-temp.tar.gz

# 运行容器
docker run -d -p 8080:80 vite-vue3-temp
```

### 更新部署
```bash
# 停止旧容器
docker stop $(docker ps -q --filter ancestor=vite-vue3-temp)

# 删除旧镜像
docker rmi vite-vue3-temp

# 加载新镜像
docker load -i vite-vue3-temp-new.tar.gz

# 启动新容器
docker run -d -p 8080:80 vite-vue3-temp
```

## 🔧 配置说明

### 环境变量
创建 `.env.local` 文件配置本地环境变量：

```bash
# API 基础地址
VITE_APP_API_BASE_URL=http://localhost:3000/api

# Sentry 配置
VITE_SENTRY_DSN=your_sentry_dsn
VITE_SENTRY_ORG=your_org
VITE_SENTRY_PROJECT=your_project
VITE_SENTRY_AUTH_TOKEN=your_auth_token

# 是否启用 HTTPS
VITE_ENABLE_HTTPS=false

# 是否启用构建分析
VITE_ENABLE_ANALYZER=false
```

### 代理配置
在 `config/proxy.ts` 中配置开发服务器代理：

```typescript
export const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, '')
  }
};
```
## 🆘 常见问题

### 安装依赖失败
```bash
# 清理缓存后重新安装
pnpm store prune
pnpm install
```

### 类型检查错误
```bash
# 重新生成类型文件
pnpm type-check
```

### 构建失败
```bash
# 清理构建产物后重新构建
pnpm clean
pnpm build
```
