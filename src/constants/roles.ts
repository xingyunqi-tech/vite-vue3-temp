/**
 * 角色常量定义（纯默认值）
 */

/** 默认角色枚举 */
export const DEFAULT_ROLES = {
  /** 管理员 */
  ADMIN: 'ADMIN',
  /** 内容编辑 */
  EDITOR: 'EDITOR',
  /** 内容审核员 */
  REVIEWER: 'REVIEWER',
} as const;

/** 角色类型 */
export type RoleType = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

/** 后端 RoleEnum 的角色 ID，只有这些角色可进入后台 */
export const BACKEND_ROLE_ID = {
  ADMIN: 1,
  EDITOR: 3,
  REVIEWER: 4,
} as const;

/** 可进入运营后台的角色 */
export const BACKOFFICE_ROLES: readonly RoleType[] = [
  DEFAULT_ROLES.ADMIN,
  DEFAULT_ROLES.EDITOR,
  DEFAULT_ROLES.REVIEWER,
];

/** 可审核发布内容、处理纠错与勘误的角色 */
export const REVIEW_ROLES: readonly RoleType[] = [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.REVIEWER];
