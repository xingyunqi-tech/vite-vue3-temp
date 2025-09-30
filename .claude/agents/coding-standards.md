# 编码规范 Agent

## 职责
负责制定和维护项目编码规范，确保代码风格一致性、类型安全和最佳实践，为AI生成高质量代码提供指导。

## 🎯 编码原则

### 1. 类型优先原则
- **严格类型定义**: 所有变量、函数参数和返回值必须有明确的类型定义
- **避免any类型**: 除非特殊情况，禁止使用 `any` 类型
- **接口完整性**: 所有数据结构都要有对应的TypeScript接口
- **泛型合理使用**: 适当使用泛型提高代码复用性

### 2. 组件化原则
- **单一职责**: 每个组件只负责一个功能
- **可复用性**: 组件设计要考虑复用性
- **Props类型化**: 所有Props必须有完整的类型定义
- **事件规范**: 使用defineEmits定义组件事件

### 3. 函数式原则
- **纯函数优先**: 工具函数应该是纯函数
- **副作用控制**: 明确标识和控制副作用
- **函数组合**: 通过函数组合构建复杂逻辑
- **错误处理**: 完善的错误处理机制

## 📝 TypeScript 编码规范

### 接口定义规范
```typescript
// ✅ 正确：完整的接口定义
interface IUserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 用户角色 */
  roles: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 可选的头像URL */
  avatar?: string;
}

// ❌ 错误：使用any类型
interface IBadUserInfo {
  id: string;
  data: any; // 应该定义具体类型
}

// ❌ 错误：缺少注释
interface IUserInfo {
  id: string;
  username: string;
  email: string;
}
```

### 函数类型定义规范
```typescript
// ✅ 正确：完整的函数类型定义
/**
 * 获取用户信息
 * @param userId 用户ID
 * @returns Promise<用户信息>
 */
const getUserInfo = async (userId: string): Promise<IUserInfo> => {
  const response = await UserApi.getInfo(userId);
  return response.data;
};

// ✅ 正确：泛型函数定义
/**
 * 通用API请求函数
 * @param url 请求地址
 * @param params 请求参数
 * @returns Promise<响应数据>
 */
const apiRequest = async <T>(
  url: string, 
  params?: Record<string, any>
): Promise<IResponse<T>> => {
  const response = await instance.get(url, { params });
  return response.data;
};

// ❌ 错误：缺少类型定义
const getUserInfo = async (userId) => {
  const response = await UserApi.getInfo(userId);
  return response.data;
};
```

### 枚举和常量定义
```typescript
// ✅ 正确：使用const断言
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// ✅ 正确：使用枚举
export enum ApiErrorCode {
  /** 请求成功 */
  SUCCESS = 200,
  /** 请求参数错误 */
  BAD_REQUEST = 400,
  /** 未授权 */
  UNAUTHORIZED = 401,
  /** 权限不足 */
  FORBIDDEN = 403,
  /** 资源不存在 */
  NOT_FOUND = 404,
  /** 服务器错误 */
  SERVER_ERROR = 500,
}

// ❌ 错误：使用魔法数字
if (response.code === 200) {
  // 应该使用枚举或常量
}
```

### 类型守卫和断言
```typescript
// ✅ 正确：类型守卫
function isUserInfo(obj: any): obj is IUserInfo {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.username === 'string' &&
         typeof obj.email === 'string';
}

// 使用类型守卫
const data = await apiRequest('/user/info');
if (isUserInfo(data)) {
  // 此时data被正确推断为IUserInfo类型
  console.log(data.username);
}

// ✅ 正确：非空断言（确定不为null时使用）
const element = document.getElementById('root')!;

// ❌ 错误：过度使用类型断言
const userInfo = response.data as IUserInfo; // 应该使用类型守卫
```

## 🎨 Vue 组件编码规范

