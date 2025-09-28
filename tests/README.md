# 测试指南

## 📋 概述

本项目使用 Vitest + Vue Test Utils 进行单元测试和集成测试，提供完整的测试环境配置和工具函数。

## 🛠️ 测试技术栈

- **测试框架**: [Vitest](https://vitest.dev/) - 快速的 Vite 原生测试框架
- **Vue测试工具**: [@vue/test-utils](https://test-utils.vuejs.org/) - Vue 3 官方测试工具
- **测试环境**: [jsdom](https://github.com/jsdom/jsdom) - 浏览器环境模拟
- **覆盖率工具**: [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html) - V8 覆盖率报告
- **UI界面**: [@vitest/ui](https://vitest.dev/guide/ui.html) - 可视化测试界面

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 运行测试
```bash
# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 打开可视化测试界面
npm run test:ui
```

## 📁 目录结构

```
tests/
├── README.md                 # 测试指南文档
├── setup.ts                  # 测试环境设置
├── utils/
│   └── test-helpers.ts       # 测试工具函数
├── components/               # 组件测试
│   └── StatisticsCard.test.ts
├── utils/                    # 工具函数测试
└── api/                      # API测试
```

## 🧪 测试类型

### 1. 组件测试
测试 Vue 组件的渲染、交互和状态变化。

```typescript
import { describe, it, expect } from 'vitest';
import { createWrapper } from '../utils/test-helpers';
import MyComponent from '@/components/MyComponent.vue';

describe('MyComponent', () => {
  it('应该正确渲染', () => {
    const wrapper = createWrapper(MyComponent, {
      props: { title: '测试标题' }
    });
    
    expect(wrapper.find('h1').text()).toBe('测试标题');
  });
});
```

### 2. 工具函数测试
测试纯函数的输入输出。

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/utils/date';

describe('formatDate', () => {
  it('应该正确格式化日期', () => {
    const date = new Date('2025-01-01');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-01-01');
  });
});
```

### 3. API测试
测试 API 调用和数据处理。

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mockFetchResponse } from '../utils/test-helpers';
import { getUserInfo } from '@/api/user';

describe('用户API', () => {
  it('应该正确获取用户信息', async () => {
    const mockUser = { id: 1, name: '张三' };
    mockFetchResponse({ code: 200, data: mockUser });
    
    const result = await getUserInfo('1');
    expect(result.data).toEqual(mockUser);
  });
});
```

## 🔧 测试工具

### createWrapper
创建 Vue 组件测试包装器，自动配置常用的全局组件和 Mock。

```typescript
const wrapper = createWrapper(MyComponent, {
  props: { title: '测试' },
  global: {
    stubs: { 'custom-component': true },
    mocks: { $customMethod: vi.fn() }
  }
});
```

### 用户交互模拟
```typescript
// 点击元素
await clickElement(wrapper, '.button');

// 输入文本
await inputValue(wrapper, 'input[type="text"]', '测试文本');

// 等待更新
await waitForUpdate(wrapper);
```

### API Mock
```typescript
// Mock 成功响应
mockFetchResponse({ code: 200, data: { success: true } });

// Mock 错误响应
mockFetchResponse({ code: 500, message: '服务器错误' }, 500);
```

### 断言工具
```typescript
// 验证元素存在
expectElementsToExist(wrapper, ['.header', '.content', '.footer']);

// 验证 Props
expectPropsToMatch(wrapper, { title: '测试', visible: true });

// 验证事件
expectEventToBeEmitted(wrapper, 'click', { id: 1 });
```

## 📊 覆盖率配置

项目配置了严格的覆盖率要求：

- **分支覆盖率**: 80%
- **函数覆盖率**: 80%
- **行覆盖率**: 80%
- **语句覆盖率**: 80%

覆盖率报告生成在 `./coverage` 目录下，包含：
- 文本报告（控制台输出）
- JSON报告（`coverage.json`）
- HTML报告（`coverage/index.html`）

## 🎯 测试最佳实践

### 1. 测试命名规范
```typescript
describe('组件名称或功能模块', () => {
  describe('具体功能分组', () => {
    it('应该 + 期望行为', () => {
      // 测试实现
    });
  });
});
```

### 2. AAA模式
```typescript
it('应该正确计算总价', () => {
  // Arrange - 准备数据
  const items = [{ price: 10 }, { price: 20 }];
  
  // Act - 执行操作
  const total = calculateTotal(items);
  
  // Assert - 验证结果
  expect(total).toBe(30);
});
```

### 3. Mock策略
- **外部依赖**: 始终 Mock 外部 API、第三方库
- **内部模块**: 根据测试目标选择性 Mock
- **全局对象**: 在 setup.ts 中统一 Mock

### 4. 测试隔离
- 每个测试用例独立运行
- 使用 `beforeEach` 重置状态
- 避免测试间的相互依赖

### 5. 边界测试
- 测试正常情况
- 测试边界值（空值、零值、最大值）
- 测试异常情况

## 🚨 常见问题

### 1. Element Plus 组件测试
```typescript
// 使用全局存根
config.global.stubs = {
  'el-button': true,
  'el-input': true,
};

// 或在单个测试中存根
const wrapper = createWrapper(MyComponent, {
  global: {
    stubs: { 'el-form': true }
  }
});
```

### 2. 路由测试
```typescript
// Mock 路由对象
const wrapper = createWrapper(MyComponent, {
  global: {
    mocks: {
      $route: { path: '/test', params: { id: '1' } },
      $router: { push: vi.fn() }
    }
  }
});
```

### 3. 异步测试
```typescript
it('应该处理异步操作', async () => {
  const wrapper = createWrapper(MyComponent);
  
  // 触发异步操作
  await wrapper.find('button').trigger('click');
  
  // 等待 DOM 更新
  await wrapper.vm.$nextTick();
  
  // 验证结果
  expect(wrapper.find('.result').text()).toBe('完成');
});
```

### 4. CSS 变量测试
```typescript
it('应该应用正确的样式', () => {
  const wrapper = createWrapper(MyComponent);
  
  // 验证计算样式
  expect(wrapper.vm.computedStyle).toEqual({
    color: 'var(--colorPrimary)',
    background: 'var(--colorBg)'
  });
});
```

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Vue 3 测试指南](https://vuejs.org/guide/scaling-up/testing.html)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

通过遵循这些指南和最佳实践，可以编写出高质量、可维护的测试代码，确保项目的稳定性和可靠性。
