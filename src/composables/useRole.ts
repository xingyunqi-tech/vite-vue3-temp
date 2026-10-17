import { computed } from 'vue';
import { IDENTITY_ROLE_TYPE } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';

/**
 * 用户身份 Hook
 *
 * 提供用户身份（教师/学生）的判断。身份来源为后端 get-current-user-identity 接口，
 * 已在路由守卫中通过 `userStore.fetchUserRole()` 拉取并写入 store
 * （同时映射到 `info.role` 供路由/菜单权限过滤使用）。
 *
 * 对标 @zhs/agent-course-app 的 useRole：
 * - 差异 1：本项目身份存于 user-info store 的 `info.userIdentityAuthType`；
 * - 差异 2：身份会映射为系统角色（TEACHER/STUDENT）写入 `info.role`，
 *   细粒度角色判断（含 ADMIN）请用 `usePermission`。
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRole } from '@/composables/useRole';
 *
 * const { isTeacher, isStudent } = useRole();
 * </script>
 * ```
 */
export function useRole() {
  const userStore = useUserInfoStore();

  // 用户身份 0-学生 1-教师
  const userIdentityAuthType = computed(() => userStore.info.userIdentityAuthType);

  // ---- 身份判断 ----

  // 是否是教师
  const isTeacher = computed(() => userIdentityAuthType.value === IDENTITY_ROLE_TYPE.TEACHER);

  // 是否是学生
  const isStudent = computed(() => userIdentityAuthType.value === IDENTITY_ROLE_TYPE.STUDENT);

  /** 拉取并刷新当前用户身份（委托 store action，返回映射后的系统角色） */
  const fetchUserRole = () => userStore.fetchUserRole();

  return {
    userIdentityAuthType,
    isTeacher,
    isStudent,
    fetchUserRole,
  };
}

export default useRole;
