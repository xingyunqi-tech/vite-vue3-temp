import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /** 测试文件目录 */
  testDir: './e2e',

  /** 全局设置 */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /** Reporter 配置 */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/e2e-results.json' }],
    ['junit', { outputFile: 'playwright-report/e2e-results.xml' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  /** 全局测试配置 */
  use: {
    /** 基础 URL */
    baseURL: 'http://localhost:4173',

    /** 截图设置 */
    screenshot: 'only-on-failure',

    /** 视频录制 */
    video: 'retain-on-failure',

    /** 追踪设置 */
    trace: 'on-first-retry',

    /** 用户代理 */
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

    /** 忽略 HTTPS 错误 */
    ignoreHTTPSErrors: true,

    /** 等待加载完成 */
    waitForLoadState: 'domcontentloaded',
  },

  /** 项目配置 - 只测试 Chrome 浏览器 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /** Web Server 配置 */
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /** 测试超时设置 */
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  /** 输出目录 */
  outputDir: 'e2e-results',
});
