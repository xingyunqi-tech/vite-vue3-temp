import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

/**
 * 测试配置
 *
 * 插件（UnoCSS / Components 自动注册 / svg-icons 虚拟模块）与路径别名一律复用
 * `vite.config.ts`，避免两份配置漂移导致「组件测试解析不到自动注册组件 / virtual: 模块」。
 * mode 传 'test'：vite.config 内部据此跳过 code-inspector、mkcert 等仅服务真实 dev server 的插件。
 *
 * ⚠️ vite.config.ts 的默认导出必须保持「同步函数」。改成 async 后 baseConfig 会变成 Promise，
 * 下面的 delete 静默失效、mergeConfig 也会合出一份错配置，且全程不报错。
 */
const baseConfig = viteConfig({ mode: 'test', command: 'serve' });

// dev server 专属配置对测试是死重量：proxy 指向后端网关、host 固定到 config/devServer.ts 的域名，
// 全部只服务 `pnpm start`。测试跑的是 node 环境，不需要也不应继承。
delete baseConfig.server;

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // 测试环境配置
      environment: 'jsdom',
      // 全局API支持
      globals: true,
      // 测试文件匹配模式
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      // 排除文件
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      // 测试设置文件
      setupFiles: ['./tests/setup.ts'],
      // 服务器配置
      server: {
        deps: {
          // 内联以避免 CSS 导入问题。
          // 必须用正则：ElementPlusResolver 注入的是
          // `element-plus/es/components/xxx/style/css` 这类子路径，字符串精确匹配不到，
          // 被 externalize 后 Node 会直接 import .css 并报 "Unknown file extension"。
          inline: [/element-plus/],
        },
      },
      // 测试覆盖率配置
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage',
        exclude: [
          'node_modules/',
          'tests/',
          'dist/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/coverage/**',
          '**/build/**',
          'scripts/',
          '.claude/',
        ],
        // 模版只带一个示例测试，不设覆盖率阈值。项目按自己的要求加：
        // thresholds 必须扁平写（套 `global: {}` 会被当 glob 匹配而静默失效），
        // 且要配 `include`，否则只统计「被测试导入过的文件」，数字虚高。
      },
    },
  }),
);
