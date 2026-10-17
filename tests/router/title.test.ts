import { beforeEach, describe, expect, it } from 'vitest';
// #if qiankun
import { vi } from 'vitest';
// #endif
import { createMemoryHistory, createRouter } from 'vue-router';
import { APP_TITLE } from '@/constants';
// #if qiankun
import { isInQiankun } from '@/micro/shared/env';
// #endif
import { setupRouterTitle } from '@/router/title';

// #if qiankun
vi.mock('@/micro/shared/env', () => ({ isInQiankun: vi.fn(() => false) }));
// #endif

const page = { template: '<div />' };

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page },
      { path: '/chat', component: page, meta: { title: '知识问答' } },
      { path: '/empty', component: page, meta: { title: '  ' } },
      { path: '/redirect', redirect: '/chat', meta: { title: '跳转中' } },
      {
        path: '/feedback',
        component: page,
        meta: { title: '反馈管理' },
        children: [{ path: '', component: page }],
      },
    ],
  });
}

beforeEach(() => {
  // #if qiankun
  vi.mocked(isInQiankun).mockReturnValue(false);
  // #endif
  document.title = '旧页面标题';
});

describe('浏览器标题', () => {
  it('安装即写入入口标题，导航后拼接路由标题', async () => {
    const router = createTestRouter();
    setupRouterTitle(router);
    expect(document.title).toBe(APP_TITLE);

    await router.push('/chat');
    expect(document.title).toBe(`${APP_TITLE}-知识问答`);
  });

  it.each(['/', '/empty'])('路由标题为空白时只显示入口标题：%s', async path => {
    const router = createTestRouter();
    setupRouterTitle(router);
    await router.push(path);
    expect(document.title).toBe(APP_TITLE);
  });

  it('取消导航不使用目标页标题', async () => {
    const router = createTestRouter();
    setupRouterTitle(router);
    await router.push('/');
    router.beforeEach(() => false);
    await router.push('/chat');
    expect(document.title).toBe(APP_TITLE);
  });

  it('重定向采用最终页面标题，嵌套路由可继承父级标题', async () => {
    const router = createTestRouter();
    setupRouterTitle(router);
    await router.push('/redirect');
    expect(document.title).toBe(`${APP_TITLE}-知识问答`);
    await router.push('/feedback');
    expect(document.title).toBe(`${APP_TITLE}-反馈管理`);
  });
  // #if qiankun

  it('qiankun 子应用保留主应用标题', async () => {
    vi.mocked(isInQiankun).mockReturnValue(true);
    document.title = '主应用';
    const router = createTestRouter();
    setupRouterTitle(router);
    expect(document.title).toBe('主应用');
    await router.push('/chat');
    expect(document.title).toBe('主应用');
  });
  // #endif
});
