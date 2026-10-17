import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import type { MenuItem } from '@/constants';
import { usePermissionStore } from '@/store/modules/permission';

// 菜单默认值替换成一棵能覆盖各种过滤分支的树；roles 走真实常量
vi.mock('@/constants', async importOriginal => {
  const actual = await importOriginal<typeof import('@/constants')>();
  return {
    ...actual,
    menuList: [
      { title: '首页', path: '/home' },
      { title: '管理', path: '/admin' },
      { title: '隐藏项', path: '/hidden', hidden: true },
      { title: '文档', path: '/docs', link: 'https://example.com', roles: ['ADMIN'] },
      { title: '敬请期待', path: '/soon', disabled: true, roles: ['TEACHER'] },
      {
        title: '教务',
        path: '/edu',
        children: [
          { title: '课程', path: '/edu/course' },
          { title: '审核', path: '/edu/audit' },
        ],
      },
      {
        title: '全被过滤的分组',
        path: '/empty',
        children: [{ title: '子项', path: '/empty/a' }],
      },
    ] satisfies MenuItem[],
  };
});

const routes: RouteRecordRaw[] = [
  { path: '/open', component: {}, meta: {} },
  { path: '/teacher', component: {}, meta: { roles: ['TEACHER'] } },
  { path: '/admin', component: {}, meta: { roles: ['ADMIN'] } },
  {
    path: '/group',
    component: {},
    redirect: '/group/a',
    children: [
      { path: 'a', component: {}, meta: { roles: ['TEACHER'] } },
      { path: 'b', component: {}, meta: { roles: ['ADMIN'] } },
    ],
  },
  {
    path: '/all-filtered',
    component: {},
    redirect: '/all-filtered/x',
    children: [{ path: 'x', component: {}, meta: { roles: ['ADMIN'] } }],
  },
];

const paths = (list: RouteRecordRaw[]) => list.map(r => r.path);

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('权限 Store · 路由过滤', () => {
  it('声明了 roles 的路由只对命中角色开放', () => {
    const store = usePermissionStore();
    const teacher = paths(store.generateRoutes(routes, ['TEACHER']));
    expect(teacher).toContain('/teacher');
    expect(teacher).not.toContain('/admin');
  });

  it('空 roles 数组等同于不限制', () => {
    const store = usePermissionStore();
    const result = store.generateRoutes([{ path: '/x', component: {}, meta: { roles: [] } }], ['STUDENT']);
    expect(paths(result)).toEqual(['/x']);
  });

  it('多角色命中任一即可', () => {
    const store = usePermissionStore();
    expect(paths(store.generateRoutes(routes, ['STUDENT', 'ADMIN']))).toContain('/admin');
  });

  it('父路由保留，但子路由按角色裁剪', () => {
    const store = usePermissionStore();
    const group = store.generateRoutes(routes, ['TEACHER']).find(r => r.path === '/group');
    expect(group?.children?.map(c => c.path)).toEqual(['a']);
  });

  it('子路由被全部过滤时父路由整体丢弃', () => {
    // 否则会留下一个 redirect 指向已移除子路由的空壳，用户点进去落到兜底 404
    const store = usePermissionStore();
    expect(paths(store.generateRoutes(routes, ['TEACHER']))).not.toContain('/all-filtered');
  });

  it('不修改传入的原始路由表', () => {
    const store = usePermissionStore();
    const before = JSON.stringify(routes.map(r => ({ p: r.path, c: r.children?.length })));
    store.generateRoutes(routes, ['TEACHER']);
    const after = JSON.stringify(routes.map(r => ({ p: r.path, c: r.children?.length })));
    expect(after).toBe(before);
  });

  it('无任何角色时只剩不限权限的路由', () => {
    const store = usePermissionStore();
    expect(paths(store.generateRoutes(routes, []))).toEqual(['/open']);
  });
});

// redirect 目标落在孙辈（`/setting` → `/setting/frontend`），中间隔着一层 index 子路由
const nestedRoutes: RouteRecordRaw[] = [
  {
    path: '/setting',
    component: {},
    redirect: '/setting/frontend',
    children: [
      {
        path: '',
        component: {},
        children: [
          { path: 'frontend', component: {}, meta: { roles: ['TEACHER'] } },
          { path: 'audit', component: {}, meta: { roles: ['ADMIN'] } },
        ],
      },
    ],
  },
];

const indexOnlyRoutes: RouteRecordRaw[] = [
  {
    path: '/only-index',
    component: {},
    redirect: '/only-index/gone',
    children: [
      { path: '', component: {} },
      { path: 'gone', component: {}, meta: { roles: ['ADMIN'] } },
    ],
  },
];

