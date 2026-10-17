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
