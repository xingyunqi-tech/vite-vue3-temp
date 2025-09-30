import { type Page } from '@playwright/test';

/**
 * E2E 测试工具类
 */
export class E2EHelpers {
  constructor(public page: Page) {}

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // 等待body存在，不要求可见状态（避免loading状态问题）
    await this.page.waitForSelector('body', { state: 'attached' });

    // 等待Vue应用挂载完成（等待loading消失或主要内容出现）
    try {
      await this.page.waitForFunction(
        () => {
          const loadingWrap = document.querySelector('.LoadingWrap');
          const mainApp = document.querySelector('#main-app');
          // 要么loading消失，要么应用内容已加载
          return !loadingWrap || (mainApp && mainApp.children.length > 1);
        },
        { timeout: 5000 },
      );
    } catch {
      // 如果等待失败，添加一个固定延迟作为备用
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 截图并保存
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * 等待元素可见
   */
  async waitForVisible(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * 等待元素可点击
   */
  async waitForClickable(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'attached', timeout });
    await this.page.waitForFunction(
      sel => {
        const element = document.querySelector(sel);
        return element && !element.hasAttribute('disabled');
      },
      selector,
      { timeout },
    );
  }

  /**
   * 安全点击（等待元素可点击后再点击）
   */
  async safeClick(selector: string) {
    await this.waitForClickable(selector);
    await this.page.click(selector);
  }

  /**
   * 填写表单
   */
  async fillForm(formData: Record<string, string>) {
    for (const [selector, value] of Object.entries(formData)) {
      await this.page.fill(selector, value);
    }
  }

  /**
   * 等待网络请求完成
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 检查是否有控制台错误
   */
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * 模拟慢网络
   */
  async simulateSlowNetwork() {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
  }

  /**
   * 检查页面性能
   */
  async checkPerformance() {
    const performanceEntries = await this.page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });

    const entries = JSON.parse(performanceEntries);
    const loadTime = entries[0]?.loadEventEnd - entries[0]?.fetchStart;

    return {
      loadTime,
      entries,
    };
  }

  /**
   * 等待 Vue 组件渲染完成
   */
  async waitForVueReady() {
    await this.page.waitForFunction(() => {
      return window.Vue && window.Vue.version;
    });
  }

  /**
   * 获取 Vue 组件数据
   */
  async getVueComponentData(selector: string) {
    return await this.page.evaluate(sel => {
      const element = document.querySelector(sel);
      return element?.__vueParentComponent?.data;
    }, selector);
  }

  /**
   * 安全访问 localStorage
   */
  async safeLocalStorage(action: 'get' | 'set' | 'remove', key: string, value?: string) {
    try {
      return await this.page.evaluate(
        ({ action, key, value }) => {
          try {
            if (action === 'get') {
              return localStorage.getItem(key);
            } else if (action === 'set' && value) {
              localStorage.setItem(key, value);
              return true;
            } else if (action === 'remove') {
              localStorage.removeItem(key);
              return true;
            }
          } catch (e) {
            console.warn('localStorage access error:', e);
            return null;
          }
        },
        { action, key, value },
      );
    } catch (e) {
      console.warn('Failed to access localStorage in test environment', e);
      return null;
    }
  }

  /**
   * 检查无障碍性
   */
  async checkAccessibility() {
    // 检查是否有 alt 属性缺失的图片
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();

    // 检查是否有表单元素缺少 label
    const inputsWithoutLabel = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();

    return {
      imagesWithoutAlt,
      inputsWithoutLabel,
    };
  }

  /**
   * 模拟键盘导航
   */
  async testKeyboardNavigation() {
    await this.page.keyboard.press('Tab');
    const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
    return activeElement;
  }

  /**
   * 检查响应式设计
   */
  async testResponsive() {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1920, height: 1080 }, // Desktop
    ];

    const results = [];
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500); // 等待重排

      const screenshot = await this.page.screenshot();
      results.push({
        viewport,
        screenshot: screenshot.toString('base64'),
      });
    }

    return results;
  }
}

/**
 * 导航助手
 */
export class NavigationHelper extends E2EHelpers {
  /**
   * 导航到指定路由
   */
  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}

/**
 * API 测试助手
 */
export class APIHelper {
  constructor(public page: Page) {}

  /**
   * 监听 API 请求
   */
  async interceptAPI(url: string | RegExp, mockResponse?: any) {
    await this.page.route(url, async route => {
      if (mockResponse) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse),
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * 等待 API 请求完成
   */
  async waitForAPIResponse(url: string | RegExp) {
    return await this.page.waitForResponse(url);
  }

  /**
   * 模拟 API 错误
   */
  async simulateAPIError(url: string | RegExp, statusCode = 500) {
    await this.page.route(url, async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
  }
}