### Composition API 规范
```vue
<template>
  <div class="user-profile">
    <div class="user-info">
      <img v-if="userInfo?.avatar" :src="userInfo.avatar" :alt="userInfo.username" />
      <h3>{{ displayName }}</h3>
      <p>{{ userInfo?.email }}</p>
    </div>
    <div class="actions">
      <el-button @click="handleEdit">编辑</el-button>
      <el-button @click="handleDelete" type="danger">删除</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { UserApi } from '@/api/modules/user';
import type { IUserInfo } from '@/interface/Api';

// ==================== 接口定义 ====================
interface Props {
  /** 用户ID */
  userId: string;
  /** 是否显示操作按钮 */
  showActions?: boolean;
}

interface Emits {
  /** 编辑用户事件 */
  (e: 'edit', userId: string): void;
  /** 删除用户事件 */
  (e: 'delete', userId: string): void;
}

// ==================== Props 和 Emits ====================
const props = withDefaults(defineProps<Props>(), {
  showActions: true,
});

const emit = defineEmits<Emits>();

// ==================== 响应式数据 ====================
const userInfo = ref<IUserInfo | null>(null);
const loading = ref(false);
const error = ref<string>('');

// ==================== 计算属性 ====================
const displayName = computed(() => {
  return userInfo.value?.username || '未知用户';
});

const hasAvatar = computed(() => {
  return !!userInfo.value?.avatar;
});

// ==================== 方法定义 ====================
/**
 * 获取用户信息
 */
const fetchUserInfo = async (): Promise<void> => {
  if (!props.userId) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const response = await UserApi.getInfo(props.userId);
    userInfo.value = response.data;
  } catch (err) {
    error.value = '获取用户信息失败';
    console.error('获取用户信息失败:', err);
    ElMessage.error('获取用户信息失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 处理编辑用户
 */
const handleEdit = (): void => {
  emit('edit', props.userId);
};

/**
 * 处理删除用户
 */
const handleDelete = (): void => {
  emit('delete', props.userId);
};

// ==================== 生命周期 ====================
onMounted(() => {
  fetchUserInfo();
});

// ==================== 监听器 ====================
watch(
  () => props.userId,
  (newUserId) => {
    if (newUserId) {
      fetchUserInfo();
    }
  }
);

// ==================== 暴露给模板的方法 ====================
defineExpose({
  fetchUserInfo,
});
</script>

<style scoped lang="scss">
.user-profile {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;

    img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-bottom: 12px;
      object-fit: cover;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-profile {
    padding: 16px;
  }
}
</style>
```

### 组件Props规范
```typescript
// ✅ 正确：完整的Props定义
interface Props {
  /** 必需的字符串属性 */
  title: string;
  /** 可选的数字属性 */
  count?: number;
  /** 联合类型属性 */
  size: 'small' | 'medium' | 'large';
  /** 对象属性 */
  userInfo: IUserInfo;
  /** 数组属性 */
  items: string[];
  /** 函数属性 */
  onSubmit?: (data: any) => void;
}

// ✅ 正确：使用withDefaults设置默认值
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  size: 'medium',
  items: () => [],
});

// ❌ 错误：缺少类型定义
const props = defineProps(['title', 'count']);
```

### 组件事件规范
```typescript
// ✅ 正确：完整的事件定义
interface Emits {
  /** 提交事件 */
  (e: 'submit', data: IFormData): void;
  /** 取消事件 */
  (e: 'cancel'): void;
  /** 更新事件 */
  (e: 'update:modelValue', value: string): void;
}

const emit = defineEmits<Emits>();

// 触发事件
const handleSubmit = (formData: IFormData) => {
  emit('submit', formData);
};

// ❌ 错误：缺少类型定义
const emit = defineEmits(['submit', 'cancel']);
```

## 📊 常量定义规范

### 1. 常量组织结构
```
src/constants/
├── index.ts        # 常量统一导出
└── System.ts       # 系统相关常量
```

### 2. 常量定义示例
```typescript
// constants/System.ts

/**
 * 不同服务的代理前缀
 */
export const PROXY_URI = {
  API: '/apiService',
} as const;

/**
 * 默认语言
 */
export const DEFAULT_LOCALE = 'zh-CN';

/**
 * 默认主题
 */
export const DEFAULT_THEME_STYLE = 'light';

/**
 * 语言包选项
 */
export enum LOCALE_TYPE {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
}
```

