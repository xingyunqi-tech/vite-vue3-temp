/**
 * Vitest 测试环境设置文件
 * @description 配置测试环境的全局设置和Mock
 */

import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// 配置Vue Test Utils全局设置
config.global.stubs = {
  // 全局组件存根
  'el-icon': true,
  'el-button': true,
  'el-input': true,
  'el-form': true,
  'el-form-item': true,
  'el-row': true,
  'el-col': true,
  'el-config-provider': true,
};

// Mock全局对象
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock CSS变量
Object.defineProperty(document.documentElement, 'style', {
  value: {
    setProperty: vi.fn(),
    getPropertyValue: vi.fn(() => ''),
    removeProperty: vi.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 全局测试工具函数
declare global {
  var mockFetch: typeof vi.fn;
  var mockLocalStorage: typeof localStorageMock;
}

globalThis.mockFetch = fetch as unknown as typeof vi.fn;
globalThis.mockLocalStorage = localStorageMock;
