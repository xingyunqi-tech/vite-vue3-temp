# API开发 Agent

## 职责
专门负责API接口开发指导，包括接口设计、请求封装、错误处理、类型定义和最佳实践，为AI生成高质量的API代码提供专业指导。

## 🎯 API设计原则

### 1. RESTful设计原则
- **资源导向**: URL表示资源，HTTP方法表示操作
- **统一接口**: 使用标准的HTTP方法和状态码
- **无状态**: 每个请求包含处理所需的所有信息
- **分层系统**: 支持缓存、负载均衡等中间层

### 2. 类型安全原则
- **强类型**: 所有接口都有完整的TypeScript类型定义
- **接口契约**: 请求和响应格式明确定义
- **类型复用**: 通过泛型和继承减少重复定义
- **运行时验证**: 关键数据进行运行时类型检查

### 3. 错误处理原则
- **统一格式**: 所有错误响应使用统一格式
- **分类处理**: 按错误类型进行分类处理
- **用户友好**: 提供用户可理解的错误信息
- **日志记录**: 详细记录错误信息用于调试

## 📁 API架构设计

### 目录结构
```
src/api/
├── index.ts                    # API统一导出
├── instance.ts                 # Axios实例配置
├── types.ts                    # 通用类型定义
├── interceptors/               # 拦截器
│   ├── request.ts             # 请求拦截器
│   ├── response.ts            # 响应拦截器
│   └── error.ts               # 错误处理拦截器
├── modules/                    # API模块
│   ├── auth.ts                # 认证相关接口
│   ├── user.ts                # 用户管理接口
│   ├── role.ts                # 角色管理接口
│   └── system.ts              # 系统配置接口
└── utils/                      # API工具函数
    ├── cache.ts               # 请求缓存
    ├── retry.ts               # 重试机制
    └── transform.ts           # 数据转换
```

## 🔧 Axios实例配置

### 基础配置
```typescript
// api/instance.ts
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/store/modules/user';

/**
 * API配置接口
 */
interface IApiConfig {
  /** 基础URL */
  baseURL: string;
  /** 请求超时时间 */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 重试延迟 */
  retryDelay: number;
}

/**
 * 默认API配置
 */
const DEFAULT_CONFIG: IApiConfig = {
  baseURL: import.meta.env.VITE_APP_API_BASE_URL || '/api',
  timeout: 10 * 60 * 1000, // 10分钟
  retryCount: 3,
  retryDelay: 1000,
};

/**
 * 创建Axios实例
 */
const createInstance = (config: Partial<IApiConfig> = {}): AxiosInstance => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const instance = axios.create({
    baseURL: finalConfig.baseURL,
    timeout: finalConfig.timeout,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  });

  // 添加请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 添加认证token
      const userStore = useUserStore();
      if (userStore.token) {
        config.headers.Authorization = `Bearer ${userStore.token}`;
      }

      // 添加请求ID用于追踪
      config.headers['X-Request-ID'] = generateRequestId();

      // 添加时间戳防止缓存
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
      }

      return config;
    },
    (error) => {
      console.error('请求拦截器错误:', error);
      return Promise.reject(error);
    }
  );

  // 添加响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const { data } = response;
      
      // 检查业务状态码
      if (data.code !== undefined && data.code !== 200) {
        const error = new ApiError(data.message || '请求失败', data.code, response.status);
        return Promise.reject(error);
      }

      return response;
    },
    async (error) => {
      const { config, response } = error;

      // 处理网络错误
      if (!response) {
        ElMessage.error('网络连接失败，请检查网络设置');
        return Promise.reject(new ApiError('网络连接失败', 'NETWORK_ERROR', 0));
      }

      // 处理HTTP状态码错误
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Token失效，清除用户信息并跳转登录
          const userStore = useUserStore();
          await userStore.logout();
          window.location.href = '/login';
          break;
          
        case 403:
          ElMessage.error('权限不足');
          break;
          
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
          
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试');
          break;
          
        case 500:
          ElMessage.error('服务器内部错误');
          break;
          
        default:
          ElMessage.error(data?.message || '请求失败');
      }

      // 重试机制
      if (shouldRetry(error, config)) {
        return retryRequest(instance, config, finalConfig);
      }

      return Promise.reject(new ApiError(
        data?.message || '请求失败',
        data?.code || 'HTTP_ERROR',
        status
      ));
    }
  );

  return instance;
};

/**
 * 自定义API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string | number,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 生成请求ID
 */
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 判断是否应该重试
 */
const shouldRetry = (error: any, config: AxiosRequestConfig): boolean => {
  // 不重试的情况
  if (config.method !== 'get') return false;
  if (error.response?.status === 401) return false;
  if (error.response?.status === 403) return false;
  if (error.response?.status === 404) return false;
  
  // 网络错误或5xx错误可以重试
  return !error.response || error.response.status >= 500;
};

/**
 * 重试请求
 */
const retryRequest = async (
  instance: AxiosInstance,
  config: AxiosRequestConfig,
  apiConfig: IApiConfig
): Promise<any> => {
  const retryCount = config.metadata?.retryCount || 0;
  
  if (retryCount >= apiConfig.retryCount) {
    throw new ApiError('请求重试次数超限', 'RETRY_LIMIT_EXCEEDED', 0);
  }

  // 延迟重试
  await new Promise(resolve => setTimeout(resolve, apiConfig.retryDelay));

  // 更新重试次数
  config.metadata = { ...config.metadata, retryCount: retryCount + 1 };

  return instance.request(config);
};

// 创建默认实例
const instance = createInstance();

export default instance;
export { createInstance };
```

