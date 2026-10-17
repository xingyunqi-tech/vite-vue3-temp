import { describe, it, expect } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import { routerManager } from '@/plugins/override/override-router';

const Layout = { name: 'Layout', render: () => null };
const Page = { name: 'Page', render: () => null };
const TenantLayout = { name: 'TenantLayout', render: () => null };

describe('routerManager.applyOverrides', () => {
  it('父路由与空 path 子路由同全路径时，覆盖只作用于父路由', () => {
    routerManager.register({ overrideRoutes: { '/setting': TenantLayout } });
    const routes: RouteRecordRaw[] = [
      {
        path: '/setting',
        component: Layout,
        children: [{ path: '', component: Page, children: [{ path: 'frontend', component: Page }] }],
      },
    ];

    const [parent] = routerManager.applyOverrides(routes);
    const [indexChild] = parent.children!;

    expect(parent.component).toBe(TenantLayout);
    expect(indexChild.component).toBe(Page);
  });

  it('redirect 指向的子路由被禁用时，改指向首个仍存活的子路由', () => {
    routerManager.register({ disabledRoutes: ['/report/daily'] });
    const routes: RouteRecordRaw[] = [
      {
        path: '/report',
        component: Layout,
        redirect: '/report/daily',
        children: [
          { path: 'daily', component: Page },
          { path: 'weekly', component: Page },
        ],
      },
    ];

    const [report] = routerManager.applyOverrides(routes);

    expect(report.redirect).toBe('/report/weekly');
  });

  it.each([
    ['beforeEnter', { beforeEnter: () => true }],
    ['props', { props: true }],
    ['alias', { alias: '/start' }],
  ])('只写 %s 的覆盖按路由配置合并，保留原组件', (key, override) => {
    routerManager.register({ overrideRoutes: { '/home': override } });
    const routes: RouteRecordRaw[] = [{ path: '/home', component: Page }];

    const [home] = routerManager.applyOverrides(routes);

    expect(home.component).toBe(Page);
    expect(home[key as keyof RouteRecordRaw]).toBe(override[key as keyof typeof override]);
  });
});
