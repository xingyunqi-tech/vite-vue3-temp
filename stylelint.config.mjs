/** 自定义属性里的字体栈（如 --aix-fontFamily）允许大写的字体名 */
const FONT_FAMILY_KEYWORDS = [
  'BlinkMacSystemFont',
  'Roboto',
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Consolas',
  'Courier',
  'Monaco',
  'Menlo',
  'PingFang',
  'Hiragino',
  'Heiti',
  'SimSun',
  'SimHei',
  'NSimSun',
  'FangSong',
  'KaiTi',
  'STSong',
  'STHeiti',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
];

const config = {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-property-sort-order-smacss',
    'stylelint-config-recommended-vue/scss',
  ],

  ignoreFiles: [
    'node_modules/**/*',
    'build/**/*',
    'dist/**/*',
    'es/**/*',
    'lib/**/*',
    'coverage/**/*',
    'src/assets/iconfont/**',
  ],

  overrides: [{ files: ['**/*.scss'], customSyntax: 'postcss-scss' }],

  rules: {
    // ==================== 嵌套与选择器复杂度 ====================
    'max-nesting-depth': 10,
    'selector-max-id': 6,
    'selector-max-compound-selectors': 15,

    // ==================== 命名规范 ====================
    'scss/dollar-variable-pattern': null,
    'selector-id-pattern': '^[a-zA-Z][a-zA-Z0-9_-]+$|^el-|^mz-',
    'selector-class-pattern': '^[a-zA-Z][a-zA-Z0-9_-]+$|^el-|^mz-',
    'keyframes-name-pattern': '^[a-zA-Z0-9-]+$',
    'custom-property-pattern': '^[a-zA-Z0-9-]+$',
    'scss/at-mixin-pattern': '^[a-zA-Z0-9-]+$',
    'scss/percent-placeholder-pattern': '^[a-zA-Z0-9-]+$',

    // ==================== 值与表示法 ====================
    'value-keyword-case': ['lower', { ignoreKeywords: FONT_FAMILY_KEYWORDS, camelCaseSvgKeywords: true }],
    'color-function-notation': 'modern',
    'alpha-value-notation': 'number',

    // ==================== 浏览器兼容 ====================
    // 保留 -webkit-box 兼容旧版多行截断
    'value-no-vendor-prefix': [true, { ignoreValues: ['box'] }],
    'media-feature-name-no-vendor-prefix': null,

    // ==================== 特异性与覆盖 ====================
    'no-descending-specificity': null,

    // ==================== Vue / SCSS / UnoCSS 语法兼容 ====================
    'selector-pseudo-element-no-unknown': [true, { ignorePseudoElements: ['v-deep'] }],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'deep'] }],
    'function-no-unknown': null,
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'use',
          'forward',
          'function',
          'if',
          'for',
          'each',
          'else',
          'error',
          'include',
          'extend',
          'mixin',
          'at-root',
          'tailwind',
          'apply',
          'screen',
          'unocss',
        ],
      },
    ],
    // Vue 模板内联 style 属性被 postcss-html 解析后无选择器上下文，产生误报
    'no-invalid-position-declaration': null,

    // ==================== 字体相关 ====================
    'font-family-no-missing-generic-family-keyword': [
      true,
      {
        ignoreFontFamilies: [
          'iconfont',
          'SourceHanSansSC-Regular',
          'SourceHanSansSC-Bold',
          'SourceHanSansSC-Medium',
          'Source Han Sans SC',
          'Rubik',
          'PingFang SC',
          'DingTalk JinBuTi',
        ],
      },
    ],

    // ==================== 宽松规则 ====================
    'no-empty-source': null,
    'block-no-empty': null,
  },
};

export default config;
