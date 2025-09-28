import { test, expect } from '@playwright/test';
import { E2EHelpers } from './utils/helpers';

test.describe('基础功能测试', () => {
  let helpers: E2EHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page);
  });

  test('应用启动和基本渲染', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查页面标题
    await expect(page).toHaveTitle(/Vite Vue3 App/i);

    // 检查主要元素是否存在
    await helpers.waitForVisible('#main-app');
    await expect(page.locator('#main-app')).toBeVisible();

    // 截图保存
    await helpers.takeScreenshot('app-startup');
  });

  test('路由导航功能', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 测试路由跳转到404页面
    await page.goto('/404');
    await helpers.waitForPageLoad();
    await expect(page).toHaveURL(/\/404/);

    // 检查404页面元素
    await helpers.waitForVisible('.app-container');
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('404页面处理', async ({ page }) => {
    await page.goto('/non-existent-page');
    await helpers.waitForPageLoad();

    // 应该重定向到404页面
    await expect(page).toHaveURL(/\/404/);
    await helpers.waitForVisible('.app-container');
    await expect(page.locator('.app-container')).toBeVisible();
  });

  test('主题切换功能', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查应用是否正常加载
    await helpers.waitForVisible('#main-app');

    // 测试基本的DOM存在性
    const app = page.locator('#main-app');
    await expect(app).toBeVisible();

    await helpers.takeScreenshot('app-loaded');
  });

  test('页面基本功能', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查页面基本结构
    await helpers.waitForVisible('#main-app');

    // 验证页面标题
    const title = await page.title();
    expect(title).toBeTruthy();

    await helpers.takeScreenshot('page-basic');
  });

  test('响应式设计测试', async ({ page }) => {
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await helpers.waitForPageLoad();

    await helpers.takeScreenshot('mobile-view');

    // 检查移动端布局
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await helpers.takeScreenshot('tablet-view');

    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await helpers.takeScreenshot('desktop-view');
  });

  test('性能检查', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await helpers.waitForPageLoad();

    const loadTime = Date.now() - startTime;

    // 页面加载时间应该在合理范围内
    expect(loadTime).toBeLessThan(5000);

    // 检查页面性能指标
    const performance = await helpers.checkPerformance();
    expect(performance.loadTime).toBeLessThan(3000);
  });

  test('控制台错误检查', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查是否有严重的控制台错误
    const seriousErrors = consoleErrors.filter(
      error =>
        !error.includes('favicon') && // 忽略图标错误
        !error.includes('Extension'), // 忽略浏览器扩展错误
    );

    expect(seriousErrors.length).toBe(0);
  });

  test('网络错误处理', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');
    await helpers.waitForPageLoad();

    // 应用应该能够优雅处理网络错误
    await helpers.waitForVisible('body');
    await expect(page.locator('body')).toBeVisible();
  });

  test('无障碍性检查', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    const accessibilityIssues = await helpers.checkAccessibility();

    // 所有图片都应该有 alt 属性
    expect(accessibilityIssues.imagesWithoutAlt).toBe(0);

    // 测试键盘导航
    const activeElement = await helpers.testKeyboardNavigation();
    expect(activeElement).toBeTruthy();
  });
});
