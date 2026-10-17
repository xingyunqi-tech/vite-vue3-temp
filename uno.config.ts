import transformerDirectives from '@unocss/transformer-directives';
import { defineConfig, presetWind3, presetAttributify } from 'unocss';

export default defineConfig({
  // preflight: false —— 仅启用工具类，关闭全局样式重置，避免与 Element Plus 既有样式冲突
  presets: [presetWind3({ preflight: false }), presetAttributify()],
  transformers: [transformerDirectives()],
  content: {
    filesystem: ['./src/**/*.{vue,ts,tsx}', './index.html'],
  },
  blocklist: ['container'],
  theme: {
    colors: {},
  },
  safelist: [],
});
