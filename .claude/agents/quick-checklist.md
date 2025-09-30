# AI编程快速检查清单汇总

## 概述

本文档汇总了所有Agent的快速检查清单，方便开发者在使用AI编程时进行质量把控和规范检查。

## 📋 通用代码质量检查清单

### 基础检查（适用于所有代码）
- [ ] **TypeScript类型**: 所有变量和函数都有明确的类型定义
- [ ] **错误处理**: 包含完整的try-catch和边界条件处理
- [ ] **代码规范**: 通过ESLint和Prettier检查
- [ ] **文档注释**: 关键函数有JSDoc注释
- [ ] **单元测试**: 核心功能有对应的测试用例
- [ ] **性能考虑**: 避免不必要的重复计算和内存泄漏

## 🎨 Vue组件开发检查清单

### 组件结构检查
- [ ] **目录命名**: 使用PascalCase（如`UserProfile/`）
- [ ] **文件组织**: 主文件为`index.vue`，类型定义分离
- [ ] **Props接口**: 完整的TypeScript接口定义和JSDoc注释
- [ ] **事件定义**: 使用`defineEmits`定义所有事件类型
- [ ] **默认值**: 可选Props提供合理的默认值

### 组件逻辑检查
- [ ] **单一职责**: 组件功能聚焦，职责明确
- [ ] **响应式数据**: 正确使用`ref`、`reactive`、`computed`
- [ ] **生命周期**: 合理使用生命周期钩子
- [ ] **事件清理**: 正确清理事件监听器和定时器
- [ ] **性能优化**: 避免不必要的重渲染

### 组件样式检查
- [ ] **作用域样式**: 使用`scoped`或CSS模块
- [ ] **CSS变量**: 使用CSS变量而不是硬编码值
- [ ] **响应式设计**: 适配不同屏幕尺寸
- [ ] **BEM命名**: 遵循BEM命名规范
- [ ] **性能优化**: 避免复杂选择器和深层嵌套

## 🔌 API开发检查清单

### 接口设计检查
- [ ] **RESTful规范**: URL设计符合REST原则
- [ ] **HTTP方法**: 使用正确的HTTP方法（GET/POST/PUT/DELETE）
- [ ] **类型定义**: 请求参数和响应数据有完整的TypeScript接口
- [ ] **错误格式**: 统一的错误响应格式和错误码
- [ ] **参数验证**: 完善的输入验证和边界检查

### 请求处理检查
- [ ] **统一实例**: 使用统一的Axios实例配置
- [ ] **拦截器配置**: 请求/响应拦截器完整
- [ ] **认证处理**: 自动添加认证Token
- [ ] **错误拦截**: 统一的错误处理和用户提示
- [ ] **缓存策略**: 合理的请求缓存机制
- [ ] **去重处理**: 防止重复请求

### 数据处理检查
- [ ] **数据转换**: 请求前/响应后的数据格式转换
- [ ] **空值处理**: 正确处理null、undefined等情况
- [ ] **类型安全**: 运行时类型验证和类型守卫
- [ ] **分页处理**: 统一的分页参数和响应格式

## 🧪 测试开发检查清单

### 测试结构检查
- [ ] **测试文件命名**: 使用`.test.ts`或`.spec.ts`后缀
- [ ] **测试组织**: 使用`describe`和`it`合理组织测试用例
- [ ] **测试描述**: 清晰的测试描述，以"应该"开头
- [ ] **测试数据**: 使用Mock数据和工厂函数
- [ ] **测试隔离**: 每个测试用例相互独立

### 测试覆盖检查
- [ ] **单元测试**: 核心函数和组件有单元测试
- [ ] **集成测试**: 模块间交互有集成测试
- [ ] **边界测试**: 边界条件和异常情况有测试
- [ ] **异步测试**: 异步操作有正确的测试处理
- [ ] **Mock策略**: 合理使用Mock，避免过度Mock

### 测试质量检查
- [ ] **断言明确**: 每个测试用例有明确的断言
- [ ] **测试数据**: 使用真实但简化的测试数据
- [ ] **错误测试**: 错误情况有对应的测试用例
- [ ] **性能测试**: 关键功能有性能基准测试

## 🚀 部署配置检查清单

### Docker配置检查
- [ ] **多阶段构建**: 使用多阶段构建优化镜像大小
- [ ] **非root用户**: 使用非root用户运行应用
- [ ] **健康检查**: 配置健康检查端点
- [ ] **环境变量**: 正确使用环境变量配置
- [ ] **镜像优化**: 镜像大小和层数优化

### Kubernetes配置检查
- [ ] **资源限制**: 配置CPU和内存限制
- [ ] **健康检查**: 配置liveness和readiness探针
- [ ] **环境配置**: 使用ConfigMap和Secret管理配置
- [ ] **网络策略**: 配置适当的网络策略
- [ ] **扩缩容**: 配置HPA自动扩缩容

