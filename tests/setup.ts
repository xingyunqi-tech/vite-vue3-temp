/**
 * Vitest 测试环境设置文件
 * @description 配置测试环境的全局设置和Mock
 */

import { vi, afterEach } from 'vitest';

// 说明：Element Plus 组件由 unplugin-vue-components 在 SFC 编译期自动注册（测试配置已复用
// vite.config.ts 的插件链），无需再用 config.global.stubs 逐个打桩。
// 个别测试若想屏蔽重组件，在该测试内局部 stubs 即可。

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

// Mock ResizeObserver / IntersectionObserver
//
// 必须是真正的 class：@vueuse 的 useResizeObserver 等会 `new ResizeObserver(...)`，
// 用 vi.fn().mockImplementation(() => ({...})) 在 new 时会报 "is not a constructor"，
// 导致任何挂载了 Element Plus 复杂组件的测试直接崩掉。
class ObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
}

global.ResizeObserver = ObserverMock as unknown as typeof ResizeObserver;
global.IntersectionObserver = ObserverMock as unknown as typeof IntersectionObserver;
window.ResizeObserver = global.ResizeObserver;
window.IntersectionObserver = global.IntersectionObserver;

// Mock CSS变量
Object.defineProperty(document.documentElement, 'style', {
  value: {
    setProperty: vi.fn(),
    getPropertyValue: vi.fn(() => ''),
    removeProperty: vi.fn(),
  },
});

// Mock localStorage with actual implementation
const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 全局测试工具函数
declare global {
  var mockFetch: typeof vi.fn;
  var mockLocalStorage: typeof localStorageMock;
}

globalThis.mockFetch = fetch as unknown as typeof vi.fn;
globalThis.mockLocalStorage = localStorageMock;

// 每个测试后清理 localStorage
afterEach(() => {
  // 清理 localStorage
  localStorageMock.clear();
});
