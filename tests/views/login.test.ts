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

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountLogin>>['wrapper'], username: string) {
  await wrapper.find('input[placeholder="请输入账号"]').setValue(username);
  await wrapper.find('input[type="password"]').setValue('secret');
  await wrapper.find('.login-card__submit').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  setActivePinia(createPinia());
  loginAction.mockClear();
});

describe('登录页', () => {
  it('展示站点标题', async () => {
    const { wrapper } = await mountLogin('/login');
    expect(wrapper.find('.login-brand__title').text()).toBe('Vite Vue3 App');
  });

  it('账号为空时不发起登录', async () => {
    const { wrapper } = await mountLogin('/login');
    await fillAndSubmit(wrapper, '');

    expect(loginAction).not.toHaveBeenCalled();
  });

  it('登录成功后回到 redirect 指向的页面', async () => {
    const { wrapper, router } = await mountLogin('/login?redirect=%2Fsetting');
    await fillAndSubmit(wrapper, 'admin');

    expect(loginAction).toHaveBeenCalledWith({ username: 'admin', password: 'secret' });
    expect(router.currentRoute.value.path).toBe('/setting');
  });
});
