# API开发规范

## 职责
专门负责API接口开发指导，聚焦API模块定义、接口设计、类型定义和最佳实践。

## 🎯 API设计原则

### 1. RESTful设计原则
- **资源导向**: URL表示资源，HTTP方法表示操作
- **统一接口**: 使用标准的HTTP方法和状态码
- **类型安全**: 完整的TypeScript类型定义

### 2. 接口契约原则
- **强类型**: 所有接口都有完整的TypeScript类型定义
- **明确定义**: 请求参数和响应格式明确定义
- **类型复用**: 通过接口继承减少重复定义

### 3. 模块化原则
- **业务划分**: 按业务模块组织API
- **路径集中**: API路径集中管理
- **职责单一**: 每个API服务只负责一个业务领域

## 📁 API架构设计

### 目录结构
```
src/api/
├── index.ts                    # API统一导出
├── instance.ts                 # HTTP客户端实例(已封装好)
└── modules/                    # API模块
    ├── login.ts               # 登录相关接口
    ├── user.ts                # 用户管理接口
    └── system.ts              # 系统配置接口
```

## 📋 API模块开发规范

### 1. 模块结构模板
```typescript
// api/modules/login.ts
import { PROXY_URI } from '@/constants';
import AxiosInstance from '../instance';

// ==================== API路径字典 ====================
const Dict = {
  login: `${PROXY_URI.API}/admin/login`,
  logout: `${PROXY_URI.API}/admin/logout`,
} as const;

// ==================== 类型定义 ====================
/**
 * 登录参数接口
 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  /** 访问令牌 */
  token: string;
}

// ==================== API服务定义 ====================
/**
 * 登录服务API
 */
const LoginService = {
  /**
   * 用户登录
   */
  login(data: LoginRequest) {
    return AxiosInstance.post<LoginResponse>(Dict.login, {
      username: data.username,
      password: data.password,
    });
  },

  /**
   * 用户登出
   */
  logout() {
    return AxiosInstance.post(Dict.logout);
  },
};

export default LoginService;
```

### 2. 用户管理API示例
```typescript
// api/modules/user.ts
import { PROXY_URI } from '@/constants';
import AxiosInstance from '../instance';

const Dict = {
  userList: `${PROXY_URI.API}/admin/users`,
  userDetail: `${PROXY_URI.API}/admin/users/:id`,
  userCreate: `${PROXY_URI.API}/admin/users`,
  userUpdate: `${PROXY_URI.API}/admin/users/:id`,
  userDelete: `${PROXY_URI.API}/admin/users/:id`,
} as const;

/**
 * 用户信息接口
 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 角色列表 */
  roles: string[];
  /** 创建时间 */
  createdAt: string;
}

/**
 * 用户列表查询参数
 */
export interface UserListParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 搜索关键词 */
  keyword?: string;
}

/**
 * 分页响应接口
 */
export interface PaginationResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  pageSize: number;
}

/**
 * 用户服务API
 */
const UserService = {
  /**
   * 获取用户列表
   */
  getUserList(params: UserListParams) {
    return AxiosInstance.get<PaginationResponse<UserInfo>>(Dict.userList, { params });
  },

  /**
   * 获取用户详情
   */
  getUserDetail(id: string) {
    return AxiosInstance.get<UserInfo>(Dict.userDetail.replace(':id', id));
  },

  /**
   * 创建用户
   */
  createUser(data: Omit<UserInfo, 'id' | 'createdAt'>) {
    return AxiosInstance.post<UserInfo>(Dict.userCreate, data);
  },

  /**
   * 更新用户
   */
  updateUser(id: string, data: Partial<UserInfo>) {
    return AxiosInstance.put<UserInfo>(Dict.userUpdate.replace(':id', id), data);
  },

  /**
   * 删除用户
   */
  deleteUser(id: string) {
    return AxiosInstance.delete(Dict.userDelete.replace(':id', id));
  },
};

export default UserService;
```

## 📖 API开发最佳实践

### 1. 类型定义规范
```typescript
// ✅ 正确：完整的类型定义
export interface UserListParams {
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
  /** 搜索关键词 */
  keyword?: string;
}

export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
}

// ❌ 错误：缺少类型定义
const getUserList = (params: any) => {
  return axios.get('/users', { params });
};
```