## 📋 类型定义规范

### 通用类型定义
```typescript
// api/types.ts

/**
 * API响应基础接口
 */
export interface IApiResponse<T = any> {
  /** 响应码，200表示成功 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 响应时间戳 */
  timestamp?: number;
  /** 请求追踪ID */
  traceId?: string;
}

/**
 * 分页响应接口
 */
export interface IPaginationResponse<T = any> extends IApiResponse<T[]> {
  /** 总数量 */
  total: number;
  /** 每页大小 */
  pageSize: number;
  /** 当前页码 */
  current: number;
  /** 总页数 */
  pages: number;
}

/**
 * 分页请求参数
 */
export interface IPaginationParams {
  /** 页码，从1开始 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 搜索参数接口
 */
export interface ISearchParams extends IPaginationParams {
  /** 搜索关键词 */
  keyword?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
}

/**
 * 文件上传响应
 */
export interface IFileUploadResponse {
  /** 文件ID */
  id: string;
  /** 文件名 */
  filename: string;
  /** 文件URL */
  url: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME类型 */
  mimeType: string;
  /** 上传时间 */
  uploadTime: string;
}

/**
 * 批量操作响应
 */
export interface IBatchOperationResponse {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 失败详情 */
  failures?: Array<{
    id: string;
    reason: string;
  }>;
}
```

### 业务类型定义
```typescript
// interface/user.ts

/**
 * 用户基本信息
 */
export interface IUserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 手机号 */
  phone?: string;
  /** 用户头像 */
  avatar?: string;
  /** 用户角色 */
  roles: string[];
  /** 用户状态 */
  status: 'active' | 'inactive' | 'pending' | 'banned';
  /** 最后登录时间 */
  lastLoginTime?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户登录请求
 */
export interface ILoginRequest {
  /** 用户名或邮箱 */
  username: string;
  /** 密码 */
  password: string;
  /** 验证码 */
  captcha?: string;
  /** 记住我 */
  rememberMe?: boolean;
}

/**
 * 用户登录响应
 */
export interface ILoginResponse {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 令牌类型 */
  tokenType: string;
  /** 过期时间（秒） */
  expiresIn: number;
  /** 用户信息 */
  userInfo: IUserInfo;
  /** 用户权限 */
  permissions: string[];
}

/**
 * 用户创建请求
 */
export interface ICreateUserRequest {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 手机号 */
  phone?: string;
  /** 用户角色 */
  roles: string[];
  /** 用户状态 */
  status?: IUserInfo['status'];
}

/**
 * 用户更新请求
 */
export interface IUpdateUserRequest {
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 用户角色 */
  roles?: string[];
  /** 用户状态 */
  status?: IUserInfo['status'];
}

/**
 * 用户列表查询参数
 */
export interface IUserListParams extends ISearchParams {
  /** 用户状态筛选 */
  status?: IUserInfo['status'];
  /** 角色筛选 */
  roles?: string[];
  /** 部门筛选 */
  departmentId?: string;
}

/**
 * 修改密码请求
 */
export interface IChangePasswordRequest {
  /** 旧密码 */
  oldPassword: string;
  /** 新密码 */
  newPassword: string;
}

/**
 * 重置密码请求
 */
export interface IResetPasswordRequest {
  /** 邮箱或用户名 */
  identifier: string;
  /** 验证码 */
  verificationCode: string;
  /** 新密码 */
  newPassword: string;
}
```

## 🌐 API模块开发