### 3. 常量命名规范
```typescript
// ✅ 正确：使用大写字母和下划线
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const API_BASE_URL = '/api';
export const DEFAULT_PAGE_SIZE = 10;

// ✅ 正确：对象常量使用 as const
export const PROXY_URI = {
  API: '/apiService',
  WS: '/wsService',
} as const;

// ❌ 错误：使用小写命名
export const maxFileSize = 10 * 1024 * 1024;
export const apiBaseUrl = '/api';
```

### 4. 常量导出规范
```typescript
// constants/index.ts
/**
 * 常量统一导出文件
 * 将所有常量模块在此处统一导出，便于外部使用
 */

// 导出系统相关常量
export * from './System';
```

## 🔤 TypeScript类型定义规范

### 1. 类型组织结构
```
src/interface/
├── index.ts        # 类型统一导出
└── System.ts       # 系统相关类型
```

### 2. 类型定义示例
```typescript
// interface/System.ts

/**
 * 语言包枚举
 */
export enum LocaleList {
  'zh-CN',
  'en-US',
}

/**
 * 语言包类型
 */
export type LocaleKey = keyof typeof LocaleList;

/**
 * 主题样式枚举
 */
export enum ThemeStyleList {
  'light',
  'dark',
}

/**
 * 主题样式类型
 */
export type ThemeStyleKey = keyof typeof ThemeStyleList;
```

### 3. 接口命名规范
```typescript
// ✅ 正确：使用I前缀或描述性名称
export interface IUserInfo {
  id: string;
  username: string;
}

export type UserStatus = 'active' | 'inactive' | 'pending';

export type LocaleKey = keyof typeof LocaleList;

// ❌ 错误：命名不清晰
export interface User {
  data: any;
}

export type T = string;
```

### 4. 类型导出规范
```typescript
// interface/index.ts
/**
 * 接口类型定义统一导出文件
 * 将所有接口定义在此处统一导出，便于外部使用
 */

// 导出业务相关接口
export * from './System';
```

## 🔧 工具函数编码规范

### 1. 函数组织结构
```
src/utils/
├── index.ts        # 工具函数统一导出
├── date.ts         # 日期处理函数
└── locale.ts       # 语言包处理函数
```

### 2. 日期工具函数示例
```typescript
// utils/date.ts

/**
 * 日期处理相关工具函数
 * 提供日期格式化和字符串转日期等功能
 */

/**
 * 格式化日期为指定格式的字符串
 * @param date - 要格式化的日期对象
 * @param fmt - 格式化模板字符串，如'yyyy-MM-dd hh:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, fmt: string): string {
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
  }
  const o: { [key: string]: number } = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
  };
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      const str: string = `${o[k]}`;
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? str : padLeftZero(str));
    }
  }
  return fmt;
}

/**
 * 左侧补零工具函数
 * @param str - 要补零的字符串
 * @returns 补零后的字符串
 * @private
 */
function padLeftZero(str: string): string {
  return `00${str}`.substr(str.length);
}
```

### 3. 语言包工具函数示例
```typescript
// utils/locale.ts

import elementPlusZhCN from 'element-plus/es/locale/lang/zh-cn';
import elementPlusEnUS from 'element-plus/es/locale/lang/en';
import type { LocaleKey } from '@/interface/System';

/**
 * Element Plus 语言包映射
 */
const elementPlusLocales = {
  'zh-CN': elementPlusZhCN,
  'en-US': elementPlusEnUS,
};

/**
 * 根据语言代码获取对应的 Element Plus 语言包
 * @param locale 语言代码
 * @returns Element Plus 语言包
 */
export const getElementPlusLocale = (locale: LocaleKey) => {
  return elementPlusLocales[locale] || elementPlusLocales['zh-CN'];
};
```