### 2. 路径管理规范
```typescript
// ✅ 正确：集中管理API路径
const Dict = {
  login: `${PROXY_URI.API}/admin/login`,
  logout: `${PROXY_URI.API}/admin/logout`,
  userList: `${PROXY_URI.API}/admin/users`,
} as const;

// 使用路径
return AxiosInstance.post<LoginResponse>(Dict.login, data);

// ❌ 错误：硬编码路径
return AxiosInstance.post('/api/admin/login', data);
```

### 3. 接口文档注释
```typescript
/**
 * 用户服务API
 * 提供用户管理相关的接口调用
 */
const UserService = {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @param params.page 页码，默认1
   * @param params.pageSize 每页大小，默认10
   * @param params.keyword 搜索关键词
   */
  getUserList(params: UserListParams) {
    return AxiosInstance.get<PaginationResponse<UserInfo>>(Dict.userList, { params });
  },
};
```

### 4. 参数处理规范
```typescript
// ✅ 正确：参数解构和验证
const LoginService = {
  login(username: string, password: string) {
    // 参数验证可在这里或Store中进行
    return AxiosInstance.post<LoginResponse>(Dict.login, {
      username,
      password,
    });
  },
};

// ✅ 正确：URL参数替换
const UserService = {
  getUserDetail(id: string) {
    return AxiosInstance.get<UserInfo>(Dict.userDetail.replace(':id', id));
  },
};
```

### 5. 泛型使用规范
```typescript
// ✅ 正确：使用泛型指定响应类型
return AxiosInstance.post<LoginResponse>(Dict.login, data);
return AxiosInstance.get<UserInfo>(Dict.userDetail);
return AxiosInstance.get<PaginationResponse<UserInfo>>(Dict.userList);

// ❌ 错误：不指定响应类型
return AxiosInstance.post(Dict.login, data);
```

## 📂 HTTP客户端实例使用

### 实例已封装（src/api/instance.ts）
项目已提供封装好的 `AxiosInstance`，直接使用即可：

```typescript
import AxiosInstance from '../instance';

// 已包含以下功能：
// ✅ 自动添加认证Token
// ✅ 统一的错误处理
// ✅ 请求/响应拦截器
// ✅ 超时配置
// ✅ 请求取消

// 直接使用封装好的方法
AxiosInstance.get<T>(url, config);
AxiosInstance.post<T>(url, data, config);
AxiosInstance.put<T>(url, data, config);
AxiosInstance.delete<T>(url, config);
```

**注意**: 通常不需要修改 `instance.ts`，聚焦于API接口定义即可。

## 📋 API开发快速检查清单

### 接口定义检查
- [ ] API路径使用Dict集中管理
- [ ] 请求参数有完整的TypeScript接口定义
- [ ] 响应数据有明确的类型定义
- [ ] 使用泛型指定响应类型
- [ ] 每个接口有详细的JSDoc说明

### 类型安全检查
- [ ] 所有接口都有明确的类型定义
- [ ] 避免使用any类型
- [ ] 接口定义有完整的注释
- [ ] 复用通用类型（如PaginationResponse）

### 命名规范检查
- [ ] API路径字典使用Dict命名
- [ ] 服务对象使用Service后缀
- [ ] 接口使用清晰的动词+名词命名

## ❓ 常见问题

### Q: 如何组织API模块？
**A**: 按业务模块划分：
```
src/api/modules/
├── login.ts      # 登录相关
├── user.ts       # 用户管理
├── role.ts       # 角色管理
└── system.ts     # 系统配置
```

### Q: 如何定义通用的分页响应？
**A**:
```typescript
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 使用
return AxiosInstance.get<PaginationResponse<UserInfo>>(url);
```

### Q: 如何处理URL参数？
**A**: 
```typescript
const Dict = {
  userDetail: `${PROXY_URI.API}/admin/users/:id`,
};

// 替换参数
getUserDetail(id: string) {
  return AxiosInstance.get<UserInfo>(Dict.userDetail.replace(':id', id));
}
```

### Q: 什么时候需要修改instance.ts？
**A**: 通常不需要修改，以下情况除外：
- 需要添加全局的请求/响应拦截逻辑
- 需要修改全局的超时配置
- 需要添加特殊的错误处理

日常开发聚焦于API接口定义即可。

## 🎯 开发流程

1. **定义类型**: 先定义请求参数和响应类型
2. **定义路径**: 在Dict中添加API路径
3. **实现接口**: 在Service对象中实现API方法
4. **添加注释**: 为接口添加完整的JSDoc注释
5. **导出服务**: export default Service

通过遵循这些API开发规范，可以构建出清晰、类型安全、易维护的API接口层。
