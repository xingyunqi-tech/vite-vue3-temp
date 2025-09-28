# 项目结构解析 Agent

## 职责
负责项目目录结构分析、文件组织规范和架构设计指导，帮助AI理解项目布局和各目录的作用。

## 🏗️ 项目整体架构

### 技术栈
- **前端框架**: Vue 3.5.21 (Composition API)
- **构建工具**: Vite 6.3.5
- **语言**: TypeScript 5.9.2
- **状态管理**: Pinia 3.0.3
- **路由**: Vue Router 4.5.1
- **UI库**: Element Plus 2.11.2
- **样式**: TailwindCSS 4.1.13 + SCSS
- **HTTP客户端**: Axios 1.11.0

### 架构模式
- **分层架构**: 视图层 → 业务层 → 数据层
- **模块化设计**: 按功能模块组织代码
- **组件化开发**: 可复用的UI组件
- **类型驱动**: TypeScript严格类型检查

## 📁 目录结构详解

```
vite-vue3-temp/
├── .claude/                    # Claude AI 配置和文档
│   ├── agents/                 # AI Agent 配置文件
│   │   ├── project-structure.md    # 项目结构解析
│   │   ├── coding-standards.md     # 编码规范
│   │   ├── code-review.md          # 代码审查
│   │   ├── component-development.md # 组件开发
│   │   ├── api-development.md      # API开发
│   │   ├── testing.md              # 测试指导
│   │   └── deployment.md           # 部署指导
│   └── settings.local.json     # Claude 本地设置
├── .husky/                     # Git hooks 配置
├── config/                     # 项目配置文件
│   ├── devServer.ts           # 开发服务器配置
│   ├── host.ts                # 主机配置
│   └── proxy.ts               # 代理配置
├── docs/                       # 项目文档
│   └── api.md                 # API接口文档
├── public/                     # 静态资源
│   ├── favicon.ico            # 网站图标
│   ├── loading.css            # 加载样式
│   └── theme.css              # 主题样式
├── scripts/                    # 构建和工具脚本
│   ├── i18n/                  # 国际化自动化脚本
│   │   ├── utils/             # 国际化工具函数
│   │   ├── generate.ts        # 生成国际化代码
│   │   ├── translate.ts       # AI翻译脚本
│   │   └── merge.ts           # 合并语言包
│   ├── commit-msg/            # 提交信息检查
│   ├── pre-commit/            # 提交前检查
│   └── pre-push/              # 推送前检查
├── src/                        # 源代码目录
│   ├── api/                   # API 接口层
│   ├── assets/                # 静态资源
│   ├── components/            # 通用组件
│   ├── constants/             # 常量定义
│   ├── interface/             # TypeScript 接口定义
│   ├── layout/                # 布局组件
│   ├── router/                # 路由配置
│   ├── store/                 # 状态管理 (Pinia)
│   ├── utils/                 # 工具函数
│   ├── views/                 # 页面组件
│   ├── App.vue                # 根组件
│   └── main.ts                # 应用入口
├── typings/                    # TypeScript 类型声明
├── tests/                      # 测试文件
└── 配置文件                    # 各种配置文件
```

## 📂 核心目录详解

### `.claude/` - AI配置目录
```
.claude/
├── agents/                     # AI Agent配置文件
│   ├── project-structure.md    # 项目结构解析（当前文件）
│   ├── coding-standards.md     # 编码规范和最佳实践
│   ├── code-review.md          # 代码审查清单和规范
│   ├── component-development.md # Vue组件开发指导
│   ├── api-development.md      # API接口开发规范
│   ├── testing.md              # 测试策略和规范
│   └── deployment.md           # 部署和运维指导
└── settings.local.json         # Claude本地配置
```

**作用**:
- 存储AI编程助手的配置和指导文档
- 不同的AI任务读取对应的agent文档
- 提供项目特定的编程规范和最佳实践

### `config/` - 项目配置目录
```
config/
├── devServer.ts               # 开发服务器配置
├── host.ts                    # 主机和端口配置
└── proxy.ts                   # API代理配置
```

**作用**:
- 集中管理项目配置
- 开发环境和生产环境配置分离
- 便于维护和修改配置项

### `scripts/` - 自动化脚本目录
```
scripts/
├── i18n/                      # 国际化自动化工具
│   ├── utils/                 # 工具函数
│   │   ├── DifyClient.ts      # AI翻译客户端
│   │   ├── TextExtractor.ts   # 文本提取器
│   │   └── ...                # 其他工具
│   ├── generate.ts            # 生成国际化代码
│   ├── translate.ts           # AI自动翻译
│   └── merge.ts               # 合并语言包
├── commit-msg/                # Git提交信息检查
├── pre-commit/                # 提交前代码检查
└── pre-push/                  # 推送前完整检查
```

