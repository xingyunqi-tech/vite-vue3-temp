# E2E 测试文档

## 概述

本项目使用 [Playwright](https://playwright.dev/) 进行端到端(E2E)测试。Playwright 是一个现代化的自动化测试框架，支持多浏览器、多设备的测试。

## 目录结构

```
e2e/
├── utils/
│   └── helpers.ts          # 测试工具类和助手函数
├── basic.spec.ts           # 基础功能测试
├── auth.spec.ts            # 用户认证测试
├── components.spec.ts      # 组件交互测试
└── README.md              # 本文档
```

## 快速开始

### 安装依赖

```bash
# 安装 Playwright
pnpm add -D @playwright/test playwright

# 安装浏览器
npx playwright install
```

### 运行测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 使用 UI 模式运行测试
pnpm test:e2e:ui

# 调试模式运行测试
pnpm test:e2e:debug

# 运行特定浏览器的测试
pnpm test:e2e:chromium
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# 头部模式运行（显示浏览器窗口）
pnpm test:e2e:headed

# 查看测试报告
pnpm test:e2e:report
```

## 测试配置

### playwright.config.ts

主要配置项：

- **testDir**: 测试文件目录 (`./e2e`)
- **baseURL**: 应用基础 URL (`http://localhost:4173`)
- **projects**: 支持的浏览器项目
- **webServer**: 自动启动预览服务器
- **reporter**: 测试报告格式

### 浏览器支持

- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Pixel 5, iPhone 12
- **Tablet**: iPad Pro

## 测试工具类

### E2EHelpers

基础测试工具类，提供常用的测试方法：

```typescript
const helpers = new E2EHelpers(page);

// 等待页面加载
await helpers.waitForPageLoad();

// 安全点击
await helpers.safeClick('.button');

// 填写表单
await helpers.fillForm({
  '[data-testid="username"]': 'user',
  '[data-testid="password"]': 'password',
});

// 截图
await helpers.takeScreenshot('test-name');
```

### LoginHelper

登录相关测试助手：

```typescript
const loginHelper = new LoginHelper(page);

// 执行登录
await loginHelper.login('username', 'password');

// 验证登录状态
await loginHelper.verifyLoggedIn();

// 执行登出
await loginHelper.logout();
```

### APIHelper

API 测试助手：

```typescript
const apiHelper = new APIHelper(page);

// 拦截并模拟 API 响应
await apiHelper.interceptAPI(/\/api\/login/, {
  code: 200,
  data: { token: 'fake-token' }
});

// 模拟 API 错误
await apiHelper.simulateAPIError(/\/api\/users/, 500);
```

## 测试最佳实践

### 1. 使用数据测试ID

优先使用 `data-testid` 属性来定位元素：

```html
<button data-testid="login-button">登录</button>
```

```typescript
await page.click('[data-testid="login-button"]');
```

### 2. 等待策略

确保元素可见和可交互后再进行操作：

```typescript
// 等待元素可见
await helpers.waitForVisible('[data-testid="element"]');

// 等待网络空闲
await helpers.waitForNetworkIdle();
```

### 3. 测试隔离

每个测试应该是独立的，不依赖其他测试的状态：

```typescript
test.beforeEach(async ({ page }) => {
  // 重置应用状态
  await page.goto('/');
  await helpers.waitForPageLoad();
});
```

### 4. Mock API 响应

使用 API 拦截来控制测试环境：

```typescript
test.beforeEach(async ({ page }) => {
  const apiHelper = new APIHelper(page);
  await apiHelper.interceptAPI(/\/api\/.*/, { success: true });
});
```

### 5. 错误处理

捕获和验证错误状态：

```typescript
// 验证错误消息
await expect(page.locator('.error-message')).toBeVisible();

// 检查控制台错误
const errors = await helpers.checkConsoleErrors();
expect(errors).toHaveLength(0);
```

## 常见问题

### 1. 测试超时

如果测试经常超时，可以调整配置：

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60 * 1000, // 60秒
  expect: {
    timeout: 10 * 1000, // 10秒
  },
});
```

### 2. 元素定位失败

使用更稳定的选择器：

```typescript
// ❌ 不推荐 - CSS 类可能变化
await page.click('.btn-primary');

// ✅ 推荐 - 使用数据属性
await page.click('[data-testid="submit-button"]');
```

### 3. 网络请求问题

确保等待网络请求完成：

```typescript
// 等待特定请求
await page.waitForResponse('/api/data');

// 等待网络空闲
await page.waitForLoadState('networkidle');
```

### 4. 跨浏览器兼容性

某些功能可能在不同浏览器中表现不同：

```typescript
test.describe('Feature Tests', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'Skip on Safari');
  
  test('should work in all browsers', async ({ page }) => {
    // 测试代码
  });
});
```

## 持续集成

### GitHub Actions

项目配置了自动化 E2E 测试，在以下情况触发：

- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 或 `develop` 分支

### 测试矩阵

- **浏览器**: Chromium, Firefox, WebKit
- **设备**: Desktop, Mobile
- **并行执行**: 提高测试效率

### 测试报告

- HTML 报告：详细的测试结果展示
- JUnit 报告：CI/CD 集成
- 截图和视频：失败时自动保存

## 扩展测试

### 添加新测试

1. 在 `e2e/` 目录下创建新的 `.spec.ts` 文件
2. 使用现有的工具类和助手函数
3. 遵循测试最佳实践
4. 添加适当的断言和验证

### 自定义工具类

可以扩展现有的工具类或创建新的助手函数：

```typescript
export class CustomHelper extends E2EHelpers {
  async customAction() {
    // 自定义操作逻辑
  }
}
```

### 配置调整

根据项目需求调整 `playwright.config.ts`：

- 添加新的浏览器项目
- 修改超时设置
- 配置测试报告格式
- 设置全局测试选项

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [测试选择器最佳实践](https://playwright.dev/docs/best-practices)
- [API 测试指南](https://playwright.dev/docs/network)
- [CI/CD 集成](https://playwright.dev/docs/ci)
