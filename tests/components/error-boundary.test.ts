import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, onUnmounted } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { isFatalRenderError } from '@/components/ErrorBoundary/fatal-error';
import ErrorBoundary from '@/components/ErrorBoundary/index.vue';

vi.mock('@/utils/error-handler', () => ({ reportGlobalError: vi.fn() }));

const Home = defineComponent({ render: () => h('div', { class: 'home' }, 'home') });
const Broken = defineComponent({
  setup() {
    throw new Error('boom');
  },
});

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/broken', component: Broken },
    ],
  });
  await router.push('/');
  const wrapper = mount(defineComponent({ render: () => h(ErrorBoundary, null, { default: () => h(RouterView) }) }), {
    global: { plugins: [router] },
  });
  await router.push('/broken');
  await flushPromises();
  return { router, wrapper };
}

describe('ErrorBoundary', () => {
  it('点击返回首页后渲染首页', async () => {
    const { router, wrapper } = await setup();
    expect(wrapper.find('.home').exists()).toBe(false);

    const homeButton = wrapper.findAll('button').find(button => button.text() === '返回首页');
    await homeButton!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/');
    expect(wrapper.find('.home').exists()).toBe(true);
  });
});

describe('ErrorBoundary 离场钩子', () => {
  it('上一页卸载钩子抛错时照常渲染目标页', async () => {
    const Leaving = defineComponent({
      setup() {
        onUnmounted(() => {
          throw new Error('cleanup failed');
        });
        return () => h('div', 'leaving');
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Home },
        { path: '/leaving', component: Leaving },
      ],
    });
    await router.push('/leaving');
    const errorHandler = vi.fn();
    const wrapper = mount(defineComponent({ render: () => h(ErrorBoundary, null, { default: () => h(RouterView) }) }), {
      global: { plugins: [router], config: { errorHandler } },
    });

    await router.push('/');
    await flushPromises();

    expect(wrapper.find('.home').exists()).toBe(true);
    expect(errorHandler.mock.calls[0]?.[0]).toMatchObject({ message: 'cleanup failed' });
  });

  it.each(['bum', 'um', 'da'])('生产 code %s 不算致命', code => {
    expect(isFatalRenderError(`https://vuejs.org/error-reference/#runtime-${code}`)).toBe(false);
  });
});
