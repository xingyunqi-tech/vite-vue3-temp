import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import LoginPage from '@/views/login/index.vue';

const { loginAction } = vi.hoisted(() => ({ loginAction: vi.fn(async () => {}) }));

vi.mock('@/store', async importOriginal => ({
  ...(await importOriginal<typeof import('@/store')>()),
  useUserInfoStore: () => ({ loginAction }),
}));

const page = { template: '<div />' };

async function mountLogin(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginPage },
      { path: '/', component: page },
      { path: '/setting', component: page },
    ],
  });
  await router.push(path);
  const wrapper = mount(LoginPage, { global: { plugins: [router] } });
  return { wrapper, router };
}

beforeEach(() => {
  setActivePinia(createPinia());
  loginAction.mockClear();
});

describe('登录页', () => {
  it('展示站点标题与二维码占位图', async () => {
    const { wrapper } = await mountLogin('/login');
    expect(wrapper.find('.logo-title').text()).toBe('Vite Vue3 App');
    await new Promise(resolve => setTimeout(resolve, 350));
    await flushPromises();
    expect(wrapper.find('.qr-image').exists()).toBe(true);
  });

  it('未勾选用户协议时不发起登录', async () => {
    const { wrapper } = await mountLogin('/login');
    await wrapper.find('input[placeholder="请输入手机号"]').setValue('13800000000');
    await wrapper.find('input[type="password"]').setValue('Abcd1234');
    await wrapper.find('.login-btn').trigger('click');
    await flushPromises();

    expect(loginAction).not.toHaveBeenCalled();
  });

  it('登录成功后回到 redirect 指向的页面', async () => {
    const { wrapper, router } = await mountLogin('/login?redirect=%2Fsetting');
    await wrapper.find('input[placeholder="请输入手机号"]').setValue('13800000000');
    await wrapper.find('input[type="password"]').setValue('Abcd1234');
    await wrapper.find('.agreement-checkbox input').setValue(true);
    await wrapper.find('.login-btn').trigger('click');
    await flushPromises();

    expect(loginAction).toHaveBeenCalledWith({ username: '13800000000', password: 'Abcd1234' });
    expect(router.currentRoute.value.path).toBe('/setting');
  });
});
