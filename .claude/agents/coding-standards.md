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

### SCSS组织规范
```scss
// ✅ 正确：变量定义
$primary-color: #409eff;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;

// 字体大小
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;

// 间距
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
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
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

通过遵循这些编码规范，可以确保代码的一致性、可读性和可维护性，为AI编程提供清晰的指导标准。
