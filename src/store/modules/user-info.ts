// 走子路径而非包主入口，理由见 @/utils/auth 同款引用处
import { getToken } from '@zhs/agent-course-kit/utils/auth';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getCurrentUserIdentity } from '@/api/modules/platform';
import { ROLES, IDENTITY_ROLE_TYPE, mapIdentityToRole, resolveIdentityTypes } from '@/constants';
import type { RoleType, UserIdentityItem } from '@/constants';
import { removePersistedStore } from '@/store/plugins/persist';
import { getCookieUserNid, getUserInfoCookieRaw, jumpToLogout, resolveUserNid } from '@/utils/auth';

export type UserType = 'teacher' | 'student';

export interface UserInfo {
  id: number | undefined;
  username: string;
  realName: string;
  avatar: string;
  email: string;
  phone: string;
  /** 系统角色，统一使用 @/constants 的 ROLES（来自身份接口映射，见 fetchUserRole） */
  role: RoleType | '';
  userType: UserType | '';
  studentNo: string;
  major: string;
  department: string;
  status: number;
  /** 学校 NID（从 Cookie 解析） */
  schoolNid: string;
  /** 用户 NID（从 Cookie 解析） */
  userNid: string;
  /** 用户身份类型（0-学生 1-教师，来自 get-current-user-identity 接口） */
  userIdentityAuthType: number | undefined;
}

const createInitialState = (): UserInfo => ({
  id: undefined,
  username: '',
  realName: '',
  avatar: '',
  email: '',
  phone: '',
  role: '',
  userType: '',
  studentNo: '',
  major: '',
  department: '',
  status: 1,
  schoolNid: '',
  userNid: '',
  userIdentityAuthType: undefined,
});

export const useUserInfoStore = defineStore(
  'user',
  () => {
    const info = ref<UserInfo>(createInitialState());

    /**
     * SSO token 的响应式镜像，真源是 Cookie
     *
     * 读 Cookie 不产生响应式依赖，所以用 ref 并由 refreshToken() 主动同步，computed 会被永久缓存。
     */
    const token = ref<string>(getToken());

    /** 重新读取 Cookie 并同步镜像，返回当前 token。路由守卫每次导航进入时调用 */
    const refreshToken = (): string => {
      token.value = getToken();
      return token.value;
    };

    // 计算属性
    const isLoggedIn = computed(() => !!token.value);
    const isAdmin = computed(() => info.value.role === ROLES.ADMIN);
    const isTeacher = computed(() => info.value.role === ROLES.TEACHER || info.value.role === ROLES.ADMIN);
    const isStudent = computed(() => info.value.role === ROLES.STUDENT);

    const setUserInfo = (partial: Partial<UserInfo>) => {
      Object.assign(info.value, partial);
    };

    /** 本页从 Cookie 解析出的用户标识，换账号检测的基准；不持久化，避免刷新后先拿到上一个账号的值 */
    let loadedUserNid = '';

    const resetUserInfo = () => {
      info.value = createInitialState();
      loadedUserNid = '';
    };

    /**
     * 从 Cookie 中解析用户信息（SSO 登录后写入）
     *
     * Cookie key 因部署环境而异，清单单点维护在 @/utils/auth 的 USER_INFO_COOKIE_KEYS，
     * 不要在这里另写一份匹配逻辑——漏配的环境会在此抛错，被路由守卫吞成 403。
     */
    const getInfoAction = async () => {
      const userInfoStr = getUserInfoCookieRaw();
      if (!userInfoStr) {
        throw new Error('无法从 Cookie 中获取用户信息');
      }

      try {
        const decoded = decodeURIComponent(userInfoStr);
        const data = JSON.parse(decoded);

        setUserInfo({
          id: data.userId || data.id,
          username: data.userName || data.username || '',
          realName: data.realName || data.nickName || data.name || '',
          avatar: data.headPic || data.avatar || '',
          email: data.email || '',
          phone: data.mobile || data.phone || '',
          // 安全敏感字段：缺失时不得向高权限兜底，留空由路由守卫的「角色为空」校验拦截并重新登录
          role: data.role || '',
          schoolNid: data.schoolNid || '',
          userNid: resolveUserNid(data),
        });
        loadedUserNid = info.value.userNid;
      } catch (error) {
        console.error('解析用户信息 Cookie 失败:', error);
        throw new Error('解析用户信息失败', { cause: error });
      }
    };

    /**
     * 从后端拉取当前用户身份并映射为系统角色
     *
     * 背景：SSO 写入的用户信息 Cookie 仅含身份资料、不含 role，角色需通过
     * get-current-user-identity 接口获取。接口返回身份列表，每项含
     * identityType（0-学生 1-教师）与 authority（是否认证）。
     * 取值规则：resolveIdentityTypes 先滤掉明确未认证的身份，再在剩下的身份里教师优先；
     * 一条可用身份都没有时返回空角色，由守卫拦到 403。
     *
     * @returns 映射后的系统角色（无法判定时为空字符串）
     */
    const fetchUserRole = async (): Promise<RoleType | ''> => {
      const list = (await getCurrentUserIdentity()) as UserIdentityItem[] | null;
      const identityTypes = resolveIdentityTypes(Array.isArray(list) ? list : []);

      const hasTeacher = identityTypes.includes(IDENTITY_ROLE_TYPE.TEACHER);
      const hasStudent = identityTypes.includes(IDENTITY_ROLE_TYPE.STUDENT);

      const identityType = hasTeacher
        ? IDENTITY_ROLE_TYPE.TEACHER
        : hasStudent
          ? IDENTITY_ROLE_TYPE.STUDENT
          : undefined;

      const role = mapIdentityToRole(identityType);
      setUserInfo({ userIdentityAuthType: identityType, role });
      return role;
    };

    /**
     * Cookie 里的登录用户是否已不是本页加载的用户（其他标签页经 SSO 换了账号）
     *
     * 两边任一为空时不判定：本页尚未解析用户信息，或 Cookie 已被清掉（由守卫按未登录处理）。
     */
    const isAccountSwitched = (): boolean => {
      const current = getCookieUserNid();
      return !!current && !!loadedUserNid && current !== loadedUserNid;
    };

    /**
     * 退出登录：清理本地状态后整体跳 SSO 登出，由 SSO 引导重新登录
     *
     * @param redirect 重新登录后的回跳绝对地址，缺省回当前页；
     *                 异常页会被 jumpToLogout 换成站内目标，不必在调用点特殊处理
     */
    const logoutAction = async (redirect?: string) => {
      resetUserInfo();
      token.value = '';
      // 存储不可用时清理会 reject，此时也没有写进去的持久化数据，登出照常进行
      await removePersistedStore('user').catch(error => console.warn('清理用户持久化数据失败:', error));
      jumpToLogout(redirect);
    };

    return {
      info,
      token,
      isLoggedIn,
      refreshToken,
      isAdmin,
      isTeacher,
      isStudent,
      setUserInfo,
      resetUserInfo,
      getInfoAction,
      fetchUserRole,
      isAccountSwitched,
      logoutAction,
    };
  },
  {
    // 只持久化身份资料：token 的真源是 Cookie，持久化会在 hydrate 时还原出过期的登录态
    persist: { pick: ['info'] },
  },
);
