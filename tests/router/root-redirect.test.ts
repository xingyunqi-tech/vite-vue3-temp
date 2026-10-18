import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setRoutePathMatcher } from '@/plugins/site-config';
import { createAppRouter } from '@/router';
import { usePermissionStore } from '@/store/modules/permission';
import { useSiteConfigStore } from '@/store/modules/site-config';

const userStore = {
  info: { role: 'ADMIN' },
  refreshToken: () => 'token',
  getInfoAction: vi.fn(async () => {}),
  isAccountSwitched: () => false,
};

vi.mock('@/store/modules/user-info', () => ({ useUserInfoStore: () => userStore }));

beforeEach(() => {
  setActivePinia(createPinia());
  userStore.getInfoAction.mockClear();
});

afterEach(() => {
  setRoutePathMatcher(undefined);
});

describe('根路径重定向（真实静态路由与守卫）', () => {
  it('站点配置默认页为已删除的 /home 时，路由生成后从根路径重走并落到题目列表', async () => {
    const router = createAppRouter();
    const permission = usePermissionStore();
    useSiteConfigStore().config = { basic: { defaultPage: '/home' } };
    expect(permission.isRoutesGenerated).toBe(false);

    await router.push('/');

    expect(userStore.getInfoAction).toHaveBeenCalledOnce();
    expect(permission.isRoutesGenerated).toBe(true);
    expect(router.currentRoute.value.path).toBe('/content/questions');
    expect(router.currentRoute.value.name).toBe('ContentQuestions');
    expect(router.currentRoute.value.redirectedFrom?.path).toBe('/');
  });

  it('未校验路由时，不可访问的默认页同样回落到题目列表', async () => {
    const router = createAppRouter();
    setRoutePathMatcher(undefined);
    useSiteConfigStore().config = { basic: { defaultPage: '/home' } };

    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/content/questions');
  });

  it('站点配置默认页可访问时落到该页', async () => {
    const router = createAppRouter();
    useSiteConfigStore().config = { basic: { defaultPage: '/system/monitor' } };

    await router.push('/');

    expect(router.currentRoute.value.path).toBe('/system/monitor');
  });
});