describe('权限 Store · 路由 redirect 修正', () => {
  it('redirect 目标仍可访问时保持原样', () => {
    const store = usePermissionStore();
    const group = store.generateRoutes(routes, ['TEACHER']).find(r => r.path === '/group');
    expect(group?.redirect).toBe('/group/a');
  });

  it('redirect 目标被过滤时改指向仍可访问的子路由', () => {
    const store = usePermissionStore();
    const group = store.generateRoutes(routes, ['ADMIN']).find(r => r.path === '/group');
    expect(group?.children?.map(c => c.path)).toEqual(['b']);
    expect(group?.redirect).toBe('/group/b');
  });

  it('redirect 目标是仍可访问的孙辈时保持原样', () => {
    const store = usePermissionStore();
    const setting = store.generateRoutes(nestedRoutes, ['TEACHER']).find(r => r.path === '/setting');
    expect(setting?.redirect).toBe('/setting/frontend');
  });

  it('孙辈目标被过滤时改指向同层仍可访问的路径', () => {
    const store = usePermissionStore();
    const setting = store.generateRoutes(nestedRoutes, ['ADMIN']).find(r => r.path === '/setting');
    expect(setting?.redirect).toBe('/setting/audit');
  });

  const groupWithRedirect = (redirect: string): RouteRecordRaw[] => [
    {
      path: '/group',
      component: {},
      redirect,
      children: [
        { path: 'a', component: {}, meta: { roles: ['TEACHER'] } },
        { path: 'b', component: {}, meta: { roles: ['ADMIN'] } },
      ],
    },
  ];

  it('redirect 目标带 query 且仍可访问时保持原样', () => {
    const store = usePermissionStore();
    const [group] = store.generateRoutes(groupWithRedirect('/group/a?tab=all'), ['TEACHER']);
    expect(group.redirect).toBe('/group/a?tab=all');
  });

  it('redirect 目标在子树外时保持原样', () => {
    const store = usePermissionStore();
    const [group] = store.generateRoutes(groupWithRedirect('/open'), ['TEACHER']);
    expect(group.redirect).toBe('/open');
  });

  it('只剩 index 子路由时去掉 redirect', () => {
    const store = usePermissionStore();
    const only = store.generateRoutes(indexOnlyRoutes, ['TEACHER']).find(r => r.path === '/only-index');
    expect(only?.children?.map(c => c.path)).toEqual(['']);
    expect(only?.redirect).toBeUndefined();
  });
});

describe('权限 Store · 菜单过滤', () => {
  const accessible = new Set(['/home', '/hidden', '/edu/course']);
  const menuPaths = (roles: string[]) => {
    const store = usePermissionStore();
    store.generateMenus(roles, path => accessible.has(path));
    return store.accessMenus;
  };

  it('内部菜单按对应路由能否访问显示', () => {
    const top = menuPaths(['TEACHER']).map(m => m.path);
    expect(top).toContain('/home');
    expect(top).not.toContain('/admin');
  });

  it('hidden 菜单不显示', () => {
    expect(menuPaths(['ADMIN']).map(m => m.path)).not.toContain('/hidden');
  });

  it('外链与禁用项按自身 roles 显示', () => {
    expect(menuPaths(['TEACHER']).map(m => m.path)).toContain('/soon');
    expect(menuPaths(['TEACHER']).map(m => m.path)).not.toContain('/docs');
    expect(menuPaths(['ADMIN']).map(m => m.path)).toContain('/docs');
  });

  it('分组只保留可见子项，子项全部不可见时整组隐藏', () => {
    const menus = menuPaths(['TEACHER']);
    expect(menus.find(m => m.path === '/edu')?.children?.map(c => c.path)).toEqual(['/edu/course']);
    expect(menus.map(m => m.path)).not.toContain('/empty');
  });
});

describe('权限 Store · 状态管理', () => {
  it('generateRoutes 后标记为已生成', () => {
    const store = usePermissionStore();
    expect(store.isRoutesGenerated).toBe(false);
    store.generateRoutes(routes, ['TEACHER']);
    expect(store.isRoutesGenerated).toBe(true);
  });

  it('resetPermission 清空全部状态', () => {
    const store = usePermissionStore();
    store.generateRoutes(routes, ['ADMIN']);
    store.generateMenus(['ADMIN'], () => true);
    store.resetPermission();

    expect(store.isRoutesGenerated).toBe(false);
    expect(store.routes).toEqual([]);
    expect(store.accessMenus).toEqual([]);
  });
});

describe('权限 Store · 可访问路径判定', () => {
  it('过滤后仍在的路径可匹配，被过滤掉的不可匹配', () => {
    const store = usePermissionStore();
    store.generateRoutes(routes, ['TEACHER']);

    expect(store.hasAccessibleRoute('/teacher')).toBe(true);
    expect(store.hasAccessibleRoute('/admin')).toBe(false);
  });

  it('嵌套子路由按全路径判定', () => {
    const store = usePermissionStore();
    store.generateRoutes(routes, ['TEACHER']);

    expect(store.hasAccessibleRoute('/group/a')).toBe(true);
    expect(store.hasAccessibleRoute('/group/b')).toBe(false);
  });

  it('未声明过的路径不可匹配', () => {
    const store = usePermissionStore();
    store.generateRoutes(routes, ['ADMIN']);

    expect(store.hasAccessibleRoute('/not-exist')).toBe(false);
  });

  it('重新生成路由后判定结果跟随新角色', () => {
    const store = usePermissionStore();
    store.generateRoutes(routes, ['TEACHER']);
    expect(store.hasAccessibleRoute('/admin')).toBe(false);

    store.generateRoutes(routes, ['ADMIN']);
    expect(store.hasAccessibleRoute('/admin')).toBe(true);
  });
});
