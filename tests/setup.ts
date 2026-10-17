/**
 * Vitest 测试环境设置文件
 * @description 配置测试环境的全局设置和Mock
 */

import { vi, afterEach } from 'vitest';

/**
 * ==================== 第三方 SDK 打桩 ====================
 *
 * @zhs/agent-course-kit 及其依赖是面向浏览器的产物，在 jsdom 下加载即报错
 * （包内存在目录导入，且 md5 等模块在模块顶层就访问浏览器专有对象）。
 *
 * 这里统一打桩而不是让各测试自己写：`@/utils/auth`、用户 Store、请求层都直接引用该 SDK，
 * 凡是碰到 Store、请求、组件的测试都会被牵连到。
 * 需要断言 SDK 行为的测试，在自己文件里用 vi.mock 覆盖同名模块即可。
 */
vi.mock('@zhs/agent-course-kit', () => ({
  getToken: vi.fn(() => ''),
  getZHSUserId: vi.fn(() => ''),
  jumpToSsoLogin: vi.fn(),
  jumpToSsoLogout: vi.fn(),
  clearAuthData: vi.fn(),
}));

// 源码统一从这个子路径取 SSO 相关函数（主入口会连带 qiankun 运行时），桩要覆盖到全部被引用项
vi.mock('@zhs/agent-course-kit/utils/auth', () => ({
  getToken: vi.fn(() => ''),
  getZHSUserId: vi.fn(() => ''),
  jumpToSsoLogin: vi.fn(),
  jumpToSsoLogout: vi.fn(),
  clearAuthData: vi.fn(),
}));

vi.mock('@zhs/agent-course-kit/constants', () => ({
  TOKEN_AI_POLY: 'token-ai-poly',
  HIKE_POLYMAS_USER: 'hike-polymas-user',
  AIC_ZHS_U: 'aic-zhs-u',
  DOMAIN: 'polymas.com',
}));

vi.mock('@zhs/agent-course-kit/services/base-request', () => {
  // PolymasApi 是链式的：create().use().use()，桩要把 use 的返回值指回自己
  const createInstance = () => {
    const instance: Record<string, unknown> = {
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    instance.use = vi.fn(() => instance);
    return instance;
  };
  const PolymasApi = { create: vi.fn(() => createInstance()) };
  return {
    default: PolymasApi,
    PolymasApi,
    AuthModule: vi.fn(),
    ErrorModule: vi.fn(),
    LoadingModule: vi.fn(),
  };
});

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
