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
  it('管理员可访问远程配置与监控告警', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);

    expect(store.hasAccessibleRoute('/system/config')).toBe(true);
    expect(store.hasAccessibleRoute('/system/monitor')).toBe(true);
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
  });

  it('管理员菜单含内容管理、系统页面与预留的业务分组', () => {
    const menus = menusFor(ROLES.ADMIN);

    expect(menus.map(menu => menu.title)).toEqual(['首页', '内容管理', '纠错与勘误', 'AI 用量', '系统']);
    expect(menus.find(menu => menu.path === '/system')?.children?.map(child => child.path)).toEqual([
      '/system/config',
      '/system/monitor',
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
    const reserved = menus.filter(menu => ['/feedback', '/ai'].includes(menu.path));
    expect(reserved.flatMap(menu => menu.children ?? []).every(child => child.disabled)).toBe(true);
  });

  it('非管理员看不到预留分组与系统菜单', () => {
    expect(menusFor(ROLES.STUDENT).map(menu => menu.title)).toEqual(['首页']);
  });
});
