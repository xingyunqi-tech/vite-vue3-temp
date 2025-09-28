import { defineStore } from 'pinia';
import { ref } from 'vue';
import LoginService from '@/api/modules/login';

/**
 * 用户状态管理Store
 * 管理用户登录状态、token、角色等信息
 */
export const useUserStore = defineStore(
  'user',
  () => {
    /** 用户Token */
    const token = ref<string>('');
    /** 用户ID */
    const id = ref<string>('');
    /** 用户名 */
    const name = ref<string>('');
    /** 用户邮箱 */
    const email = ref<string>('');
    /** 用户头像 */
    const avatar = ref<string>('');
    /** 用户角色列表 */
    const roles = ref<string[]>([]);

    /**
     * 设置Token值
     * @param tokenValue Token字符串
     */
    const setTokenValue = (tokenValue: string) => {
      token.value = tokenValue;
    };

    /**
     * 设置用户ID
     * @param idValue 用户ID
     */
    const setId = (idValue: string) => {
      id.value = idValue;
    };

    /**
     * 设置用户名
     * @param nameValue 用户名
     */
    const setName = (nameValue: string) => {
      name.value = nameValue;
    };

    /**
     * 设置用户邮箱
     * @param emailValue 用户邮箱
     */
    const setEmail = (emailValue: string) => {
      email.value = emailValue;
    };

    /**
     * 设置用户头像
     * @param avatarValue 头像URL
     */
    const setAvatar = (avatarValue: string) => {
      avatar.value = avatarValue;
    };

    /**
     * 设置用户角色
     * @param rolesValue 角色列表
     */
    const setRoles = (rolesValue: string[]) => {
      roles.value = rolesValue;
    };

    /**
     * 登录操作
     */
    const loginAction = async (userInfo: { username: string; password: string }) => {
      const username = userInfo.username.trim();
      try {
        const response = await LoginService.login(username, userInfo.password);
        const tokenStr = response.data.token;
        setTokenValue(tokenStr);
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    };

    /**
     * 获取用户信息
     */
    const getInfoAction = async () => {
      try {
        // 这里应该调用获取用户信息的接口
        // 暂时使用模拟数据
        const mockUserInfo = {
          id: id.value || 'user_123',
          username: name.value || '管理员',
          email: email.value || 'admin@example.com',
          roles: ['admin'],
          icon: '',
        };

        if (mockUserInfo.roles && mockUserInfo.roles.length > 0) {
          setRoles(mockUserInfo.roles);
        } else {
          throw new Error('getInfo: roles must be a non-null array!');
        }
        setId(mockUserInfo.id);
        setName(mockUserInfo.username);
        setEmail(mockUserInfo.email);
        setAvatar(mockUserInfo.icon || '');
        return Promise.resolve(mockUserInfo);
      } catch (error) {
        return Promise.reject(error);
      }
    };

    /**
     * 退出登录
     */
    const logoutAction = async () => {
      try {
        // 调用退出登录接口
        await LoginService.logout();
        setTokenValue('');
        setId('');
        setName('');
        setEmail('');
        setAvatar('');
        setRoles([]);
        return Promise.resolve();
      } catch {
        // 即使接口调用失败，也要清除本地状态
        setTokenValue('');
        setId('');
        setName('');
        setEmail('');
        setAvatar('');
        setRoles([]);
        return Promise.resolve();
      }
    };

    /**
     * 前端退出登录（不调用接口）
     */
    const fedLogOut = async () => {
      setTokenValue('');
      setId('');
      setName('');
      setEmail('');
      setAvatar('');
      setRoles([]);
      return Promise.resolve();
    };

    return {
      token,
      id,
      name,
      email,
      avatar,
      roles,
      setTokenValue,
      setId,
      setName,
      setEmail,
      setAvatar,
      setRoles,
      loginAction,
      getInfoAction,
      logoutAction,
      fedLogOut,
    };
  },
  {
    persist: true,
  },
);