### 4. 函数命名规范
```typescript
// ✅ 正确：清晰的函数命名
export function formatDate(date: Date, fmt: string): string {
  // 格式化日期
}

export function getElementPlusLocale(locale: LocaleKey) {
  // 获取语言包
}

// ❌ 错误：命名不清晰
export function format(d: any, f: any) {
  // 不清楚在格式化什么
}

export function get(key: string) {
  // 不清楚在获取什么
}
```

### 5. 函数文档注释规范
```typescript
/**
 * 完整的函数文档注释
 * @param param1 - 参数1的说明
 * @param param2 - 参数2的说明
 * @returns 返回值说明
 * @example
 * const result = formatDate(new Date(), 'yyyy-MM-dd');
 * console.log(result); // 2023-12-25
 */
export function formatDate(date: Date, fmt: string): string {
  // 函数实现
}
```

### 6. 工具函数导出规范
```typescript
// utils/index.ts
/**
 * 工具函数统一导出文件
 * 将所有工具函数在此处统一导出，便于外部使用
 */

export * from './date';
export * from './locale';
```

## 🏪 状态管理规范 (Pinia)

### Store定义规范
```typescript
// stores/modules/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { UserApi } from '@/api/modules/user';
import type { IUserInfo, ILoginRequest } from '@/interface/Api';

/**
 * 用户状态管理Store
 */
export const useUserStore = defineStore('user', () => {
  // ==================== 状态定义 ====================
  /** 用户Token */
  const token = ref<string>('');
  /** 用户信息 */
  const userInfo = ref<IUserInfo | null>(null);
  /** 用户权限列表 */
  const permissions = ref<string[]>([]);
  /** 加载状态 */
  const loading = ref(false);

  // ==================== 计算属性 ====================
  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value);
  
  /** 用户角色列表 */
  const userRoles = computed(() => userInfo.value?.roles || []);
  
  /** 权限检查函数 */
  const hasPermission = computed(() => (permission: string) => {
    return permissions.value.includes(permission);
  });

  // ==================== 动作定义 ====================
  /**
   * 用户登录
   * @param credentials 登录凭据
   */
  const login = async (credentials: ILoginRequest): Promise<void> => {
    loading.value = true;
    
    try {
      const response = await UserApi.login(credentials);
      
      // 更新状态
      token.value = response.data.token;
      userInfo.value = response.data.userInfo;
      permissions.value = response.data.permissions;
      
      // 持久化存储
      localStorage.setItem('token', token.value);
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value));
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 用户登出
   */
  const logout = async (): Promise<void> => {
    try {
      await UserApi.logout();
    } finally {
      // 清理状态
      token.value = '';
      userInfo.value = null;
      permissions.value = [];
      
      // 清理本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    }
  };

  /**
   * 初始化用户状态
   */
  const initUserState = (): void => {
    const savedToken = localStorage.getItem('token');
    const savedUserInfo = localStorage.getItem('userInfo');
    
    if (savedToken) {
      token.value = savedToken;
    }
    
    if (savedUserInfo) {
      try {
        userInfo.value = JSON.parse(savedUserInfo);
      } catch (error) {
        console.error('解析用户信息失败:', error);
        localStorage.removeItem('userInfo');
      }
    }
  };

  // 初始化
  initUserState();

  return {
    // 状态
    token,
    userInfo,
    permissions,
    loading,
    // 计算属性
    isLoggedIn,
    userRoles,
    hasPermission,
    // 动作
    login,
    logout,
    initUserState,
  };
});
```

## 🌐 API接口规范

