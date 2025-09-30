# AI编程Agent体系总览

## 📖 概述

本目录包含了完整的AI编程Agent体系，为Vue3项目提供专业化的AI辅助开发指导。每个Agent专注于特定领域，通过协作为开发者提供全方位的编程支持。

## 🤖 Agent体系架构

### 核心控制层
- **[main-controller.md](./main-controller.md)** - 主控制Agent，负责协调各专业Agent，智能选择最佳协作策略

### 开发指导层
- **[coding-standards.md](./coding-standards.md)** - 编码规范Agent，确保代码质量和一致性，包含常量/类型/函数规范
- **[component-development.md](./component-development.md)** - 组件开发Agent，区分基础组件和业务组件开发指导
- **[api-development.md](./api-development.md)** - API开发Agent，处理接口设计和数据交互
- **[store-development.md](./store-development.md)** - Store开发Agent，Pinia状态管理规范
- **[code-review.md](./code-review.md)** - 代码审查Agent，提供质量检查和优化建议
- **[project-structure.md](./project-structure.md)** - 项目结构Agent，管理架构设计和目录组织

### 上线部署层
- **[testing.md](./testing.md)** - 测试指导Agent，上线前的测试策略和用例编写
- **[deployment.md](./deployment.md)** - 部署指导Agent，上线部署和运维相关

### 工具支持层
- **[prompts-guide.md](./prompts-guide.md)** - 提示词指南，提供标准化的AI交互模板
- **[ai-programming-best-practices.md](./ai-programming-best-practices.md)** - AI编程最佳实践
- **[quick-checklist.md](./quick-checklist.md)** - 快速检查清单汇总

## 🎯 快速导航

### 按开发阶段选择Agent

#### 项目规划阶段
```
需求分析 → main-controller.md
架构设计 → project-structure.md
技术规范 → coding-standards.md
```

#### 开发实施阶段
```
基础组件 → component-development.md (src/components/)
业务组件 → component-development.md (src/business-components/)
API开发 → api-development.md
状态管理 → store-development.md
常量/类型 → coding-standards.md (constants、interface、utils)
```

#### 质量保证阶段
```
代码审查 → code-review.md
性能优化 → code-review.md
```

#### 上线部署阶段
```
测试编写 → testing.md
部署配置 → deployment.md
```

### 按文件类型选择Agent

| 文件类型 | 推荐Agent | 说明 |
|---------|----------|------|
| `src/components/**/*.vue` | component-development.md | 基础组件 |
| `src/business-components/**/*.vue` | component-development.md | 业务组件 |
| `src/views/**/*.vue` | component-development.md | 页面组件 |
| `src/api/**/*.ts` | api-development.md | API接口 |
| `src/store/**/*.ts` | store-development.md | 状态管理 |
| `src/constants/**/*.ts` | coding-standards.md | 常量定义 |
| `src/interface/**/*.ts` | coding-standards.md | 类型定义 |
| `src/utils/**/*.ts` | coding-standards.md | 工具函数 |

## 🛠️ 使用指南

### 1. 单Agent使用
当问题明确属于某个专业领域时，直接使用对应的Agent：

```markdown
参考：component-development.md
任务：创建一个登录输入组件
要求：遵循Vue3 Composition API规范，区分基础组件和业务组件
```

### 2. 多Agent协作
复杂问题需要多个Agent协作时，建议使用主控制Agent：

```markdown
参考：main-controller.md
任务：开发登录页面
涉及：页面组件 + 业务组件 + API接口 + 状态管理
```

### 3. 渐进式开发
按照开发流程逐步使用不同Agent：

```markdown
阶段1：project-structure.md - 确定模块结构
阶段2：api-development.md - 设计API接口
阶段3：store-development.md - 设计状态管理
阶段4：component-development.md - 实现UI组件
阶段5：code-review.md - 代码质量检查
阶段6：testing.md + deployment.md - 上线部署
```

## 📚 组件分类规范

