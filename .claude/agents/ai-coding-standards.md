# AI 编程规范总览

## 概述

本文档为Vue3项目的AI编程助手提供总体指导，通过专业化的Agent体系确保高质量的代码生成和开发指导。

## 🤖 AI Agent 体系架构

### 专业化Agent分工
本项目采用多Agent协作模式，每个Agent专注于特定领域：

- **[主控制Agent](./main-controller.md)**: 总体协调和决策
- **[项目结构Agent](./project-structure.md)**: 项目架构和目录组织
- **[编码规范Agent](./coding-standards.md)**: 代码规范和最佳实践
- **[代码审查Agent](./code-review.md)**: 质量检查和优化建议
- **[组件开发Agent](./component-development.md)**: Vue组件开发指导
- **[API开发Agent](./api-development.md)**: 接口开发和数据处理
- **[测试指导Agent](./testing.md)**: 测试策略和用例编写
- **[部署指导Agent](./deployment.md)**: 部署和运维指导

### Agent使用指南

#### 快速选择Agent
根据您的需求选择合适的Agent：

```
📁 项目结构相关 → project-structure.md
📝 编码规范问题 → coding-standards.md
🔍 代码审查优化 → code-review.md
🎨 Vue组件开发 → component-development.md
🌐 API接口开发 → api-development.md
🧪 测试相关问题 → testing.md
🚀 部署运维相关 → deployment.md
🎯 综合性问题 → main-controller.md
```

## 🎯 核心编程原则

### 1. 类型安全优先
- 严格的TypeScript类型定义
- 避免使用`any`类型
- 完整的接口定义和泛型使用

### 2. 组件化设计
- 单一职责原则
- 高内聚低耦合
- 可复用性和可测试性

### 3. 代码质量保证
- 完善的错误处理
- 详细的文档注释
- 全面的测试覆盖

## 🚀 使用方式

### 1. 根据需求选择Agent
不同的开发任务对应不同的专业Agent，选择最合适的Agent可以获得最佳的指导效果。

### 2. Agent协作模式
复杂任务可能需要多个Agent协作：
- **主控制Agent**会自动协调其他Agent
- 可以同时参考多个相关Agent的指导
- 按照Agent建议的优先级执行任务

### 3. 质量保证流程
所有AI生成的代码都应该经过：
1. **编码规范检查** (coding-standards.md)
2. **代码质量审查** (code-review.md)  
3. **测试用例验证** (testing.md)

## 📚 快速参考

### 常用开发场景
- **新建Vue组件**: component-development.md + coding-standards.md
- **API接口开发**: api-development.md + coding-standards.md
- **代码优化**: code-review.md + coding-standards.md
- **项目部署**: deployment.md + testing.md
- **架构设计**: project-structure.md + main-controller.md

### 技术栈参考
- **Vue 3**: [官方文档](https://vuejs.org/)
- **TypeScript**: [官方文档](https://www.typescriptlang.org/)
- **Vite**: [官方文档](https://vitejs.dev/)
- **Element Plus**: [组件库文档](https://element-plus.org/)

通过这个专业化的Agent体系，可以确保AI生成的代码质量高、可维护性强，并且符合项目的整体架构和编码标准。