### API模块定义
```typescript
// api/modules/user.ts
import instance from '../instance';
import type { 
  IUserInfo, 
  ILoginRequest, 
  ILoginResponse,
  IUserListParams,
  IPaginationResponse,
  IResponse 
} from '@/interface/Api';

/**
 * 用户相关API接口
 */
export class UserApi {
  /**
   * 用户登录
   * @param credentials 登录凭据
   */
  static async login(credentials: ILoginRequest): Promise<IResponse<ILoginResponse>> {
    const response = await instance.post('/auth/login', credentials);
    return response.data;
  }

  /**
   * 获取用户列表
   * @param params 查询参数
   */
  static async getUserList(
    params: IUserListParams = {}
  ): Promise<IPaginationResponse<IUserInfo>> {
    const response = await instance.get('/users', { params });
    return response.data;
  }

  /**
   * 获取用户详情
   * @param userId 用户ID
   */
  static async getUserInfo(userId: string): Promise<IResponse<IUserInfo>> {
    const response = await instance.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * 创建用户
   * @param userData 用户数据
   */
  static async createUser(userData: Omit<IUserInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<IResponse<IUserInfo>> {
    const response = await instance.post('/users', userData);
    return response.data;
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param userData 更新数据
   */
  static async updateUser(
    userId: string, 
    userData: Partial<IUserInfo>
  ): Promise<IResponse<IUserInfo>> {
    const response = await instance.put(`/users/${userId}`, userData);
    return response.data;
  }

  /**
   * 删除用户
   * @param userId 用户ID
   */
  static async deleteUser(userId: string): Promise<IResponse<void>> {
    const response = await instance.delete(`/users/${userId}`);
    return response.data;
  }
}

export default UserApi;
```

## 🛠️ 工具函数规范

### 工具函数定义
```typescript
// utils/date.ts
import dayjs from 'dayjs';

/**
 * 日期格式化工具
 */
export class DateUtils {
  /**
   * 格式化日期
   * @param date 日期
   * @param format 格式化字符串
   * @returns 格式化后的日期字符串
   */
  static format(date: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
    return dayjs(date).format(format);
  }

  /**
   * 获取相对时间
   * @param date 日期
   * @returns 相对时间字符串
   */
  static fromNow(date: Date | string | number): string {
    return dayjs(date).fromNow();
  }

  /**
   * 判断是否为今天
   * @param date 日期
   * @returns 是否为今天
   */
  static isToday(date: Date | string | number): boolean {
    return dayjs(date).isSame(dayjs(), 'day');
  }

  /**
   * 获取日期范围
   * @param start 开始日期
   * @param end 结束日期
   * @returns 日期范围数组
   */
  static getDateRange(start: Date | string, end: Date | string): string[] {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const dates: string[] = [];
    
    let current = startDate;
    while (current.isSameOrBefore(endDate)) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    
    return dates;
  }
}

// utils/validation.ts
/**
 * 数据验证工具
 */
export class ValidationUtils {
  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns 是否为有效邮箱
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式
   * @param phone 手机号
   * @returns 是否为有效手机号
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证密码强度
   * @param password 密码
   * @returns 密码强度等级
   */
  static getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (password.length < 6) return 'weak';
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 3) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }
}
```

## 📋 代码注释规范

### JSDoc注释规范
```typescript
/**
 * 用户管理服务类
 * 提供用户相关的业务逻辑处理
 * 
 * @example
 * ```typescript
 * const userService = new UserService();
 * const users = await userService.getUserList({ page: 1 });
 * ```
 */
export class UserService {
  /**
   * 获取用户列表
   * 
   * @param params - 查询参数
   * @param params.page - 页码，默认为1
   * @param params.pageSize - 每页大小，默认为10
   * @param params.keyword - 搜索关键词
   * @returns Promise<用户列表响应>
   * 
   * @throws {Error} 当网络请求失败时抛出错误
   * 
   * @example
   * ```typescript
   * const result = await userService.getUserList({
   *   page: 1,
   *   pageSize: 20,
   *   keyword: 'admin'
   * });
   * ```
   */
  async getUserList(params: IUserListParams): Promise<IPaginationResponse<IUserInfo>> {
    // 实现代码...
  }
}
```

### 行内注释规范
```typescript
// ✅ 正确：解释复杂逻辑
const processUserData = (users: IUserInfo[]) => {
  // 过滤活跃用户并按创建时间排序
  return users
    .filter(user => user.status === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// ✅ 正确：解释业务逻辑
if (user.roles.includes('admin')) {
  // 管理员用户可以访问所有功能
  permissions.push(...ALL_PERMISSIONS);
} else {
  // 普通用户只能访问基础功能
  permissions.push(...BASIC_PERMISSIONS);
}

// ❌ 错误：显而易见的注释
const count = users.length; // 获取用户数量
```

