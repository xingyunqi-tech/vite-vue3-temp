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

  it('非后台角色无法访问内容管理', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), ['USER']);

    expect(store.hasAccessibleRoute('/content/questions')).toBe(false);
  });

  it('编辑与审核员无法访问系统页面', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.EDITOR, ROLES.REVIEWER]);

    expect(store.hasAccessibleRoute('/system/config')).toBe(false);
    expect(store.hasAccessibleRoute('/system/monitor')).toBe(false);
    expect(store.hasAccessibleRoute('/system/agreement')).toBe(false);
  });

  it('管理员可访问 AI 用量页，其他角色不可访问', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN]);
    expect(store.hasAccessibleRoute('/ai/usage')).toBe(true);

    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.EDITOR, ROLES.REVIEWER]);
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

  it('设置页仅管理员可访问', () => {
    const store = usePermissionStore();
    const route = store
      .generateRoutes(resolveDeclaredRoutes(), [ROLES.ADMIN])
      .find(item => item.path === '/setting')
      ?.children?.[0]?.children?.find(child => child.path === 'mini-program');
    expect(route?.meta?.title).toBe('小程序配置');
    expect(store.hasAccessibleRoute('/setting/mini-program')).toBe(true);

    expect(store.hasAccessibleRoute('/setting/frontend')).toBe(true);

    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.EDITOR, ROLES.REVIEWER]);
    expect(store.hasAccessibleRoute('/setting/mini-program')).toBe(false);
    expect(store.hasAccessibleRoute('/setting/frontend')).toBe(false);
  });

  it('编辑可访问内容管理，不能访问审核发布、纠错与勘误、AI 用量与系统', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.EDITOR]);

    [
      '/content/exams',
      '/content/questions',
      '/content/questions/create',
      '/content/papers',
      '/content/imports',
    ].forEach(path => expect(store.hasAccessibleRoute(path)).toBe(true));
    ['/content/review', '/feedback/reports', '/feedback/errata', '/ai/usage', '/system/config'].forEach(path =>
      expect(store.hasAccessibleRoute(path)).toBe(false),
    );
  });

  it('审核员可访问内容管理、审核发布、纠错与勘误，不能访问 AI 用量与系统', () => {
    const store = usePermissionStore();
    store.generateRoutes(resolveDeclaredRoutes(), [ROLES.REVIEWER]);

    ['/content/questions', '/content/review', '/feedback/reports', '/feedback/errata/create'].forEach(path =>
      expect(store.hasAccessibleRoute(path)).toBe(true),
    );
    ['/ai/usage', '/system/config', '/setting/mini-program'].forEach(path =>
      expect(store.hasAccessibleRoute(path)).toBe(false),
    );
  });

  it('编辑与审核员的菜单分组', () => {
    expect(menusFor(ROLES.EDITOR).map(menu => menu.title)).toEqual(['内容管理']);
    expect(
      menusFor(ROLES.EDITOR)
        .find(menu => menu.path === '/content')
        ?.children?.map(child => child.path),
    ).not.toContain('/content/review');
    expect(menusFor(ROLES.REVIEWER).map(menu => menu.title)).toEqual(['内容管理', '纠错与勘误']);
  });

  it('没有后台角色时看不到任何业务菜单', () => {
    expect(menusFor('')).toEqual([]);
  });
});
