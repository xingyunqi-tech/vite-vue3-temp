import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { h, type Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { canAccess, setupRouterGuard } from '@/router/guards';
import { FORBIDDEN_PATH } from '@/router/redirect';
import { fallbackRoute } from '@/router/routes';
import { usePermissionStore } from '@/store/modules/permission';

const View: Component = { render: () => h('div') };

const userStore = {
  info: { role: '' },
  refreshToken: () => true,
  getInfoAction: vi.fn(async () => {}),
  fetchUserRole: vi.fn(async () => userStore.info.role),
  isAccountSwitched: vi.fn(() => false),
};

vi.mock('@/store/modules/user-info', () => ({ useUserInfoStore: () => userStore }));
vi.mock('@/utils/error-handler', () => ({ redirectToLoginOnce: vi.fn() }));

vi.mock('@/router/routes', () => {
  const Page = { render: () => null };
  return {
    resolveDeclaredRoutes: () => [{ path: '/declared', component: Page, meta: { roles: ['TEACHER'] } }],
    fallbackRoute: {
      path: '/:pathMatch(.*)*',
      name: 'Fallback',
      component: Page,
      children: [{ path: '', name: 'Exception', component: Page }],
    },
  };
});

/** /home 与 /admin-only 都在建 router 时直接注册，不经 generateRoutes */
function createGuardedRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: View, meta: { roles: ['TEACHER', 'STUDENT'] } },
      { path: '/admin-only', component: View, meta: { roles: ['ADMIN'] } },
    ],
  });
  setupRouterGuard(router);
  return router;
}

describe('路由守卫的角色校验', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('角色不满足直接注册路由的 meta.roles 时落到布局内异常页，地址保留', async () => {
    userStore.info.role = 'STUDENT';
    const router = createGuardedRouter();

    await router.push('/admin-only?tab=1');

    expect(router.currentRoute.value.name).toBe('Exception');
    expect(router.currentRoute.value.fullPath).toBe('/admin-only?tab=1');
  });

  it('未登录也能进入全屏 403，不跳 SSO', async () => {
    vi.spyOn(userStore, 'refreshToken').mockReturnValueOnce(false);
    const router = createGuardedRouter();
    router.addRoute({ path: FORBIDDEN_PATH, component: View });

    await router.push(FORBIDDEN_PATH);

    expect(router.currentRoute.value.path).toBe(FORBIDDEN_PATH);
  });

  it('角色满足时正常进入', async () => {
    userStore.info.role = 'STUDENT';
    const router = createGuardedRouter();

    await router.push('/home');

    expect(router.currentRoute.value.path).toBe('/home');
    expect(router.currentRoute.value.name).not.toBe('Exception');
  });

  it('首次导航经过 redirect 时，路由生成后按角色重新判定落点', async () => {
    userStore.info.role = 'STUDENT';
    const router = createGuardedRouter();
    router.addRoute({
      path: '/',
      redirect: () => {
        const permission = usePermissionStore();
        return permission.isRoutesGenerated && !permission.hasAccessibleRoute('/declared') ? '/home' : '/declared';
      },
    });

    await router.push('/?tab=1');

    expect(router.currentRoute.value.fullPath).toBe('/home?tab=1');
  });
});

describe('路由守卫的账号检查', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('路由已生成后检测到换了账号时取消导航', async () => {
    userStore.info.role = 'STUDENT';
    const router = createGuardedRouter();
    await router.push('/home');

    userStore.isAccountSwitched.mockReturnValueOnce(true);
    await router.push('/declared');

    expect(router.currentRoute.value.path).toBe('/home');
  });
});

describe('canAccess', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('按匹配到的每一层 meta.roles 判定，未注册路径落到兜底时不可访问', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/open', component: View },
        {
          path: '/edu',
          component: View,
          meta: { roles: ['TEACHER', 'ADMIN'] },
          children: [{ path: 'audit', component: View, meta: { roles: ['ADMIN'] } }],
        },
        fallbackRoute,
      ],
    });

    expect(canAccess(router, '/open', ['STUDENT'])).toBe(true);
    expect(canAccess(router, '/edu', ['TEACHER'])).toBe(true);
    expect(canAccess(router, '/edu/audit', ['TEACHER'])).toBe(false);
    expect(canAccess(router, '/edu/audit', ['ADMIN'])).toBe(true);
    expect(canAccess(router, '/not-exist', ['ADMIN'])).toBe(false);
  });
});
