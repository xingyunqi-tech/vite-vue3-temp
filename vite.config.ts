import path from 'path';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import type { PluginOption } from 'vite';
import { devServer } from './config/devServer';
import childProcess from 'child_process';
import mkcert from 'vite-plugin-mkcert';
import legacy from '@vitejs/plugin-legacy';
import viteCompression from 'vite-plugin-compression';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { VueMcp } from 'vite-plugin-vue-mcp';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { codeInspectorPlugin } from 'code-inspector-plugin';

/**
 * 现代浏览器兼容性填充
 */
const modernLegacyPolyfills = [
  'core-js/es/array/at',
  'core-js/es/array/find-last',
  'core-js/es/array/find-last-index',
  'core-js/es/array/to-reversed',
  'core-js/es/array/to-sorted',
  'core-js/es/array/to-spliced',
  'core-js/es/typed-array/at',
  'core-js/es/typed-array/find-last',
  'core-js/es/typed-array/find-last-index',
  'core-js/es/typed-array/to-reversed',
  'core-js/es/typed-array/to-sorted',
  'core-js/es/string/replace-all',
  'core-js/es/object/has-own',
  'core-js/es/promise/any',
];

function generatePlugins(mode: string): PluginOption[] {
  const isProd = mode === 'production';

  const plugins: PluginOption[] = [
    vue(),
    vueJsx(),
    VueMcp(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    codeInspectorPlugin({
      bundler: 'vite',
    }),
  ];

  if (isProd) {
    plugins.push(
      legacy({
        targets: ['defaults', 'not IE 11'],
        additionalLegacyPolyfills: modernLegacyPolyfills,
        additionalModernPolyfills: modernLegacyPolyfills,
      }),
      viteCompression({
        verbose: true, // 是否在控制台输出压缩结果
        disable: false, // 是否禁用压缩
        threshold: 10240, // 体积大于阈值时才会被压缩，单位为 b，默认为 10kb
        algorithm: 'gzip', // 压缩算法
        ext: '.gz', // 生成的压缩包后缀
        deleteOriginFile: false, // 是否删除原文件
      }),
    );

    if (process.env.UPLOAD_TO_SENTRY) {
      plugins.push(
        // 上传到sentry平台
        sentryVitePlugin({
          org: process.env.VITE_SENTRY_ORG,
          project: process.env.VITE_SENTRY_PROJECT,
          authToken: process.env.VITE_SENTRY_AUTH_TOKEN,
          telemetry: false,
        }),
      );
    }
    if (process.env.VITE_ENABLE_ANALYZER) {
      plugins.push(
        // 打包产物分析
        visualizer({
          title: 'Vite Bundle Visualizer',
          open: true,
          brotliSize: true,
          gzipSize: true,
          sourcemap: false,
          template: 'treemap',
          filename: 'dist/analyzer.html',
        }),
      );
    }
  } else {
    if (process.env.VITE_ENABLE_HTTPS) {
      plugins.push(mkcert());
    }
  }

  return plugins;
}

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return defineConfig({
    /** 测试配置 */
    test: {
      // 测试环境配置
      environment: 'jsdom',
      // 全局API支持
      globals: true,
      // 测试文件匹配模式
      include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      // 排除文件
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      // 服务器配置
      server: {
        deps: {
          // 内联以避免CSS导入问题
          inline: ['element-plus'],
        },
      },
      // 测试覆盖率配置
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        reportsDirectory: './coverage',
        exclude: ['node_modules/', 'tests/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/coverage/**', '**/build/**'],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
      // 测试设置文件
      setupFiles: ['./tests/setup.ts'],
    },
    /** 开发服务器配置 */
    server: devServer(),
    /** 插件配置 */
    plugins: generatePlugins(mode),
    /** 路径别名配置 */
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    /** css配置 */
    css: {
      preprocessorOptions: {
        scss: {
          // 配置全局scss
          // additionalData: '@use "@/assets/scss/base.scss" as *;',
        },
      },
    },
    /** 构建配置 */
    build: {
      sourcemap: true,
      assetsInlineLimit: 10 * 1024, // 10kb
      outDir: 'dist', // 打包目录名称
      assetsDir: 'static/assets',
      rollupOptions: {
        output: {
          experimentalMinChunkSize: 200 * 1024, // 200kb
          // 打包编译文件名称，添加内容哈希值
          entryFileNames: `static/js/[name].[hash].js`,
          chunkFileNames: `static/js/[name].[hash].js`,
          // 根据资源类型分类到不同文件夹
          assetFileNames: ({ names }) => {
            const fileName = names?.[0] ?? '';
            if (/\.(css)$/.test(fileName)) {
              return 'static/css/[name].[hash].[ext]';
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/.test(fileName)) {
              return 'static/fonts/[name].[hash].[ext]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(fileName)) {
              return 'static/img/[name].[hash].[ext]';
            }
            return 'static/assets/[name].[hash].[ext]';
          },
        },
      },
    },
    /** 定义配置 */
    define: {
      // 将git分支名写入环境变量
      'process.env.BRANCH_NAME': JSON.stringify(
        childProcess.execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      ),
    },
  });
};
