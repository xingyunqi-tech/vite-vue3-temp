import { readFileSync } from 'fs';
import path from 'path';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import legacy from '@vitejs/plugin-legacy';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import UnoCSS from 'unocss/vite';
import ElementPlusStyle from 'unplugin-element-plus/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig, loadEnv } from 'vite';
import type { ConfigEnv, PluginOption } from 'vite';
import { compression } from 'vite-plugin-compression2';
import mkcert from 'vite-plugin-mkcert';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import { devServer } from './config/devServer.ts';

const { version: APP_VERSION } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

const uploadToSentry = process.env.UPLOAD_TO_SENTRY === 'true';

/**
 * modern 包需要的 core-js 补丁
 * plugin-legacy 的用量探测只覆盖语法特性，较新的内置方法需显式列出。
 * 条目省略 `core-js/` 前缀：plugin-legacy 对含 `/` 的条目会自行拼上它
 */
const modernPolyfills = [
  'es/array/at',
  'es/array/find-last',
  'es/array/find-last-index',
  'es/array/to-reversed',
  'es/array/to-sorted',
  'es/array/to-spliced',
  'es/array/with',
  'es/typed-array/at',
  'es/typed-array/find-last',
  'es/typed-array/find-last-index',
  'es/typed-array/to-reversed',
  'es/typed-array/to-sorted',
  'es/typed-array/with',
  'es/string/at',
  'es/string/replace-all',
  'es/object/has-own',
  'es/promise/any',
];

/**
 * 生成插件
 * @param mode - 模式
 * @param command - 命令
 * @returns 插件
 */
function generatePlugins(mode: string, command: ConfigEnv['command']): PluginOption[] {
  const isProd = command === 'build';
  // vitest 复用本配置（mode 'test'），跳过仅服务真实 dev server 的插件
  const isTest = mode === 'test';

  const plugins: PluginOption[] = [
    UnoCSS(),
    vue(),
    vueJsx(),
    ElementPlusStyle({}),
    Components({
      resolvers: [ElementPlusResolver()],
      // 放进 tsconfig.app.json 的 include 范围，vue-tsc 才能校验自动注册组件的 props
      dts: 'typings/components.d.ts',
    }),
    createSvgIconsPlugin({
      iconDirs: [path.resolve(import.meta.dirname, 'src/assets/icons')],
      // symbol id 与容器 id 带项目名，与 iconfont 的 icon- 命名空间隔离
      symbolId: 'vite-vue3-temp-[dir]-[name]',
      customDomId: 'vite-vue3-temp-icon',
    }),
  ];

  // 开发环境插件
  if (!isProd && !isTest) {
    plugins.push(codeInspectorPlugin({ bundler: 'vite' }));
    if (process.env.VITE_ENABLE_HTTPS === 'true') {
      plugins.push(mkcert());
    }
  }

  // 生产环境插件
  if (isProd) {
    // VITE_LEGACY=true 时只给 modern 包注入 polyfill；目标浏览器（.browserslistrc）都支持 ESM，不产出 legacy 包
    if (process.env.VITE_LEGACY === 'true') {
      plugins.push(legacy({ renderLegacyChunks: false, modernPolyfills }));
    }
    plugins.push(
      compression({
        algorithms: ['gzip', 'brotliCompress'],
        threshold: 10240,
      }),
    );
    if (uploadToSentry) {
      plugins.push(
        sentryVitePlugin({
          org: process.env.VITE_SENTRY_ORG,
          project: process.env.VITE_SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: APP_VERSION },
          sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
          telemetry: false,
        }),
      );
    }
    if (process.env.VITE_ENABLE_ANALYZER === 'true') {
      plugins.push(
        visualizer({
          title: 'Vite Bundle Visualizer',
          open: true,
          brotliSize: true,
          gzipSize: true,
          template: 'treemap',
          filename: 'reports/analyzer.html', // 放在 dist 之外，避免随部署产物发布
        }),
      );
    }
  }

  return plugins;
}

// https://vitejs.dev/config/
export default ({ mode, command }: Pick<ConfigEnv, 'mode' | 'command'>) => {
  // .env 文件里的变量补进 process.env，命令行显式传入的优先
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd()))) {
    process.env[key] ??= value;
  }
  const basePath = process.env.VITE_BASE_PATH || '/';
  return defineConfig({
    /** 资源 base path（非根路径部署时的前缀） */
    base: basePath,
    /** 开发服务器配置 */
    server: devServer(),
    /** 插件配置 */
    plugins: generatePlugins(mode, command),
    /** 路径别名配置 */
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(import.meta.dirname, 'src') }],
    },
    /** css配置 */
    css: {
      preprocessorOptions: {
        scss: {
          // 配置全局scss
          // additionalData: '@use "@/styles/index.scss" as *;',
        },
      },
      devSourcemap: true,
    },
    /** 构建配置（压缩器、CSS 压缩、sourcemap 等沿用 Vite 8 默认值） */
    build: {
      sourcemap: uploadToSentry ? 'hidden' : false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          entryFileNames: `static/js/[name].[hash].js`,
          chunkFileNames: `static/js/[name].[hash].js`,
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
          // 首屏必加载的三方库拆成稳定的 vendor 块，业务改动不再让整包三方代码换 hash。
          // 只按路由使用的重型库不在此列，交给默认路由级拆包；勿写 /node_modules/ 兜底组，会把懒加载库拖进首屏。
          codeSplitting: {
            groups: [
              {
                name: 'vue-vendor',
                test: /[\\/]node_modules[\\/](vue|@vue|vue-router|vue-i18n|pinia|pinia-plugin-persistedstate)[\\/]/,
              },
              { name: 'element-plus', test: /[\\/]node_modules[\\/](element-plus|@element-plus)[\\/]/ },
              {
                name: 'vendor',
                test: /[\\/]node_modules[\\/](axios|dayjs|localforage|lodash-es|js-cookie)[\\/]/,
              },
            ],
          },
        },
      },
    },
  });
};
