import { test, expect } from '@playwright/test';
import { E2EHelpers } from './utils/helpers';

test.describe('组件功能测试', () => {
  let helpers: E2EHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page);
  });

  test('Sentry错误边界组件', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查页面正常加载
    await helpers.waitForVisible('#main-app');
    await expect(page.locator('#main-app')).toBeVisible();

    await helpers.takeScreenshot('sentry-component-test');
  });

  test('基本组件渲染', async ({ page }) => {
    await page.goto('/');
    await helpers.waitForPageLoad();

    // 检查应用基本结构
    const app = page.locator('#main-app');
    await expect(app).toBeVisible();

    await helpers.takeScreenshot('basic-components');
  });

  test('404页面组件', async ({ page }) => {
    await page.goto('/404');
    await helpers.waitForPageLoad();

    // 检查404页面元素
    await helpers.waitForVisible('.app-container');
    await expect(page.locator('.app-container')).toBeVisible();
    await expect(page.locator('h1')).toContainText('OOPS');
    await expect(page.locator('h2')).toContainText('很抱歉，页面它不小心迷路了');

    await helpers.takeScreenshot('404-component');
  });

  test('403页面组件', async ({ page }) => {
    await page.goto('/403');
    await helpers.waitForPageLoad();

    // 检查403页面元素
    await helpers.waitForVisible('.error-page');
    await expect(page.locator('.error-page')).toBeVisible();
    await expect(page.locator('.error-code')).toContainText('403');
    await expect(page.locator('.error-title')).toContainText('无访问权限');

    await helpers.takeScreenshot('403-component');
  });
});
