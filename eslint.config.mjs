import jseslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const isProd = process.env.NODE_ENV === 'production';

// 导入路径限制匹配的文件类型
const SCRIPT_EXTS = '*.{ts,tsx,js,jsx,vue,mts,cts}';

// 基础导入限制
const restrictedPatterns = {
  apiGenerated: {
    group: ['@/api/generated', '@/api/generated/**', '**/api/generated', '**/api/generated/**'],
    message:
      '禁止直接从 api/generated/ 导入，请通过 @/api 统一入口导入。generated/ 由 Orval 自动生成，直接引用会绕过 custom/ 的覆盖逻辑。',
  },
  viewsCrossImport: {
    group: ['@/views', '@/views/**'],
    message: 'views/ 子目录间禁止通过别名互相引用。同目录内请使用相对路径（如 ./components/Foo.vue）。',
  },
};

export default [
  // ==================== 基础推荐配置 ====================
  jseslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  ...eslintPluginVue.configs['flat/recommended'],

  // ==================== 全局配置 ====================
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-console': isProd ? ['warn', { allow: ['warn', 'error'] }] : 'off',
      'no-debugger': 'error',
      'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
      'no-control-regex': 'off',
    },
  },

  // ==================== Vue 文件配置 ====================
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        // 按文件就近查找 tsconfig（根 tsconfig.json 为 solution-style，reference 到 tsconfig.app.json）
        projectService: true,
      },
    },
    rules: {
      // <script setup> 变量在模板中使用，ESLint 无法感知
      'no-useless-assignment': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-closing-bracket-newline': 'off',
      // 模板中使用的变量可能被误报
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // ==================== Import 规则 ====================
  {
    plugins: {
      import: eslintPluginImportX,
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.app.json',
        },
        alias: {
          map: [['@', './src']],
          extensions: ['.js', '.ts', '.vue', '.json', '.d.ts'],
        },
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'never',
        },
      ],
    },
  },

  // ==================== 非 Vue 文件禁用 Vue 规则 ====================
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    ignores: ['**/*.vue'],
    rules: {
      'vue/one-component-per-file': 'off',
      'vue/require-prop-types': 'off',
      'vue/require-default-prop': 'off',
      'vue/comment-directive': 'off',
    },
  },

  // ==================== 生成文件配置 ====================
  {
    files: ['src/api/generated/**/*'],
    rules: {
      // 允许 Orval 生成的 type/const 同名声明（枚举模式）
      '@typescript-eslint/no-redeclare': 'off',
      // Orval 生成文件有固定 import 风格，不强制排序
      'import/order': 'off',
    },
  },

  // ==================== 导入路径限制 ====================
  // flat config 里同名规则是「后块整体替换前块」，patterns 数组不会合并，后续块需重新声明仍需生效的 pattern
  {
    files: [`src/**/${SCRIPT_EXTS}`],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [restrictedPatterns.apiGenerated] }],
    },
  },
  {
    files: [`src/views/**/${SCRIPT_EXTS}`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [restrictedPatterns.apiGenerated, restrictedPatterns.viewsCrossImport] },
      ],
    },
  },

  // ==================== 文件命名规范 ====================
  // Vue 组件：PascalCase（index.vue / App.vue / 数字命名页面除外）
  {
    files: ['src/**/*.vue'],
    ignores: ['src/**/index.vue', 'src/App.vue', 'src/views/[0-9]*.vue'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.vue': 'PASCAL_CASE' }],
    },
  },
  // Composables / Hooks：camelCase
  {
    files: ['src/**/use[A-Z]*.{ts,js}'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.{ts,js}': 'CAMEL_CASE' }],
    },
  },
  // 其余 TS/JS 文件：kebab-case（Orval 生成产物除外）
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/**/use[A-Z]*.{ts,js}', 'src/**/*.d.ts', 'src/api/generated/**'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.{ts,tsx,js,jsx}': 'KEBAB_CASE' }],
    },
  },

  // ==================== Prettier 兼容（必须在最后） ====================
  eslintConfigPrettier,

  // ==================== 忽略文件配置 ====================
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'public/**/*',
      'coverage/**/*',
      'reports/**/*',
      'src/assets/iconfont/**/*',
    ],
  },
];
