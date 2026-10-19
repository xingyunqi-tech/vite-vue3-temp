import { ChatDotRound, Collection, Monitor, TrendCharts } from '@element-plus/icons-vue';
import type { Component } from 'vue';

/**
 * 菜单项类型
 */
export interface MenuItem {
  /** 菜单标题 */
  title: string;
  /** 路由路径 */
  path: string;
  /** 图标：Vue 组件（Element Plus）| 字符串（SvgIcon 名称） */
  icon?: Component | string;
  /**
   * 权限角色（空=所有人可见），只对外链与禁用项生效
   *
   * 内部菜单是否可见由对应路由的 meta.roles 决定，这里不必也不应重复声明。
   */
  roles?: string[];
  /** 子菜单 */
  children?: MenuItem[];
  /** 外链地址 */
  link?: string;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否禁用（点击提示敬请期待） */
  disabled?: boolean;
  /** 后端菜单 ID（用于权限匹配） */
  menuId?: string;
}

/**
 * 默认菜单配置列表
 */
export const DEFAULT_MENU_LIST: MenuItem[] = [
  {
    title: '内容管理',
    path: '/content',
    icon: Collection,
    children: [
      { title: '考试与科目', path: '/content/exams' },
      { title: '题目', path: '/content/questions' },
      { title: '审核发布', path: '/content/review' },
      { title: '试卷', path: '/content/papers' },
      { title: '组卷规则', path: '/content/paper-rules' },
      { title: '每日一练', path: '/content/daily' },
      { title: '批量导入', path: '/content/imports' },
    ],
  },
  {
    title: '纠错与勘误',
    path: '/feedback',
    icon: ChatDotRound,
    children: [
      { title: '纠错与举报', path: '/feedback/reports' },
      { title: '勘误', path: '/feedback/errata' },
    ],
  },
  {
    title: 'AI 用量',
    path: '/ai',
    icon: TrendCharts,
    children: [{ title: '用量与成本', path: '/ai/usage' }],
  },
  {
    title: '系统',
    path: '/system',
    icon: Monitor,
    children: [
      { title: '远程配置', path: '/system/config' },
      { title: '监控告警', path: '/system/monitor' },
      { title: '协议管理', path: '/system/agreement' },
    ],
  },
];