### 基础组件（src/components/）
- **特点**: 无业务逻辑，纯UI组件，高度可复用
- **命名**: 使用 `Base` 前缀
- **示例**: `BaseInput`、`BaseButton`
- **参考**: [component-development.md](./component-development.md)

### 业务组件（src/business-components/）
- **特点**: 包含业务逻辑，与业务流程关联
- **命名**: 业务功能描述
- **示例**: `LoginInput`、`QrCodeLogin`
- **参考**: [component-development.md](./component-development.md)

### 页面组件（src/views/）
- **特点**: 完整页面，路由对应
- **命名**: 页面名称
- **示例**: `Login`、`Home`
- **参考**: [component-development.md](./component-development.md)

## 📁 代码组织规范

### API开发
- **目录**: `src/api/modules/`
- **规范**: [api-development.md](./api-development.md)
- **示例**: `login.ts`

### 状态管理
- **目录**: `src/store/modules/`
- **规范**: [store-development.md](./store-development.md)
- **示例**: `user.ts`、`global.ts`

### 常量定义
- **目录**: `src/constants/`
- **规范**: [coding-standards.md](./coding-standards.md#常量定义规范)
- **示例**: `System.ts`

### 类型定义
- **目录**: `src/interface/`
- **规范**: [coding-standards.md](./coding-standards.md#typescript类型定义规范)
- **示例**: `System.ts`

### 工具函数
- **目录**: `src/utils/`
- **规范**: [coding-standards.md](./coding-standards.md#工具函数编码规范)
- **示例**: `date.ts`、`locale.ts`

## 🔄 Agent协作示例

### 示例1：创建登录页面
```yaml
主导Agent: component-development.md
协作Agent: 
  - api-development.md (登录API)
  - store-development.md (用户状态)
  - coding-standards.md (代码规范)

工作流程:
  1. 设计API接口和类型定义
  2. 创建用户Store管理登录状态
  3. 开发BaseInput基础组件
  4. 开发LoginInput和QrCodeLogin业务组件
  5. 组装Login页面组件
  6. 代码审查和优化
```

### 示例2：开发用户管理模块
```yaml
主导Agent: main-controller.md
协作Agent:
  - api-development.md (用户API)
  - store-development.md (用户状态)
  - component-development.md (组件开发)
  - coding-standards.md (代码规范)

工作流程:
  1. 设计用户管理API接口
  2. 创建用户Store
  3. 开发用户列表组件
  4. 开发用户表单组件
  5. 集成测试
```

## 📋 开发阶段说明

### 开发阶段 (日常开发)
以下Agent用于日常开发，保证代码质量和开发效率：
- coding-standards.md
- component-development.md
- api-development.md
- store-development.md
- code-review.md
- project-structure.md

### 上线阶段
以下Agent仅在准备上线时使用：
- testing.md - 编写完整的测试用例
- deployment.md - 配置部署流程

## 🎯 最佳实践

### 1. 遵循目录规范
- 基础组件放在 `src/components/`
- 业务组件放在 `src/business-components/`
- 页面组件放在 `src/views/`
- API接口放在 `src/api/modules/`
- 状态管理放在 `src/store/modules/`

### 2. 遵循命名规范
- 基础组件使用 `Base` 前缀
- 业务组件使用业务功能描述
- 常量使用大写字母和下划线
- 类型接口使用 `I` 前缀或描述性名称

### 3. 避免冗余
- 避免冗余的DOM层级
- 避免冗余的样式定义
- 基础组件不包含业务逻辑
- 复用已有组件而不是重复开发

### 4. 保持一致性
- 统一的代码风格
- 统一的命名规范
- 统一的目录结构
- 统一的类型定义

## 📈 持续改进

### 反馈机制
- 使用过程中的问题和建议
- Agent协作效果评估
- 新场景和需求收集
- 最佳实践案例分享

### 更新计划
- 定期更新Agent指导内容
- 新增专业领域Agent
- 优化协作机制和流程
- 集成更多AI工具和服务

---

通过这个完整的AI编程Agent体系，开发者可以获得专业、高效、一致的AI辅助开发体验，显著提升开发效率和代码质量。
