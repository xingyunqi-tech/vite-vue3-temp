/**
 * 测试工具函数库
 * @description 提供常用的测试工具函数和Mock工具
 */

import { mount, VueWrapper } from '@vue/test-utils';
import { vi, expect } from 'vitest';
import type { Component, ComponentPublicInstance } from 'vue';
import type { MountingOptions } from '@vue/test-utils';
import { nextTick } from 'vue';

/**
 * 创建Vue组件测试包装器
 * @param component - Vue组件
 * @param options - 挂载选项
 * @returns 测试包装器
 */
export function createWrapper<T extends ComponentPublicInstance>(
  component: Component,
  options: MountingOptions<any> = {},
): VueWrapper<T> {
  return mount(component, {
    global: {
      stubs: {
        'el-icon': true,
        'el-button': true,
        'el-input': true,
        'router-link': true,
        'router-view': true,
        ...options.global?.stubs,
      },
      mocks: {
        $t: (key: string) => key,
        $route: {
          path: '/',
          params: {},
          query: {},
        },
        $router: {
          push: vi.fn(),
          replace: vi.fn(),
          go: vi.fn(),
          back: vi.fn(),
        },
        ...options.global?.mocks,
      },
    },
    ...options,
  });
}

/**
 * 等待Vue组件更新
 * @param wrapper - 组件包装器
 */
export async function waitForUpdate(): Promise<void> {
  await nextTick();
}

/**
 * 模拟用户点击事件
 * @param wrapper - 组件包装器
 * @param selector - 选择器
 */
export async function clickElement(wrapper: VueWrapper<any>, selector: string): Promise<void> {
  const element = wrapper.find(selector);
  expect(element.exists()).toBe(true);
  await element.trigger('click');
  await waitForUpdate();
}

/**
 * 模拟用户输入
 * @param wrapper - 组件包装器
 * @param selector - 输入框选择器
 * @param value - 输入值
 */
export async function inputValue(wrapper: VueWrapper<any>, selector: string, value: string): Promise<void> {
  const input = wrapper.find(selector);
  expect(input.exists()).toBe(true);
  await input.setValue(value);
  await waitForUpdate();
}

/**
 * 创建Mock API响应
 * @param data - 响应数据
 * @param success - 是否成功
 * @param message - 响应消息
 */
export function createMockApiResponse<T = any>(data: T, success = true, message = 'success') {
  return {
    code: success ? 200 : 500,
    message,
    data,
    success,
  };
}

/**
 * Mock Fetch请求
 * @param response - 模拟响应
 * @param status - HTTP状态码
 */
export function mockFetchResponse(response: any, status = 200) {
  const mockFetch = (globalThis as any).mockFetch as ReturnType<typeof vi.fn>;
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  });
}

/**
 * Mock Promise延迟
 * @param ms - 延迟毫秒数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建测试用的Pinia Store Mock
 * @param initialState - 初始状态
 */
export function createMockStore(initialState: any = {}) {
  return {
    state: { ...initialState },
    getters: {},
    actions: {},
    mutations: {},
  };
}

/**
 * 验证组件是否正确渲染
 * @param wrapper - 组件包装器
 * @param expectedElements - 期望存在的元素选择器数组
 */
export function expectElementsToExist(wrapper: VueWrapper<any>, expectedElements: string[]): void {
  expectedElements.forEach(selector => {
    expect(wrapper.find(selector).exists()).toBe(true);
  });
}

/**
 * 验证组件Props
 * @param wrapper - 组件包装器
 * @param expectedProps - 期望的Props
 */
export function expectPropsToMatch(wrapper: VueWrapper<any>, expectedProps: Record<string, any>): void {
  Object.entries(expectedProps).forEach(([key, value]) => {
    expect(wrapper.props(key)).toEqual(value);
  });
}

/**
 * 验证事件是否被触发
 * @param wrapper - 组件包装器
 * @param eventName - 事件名称
 * @param expectedPayload - 期望的事件载荷
 */
export function expectEventToBeEmitted(wrapper: VueWrapper<any>, eventName: string, expectedPayload?: any): void {
  const emittedEvents = wrapper.emitted(eventName);
  expect(emittedEvents).toBeTruthy();

  if (expectedPayload !== undefined) {
    const lastEmission = emittedEvents![emittedEvents!.length - 1];
    expect(lastEmission[0]).toEqual(expectedPayload);
  }
}
