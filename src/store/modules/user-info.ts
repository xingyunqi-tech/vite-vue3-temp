import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getUserInfo, login, logout, type LoginParams } from '@/api/modules/auth';
import { ROLES } from '@/constants';
import type { RoleType } from '@/constants';
import { removePersistedStore } from '@/store/plugins/persist';
import { getToken, jumpToLogout, setToken } from '@/utils/auth';

export type UserType = 'teacher' | 'student';

export interface UserInfo {
  id: number | undefined;
  username: string;
  realName: string;
  avatar: string;
  email: string;
  phone: string;
  /** 系统角色，统一使用 @/constants 的 ROLES（来自 getUserInfo 接口） */
  role: RoleType | '';
  userType: UserType | '';
  studentNo: string;
  major: string;
  department: string;
  status: number;
}

const isRole = (value: unknown): value is RoleType => (Object.values(ROLES) as unknown[]).includes(value);

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
});

export const useUserInfoStore = defineStore(
  'user',
  () => {
    const info = ref<UserInfo>(createInitialState());

    /**
     * 登录 token 的响应式镜像，真源是 Cookie
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

    /** 本页加载用户信息时的 token，换账号检测的基准；不持久化 */
    let loadedToken = '';

    const resetUserInfo = () => {
      info.value = createInitialState();
      loadedToken = '';
    };

    /** 账号密码登录：写入 token 并同步镜像 */
    const loginAction = async (params: LoginParams) => {
      const newToken = (await login(params))?.token;
      if (!newToken) throw new Error('登录失败：未获取到登录凭证');
      setToken(newToken);
      refreshToken();
    };

    /**
     * 拉取当前用户资料与角色，以接口返回为准覆盖本地信息
     *
     * 安全敏感字段 role 缺失时不得向高权限兜底，留空由路由守卫的「角色为空」校验拦截。
     */
    const getInfoAction = async () => {
      const user = await getUserInfo();
      info.value = { ...createInitialState(), ...user, role: isRole(user?.role) ? user.role : '' };
      loadedToken = getToken();
    };

    /**
     * Cookie 里的 token 是否已不是本页加载用户信息时的 token（其他标签页换了账号）
     *
     * 两边任一为空时不判定：本页尚未加载用户信息，或 token 已被清掉（由守卫按未登录处理）。
     */
    const isAccountSwitched = (): boolean => {
      const current = getToken();
      return !!current && !!loadedToken && current !== loadedToken;
    };

    /**
     * 退出登录：通知后端、清理本地用户数据后整页跳转登录页
     *
     * @param redirect 重新登录后的回跳站内路径，缺省回当前页；异常页会被换成站内首页
     */
    const logoutAction = async (redirect?: string) => {
      await logout().catch(error => console.warn('退出登录接口调用失败:', error));
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
      loginAction,
      getInfoAction,
      isAccountSwitched,
      logoutAction,
    };
  },
  {
    // 只持久化身份资料，不含 role：角色每次进入应用都以接口为准；token 的真源是 Cookie
    persist: { pick: ['info.id', 'info.username', 'info.realName', 'info.avatar', 'info.email', 'info.phone'] },
  },
);