### CI/CD流程检查
- [ ] **构建流程**: 完整的构建、测试、部署流程
- [ ] **质量门禁**: 代码质量和测试覆盖率门禁
- [ ] **安全扫描**: 依赖安全扫描和代码安全检查
- [ ] **环境隔离**: 开发、测试、生产环境隔离
- [ ] **回滚机制**: 支持快速回滚的机制

## 📊 代码审查检查清单

### 代码质量检查
- [ ] **逻辑正确**: 代码逻辑正确，满足业务需求
- [ ] **类型安全**: TypeScript类型定义完整准确
- [ ] **错误处理**: 完善的异常处理机制
- [ ] **边界条件**: 考虑各种边界情况
- [ ] **代码复杂度**: 函数复杂度控制在合理范围

### 性能优化检查
- [ ] **渲染性能**: 避免不必要的重渲染
- [ ] **内存管理**: 防止内存泄漏
- [ ] **网络优化**: 减少不必要的请求
- [ ] **包大小**: 控制打包体积
- [ ] **缓存策略**: 合理使用缓存

### 安全性检查
- [ ] **输入验证**: 严格的数据验证
- [ ] **XSS防护**: 防止跨站脚本攻击
- [ ] **权限控制**: 合理的权限验证
- [ ] **敏感信息**: 避免泄露敏感数据
- [ ] **依赖安全**: 使用安全的第三方依赖

## 🛠️ 快速检查工具

### 自动化检查脚本
```bash
#!/bin/bash
# scripts/quality-check.sh

echo "🔍 执行代码质量检查..."

# TypeScript类型检查
echo "1️⃣ TypeScript类型检查"
pnpm type-check || exit 1

# 代码规范检查
echo "2️⃣ ESLint规范检查"
pnpm lint || exit 1

# 样式规范检查
echo "3️⃣ Stylelint样式检查"
pnpm stylelint "src/**/*.{vue,scss,css}" || exit 1

# 单元测试
echo "4️⃣ 单元测试"
pnpm test:unit || exit 1

# 构建验证
echo "5️⃣ 构建验证"
pnpm build || exit 1

echo "✅ 所有检查通过！"
```

### 质量指标检查
```typescript
// utils/quality-metrics.ts
interface IQualityMetrics {
  typescriptCoverage: number;    // TypeScript覆盖率
  lintErrors: number;            // ESLint错误数
  testCoverage: number;          // 测试覆盖率
  bundleSize: number;            // 打包大小
  performanceScore: number;      // 性能分数
}

// 质量标准
const QUALITY_STANDARDS: IQualityMetrics = {
  typescriptCoverage: 95,   // ≥95%
  lintErrors: 0,            // 0个错误
  testCoverage: 80,         // ≥80%
  bundleSize: 1024 * 1024,  // ≤1MB
  performanceScore: 90,     // ≥90分
};

export const checkQualityStandards = (metrics: IQualityMetrics): boolean => {
  return (
    metrics.typescriptCoverage >= QUALITY_STANDARDS.typescriptCoverage &&
    metrics.lintErrors <= QUALITY_STANDARDS.lintErrors &&
    metrics.testCoverage >= QUALITY_STANDARDS.testCoverage &&
    metrics.bundleSize <= QUALITY_STANDARDS.bundleSize &&
    metrics.performanceScore >= QUALITY_STANDARDS.performanceScore
  );
};
```

## 📝 检查清单使用指南

### 1. 开发前检查
在开始编码前，明确需要遵循的检查清单：
- 确定开发任务类型（组件/API/测试/部署）
- 选择对应的检查清单
- 设置开发环境和工具

### 2. 开发中检查
在编码过程中，定期进行检查：
- 每完成一个功能模块，运行相关检查
- 提交代码前，执行完整检查流程
- 发现问题及时修复，避免累积

### 3. 开发后检查
代码完成后，进行全面检查：
- 运行所有自动化检查工具
- 进行人工代码审查
- 验证质量指标达标
- 更新文档和测试

### 4. 团队协作检查
在团队协作中，建立统一的检查标准：
- 制定团队检查规范
- 建立代码审查流程
- 定期更新检查清单
- 分享最佳实践

## 🔗 相关文档链接

- [AI编程Agent体系总览](./README.md)
- [编码规范Agent](./coding-standards.md)
- [组件开发Agent](./component-development.md)
- [API开发Agent](./api-development.md)
- [测试指导Agent](./testing.md)
- [代码审查Agent](./code-review.md)
- [部署指导Agent](./deployment.md)
- [项目结构Agent](./project-structure.md)

通过使用这些检查清单，可以确保AI生成的代码质量高、规范统一、可维护性强。