### 用户管理API
```typescript
// api/modules/user.ts
import instance from '../instance';
import type {
  IUserInfo,
  ILoginRequest,
  ILoginResponse,
  ICreateUserRequest,
  IUpdateUserRequest,
  IUserListParams,
  IChangePasswordRequest,
  IResetPasswordRequest,
  IApiResponse,
  IPaginationResponse,
  IBatchOperationResponse,
} from '@/interface';

/**
 * 用户管理API类
 */
export class UserApi {
  /**
   * 用户登录
   * @param credentials 登录凭据
   */
  static async login(credentials: ILoginRequest): Promise<IApiResponse<ILoginResponse>> {
    // 参数验证
    if (!credentials.username || !credentials.password) {
      throw new Error('用户名和密码不能为空');
    }

    const response = await instance.post('/auth/login', credentials);
    return response.data;
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<IApiResponse<void>> {
    const response = await instance.post('/auth/logout');
    return response.data;
  }

  /**
   * 刷新令牌
   * @param refreshToken 刷新令牌
   */
  static async refreshToken(refreshToken: string): Promise<IApiResponse<ILoginResponse>> {
    if (!refreshToken) {
      throw new Error('刷新令牌不能为空');
    }

    const response = await instance.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<IApiResponse<IUserInfo>> {
    const response = await instance.get('/user/profile');
    return response.data;
  }

  /**
   * 获取用户列表
   * @param params 查询参数
   */
  static async getUserList(
    params: IUserListParams = {}
  ): Promise<IPaginationResponse<IUserInfo>> {
    // 参数验证和处理
    const queryParams = {
      page: Math.max(1, params.page || 1),
      pageSize: Math.min(100, Math.max(1, params.pageSize || 10)),
      ...params,
    };

    const response = await instance.get('/users', { params: queryParams });
    return response.data;
  }

  /**
   * 获取用户详情
   * @param userId 用户ID
   */
  static async getUserById(userId: string): Promise<IApiResponse<IUserInfo>> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    const response = await instance.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * 创建用户
   * @param userData 用户数据
   */
  static async createUser(userData: ICreateUserRequest): Promise<IApiResponse<IUserInfo>> {
    // 参数验证
    this.validateUserData(userData);

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
    userData: IUpdateUserRequest
  ): Promise<IApiResponse<IUserInfo>> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    // 过滤空值
    const filteredData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined && value !== null)
    );

    const response = await instance.put(`/users/${userId}`, filteredData);
    return response.data;
  }

  /**
   * 删除用户
   * @param userId 用户ID
   */
  static async deleteUser(userId: string): Promise<IApiResponse<void>> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    const response = await instance.delete(`/users/${userId}`);
    return response.data;
  }

  /**
   * 批量删除用户
   * @param userIds 用户ID列表
   */
  static async batchDeleteUsers(userIds: string[]): Promise<IApiResponse<IBatchOperationResponse>> {
    if (!userIds || userIds.length === 0) {
      throw new Error('用户ID列表不能为空');
    }

    const response = await instance.delete('/users/batch', { data: { userIds } });
    return response.data;
  }

  /**
   * 修改密码
   * @param userId 用户ID
   * @param passwordData 密码数据
   */
  static async changePassword(
    userId: string,
    passwordData: IChangePasswordRequest
  ): Promise<IApiResponse<void>> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    if (!passwordData.oldPassword || !passwordData.newPassword) {
      throw new Error('旧密码和新密码不能为空');
    }

    const response = await instance.put(`/users/${userId}/password`, passwordData);
    return response.data;
  }

  /**
   * 重置密码
   * @param resetData 重置数据
   */
  static async resetPassword(resetData: IResetPasswordRequest): Promise<IApiResponse<void>> {
    if (!resetData.identifier || !resetData.verificationCode || !resetData.newPassword) {
      throw new Error('所有字段都不能为空');
    }

    const response = await instance.post('/auth/reset-password', resetData);
    return response.data;
  }

  /**
   * 启用/禁用用户
   * @param userId 用户ID
   * @param enabled 是否启用
   */
  static async toggleUserStatus(
    userId: string,
    enabled: boolean
  ): Promise<IApiResponse<IUserInfo>> {
    if (!userId) {
      throw new Error('用户ID不能为空');
    }

    const response = await instance.patch(`/users/${userId}/status`, {
      status: enabled ? 'active' : 'inactive',
    });
    return response.data;
  }

  /**
   * 验证用户数据
   * @private
   */
  private static validateUserData(userData: ICreateUserRequest): void {
    if (!userData.username) {
      throw new Error('用户名不能为空');
    }

    if (!userData.email) {
      throw new Error('邮箱不能为空');
    }

    if (!userData.password) {
      throw new Error('密码不能为空');
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('邮箱格式不正确');
    }

    // 密码强度验证
    if (userData.password.length < 8) {
      throw new Error('密码长度不能少于8位');
    }

    // 用户名格式验证
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(userData.username)) {
      throw new Error('用户名只能包含字母、数字和下划线，长度3-20位');
    }
  }
}

export default UserApi;
```

