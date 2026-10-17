import { createPinia } from 'pinia';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { renderApp } from '@/app/render';

const order: string[] = [];

vi.mock('@/app/App.vue', () => ({ default: defineComponent({ render: () => h('div') }) }));
vi.mock('@/directives', () => ({ setupDirectives: vi.fn() }));
vi.mock('@/plugins/locale', () => ({ i18n: { install: vi.fn() } }));
vi.mock('@/utils/error-handler', () => ({
  reportGlobalError: vi.fn(),
  setupGlobalErrorHandler: vi.fn(),
}));
vi.mock('@/store', () => ({ default: Promise.resolve(createPinia()), preloadPersistedData: vi.fn() }));
vi.mock('@/router', () => ({
  createAppRouter: () => ({ install: () => order.push('router') }),
}));

describe('renderApp', () => {
  it('beforeRouter 在 router 安装前执行，beforeMount 在其后', async () => {
    document.body.innerHTML = '<div id="main-app"></div>';

    await renderApp({
      beforeRouter: () => {
        order.push('beforeRouter');
      },
      beforeMount: () => {
        order.push('beforeMount');
      },
    });

    expect(order).toEqual(['beforeRouter', 'router', 'beforeMount']);
  });
});
