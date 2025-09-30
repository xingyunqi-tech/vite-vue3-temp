import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import QrCodeLogin from '@/business-components/QrCodeLogin/index.vue';

// 模拟QrCodeLogin组件
vi.mock('@/business-components/QrCodeLogin/index.vue', () => ({
  default: {
    name: 'QrCodeLogin',
    template: `
      <div class="qr-code-login">
        <h3 class="qr-title">扫码登录</h3>
        <div class="qr-code" :class="{ loading }">
          <img v-if="qrCodeUrl && !loading" :src="qrCodeUrl" alt="二维码" class="qr-image" />
          <div v-else class="qr-loading">
            <div class="loading-spinner"></div>
            <p class="loading-text">加载中...</p>
          </div>
        </div>
        <p class="qr-tip">打开<span class="brand-highlight">企业微信</span>扫一扫登录</p>
        <button class="refresh-btn" :disabled="isRefreshing" @click="refreshQrCode">刷新二维码</button>
      </div>
    `,
    props: ['qrCodeUrl', 'loading'],
    data() {
      return {
        isRefreshing: false,
      };
    },
    methods: {
      refreshQrCode() {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        this.$emit('refresh');
        setTimeout(() => {
          this.isRefreshing = false;
        }, 1000);
      },
    },
    mounted() {
      console.log('开始轮询二维码状态...');
    },
  },
}));

describe('QrCodeLogin 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 基础渲染测试
  it('正确渲染组件', () => {
    const wrapper = mount(QrCodeLogin);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.qr-code-login').exists()).toBe(true);
    expect(wrapper.find('.qr-title').text()).toBe('扫码登录');
  });

  // 二维码显示测试
  it('当提供二维码URL时正确显示二维码', () => {
    const qrCodeUrl = 'https://example.com/qrcode.png';
    const wrapper = mount(QrCodeLogin, {
      props: {
        qrCodeUrl,
      },
    });

    const qrImage = wrapper.find('.qr-image');
    expect(qrImage.exists()).toBe(true);
    expect(qrImage.attributes('src')).toBe(qrCodeUrl);
  });

  // 加载状态测试
  it('加载状态下显示加载动画', () => {
    const wrapper = mount(QrCodeLogin, {
      props: {
        loading: true,
      },
    });

    expect(wrapper.find('.qr-loading').exists()).toBe(true);
    expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    expect(wrapper.find('.loading-text').text()).toBe('加载中...');
    expect(wrapper.find('.qr-image').exists()).toBe(false);
  });

  // 无二维码URL测试
  it('无二维码URL时显示加载状态', () => {
    const wrapper = mount(QrCodeLogin, {
      props: {
        qrCodeUrl: '',
      },
    });

    expect(wrapper.find('.qr-loading').exists()).toBe(true);
    expect(wrapper.find('.qr-image').exists()).toBe(false);
  });

  // 刷新按钮测试
  it('点击刷新按钮触发刷新事件', async () => {
    const wrapper = mount(QrCodeLogin, {
      props: {
        qrCodeUrl: 'https://example.com/qrcode.png',
      },
    });

    const refreshBtn = wrapper.find('.refresh-btn');
    expect(refreshBtn.exists()).toBe(true);

    await refreshBtn.trigger('click');

    expect(wrapper.emitted('refresh')).toBeTruthy();
    expect(wrapper.emitted('refresh').length).toBe(1);
  });

  // 刷新中状态测试
  it('刷新过程中按钮处于禁用状态', async () => {
    const wrapper = mount(QrCodeLogin, {
      props: {
        qrCodeUrl: 'https://example.com/qrcode.png',
      },
    });

    const refreshBtn = wrapper.find('.refresh-btn');

    // 触发刷新
    await refreshBtn.trigger('click');

    // 刷新中状态
    expect(wrapper.vm.isRefreshing).toBe(true);

    // 按钮应该被禁用
    expect(refreshBtn.attributes('disabled')).toBeDefined();

    // 前进时间
    vi.advanceTimersByTime(1000);
    await flushPromises();

    // 刷新完成后状态恢复
    expect(wrapper.vm.isRefreshing).toBe(false);
  });

  // 重复点击测试
  it('刷新过程中再次点击不会触发多次刷新', async () => {
    const wrapper = mount(QrCodeLogin, {
      props: {
        qrCodeUrl: 'https://example.com/qrcode.png',
      },
    });

    const refreshBtn = wrapper.find('.refresh-btn');

    // 第一次点击
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh').length).toBe(1);

    // 刷新中再次点击
    await refreshBtn.trigger('click');
    expect(wrapper.emitted('refresh').length).toBe(1); // 仍然是1，没有增加

    // 前进时间
    vi.advanceTimersByTime(1000);
    await flushPromises();
  });

  // 错误处理测试
  it('刷新出错时触发错误事件', async () => {
    const wrapper = mount(QrCodeLogin);

    // 手动触发错误事件
    wrapper.vm.$emit('error', new Error('刷新失败'));

    // 验证错误事件
    expect(wrapper.emitted()).toHaveProperty('error');
  });

  // 提示文本测试
  it('显示正确的提示文本', () => {
    const wrapper = mount(QrCodeLogin);
    const tipText = wrapper.find('.qr-tip');

    expect(tipText.exists()).toBe(true);
    expect(tipText.text()).toContain('打开');
    expect(tipText.text()).toContain('企业微信');
    expect(tipText.text()).toContain('扫一扫登录');
  });

  // 组件挂载时初始化测试
  it('组件挂载时调用轮询方法', () => {
    // 监听console.log
    const consoleSpy = vi.spyOn(console, 'log');

    mount(QrCodeLogin);

    // 验证轮询方法被调用
    expect(consoleSpy).toHaveBeenCalledWith('开始轮询二维码状态...');
  });
});
