import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
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

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mountLogin>>['wrapper'], email: string) {
  await wrapper.find('input[placeholder="请输入邮箱"]').setValue(email);
  await wrapper.find('input[type="password"]').setValue('secret');
  await wrapper.find('.login-card__submit').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  setActivePinia(createPinia());
  loginAction.mockClear();
  vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }) as never);
});

describe('登录页', () => {
  it('展示站点标题', async () => {
    const { wrapper } = await mountLogin('/login');
    expect(wrapper.find('.login-brand__title').text()).toBe('备考刷题运营后台');
  });

  it('邮箱为空时不发起登录', async () => {
    const { wrapper } = await mountLogin('/login');
    await fillAndSubmit(wrapper, '');

    expect(loginAction).not.toHaveBeenCalled();
  });

  it('邮箱格式不正确时不发起登录', async () => {
    const { wrapper } = await mountLogin('/login');
    await fillAndSubmit(wrapper, 'admin');

    expect(loginAction).not.toHaveBeenCalled();
  });

  it('非后台角色登录失败时提示无权限并停留在登录页', async () => {
    loginAction.mockRejectedValueOnce(new Error('当前账号无运营后台访问权限'));
    const { wrapper, router } = await mountLogin('/login');
    await fillAndSubmit(wrapper, 'user@example.com');

    expect(ElMessage.error).toHaveBeenCalledWith('当前账号无运营后台访问权限');
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('登录成功后回到 redirect 指向的页面', async () => {
    const { wrapper, router } = await mountLogin('/login?redirect=%2Fsetting');
    await fillAndSubmit(wrapper, 'admin@example.com');

    expect(loginAction).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' });
    expect(router.currentRoute.value.path).toBe('/setting');
  });
});
