import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MicroAppContainer from '@/micro/main/MicroAppContainer.vue';

/** 模拟 qiankun：挂载与卸载都会清空容器 */
function clearContainer(selector: string) {
  const el = document.querySelector(selector)!;
  while (el.firstChild) el.removeChild(el.firstChild);
}

vi.mock('@/micro/main/manager', () => ({
  startMicroApp: vi.fn(async (_app: string, { container }: { container: string }) => {
    clearContainer(container);
    const node = document.createElement('div');
    node.className = 'sub-app';
    document.querySelector(container)!.appendChild(node);
    return { mountPromise: Promise.resolve() };
  }),
  stopMicroApp: vi.fn(async () => clearContainer('#micro-demo')),
  getMicroAppStatus: vi.fn(() => 'MOUNTED'),
}));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MicroAppContainer', () => {
  it('子应用挂载、卸载后状态插槽照常渲染', async () => {
    const errors: unknown[] = [];
    const wrapper = mount(MicroAppContainer, {
      props: { app: 'demo' },
      slots: { placeholder: '<div class="placeholder">未启动</div>' },
      attachTo: document.body,
      global: { config: { errorHandler: err => errors.push(err) } },
    });

    await wrapper.vm.start();
    await flushPromises();
    expect(wrapper.find('.sub-app').exists()).toBe(true);

    await wrapper.vm.stop();
    await flushPromises();
    expect(wrapper.find('.placeholder').exists()).toBe(true);

    await wrapper.vm.start();
    await flushPromises();
    expect(wrapper.find('.sub-app').exists()).toBe(true);
    expect(errors).toEqual([]);

    wrapper.unmount();
  });
});
