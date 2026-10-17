import { computed } from 'vue';
import { ROLES } from '@/constants';
import type { RoleType } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';

/**
 * 资源权限配置
 */
export interface ResourcePermissionConfig {
  /** 查看权限：哪些角色可以查看 */
  view?: RoleType[];
  /** 创建权限：哪些角色可以创建 */
  create?: RoleType[];
  /** 编辑权限：哪些角色可以编辑 */
  edit?: RoleType[];
  /** 删除权限：哪些角色可以删除 */
  delete?: RoleType[];
  /** 导出权限：哪些角色可以导出 */
  export?: RoleType[];
  /** 审核权限：哪些角色可以审核 */
  audit?: RoleType[];
}

/**
 * 默认资源权限配置
 *
 * 默认规则：
 * - view: 所有登录用户（所有角色）
 * - create: 管理员和教师
 * - edit: 管理员和教师
 * - delete: 管理员和教师
 * - export: 管理员和教师
 * - audit: 管理员和教师
 */
const DEFAULT_RESOURCE_CONFIG: ResourcePermissionConfig = {
  view: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT],
  create: [ROLES.ADMIN, ROLES.TEACHER],
  edit: [ROLES.ADMIN, ROLES.TEACHER],
  delete: [ROLES.ADMIN, ROLES.TEACHER],
  export: [ROLES.ADMIN, ROLES.TEACHER],
  audit: [ROLES.ADMIN, ROLES.TEACHER],
};

/**
 * 权限判断 Composable
 *
 * 提供响应式的通用权限判断能力，支持两种使用方式：
 * 1. 基础用法：灵活的角色判断
 * 2. 资源配置：快速配置标准 CRUD 权限
 *
 * @example 基础用法
 * ```vue
 * <script setup>
 * import { usePermission } from '@/composables/usePermission';
 * import { ROLES } from '@/constants';
 *
 * const { hasRole, isAdmin } = usePermission();
 *
 * // 组件内定义业务权限
 * const canManage = hasRole([ROLES.ADMIN, ROLES.TEACHER]);
 * </script>
 * ```
 *
 * @example 资源配置用法（使用默认配置）
 * ```vue
 * <script setup>
 * import { usePermission } from '@/composables/usePermission';
 *
 * // 使用默认配置（管理员和教师可以 CRUD + 审核）
 * const { canCreate, canEdit, canDelete, canAudit } = usePermission();
 * </script>
 * ```
 *
 * @example 资源配置用法（自定义配置）
 * ```vue
 * <script setup>
 * import { usePermission } from '@/composables/usePermission';
 * import { ROLES } from '@/constants';
 *
 * // 自定义权限配置（覆盖默认配置）
 * const { canCreate, canEdit, canDelete } = usePermission({
 *   delete: [ROLES.ADMIN], // 只有管理员可以删除
 * });
 * </script>
 * ```
 */
export function usePermission(config?: ResourcePermissionConfig) {
  const userStore = useUserInfoStore();
  const role = computed(() => userStore.info.role);

  /**
   * 当前角色
   */
  const currentRole = computed(() => role.value);

  // 角色判断复用 user-info store 的口径（isTeacher 含 ADMIN），保持单一真实来源
  const isAdmin = computed(() => userStore.isAdmin);
  const isTeacher = computed(() => userStore.isTeacher);
  const isStudent = computed(() => userStore.isStudent);

  /**
   * 检查是否有指定角色（单个或多个）
   * @param roles 角色或角色数组
   * @returns 响应式布尔值
   *
   * @example
   * const canEdit = hasRole([ROLES.ADMIN, ROLES.TEACHER]);
   * const canDelete = hasRole(ROLES.ADMIN);
   */
  const hasRole = (roles: RoleType | RoleType[]) => {
    return computed(() => {
      if (!role.value) return false;
      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(role.value as RoleType);
    });
  };

  /**
   * 检查是否有任一角色（hasRole 的别名，语义更清晰）
   * @param roles 角色数组
   * @returns 响应式布尔值
   *
   * @example
   * const canManage = hasAnyRole([ROLES.ADMIN, ROLES.TEACHER]);
   */
  const hasAnyRole = (roles: RoleType[]) => {
    return hasRole(roles);
  };

  /**
   * 检查是否是指定角色
   * @param targetRole 目标角色
   * @returns 响应式布尔值
   *
   * @example
   * const isAdminUser = isRole(ROLES.ADMIN);
   */
  const isRole = (targetRole: RoleType) => {
    return computed(() => role.value === targetRole);
  };

  // 如果提供了配置，返回资源权限
  // 合并默认配置和用户配置
  const finalConfig = { ...DEFAULT_RESOURCE_CONFIG, ...config };

  return {
    // 当前角色
    currentRole,

    // 角色判断
    isAdmin,
    isTeacher,
    isStudent,

    // 通用权限方法
    hasRole,
    hasAnyRole,
    isRole,

    // 资源权限（使用合并后的配置）
    // 空数组表示无角色可访问，需检查 length 而非 truthy
    canView: finalConfig.view?.length ? hasRole(finalConfig.view) : computed(() => false),
    canCreate: finalConfig.create?.length ? hasRole(finalConfig.create) : computed(() => false),
    canEdit: finalConfig.edit?.length ? hasRole(finalConfig.edit) : computed(() => false),
    canDelete: finalConfig.delete?.length ? hasRole(finalConfig.delete) : computed(() => false),
    canExport: finalConfig.export?.length ? hasRole(finalConfig.export) : computed(() => false),
    canAudit: finalConfig.audit?.length ? hasRole(finalConfig.audit) : computed(() => false),
  };
}
