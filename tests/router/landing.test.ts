import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryHistory, createRouter, type RouteLocationNormalized } from 'vue-router';
import { ROLES, type MenuItem } from '@/constants';
import { DEFAULT_PAGE } from '@/constants/system';
import { firstAccessibleMenuPath, resolveLandingPath } from '@/router/landing';
import { fallbackRoute, resolveDeclaredRoutes, staticRoutes } from '@/router/routes';
import { usePermissionStore } from '@/store/modules/permission';

const MENUS: MenuItem[] = [
  { title: '外链', path: '/doc', link: 'https://example.com' },
  {
    title: '内容管理',
    path: '/content',
    children: [
      { title: '考试', path: '/content/exams' },
      { title: '题目', path: '/content/questions' },
    ],
  },
  { title: '预留', path: '/ai', children: [{ title: '用量', path: '/ai/usage', disabled: true }] },
  { title: '隐藏', path: '/hidden', hidden: true },
  { title: '系统', path: '/system', children: [{ title: '监控', path: '/system/monitor' }] },
];

const allow =
  (...paths: string[]) =>
  (pathname: string) =>
    paths.includes(pathname);

describe('根路径落点', () => {
  it('内置默认页为题目列表', () => {
    expect(DEFAULT_PAGE).toBe('/content/questions');
  });

  it('权限路由未生成时直接返回候选页，交给守卫生成后重新判定', () => {
    const options = { routesReady: false, canAccess: allow(), menus: MENUS };

    expect(resolveLandingPath(undefined, options)).toBe(DEFAULT_PAGE);
    expect(resolveLandingPath('/system/monitor?tab=1', options)).toBe('/system/monitor?tab=1');
  });

  it('优先使用可访问的站点配置默认页，保留 query 与 hash', () => {
    const options = { routesReady: true, canAccess: allow('/system/monitor', DEFAULT_PAGE), menus: MENUS };

    expect(resolveLandingPath('/system/monitor/?tab=1#top', options)).toBe('/system/monitor/?tab=1#top');
  });

  it('站点配置默认页不可访问时回到题目列表', () => {
    const options = { routesReady: true, canAccess: allow(DEFAULT_PAGE), menus: MENUS };

    expect(resolveLandingPath('/home', options)).toBe(DEFAULT_PAGE);
  });

  it('站点配置为根路径时不作为落点', () => {
    const options = { routesReady: true, canAccess: allow('/', DEFAULT_PAGE), menus: MENUS };

    expect(resolveLandingPath('/', options)).toBe(DEFAULT_PAGE);
    expect(resolveLandingPath('/?tab=1', options)).toBe(DEFAULT_PAGE);
  });

  it('题目列表不可访问时落到第一个可访问的菜单页', () => {
    const options = { routesReady: true, canAccess: allow('/system/monitor', '/content/exams'), menus: MENUS };

    expect(resolveLandingPath(undefined, options)).toBe('/content/exams');
  });

  it('没有任何可访问页时返回题目列表，由兜底路由展示无权限', () => {
    const options = { routesReady: true, canAccess: allow(), menus: MENUS };

    expect(resolveLandingPath(undefined, options)).toBe(DEFAULT_PAGE);
  });
});

describe('第一个可访问的菜单页', () => {
  it('跳过外链、禁用与隐藏项，按菜单顺序深度优先', () => {
    expect(firstAccessibleMenuPath(MENUS, allow('/doc', '/ai/usage', '/hidden', '/system/monitor'))).toBe(
      '/system/monitor',
    );
    expect(firstAccessibleMenuPath(MENUS, allow('/content/questions', '/system/monitor'))).toBe('/content/questions');
    expect(firstAccessibleMenuPath(MENUS, allow())).toBeUndefined();
  });
});

describe('根路径重定向', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('管理员访问根路径进入题目列表', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: staticRoutes });
    usePermissionStore()
      .generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN])
      .forEach(route => router.addRoute(route));
    router.addRoute(fallbackRoute);
    let landing: RouteLocationNormalized | undefined;
    router.beforeEach(to => {
      landing = to;
      return false;
    });

    await router.push('/');

    expect(landing?.path).toBe('/content/questions');
    expect(landing?.name).toBe('ContentQuestions');
  });
});