## 🎨 样式编码规范

### CSS变量使用规范（重要）

#### 必须使用 public/theme.css 中定义的CSS变量
```scss
// ✅ 正确：使用预定义的CSS变量
.component {
  // 文本颜色
  color: var(--colorTextHeading);        // 标题文本 rgba(0,0,0,0.88)
  color: var(--colorText);               // 普通文本 rgba(0,0,0,0.88)
  color: var(--colorTextSecondary);      // 次要文本 rgba(0,0,0,0.65)
  color: var(--colorTextTertiary);       // 三级文本 rgba(0,0,0,0.45)
  color: var(--colorTextPlaceholder);    // 占位符 rgba(0,0,0,0.25)
  
  // 背景颜色
  background: var(--colorBgContainer);   // 容器背景 #ffffff
  background: var(--colorBgLayout);      // 布局背景 #f5f5f5
  background: var(--colorBgElevated);    // 浮层背景 #ffffff
  
  // 边框颜色
  border: 1px solid var(--colorBorder);           // 默认边框 #d9d9d9
  border: 1px solid var(--colorBorderSecondary);  // 次要边框 #eeeeee
  
  // 主题色
  background: var(--colorPrimary);       // 主色 rgb(0,180,180)
  color: var(--colorPrimaryText);        // 主色文本
  border-color: var(--colorPrimaryBorder); // 主色边框
  
  // 状态颜色
  color: var(--colorSuccess);            // 成功色
  color: var(--colorWarning);            // 警告色
  color: var(--colorError);              // 错误色
  
  // 色板变量
  background: var(--cyan-2);             // 青色
  background: var(--blue-4);             // 蓝色
  background: var(--green-5);            // 绿色
}

// ❌ 错误：硬编码颜色值
.component {
  color: #333;              // 禁止！使用 var(--colorText)
  background: #fff;         // 禁止！使用 var(--colorBgContainer)
  border: 1px solid #e0e0e0;  // 禁止！使用 var(--colorBorder)
  color: rgba(0,0,0,0.88);   // 禁止！使用 var(--colorTextHeading)
}
```

#### 样式选择器规范
```scss
// ❌ 错误：直接使用标签选择器
h1 {
  font-size: 24px;
  color: var(--colorTextHeading);
}

h2 {
  font-size: 20px;
}

p {
  color: var(--colorText);
}

div {
  padding: 20px;
}

// ✅ 正确：为每个元素添加 class
.page-title {
  font-size: 24px;
  color: var(--colorTextHeading);
}

.section-title {
  font-size: 20px;
  color: var(--colorTextHeading);
}

.text-content {
  color: var(--colorText);
}

.content-wrapper {
  padding: 20px;
}
```

### SCSS组织规范
```scss
// ❌ 不要定义颜色变量，使用 public/theme.css 中的CSS变量
// $primary-color: #409eff;  // 禁止！
// $success-color: #67c23a;  // 禁止！

// ✅ 可以定义非颜色的变量
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;

$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;

// ✅ 正确：混入定义
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin card-style {
  padding: $spacing-lg;
  border: 1px solid var(--colorBorder);  // 使用CSS变量
  border-radius: 8px;
  background: var(--colorBgContainer);   // 使用CSS变量
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@mixin text-ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

// ✅ 正确：组件样式
.user-management {
  padding: $spacing-lg;

  &__header {
    @include flex-center;
    justify-content: space-between;
    margin-bottom: $spacing-lg;

    .title {
      font-size: $font-size-lg;
      font-weight: 600;
      color: #333;
    }

    .actions {
      display: flex;
      gap: $spacing-sm;
    }
  }

  &__content {
    @include card-style;
  }

  &__table {
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-name {
      @include text-ellipsis;
      max-width: 120px;
      font-weight: 500;
    }

    .user-status {
      &--active {
        color: $success-color;
      }

      &--inactive {
        color: $danger-color;
      }

      &--pending {
        color: $warning-color;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-management {
    padding: $spacing-md;

    &__header {
      flex-direction: column;
      gap: $spacing-md;
    }
  }
}
```

