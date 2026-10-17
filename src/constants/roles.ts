/**
 * 角色常量定义（纯默认值）
 */

/** 默认角色枚举 */
export const DEFAULT_ROLES = {
  /** 管理员 */
  ADMIN: 'ADMIN',
  /** 教师 */
  TEACHER: 'TEACHER',
  /** 学生 */
  STUDENT: 'STUDENT',
} as const;

/** 角色类型 */
export type RoleType = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

/** 后端 RoleEnum 的角色 ID，只有管理员可进入后台 */
export const BACKEND_ROLE_ID = {
  ADMIN: 1,
} as const;
