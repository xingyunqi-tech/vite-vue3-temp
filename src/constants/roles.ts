/**
 * 角色常量定义（纯默认值）
 */

/** 默认角色枚举 */
export const DEFAULT_ROLES = {
  /**
   * 管理员（预留角色）
   *
   * 当前身份接口 get-current-user-identity 只返回教师/学生（identityType 0/1），
   * 不会产出 ADMIN（见 mapIdentityToRole）。因此正常登录流程下 info.role 不会是 ADMIN，
   * `usePermission.isAdmin`、`store.isTeacher` 的 `|| ADMIN` 兜底、路由 meta.roles 中的 ADMIN
   * 均为面向未来的预留占位（当前恒不命中，非 bug）。待接口返回 ADMIN 后自动生效。
   */
  ADMIN: 'ADMIN',
  /** 教师 */
  TEACHER: 'TEACHER',
  /** 学生 */
  STUDENT: 'STUDENT',
} as const;

/** 角色类型 */
export type RoleType = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];

/**
 * 用户身份类型（对应后端 get-current-user-identity 接口的 identityType）
 * 0-学生 1-教师，与 @zhs/agent-course-app 的 IDENTITY_ROLE_TYPE 保持一致
 */
export const IDENTITY_ROLE_TYPE = {
  /** 教师 */
  TEACHER: 1,
  /** 学生 */
  STUDENT: 0,
} as const;

/** get-current-user-identity 返回的单条身份 */
export interface UserIdentityItem {
  /** 身份类型，见 IDENTITY_ROLE_TYPE */
  identityType?: number;
  /** 该身份是否已认证 */
  authority?: boolean;
}

/**
 * 取出可用的身份类型，去重
 *
 * 丢掉 authority 明确为 false 的身份：账号常额外挂一条未认证的对侧身份（教师账号挂学生、
 * 学生账号挂教师），算上它会把未认证的那一侧当成真实身份。
 *
 * 只丢「明确 false」而不是「非 true」：authority 字段缺失表示这套后端不下发认证状态，
 * 此时无从判断，身份照用；换成 `=== true` 会让这类部署的所有账号都判不出身份。
 *
 * 全部被丢掉时返回空列表，由上层按「判不出身份」处理（守卫会拦到 403）。角色决定可访问
 * 路由，不能在这里向教师那侧兜底 —— 同 store/modules/user-info.ts 对 role 的处理口径。
 *
 * 以上按「authority=false 的是占位身份」取值。若某部署下它表示「该身份认证中、仍按此身份运作」，
 * 改成不按 authority 过滤即可，认证状态交展示层单独读这个字段。
 */
export const resolveIdentityTypes = (identities: UserIdentityItem[]): number[] => {
  const usable = identities.filter(item => item.authority !== false);
  return [...new Set(usable.map(item => item.identityType).filter((type): type is number => typeof type === 'number'))];
};

/**
 * 身份类型（identityType）映射到系统角色（RoleType）
 * 教师 → TEACHER，学生 → STUDENT；其余返回空字符串（由上层决定兜底/拦截）
 */
export const mapIdentityToRole = (identityType: number | undefined | null): RoleType | '' => {
  if (identityType === IDENTITY_ROLE_TYPE.TEACHER) return DEFAULT_ROLES.TEACHER;
  if (identityType === IDENTITY_ROLE_TYPE.STUDENT) return DEFAULT_ROLES.STUDENT;
  return '';
};
