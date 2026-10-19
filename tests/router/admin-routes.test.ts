import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ROLES, type MenuItem } from '@/constants';
import { canAccess } from '@/router/guards';
import { fallbackRoute, resolveDeclaredRoutes, staticRoutes } from '@/router/routes';
import { usePermissionStore } from '@/store/modules/permission';

function menusFor(role: string): MenuItem[] {
  const store = usePermissionStore();
  const router = createRouter({ history: createMemoryHistory(), routes: staticRoutes });
  store.generateRoutes(resolveDeclaredRoutes(), [role]).forEach(route => router.addRoute(route));
  router.addRoute(fallbackRoute);
  store.generateMenus([role], path => canAccess(router, path, [role]));
  return store.accessMenus;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('后台路由与菜单', () => {
  it('管理员可访问远程配置、监控告警与协议管理', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);

    expect(store.hasAccessibleRoute('/system/config')).toBe(true);
    expect(store.hasAccessibleRoute('/system/monitor')).toBe(true);
    expect(store.hasAccessibleRoute('/system/agreement')).toBe(true);
  });

  it('管理员可访问内容管理各页面', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);

    [
      '/content/exams',
      '/content/questions',
      '/content/questions/create',
      '/content/review',
      '/content/papers',
      '/content/paper-rules',
      '/content/daily',
      '/content/imports',
    ].forEach(path => expect(store.hasAccessibleRoute(path)).toBe(true));
  });

  it('管理员可访问纠错与勘误各页面', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);

    [
      '/feedback/reports',
      '/feedback/reports/1',
      '/feedback/errata',
      '/feedback/errata/create',
      '/feedback/errata/e1',
    ].forEach(path => expect(store.hasAccessibleRoute(path)).toBe(true));
  });

  it('非管理员角色无法访问纠错与勘误', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.TEACHER]);

    expect(store.hasAccessibleRoute('/feedback/reports')).toBe(false);
    expect(store.hasAccessibleRoute('/feedback/errata')).toBe(false);
  });

  it('非管理员角色无法访问内容管理', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.TEACHER]);

    expect(store.hasAccessibleRoute('/content/questions')).toBe(false);
  });

  it('非管理员角色无法访问系统页面', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.TEACHER]);

    expect(store.hasAccessibleRoute('/system/config')).toBe(false);
    expect(store.hasAccessibleRoute('/system/monitor')).toBe(false);
    expect(store.hasAccessibleRoute('/system/agreement')).toBe(false);
  });

  it('管理员可访问 AI 用量页，其他角色不可访问', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);
    expect(store.hasAccessibleRoute('/ai/usage')).toBe(true);

    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.TEACHER]);
    expect(store.hasAccessibleRoute('/ai/usage')).toBe(false);
  });

  it('管理员菜单含内容管理、纠错、AI 用量与系统分组', () => {
    const menus = menusFor(ROLES.ADMIN);

    expect(menus.map(menu => menu.title)).toEqual(['内容管理', '纠错与勘误', 'AI 用量', '系统']);
    expect(menus.find(menu => menu.path === '/system')?.children?.map(child => child.path)).toEqual([
      '/system/config',
      '/system/monitor',
      '/system/agreement',
    ]);
    const content = menus.find(menu => menu.path === '/content')?.children ?? [];
    expect(content.map(child => child.path)).toEqual([
      '/content/exams',
      '/content/questions',
      '/content/review',
      '/content/papers',
      '/content/paper-rules',
      '/content/daily',
      '/content/imports',
    ]);
    expect(content.some(child => child.disabled)).toBe(false);
    const feedback = menus.find(menu => menu.path === '/feedback')?.children ?? [];
    expect(feedback.map(child => child.path)).toEqual(['/feedback/reports', '/feedback/errata']);
    expect(feedback.some(child => child.disabled)).toBe(false);
    const ai = menus.find(menu => menu.path === '/ai')?.children ?? [];
    expect(ai.map(child => child.path)).toEqual(['/ai/usage']);
    expect(ai.some(child => child.disabled)).toBe(false);
  });

  it('非管理员看不到任何业务菜单', () => {
    expect(menusFor(ROLES.STUDENT)).toEqual([]);
  });
});
