import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import Login from '@/views/Login/index.vue';

// 模拟Element Plus组件
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// 模拟业务组件
vi.mock('@/business-components/QrCodeLogin/index.vue', () => ({
  default: {
    name: 'QrCodeLogin',
    template: `
      <div class="mock-qr-code-login">
        <div class="qr-code" :class="{ loading }">
          <img v-if="qrCodeUrl && !loading" :src="qrCodeUrl" alt="二维码" class="qr-image" />
          <div v-else class="qr-loading">加载中...</div>
        </div>
        <button @click="$emit('refresh')">刷新二维码</button>
      </div>
    `,
    props: ['qrCodeUrl', 'loading'],
  },
}));

vi.mock('@/business-components/LoginInput/index.vue', () => ({
  default: {
    name: 'LoginInput',
    template: `
      <div class="mock-login-input">
        <button @click="$emit('login-success', 'mock-token')">登录成功</button>
        <button @click="$emit('login-error', new Error('登录失败'))">登录失败</button>
      </div>
    `,
  },
}));

// 创建路由
const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/Home', component: { template: '<div>Home</div>' } },
  { path: '/login', component: Login },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

// 模拟用户仓库
const mockUserStore = {
  token: '',
  setTokenValue: vi.fn(),
};

vi.mock('@/store', () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

describe('Login 页面', () => {
  beforeEach(() => {
    // 创建并设置 pinia
    setActivePinia(createPinia());

    // 重置所有模拟
    vi.clearAllMocks();

    // 重置用户token
    mockUserStore.token = '';

    // 重置路由
    router.push('/login');
  });

  // 基础渲染测试
  it('正确渲染页面结构', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.login-container').exists()).toBe(true);
    expect(wrapper.find('.logo-header').exists()).toBe(true);
    expect(wrapper.find('.main-content').exists()).toBe(true);
    expect(wrapper.find('.qr-section').exists()).toBe(true);
    expect(wrapper.find('.form-section').exists()).toBe(true);
  });

  // Logo 渲染测试
  it('正确渲染Logo和标题', () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.find('.logo-image').exists()).toBe(true);
    expect(wrapper.find('.logo-text').exists()).toBe(true);
    expect(wrapper.find('.logo-text-title').text()).toContain('生命科学学院');
  });

  // 二维码组件测试
  it('包含二维码登录组件', () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.findComponent({ name: 'QrCodeLogin' }).exists()).toBe(true);
  });

  // 账号登录组件测试
  it('包含账号登录组件', () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.findComponent({ name: 'LoginInput' }).exists()).toBe(true);
  });

  // 注册链接测试
  it('包含注册链接', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    const registerLink = wrapper.find('.register-link-text');
    expect(registerLink.exists()).toBe(true);
    expect(registerLink.text()).toBe('注册账号');

    // 点击注册链接
    await registerLink.trigger('click');

    // 验证消息提示
    expect(ElMessage.info).toHaveBeenCalledWith('注册功能暂未开放');
  });

  // 二维码刷新测试
  it('可以刷新二维码', async () => {
    // 模拟时间
    const mockDate = new Date(2023, 0, 1);
    const spy = vi.spyOn(global.Date, 'now').mockImplementation(() => mockDate.getTime());

    const wrapper = mount(Login, {
      global: {
        plugins: [router],
        stubs: {
          QrCodeLogin: true,
        },
      },
    });

    // 设置初始状态
    wrapper.vm.qrLoading = false;

    // 模拟刷新二维码
    await wrapper.findComponent({ name: 'QrCodeLogin' }).vm.$emit('refresh');

    // 验证加载状态
    expect(wrapper.vm.qrLoading).toBe(true);

    // 等待异步操作完成
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 1100));

    // 验证加载状态结束
    expect(wrapper.vm.qrLoading).toBe(false);

    // 恢复时间模拟
    spy.mockRestore();
  });

  // 二维码登录成功测试
  it('二维码登录成功时正确处理', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
        stubs: {
          QrCodeLogin: true,
        },
      },
    });

    const token = 'qr-login-token';

    // 模拟路由推送
    router.push = vi.fn();

    // 模拟二维码登录成功
    await wrapper.findComponent({ name: 'QrCodeLogin' }).vm.$emit('success', token);

    // 验证成功消息
    expect(ElMessage.success).toHaveBeenCalledWith('扫码登录成功！');

    // 验证token设置
    expect(mockUserStore.setTokenValue).toHaveBeenCalledWith(token);

    // 验证路由跳转
    expect(router.push).toHaveBeenCalledWith('/Home');
  });

  // 二维码登录失败测试
  it('二维码登录失败时正确处理', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    const error = new Error('扫码登录失败');

    // 模拟二维码登录失败
    await wrapper.findComponent({ name: 'QrCodeLogin' }).vm.$emit('error', error);

    // 验证错误消息
    expect(ElMessage.error).toHaveBeenCalledWith('扫码登录失败，请重试');
  });

  // 账号登录成功测试
  it('账号登录成功时正确处理', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
        stubs: {
          LoginInput: true,
        },
      },
    });

    const token = 'account-login-token';

    // 模拟路由推送
    router.push = vi.fn();

    // 模拟账号登录成功
    await wrapper.findComponent({ name: 'LoginInput' }).vm.$emit('login-success', token);

    // 验证token设置
    expect(mockUserStore.setTokenValue).toHaveBeenCalledWith(token);

    // 验证路由跳转
    expect(router.push).toHaveBeenCalledWith('/Home');
  });

  // 账号登录失败测试
  it('账号登录失败时正确处理', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [router],
      },
    });

    const error = new Error('账号登录失败');

    // 模拟账号登录失败
    await wrapper.findComponent({ name: 'LoginInput' }).vm.$emit('login-error', error);

    // 验证错误消息
    expect(ElMessage.error).toHaveBeenCalledWith('登录失败，请重试');
  });

  // 已登录状态测试
  it('已登录状态下自动跳转到首页', async () => {
    // 设置已登录状态
    mockUserStore.token = 'existing-token';

    // 模拟路由推送
    router.push = vi.fn();

    // 挂载组件
    mount(Login, {
      global: {
        plugins: [router],
      },
    });

    // 等待异步操作完成
    await flushPromises();

    // 验证路由跳转
    expect(router.push).toHaveBeenCalledWith('/Home');
  });
});