## 🔍 错误处理规范

### 统一错误处理
```typescript
// utils/error.ts
/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * API错误处理
 */
export const handleApiError = (error: any): AppError => {
  if (error.response) {
    // 服务器响应错误
    const { status, data } = error.response;
    return new AppError(
      data.message || '服务器错误',
      data.code || 'SERVER_ERROR',
      status
    );
  } else if (error.request) {
    // 网络错误
    return new AppError(
      '网络连接失败',
      'NETWORK_ERROR',
      0
    );
  } else {
    // 其他错误
    return new AppError(
      error.message || '未知错误',
      'UNKNOWN_ERROR',
      500
    );
  }
};

// 在组件中使用
const fetchUserData = async () => {
  try {
    const response = await UserApi.getUserList();
    userList.value = response.data;
  } catch (error) {
    const appError = handleApiError(error);
    ElMessage.error(appError.message);
    console.error('获取用户列表失败:', appError);
  }
};
```

## 📋 编码规范快速检查清单

### TypeScript 类型安全检查
- [ ] 所有变量都有明确的类型定义，避免使用 `any`
- [ ] 接口定义完整，包含所有必要字段和注释
- [ ] 函数参数和返回值类型明确
- [ ] 使用类型守卫而不是类型断言
- [ ] 泛型使用合理，提高代码复用性
- [ ] 导入类型时使用 `type` 关键字

### Vue组件规范检查
- [ ] Props 和 Emits 有完整的类型定义
- [ ] 响应式数据类型明确，避免类型推断错误
- [ ] 计算属性有返回类型注解
- [ ] 异步函数有完善的错误处理
- [ ] 生命周期钩子使用合理
- [ ] 模板中使用 `v-key` 进行列表渲染
- [ ] 列表内容使用数据驱动而非硬编码

### API接口规范检查
- [ ] 接口方法有完整的 JSDoc 注释
- [ ] 参数验证完善，包含边界条件检查
- [ ] 错误处理机制统一
- [ ] 返回值类型定义完整
- [ ] 使用统一的响应格式
- [ ] 异步操作有超时和重试机制

### 样式编码检查（强化）
- [ ] 使用 `public/theme.css` 中定义的 CSS 变量
- [ ] 所有颜色值使用 `var(--colorXxx)` 而非硬编码
- [ ] 不直接使用标签名选择器（如 `h1`, `p`, `div`）
- [ ] 每个元素都有语义化的 class 名称
- [ ] 样式类名遵循 BEM 命名规范
- [ ] 响应式设计适配多种屏幕尺寸
- [ ] 使用语义化的样式组织
- [ ] 避免深层嵌套选择器（不超过3层）
- [ ] 样式性能优化（避免复杂选择器）

### 图片资源管理检查
- [ ] 图片按页面/功能分类存放在 `src/assets/images/` 目录
- [ ] 图标存放在 `src/assets/icons/` 目录
- [ ] 下载前检查本地是否已存在
- [ ] 使用导入方式加载图片而非硬编码路径
- [ ] 图片文件命名语义化

## ❓ 编码规范常见问题

### Q: 什么时候可以使用 `any` 类型？
**A**: 极少数情况下可以使用：
- 迁移现有 JavaScript 代码的过渡期
- 第三方库没有类型定义且无法补充
- 动态内容确实无法预知类型结构
- **更好的选择**: 使用 `unknown` + 类型守卫

### Q: 如何处理复杂的嵌套对象类型？
**A**: 
```typescript
// ✅ 推荐：拆分复杂类型
interface IUserProfile {
  personal: IPersonalInfo;
  contact: IContactInfo;
  preferences: IUserPreferences;
}

interface IPersonalInfo {
  name: string;
  age: number;
  avatar?: string;
}

// ❌ 避免：过于复杂的嵌套
interface IUser {
  name: string;
  contact: {
    email: string;
    phone: {
      primary: string;
      secondary?: string;
    };
  };
}
```