**作用**:
- 自动化开发流程
- 国际化处理自动化
- Git hooks集成
- 代码质量保证

### `src/api/` - API接口层
```
src/api/
├── instance.ts                # Axios实例配置
├── modules/                   # 按业务模块组织
│   ├── login.ts              # 登录相关接口
│   ├── user.ts               # 用户管理接口
│   └── ...                   # 其他业务模块
└── index.ts                  # API统一导出
```

**作用**:
- 统一管理API接口
- 请求/响应拦截器
- 错误处理和重试机制
- 按业务模块组织接口

### `src/components/` - 通用组件目录
```
src/components/
├── QuickActions/              # 快捷操作组件
│   ├── index.vue             # 组件主文件
│   └── types.ts              # 组件类型定义（可选）
├── StatisticsCard/            # 统计卡片组件
│   ├── index.vue             # 组件主文件
│   └── README.md             # 组件文档（可选）
└── ...                       # 其他通用组件
```

**组件命名规范**:
- 目录名: PascalCase (如 `QuickActions`)
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
├── home/                      # 首页
│   ├── index.vue             # 页面主文件
│   └── components/           # 页面私有组件（可选）
├── login/                     # 登录页
│   ├── index.vue             # 页面主文件
│   └── components/           # 页面私有组件（可选）
├── 404.vue                   # 404页面
└── ...                       # 其他页面
```

**页面组织原则**:
- 每个页面一个目录
- 复杂页面可包含私有组件
- 页面间不能直接引用
- 通过路由进行页面跳转

### `src/store/` - 状态管理目录
```
src/store/
├── index.ts                   # Store入口文件
└── modules/                   # 按业务模块组织
    ├── user.ts               # 用户状态管理
    ├── app.ts                # 应用状态管理
    └── ...                   # 其他状态模块
```

**状态管理原则**:
- 使用Pinia进行状态管理
- 按业务模块拆分Store
- 组合式API风格
- 类型安全的状态定义

### `src/utils/` - 工具函数目录
```
src/utils/
├── index.ts                   # 工具函数统一导出
├── date.ts                   # 日期处理工具
├── request.ts                # 请求工具（可选）
├── storage.ts                # 本地存储工具
└── ...                       # 其他工具函数
```

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
├── asset.d.ts                # 资源文件类型
├── utils.d.ts                # 工具类型
└── ...                       # 其他类型声明
```

**类型声明原则**:
- 全局类型统一管理
- 第三方库类型补充
- 环境变量类型定义
- 资源文件类型声明

## 🔄 文件引用规范

### 导入路径规范
```typescript
// ✅ 正确：使用别名导入
import { UserApi } from '@/api/modules/user';
import { useUserStore } from '@/store/modules/user';
import QuickActions from '@/components/QuickActions/index.vue';

// ❌ 错误：相对路径过长
import { UserApi } from '../../../api/modules/user';
```

### 导入顺序规范
```typescript
// 1. Vue相关导入
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// 2. 第三方库导入
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

// 3. 项目内部导入
import { UserApi } from '@/api/modules/user';
import { useUserStore } from '@/store/modules/user';
import QuickActions from '@/components/QuickActions/index.vue';

// 4. 类型导入（使用type关键字）
import type { IUserInfo } from '@/interface/Api';
```

### 组件引用规范
```typescript
// ✅ 正确：页面组件引用通用组件
import QuickActions from '@/components/QuickActions/index.vue';

// ✅ 正确：页面组件引用自己的私有组件
import UserForm from './components/UserForm.vue';

// ❌ 错误：页面间直接引用
import UserList from '@/views/User/components/UserList.vue';
```

## 📋 目录创建指导

### 新增页面
```bash
# 1. 在views目录下创建页面目录
mkdir src/views/NewPage

# 2. 创建页面主文件
touch src/views/NewPage/index.vue

# 3. 如需私有组件，创建components目录
mkdir src/views/NewPage/components
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

### 新增API模块
```bash
# 1. 在api/modules目录下创建模块文件
touch src/api/modules/newModule.ts

# 2. 在interface目录下创建对应类型文件
touch src/interface/newModule.ts
```

## 🎯 AI编程指导原则

### 1. 目录选择原则
- **通用组件** → `src/components/`
- **页面组件** → `src/views/`
- **API接口** → `src/api/modules/`
- **类型定义** → `src/interface/` 或 `typings/`
- **工具函数** → `src/utils/`
- **状态管理** → `src/store/modules/`

### 2. 文件命名原则
- **组件文件**: PascalCase目录 + index.vue
- **工具文件**: camelCase.ts
- **类型文件**: camelCase.ts 或 .d.ts
- **配置文件**: camelCase.ts

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
