import type { RouteRecordRaw } from 'vue-router';
import { ROLES } from '@/constants';
import { AppLayout } from '@/layout/constants';

/** 设置页壳路由的名字：壳内导航列出它的直接子页面 */
export const SETTING_SHELL_ROUTE_NAME = 'SettingShell';

/** 异步路由：登录后按 meta.roles 过滤再注册 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/setting',
    component: AppLayout,
    redirect: '/setting/frontend',
    meta: {
      title: '设置',
      hidden: true,
      roles: [ROLES.TEACHER, ROLES.ADMIN],
      layout: {
        layoutVisible: {
          nav: false,
          header: true,
        },
      },
    },
    children: [
      {
        path: '',
        name: SETTING_SHELL_ROUTE_NAME,
        redirect: '/setting/frontend',
        component: () => import('@/views/setting/index.vue'),
        children: [
          {
            path: 'frontend',
            name: 'Frontend',
            component: () => import('@/views/setting/Frontend.vue'),
            meta: {
              title: '前端配置',
              roles: [ROLES.TEACHER, ROLES.ADMIN],
            },
          },
        ],
      },
    ],
  },
];
