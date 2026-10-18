import type { RouteRecordRaw } from 'vue-router';
import { ROLES } from '@/constants';
import { AppLayout } from '@/layout/constants';

/** 设置页壳路由的名字：壳内导航列出它的直接子页面 */
export const SETTING_SHELL_ROUTE_NAME = 'SettingShell';

/** 异步路由：登录后按 meta.roles 过滤再注册 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/content',
    component: AppLayout,
    redirect: '/content/exams',
    meta: { title: '内容管理', roles: [ROLES.ADMIN] },
    children: [
      {
        path: 'exams',
        name: 'ContentExams',
        component: () => import('@/views/content/exams/index.vue'),
        meta: { title: '考试与科目', roles: [ROLES.ADMIN] },
      },
      {
        path: 'questions',
        name: 'ContentQuestions',
        component: () => import('@/views/content/questions/index.vue'),
        meta: { title: '题目', roles: [ROLES.ADMIN] },
      },
      {
        path: 'questions/create',
        name: 'ContentQuestionCreate',
        component: () => import('@/views/content/question-edit/index.vue'),
        meta: { title: '新建题目', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/content/questions' },
      },
      {
        path: 'questions/:id',
        name: 'ContentQuestionEdit',
        component: () => import('@/views/content/question-edit/index.vue'),
        meta: { title: '编辑题目', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/content/questions' },
      },
      {
        path: 'review',
        name: 'ContentReview',
        component: () => import('@/views/content/review/index.vue'),
        meta: { title: '审核发布', roles: [ROLES.ADMIN] },
      },
      {
        path: 'papers',
        name: 'ContentPapers',
        component: () => import('@/views/content/papers/index.vue'),
        meta: { title: '试卷', roles: [ROLES.ADMIN] },
      },
      {
        path: 'papers/:id',
        name: 'ContentPaperEdit',
        component: () => import('@/views/content/paper-edit/index.vue'),
        meta: { title: '编辑试卷', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/content/papers' },
      },
      {
        path: 'paper-rules',
        name: 'ContentPaperRules',
        component: () => import('@/views/content/paper-rules/index.vue'),
        meta: { title: '组卷规则', roles: [ROLES.ADMIN] },
      },
      {
        path: 'daily',
        name: 'ContentDaily',
        component: () => import('@/views/content/daily/index.vue'),
        meta: { title: '每日一练', roles: [ROLES.ADMIN] },
      },
      {
        path: 'imports',
        name: 'ContentImports',
        component: () => import('@/views/content/imports/index.vue'),
        meta: { title: '批量导入', roles: [ROLES.ADMIN] },
      },
    ],
  },
  {
    path: '/feedback',
    component: AppLayout,
    redirect: '/feedback/reports',
    meta: { title: '纠错与勘误', roles: [ROLES.ADMIN] },
    children: [
      {
        path: 'reports',
        name: 'FeedbackReports',
        component: () => import('@/views/content/report-list/index.vue'),
        meta: { title: '纠错与举报', roles: [ROLES.ADMIN] },
      },
      {
        path: 'reports/:id',
        name: 'FeedbackReportDetail',
        component: () => import('@/views/content/report-detail/index.vue'),
        meta: { title: '纠错单详情', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/feedback/reports' },
      },
      {
        path: 'errata',
        name: 'FeedbackErrata',
        component: () => import('@/views/content/errata/index.vue'),
        meta: { title: '勘误', roles: [ROLES.ADMIN] },
      },
      {
        path: 'errata/create',
        name: 'FeedbackErrataCreate',
        component: () => import('@/views/content/errata-create/index.vue'),
        meta: { title: '题目勘误', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/feedback/errata' },
      },
      {
        path: 'errata/:id',
        name: 'FeedbackErrataDetail',
        component: () => import('@/views/content/errata-detail/index.vue'),
        meta: { title: '勘误进度', roles: [ROLES.ADMIN], hidden: true, activeMenu: '/feedback/errata' },
      },
    ],
  },
  {
    path: '/ai',
    component: AppLayout,
    redirect: '/ai/usage',
    meta: { title: 'AI 用量', roles: [ROLES.ADMIN] },
    children: [
      {
        path: 'usage',
        name: 'AiUsage',
        component: () => import('@/views/ai/usage/index.vue'),
        meta: { title: '用量与成本', roles: [ROLES.ADMIN] },
      },
    ],
  },
  {
    path: '/system',
    component: AppLayout,
    redirect: '/system/config',
    meta: { title: '系统', roles: [ROLES.ADMIN] },
    children: [
      {
        path: 'config',
        name: 'RemoteConfig',
        component: () => import('@/views/system/config/index.vue'),
        meta: { title: '远程配置', roles: [ROLES.ADMIN] },
      },
      {
        path: 'monitor',
        name: 'Monitor',
        component: () => import('@/views/system/monitor/index.vue'),
        meta: { title: '监控告警', roles: [ROLES.ADMIN] },
      },
    ],
  },
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
