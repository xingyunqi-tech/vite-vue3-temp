import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useGlobalStore } from '@/store/modules/global';

import Layout from '@/layout/index.vue';

export const constantRouterMap: RouteRecordRaw[] = [
  {
    path: '/Login',
    component: () => import('@/views/Login/index.vue'),
    meta: { hidden: true, title: '登录' },
  },
  {
    path: '/404',
    component: () => import('@/views/404.vue'),
    meta: { hidden: true, title: '404' },
  },
  {
    path: '/403',
    component: () => import('@/views/403.vue'),
    meta: { hidden: true, title: '无权限' },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/Home',
    meta: { title: '首页' },
    children: [
      {
        path: 'Home',
        name: 'Home',
        component: () => import('@/views/Home/index.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'Setting',
        name: 'Setting',
        component: () => import('@/views/Setting/index.vue'),
        redirect: '/Setting/FrontendSetting',
        children: [
          {
            path: 'FrontendSetting',
            name: 'FrontendSetting',
            component: () => import('@/views/Setting/FrontendSetting.vue'),
            meta: { title: '前端配置' },
          },
          {
            path: 'ThemeSetting',
            name: 'ThemeSetting',
            component: () => import('@/views/Setting/ThemeSetting.vue'),
            meta: { title: '主题配置' },
          },
        ],
        meta: { title: '设置页' },
      },
    ],
  },
  // 通配符路由必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: { hidden: true },
  },
];

export const asyncRouterMap: RouteRecordRaw[] = [
  // 保留为空，以后用于动态路由
];

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [...constantRouterMap, ...asyncRouterMap],
});

// 路由守卫：控制Setting页面访问
router.beforeEach((to, from, next) => {
  const globalStore = useGlobalStore();

  // 检查是否访问Setting相关页面
  if (to.path.startsWith('/Setting')) {
    // 只有开启高级模式才能访问Setting页面
    if (!globalStore.advanceMode) {
      // 重定向到首页或显示403页面
      next('/403');
      return;
    }
  }

  next();
});

export default router;