### Q: 组件的 Props 验证应该多严格？
**A**: 
- **必需 Props**: 严格验证，包含类型和格式检查
- **可选 Props**: 提供合理默认值
- **对象 Props**: 使用接口定义结构
- **函数 Props**: 明确参数和返回值类型

### Q: 如何组织大型组件的代码结构？
**A**: 
```vue
<script setup lang="ts">
// 1. 导入声明（按类别分组）
// 2. 类型定义
// 3. Props 和 Emits
// 4. 响应式数据
// 5. 计算属性
// 6. 监听器
// 7. 生命周期
// 8. 方法定义
// 9. 暴露的方法/属性
</script>
```

### Q: 错误处理的最佳实践是什么？
**A**:
```typescript
// ✅ 推荐的错误处理模式
const fetchUserData = async (userId: string): Promise<IUserInfo> => {
  try {
    validateUserId(userId);
    const response = await UserApi.getInfo(userId);
    return response.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new UserError('用户ID格式不正确', 'INVALID_USER_ID');
    }
    if (error instanceof NetworkError) {
      throw new UserError('网络连接失败', 'NETWORK_ERROR');
    }
    throw new UserError('获取用户信息失败', 'UNKNOWN_ERROR');
  }
};
```

## 🛠️ 代码质量工具配置

### ESLint 规则检查
```bash
# 检查所有文件
pnpm lint

# 自动修复可修复的问题
pnpm lint:fix

# 检查特定文件
pnpm eslint src/components/MyComponent.vue
```

### TypeScript 编译检查
```bash
# 类型检查
pnpm type-check

# 监听模式类型检查
pnpm type-check:watch
```

### 样式规范检查
```bash
# Stylelint 检查
pnpm stylelint "src/**/*.{vue,scss,css}"

# 自动修复样式问题
pnpm stylelint "src/**/*.{vue,scss,css}" --fix
```

## 🔧 快速修复常见问题

### 类型错误快速修复
```typescript
// 问题：Property 'xxx' does not exist on type
// 修复：完善接口定义
interface IApiResponse<T> {
  code: number;
  message: string;
  data: T;
  // 添加缺失的属性
  timestamp?: number;
  traceId?: string;
}

// 问题：Argument of type 'unknown' is not assignable
// 修复：使用类型守卫
function isUserInfo(obj: unknown): obj is IUserInfo {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

### Vue组件常见问题
```vue
<!-- 问题：v-for 缺少 key -->
<!-- 修复：添加唯一 key -->
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

<!-- 问题：事件处理器类型错误 -->
<!-- 修复：明确事件类型 -->
<template>
  <button @click="handleClick">点击</button>
</template>

<script setup lang="ts">
const handleClick = (event: MouseEvent): void => {
  // 处理点击事件
};
</script>
```

### API接口问题修复
```typescript
// 问题：缺少错误处理
// 修复：完善错误处理
const getUserList = async (params: IUserListParams) => {
  try {
    const response = await api.get('/users', { params });
    return response.data;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    throw handleApiError(error);
  }
};
```

## 📊 代码质量指标

### 可接受的质量标准
- **TypeScript 覆盖率**: ≥ 95%
- **ESLint 错误数**: 0
- **代码复杂度**: ≤ 10（单个函数）
- **函数长度**: ≤ 50 行
- **文件长度**: ≤ 500 行
- **嵌套深度**: ≤ 4 层

### 定期检查项目
```bash
# 全面代码质量检查脚本
#!/bin/bash
echo "🔍 执行代码质量检查..."

echo "1️⃣ TypeScript 类型检查"
pnpm type-check

echo "2️⃣ ESLint 规范检查"
pnpm lint

echo "3️⃣ Stylelint 样式检查"
pnpm stylelint "src/**/*.{vue,scss,css}"

echo "4️⃣ 单元测试"
pnpm test:unit

echo "5️⃣ 构建验证"
pnpm build

echo "✅ 代码质量检查完成"
```

通过遵循这些编码规范，可以确保代码的一致性、可读性和可维护性，为AI编程提供清晰的指导标准。