### 文件上传API
```typescript
// api/modules/file.ts
import instance from '../instance';
import type { IApiResponse, IFileUploadResponse } from '@/interface';

/**
 * 文件管理API类
 */
export class FileApi {
  /**
   * 上传单个文件
   * @param file 文件对象
   * @param options 上传选项
   */
  static async uploadFile(
    file: File,
    options: {
      /** 文件类型 */
      type?: 'avatar' | 'document' | 'image';
      /** 上传进度回调 */
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<IApiResponse<IFileUploadResponse>> {
    if (!file) {
      throw new Error('文件不能为空');
    }

    // 文件大小验证（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过10MB');
    }

    // 文件类型验证
    const allowedTypes = {
      avatar: ['image/jpeg', 'image/png', 'image/gif'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    };

    if (options.type && allowedTypes[options.type]) {
      if (!allowedTypes[options.type].includes(file.type)) {
        throw new Error(`不支持的文件类型: ${file.type}`);
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    if (options.type) {
      formData.append('type', options.type);
    }

    const response = await instance.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @param options 上传选项
   */
  static async uploadFiles(
    files: File[],
    options: {
      type?: 'avatar' | 'document' | 'image';
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<IApiResponse<IFileUploadResponse[]>> {
    if (!files || files.length === 0) {
      throw new Error('文件列表不能为空');
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    if (options.type) {
      formData.append('type', options.type);
    }

    const response = await instance.post('/files/upload/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * 删除文件
   * @param fileId 文件ID
   */
  static async deleteFile(fileId: string): Promise<IApiResponse<void>> {
    if (!fileId) {
      throw new Error('文件ID不能为空');
    }

    const response = await instance.delete(`/files/${fileId}`);
    return response.data;
  }

  /**
   * 获取文件信息
   * @param fileId 文件ID
   */
  static async getFileInfo(fileId: string): Promise<IApiResponse<IFileUploadResponse>> {
    if (!fileId) {
      throw new Error('文件ID不能为空');
    }

    const response = await instance.get(`/files/${fileId}`);
    return response.data;
  }
}

export default FileApi;
```

## 🔄 请求缓存和优化

### 请求缓存实现
```typescript
// api/utils/cache.ts
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 缓存配置接口
 */
interface ICacheConfig {
  /** 缓存时间（毫秒） */
  ttl: number;
  /** 最大缓存数量 */
  maxSize: number;
  /** 是否启用缓存 */
  enabled: boolean;
}

/**
 * 缓存项接口
 */
interface ICacheItem {
  /** 缓存数据 */
  data: any;
  /** 过期时间 */
  expireTime: number;
  /** 创建时间 */
  createTime: number;
}

/**
 * API请求缓存类
 */
export class ApiCache {
  private cache = new Map<string, ICacheItem>();
  private config: ICacheConfig;

  constructor(config: Partial<ICacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 默认5分钟
      maxSize: 100, // 默认最大100个缓存项
      enabled: true,
      ...config,
    };
  }

  /**
   * 生成缓存键
   */
  private generateKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  /**
   * 获取缓存
   */
  get(config: AxiosRequestConfig): AxiosResponse | null {
    if (!this.config.enabled) return null;

    const key = this.generateKey(config);
    const item = this.cache.get(key);

    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.expireTime) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 设置缓存
   */
  set(config: AxiosRequestConfig, response: AxiosResponse): void {
    if (!this.config.enabled) return;

    // 只缓存GET请求
    if (config.method !== 'get') return;

    const key = this.generateKey(config);
    const now = Date.now();

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: response,
      expireTime: now + this.config.ttl,
      createTime: now,
    });
  }

  /**
   * 清除过期缓存
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.createTime < oldestTime) {
        oldestTime = item.createTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除指定模式的缓存
   */
  clearByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// 创建全局缓存实例
export const apiCache = new ApiCache();
```

### 请求去重
```typescript
// api/utils/deduplication.ts
import type { AxiosRequestConfig } from 'axios';

/**
 * 请求去重管理器
 */
export class RequestDeduplication {
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * 生成请求键
   */
  private generateKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  /**
   * 添加请求
   */
  addRequest<T>(config: AxiosRequestConfig, requestPromise: Promise<T>): Promise<T> {
    const key = this.generateKey(config);
    
    // 如果已有相同请求在进行中，返回该请求的Promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // 添加新请求
    this.pendingRequests.set(key, requestPromise);

    // 请求完成后清除
    requestPromise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return requestPromise;
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    this.pendingRequests.clear();
  }
}

// 创建全局去重实例
export const requestDeduplication = new RequestDeduplication();
```

## 📊 API性能监控

### 性能监控实现
```typescript
// api/utils/monitor.ts

/**
 * API性能指标接口
 */
interface IApiMetrics {
  /** 请求URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 响应时间（毫秒） */
  duration: number;
  /** 响应状态码 */
  statusCode: number;
  /** 请求大小（字节） */
  requestSize: number;
  /** 响应大小（字节） */
  responseSize: number;
  /** 请求时间戳 */
  timestamp: number;
  /** 是否成功 */
  success: boolean;
}

/**
 * API性能监控类
 */
export class ApiMonitor {
  private metrics: IApiMetrics[] = [];
  private maxMetrics = 1000; // 最大保存指标数量

  /**
   * 记录API指标
   */
  recordMetrics(
    config: AxiosRequestConfig,
    response: AxiosResponse,
    startTime: number
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metrics: IApiMetrics = {
      url: config.url || '',
      method: config.method || 'GET',
      duration,
      statusCode: response.status,
      requestSize: this.calculateSize(config.data),
      responseSize: this.calculateSize(response.data),
      timestamp: startTime,
      success: response.status >= 200 && response.status < 300,
    };

    this.addMetrics(metrics);
  }

  /**
   * 记录错误指标
   */
  recordError(config: AxiosRequestConfig, error: any, startTime: number): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metrics: IApiMetrics = {
      url: config.url || '',
      method: config.method || 'GET',
      duration,
      statusCode: error.response?.status || 0,
      requestSize: this.calculateSize(config.data),
      responseSize: 0,
      timestamp: startTime,
      success: false,
    };

    this.addMetrics(metrics);
  }

  /**
   * 添加指标
   */
  private addMetrics(metrics: IApiMetrics): void {
    this.metrics.push(metrics);

    // 保持指标数量在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * 计算数据大小
   */
  private calculateSize(data: any): number {
    if (!data) return 0;
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * 获取性能统计
   */
  getStatistics(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    slowestRequest: IApiMetrics | null;
    fastestRequest: IApiMetrics | null;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        slowestRequest: null,
        fastestRequest: null,
      };
    }

    const successCount = this.metrics.filter(m => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const sortedByDuration = [...this.metrics].sort((a, b) => a.duration - b.duration);

    return {
      totalRequests: this.metrics.length,
      successRate: (successCount / this.metrics.length) * 100,
      averageResponseTime: totalDuration / this.metrics.length,
      slowestRequest: sortedByDuration[sortedByDuration.length - 1],
      fastestRequest: sortedByDuration[0],
    };
  }

  /**
   * 清除指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

// 创建全局监控实例
export const apiMonitor = new ApiMonitor();
```

## 🧪 API测试策略

### 单元测试示例
```typescript
// tests/api/user.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { UserApi } from '@/api/modules/user';
import type { IUserInfo, ILoginRequest } from '@/interface';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('UserApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('应该成功登录并返回用户信息', async () => {
      const loginRequest: ILoginRequest = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        data: {
          code: 200,
          message: '登录成功',
          data: {
            accessToken: 'mock-token',
            userInfo: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
            },
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await UserApi.login(loginRequest);

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', loginRequest);
      expect(result.code).toBe(200);
      expect(result.data.accessToken).toBe('mock-token');
    });

    it('应该在用户名为空时抛出错误', async () => {
      const loginRequest: ILoginRequest = {
        username: '',
        password: 'password123',
      };

      await expect(UserApi.login(loginRequest)).rejects.toThrow('用户名和密码不能为空');
    });
  });

  describe('getUserList', () => {
    it('应该返回用户列表', async () => {
      const mockUsers: IUserInfo[] = [
        {
          id: '1',
          username: 'user1',
          email: 'user1@example.com',
          roles: ['user'],
          status: 'active',
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01',
        },
      ];

      const mockResponse = {
        data: {
          code: 200,
          message: '获取成功',
          data: mockUsers,
          total: 1,
          current: 1,
          pageSize: 10,
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await UserApi.getUserList({ page: 1, pageSize: 10 });

      expect(mockedAxios.get).toHaveBeenCalledWith('/users', {
        params: { page: 1, pageSize: 10 },
      });
      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(1);
    });
  });
});
```

通过遵循这些API开发规范和最佳实践，可以构建出高质量、可维护、高性能的API接口层，为前端应用提供稳定可靠的数据服务。
