# 代码审查 Agent

## 职责
负责代码质量检查、安全审查、性能优化建议和最佳实践验证，确保代码符合项目标准并提供改进建议。

## 🎯 审查原则

### 1. 质量优先
- **功能正确性**: 代码逻辑正确，满足业务需求
- **类型安全**: TypeScript类型定义完整准确
- **错误处理**: 完善的异常处理机制
- **边界条件**: 考虑各种边界情况

### 2. 性能导向
- **渲染性能**: 避免不必要的重渲染
- **内存管理**: 防止内存泄漏
- **网络优化**: 减少不必要的请求
- **包大小**: 控制打包体积

### 3. 安全第一
- **输入验证**: 严格的数据验证
- **XSS防护**: 防止跨站脚本攻击
- **权限控制**: 合理的权限验证
- **敏感信息**: 避免泄露敏感数据

## 📋 代码审查清单

### TypeScript 类型检查
```typescript
// ✅ 检查点：类型定义完整
interface IUserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
  avatar?: string; // 可选属性明确标识
}

// ❌ 问题：使用any类型
const userData: any = response.data; // 应该定义具体类型

// ✅ 改进：使用具体类型
const userData: IUserInfo = response.data;

// ❌ 问题：缺少null检查
const userName = user.name.toUpperCase(); // 可能报错

// ✅ 改进：添加null检查
const userName = user?.name?.toUpperCase() || '';

// ❌ 问题：类型断言过度使用
const element = document.getElementById('root') as HTMLElement;

// ✅ 改进：使用类型守卫
const element = document.getElementById('root');
if (element instanceof HTMLElement) {
  // 安全使用element
}
```

**检查要点**:
- [ ] 所有变量都有明确类型定义
- [ ] 避免使用`any`类型
- [ ] 接口定义完整且有注释
- [ ] 泛型使用合理
- [ ] 类型导入使用`type`关键字
- [ ] 可选属性正确标识
- [ ] 联合类型使用恰当

### Vue 组件检查
```vue
<!-- ✅ 检查点：模板结构清晰 -->
<template>
  <div class="user-profile">
    <!-- 条件渲染使用v-if -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="content">
      <!-- 列表渲染使用key -->
      <div v-for="user in userList" :key="user.id" class="user-item">
        {{ user.username }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ✅ 检查点：导入顺序规范
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { UserApi } from '@/api/modules/user';
import type { IUserInfo } from '@/interface/Api';

// ✅ 检查点：Props类型定义完整
interface Props {
  /** 用户ID */
  userId: string;
  /** 显示模式 */
  mode?: 'card' | 'list';
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'card',
});

// ✅ 检查点：事件定义清晰
interface Emits {
  (e: 'update', user: IUserInfo): void;
  (e: 'delete', userId: string): void;
}

const emit = defineEmits<Emits>();

// ❌ 问题：响应式数据类型不明确
const userInfo = ref(null); // 应该指定类型

// ✅ 改进：明确类型定义
const userInfo = ref<IUserInfo | null>(null);

// ❌ 问题：计算属性没有返回类型
const displayName = computed(() => {
  return userInfo.value?.username || '未知用户';
});

// ✅ 改进：添加返回类型
const displayName = computed((): string => {
  return userInfo.value?.username || '未知用户';
});

// ❌ 问题：异步函数缺少错误处理
const fetchUser = async () => {
  const response = await UserApi.getInfo(props.userId);
  userInfo.value = response.data;
};

// ✅ 改进：完善错误处理
const fetchUser = async (): Promise<void> => {
  try {
    loading.value = true;
    const response = await UserApi.getInfo(props.userId);
    userInfo.value = response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    ElMessage.error('获取用户信息失败');
  } finally {
    loading.value = false;
  }
};

// ✅ 检查点：生命周期使用合理
onMounted(() => {
  fetchUser();
});

// ✅ 检查点：监听器依赖明确
watch(
  () => props.userId,
  (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
      fetchUser();
    }
  }
);
</script>

<style scoped lang="scss">
// ✅ 检查点：样式组织规范
.user-profile {
  padding: 20px;
  
  .loading,
  .error {
    text-align: center;
    padding: 40px;
  }
  
  .error {
    color: #f56c6c;
  }
  
  .content {
    .user-item {
      padding: 12px;
      border-bottom: 1px solid #eee;
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
}
</style>
```

**检查要点**:
- [ ] Props和Emits类型定义完整
- [ ] 响应式数据类型明确
- [ ] 计算属性有返回类型
- [ ] 异步函数有错误处理
- [ ] 生命周期使用合理
- [ ] 监听器依赖明确
- [ ] 模板使用v-key
- [ ] 条件渲染逻辑清晰

### API 接口检查
```typescript
// ✅ 检查点：接口定义规范
export class UserApi {
  /**
   * 获取用户列表
   * @param params 查询参数
   * @returns Promise<用户列表响应>
   */
  static async getUserList(
    params: IUserListParams = {}
  ): Promise<IPaginationResponse<IUserInfo>> {
    // ✅ 检查点：参数验证
    if (params.page && params.page < 1) {
      throw new Error('页码必须大于0');
    }
    
    if (params.pageSize && (params.pageSize < 1 || params.pageSize > 100)) {
      throw new Error('每页大小必须在1-100之间');
    }
    
    try {
      const response = await instance.get('/users', { params });
      return response.data;
    } catch (error) {
      // ✅ 检查点：错误处理完善
      console.error('获取用户列表失败:', error);
      throw handleApiError(error);
    }
  }

  // ❌ 问题：缺少参数验证
  static async deleteUser(userId: string): Promise<void> {
    const response = await instance.delete(`/users/${userId}`);
    return response.data;
  }

  // ✅ 改进：添加参数验证
  static async deleteUser(userId: string): Promise<IResponse<void>> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('用户ID不能为空');
    }
    
    try {
      const response = await instance.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw handleApiError(error);
    }
  }
}
```

**检查要点**:
- [ ] 接口方法有完整的JSDoc注释
- [ ] 参数类型定义明确
- [ ] 返回值类型定义完整
- [ ] 参数验证完善
- [ ] 错误处理机制完整
- [ ] 异常情况考虑周全

### 状态管理检查
```typescript
// ✅ 检查点：Store定义规范
export const useUserStore = defineStore('user', () => {
  // ✅ 检查点：状态类型明确
  const token = ref<string>('');
  const userInfo = ref<IUserInfo | null>(null);
  const loading = ref<boolean>(false);

  // ✅ 检查点：计算属性类型明确
  const isLoggedIn = computed((): boolean => !!token.value);

  // ❌ 问题：异步操作缺少加载状态
  const login = async (credentials: ILoginRequest) => {
    const response = await UserApi.login(credentials);
    token.value = response.data.token;
    userInfo.value = response.data.userInfo;
  };

  // ✅ 改进：添加加载状态和错误处理
  const login = async (credentials: ILoginRequest): Promise<void> => {
    loading.value = true;
    
    try {
      const response = await UserApi.login(credentials);
      token.value = response.data.token;
      userInfo.value = response.data.userInfo;
      
      // 持久化存储
      localStorage.setItem('token', token.value);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // ✅ 检查点：清理操作完整
  const logout = async (): Promise<void> => {
    try {
      await UserApi.logout();
    } finally {
      // 确保状态被清理
      token.value = '';
      userInfo.value = null;
      localStorage.removeItem('token');
    }
  };

  return {
    // 状态
    token: readonly(token),
    userInfo: readonly(userInfo),
    loading: readonly(loading),
    // 计算属性
    isLoggedIn,
    // 动作
    login,
    logout,
  };
});
```

**检查要点**:
- [ ] 状态类型定义明确
- [ ] 计算属性有返回类型
- [ ] 异步操作有加载状态
- [ ] 错误处理完善
- [ ] 状态清理完整
- [ ] 持久化存储合理
- [ ] 状态只读暴露

## 🚀 性能优化检查

### 组件性能
```vue
<script setup lang="ts">
// ❌ 问题：每次渲染都创建新对象
const handleClick = () => {
  emit('click', { timestamp: Date.now() });
};

// ✅ 改进：使用useCallback优化
const handleClick = useCallback(() => {
  emit('click', { timestamp: Date.now() });
}, []);

// ❌ 问题：计算属性依赖过多
const expensiveComputed = computed(() => {
  return props.items
    .filter(item => item.active)
    .map(item => ({ ...item, processed: true }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

// ✅ 改进：拆分计算属性
const activeItems = computed(() => 
  props.items.filter(item => item.active)
);

const processedItems = computed(() =>
  activeItems.value.map(item => ({ ...item, processed: true }))
);

const sortedItems = computed(() =>
  processedItems.value.sort((a, b) => a.name.localeCompare(b.name))
);

// ❌ 问题：不必要的响应式数据
const config = reactive({
  apiUrl: 'https://api.example.com',
  timeout: 5000,
});

// ✅ 改进：使用常量
const CONFIG = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} as const;
</script>

<template>
  <!-- ❌ 问题：内联对象/函数 -->
  <div :style="{ color: 'red', fontSize: '14px' }">
    <button @click="() => handleDelete(item.id)">删除</button>
  </div>

  <!-- ✅ 改进：提取到计算属性/方法 -->
  <div :style="itemStyle">
    <button @click="handleDelete(item.id)">删除</button>
  </div>
</template>
```

**性能检查要点**:
- [ ] 避免在模板中使用内联对象/函数
- [ ] 合理使用计算属性缓存
- [ ] 避免不必要的响应式数据
- [ ] 大列表使用虚拟滚动
- [ ] 图片懒加载
- [ ] 组件懒加载

### 网络请求优化
```typescript
// ❌ 问题：重复请求
const fetchUserInfo = async (userId: string) => {
  const response = await UserApi.getInfo(userId);
  return response.data;
};

// ✅ 改进：请求缓存
const userCache = new Map<string, IUserInfo>();

const fetchUserInfo = async (userId: string): Promise<IUserInfo> => {
  // 检查缓存
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }
  
  const response = await UserApi.getInfo(userId);
  const userInfo = response.data;
  
  // 缓存结果
  userCache.set(userId, userInfo);
  
  return userInfo;
};

// ❌ 问题：串行请求
const loadPageData = async () => {
  const users = await UserApi.getUserList();
  const roles = await RoleApi.getRoleList();
  const permissions = await PermissionApi.getPermissionList();
  
  return { users, roles, permissions };
};

// ✅ 改进：并行请求
const loadPageData = async () => {
  const [users, roles, permissions] = await Promise.all([
    UserApi.getUserList(),
    RoleApi.getRoleList(),
    PermissionApi.getPermissionList(),
  ]);
  
  return { users: users.data, roles: roles.data, permissions: permissions.data };
};
```

## 🔒 安全检查

### 输入验证
```typescript
// ❌ 问题：缺少输入验证
const createUser = async (userData: any) => {
  const response = await UserApi.create(userData);
  return response.data;
};

// ✅ 改进：严格输入验证
const createUser = async (userData: ICreateUserRequest): Promise<IUserInfo> => {
  // 验证必填字段
  if (!userData.username || !userData.email || !userData.password) {
    throw new Error('用户名、邮箱和密码为必填项');
  }
  
  // 验证邮箱格式
  if (!ValidationUtils.isValidEmail(userData.email)) {
    throw new Error('邮箱格式不正确');
  }
  
  // 验证密码强度
  if (ValidationUtils.getPasswordStrength(userData.password) === 'weak') {
    throw new Error('密码强度不足');
  }
  
  // 清理输入数据
  const cleanData = {
    username: userData.username.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    roles: userData.roles || ['user'],
  };
  
  const response = await UserApi.create(cleanData);
  return response.data;
};
```

### XSS防护
```vue
<template>
  <!-- ❌ 问题：直接输出HTML -->
  <div v-html="userContent"></div>

  <!-- ✅ 改进：文本输出或使用DOMPurify -->
  <div>{{ userContent }}</div>
  <!-- 或者 -->
  <div v-html="sanitizedContent"></div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';

const props = defineProps<{
  userContent: string;
}>();

// 清理HTML内容
const sanitizedContent = computed(() => {
  return DOMPurify.sanitize(props.userContent);
});
</script>
```

### 权限控制
```typescript
// ✅ 检查点：权限验证
const checkPermission = (permission: string): boolean => {
  const userStore = useUserStore();
  return userStore.hasPermission(permission);
};

// 在组件中使用
const canEdit = computed(() => checkPermission('user:edit'));
const canDelete = computed(() => checkPermission('user:delete'));

// 在路由守卫中使用
router.beforeEach((to, from, next) => {
  const requiredPermission = to.meta.permission as string;
  
  if (requiredPermission && !checkPermission(requiredPermission)) {
    next('/403');
    return;
  }
  
  next();
});
```

## 📊 代码质量指标

### 复杂度检查
```typescript
// ❌ 问题：函数过于复杂
const processUserData = (users: IUserInfo[], filters: any) => {
  let result = users;
  
  if (filters.status) {
    result = result.filter(user => user.status === filters.status);
  }
  
  if (filters.role) {
    result = result.filter(user => user.roles.includes(filters.role));
  }
  
  if (filters.keyword) {
    result = result.filter(user => 
      user.username.includes(filters.keyword) || 
      user.email.includes(filters.keyword)
    );
  }
  
  if (filters.dateRange) {
    result = result.filter(user => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= filters.dateRange.start && 
             createdAt <= filters.dateRange.end;
    });
  }
  
  if (filters.sortBy) {
    result = result.sort((a, b) => {
      if (filters.sortBy === 'username') {
        return a.username.localeCompare(b.username);
      } else if (filters.sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }
  
  return result;
};

// ✅ 改进：拆分函数
const filterByStatus = (users: IUserInfo[], status?: string) => {
  return status ? users.filter(user => user.status === status) : users;
};

const filterByRole = (users: IUserInfo[], role?: string) => {
  return role ? users.filter(user => user.roles.includes(role)) : users;
};

const filterByKeyword = (users: IUserInfo[], keyword?: string) => {
  if (!keyword) return users;
  
  const lowerKeyword = keyword.toLowerCase();
  return users.filter(user => 
    user.username.toLowerCase().includes(lowerKeyword) || 
    user.email.toLowerCase().includes(lowerKeyword)
  );
};

const filterByDateRange = (users: IUserInfo[], dateRange?: { start: Date; end: Date }) => {
  if (!dateRange) return users;
  
  return users.filter(user => {
    const createdAt = new Date(user.createdAt);
    return createdAt >= dateRange.start && createdAt <= dateRange.end;
  });
};

const sortUsers = (users: IUserInfo[], sortBy?: string) => {
  if (!sortBy) return users;
  
  return [...users].sort((a, b) => {
    switch (sortBy) {
      case 'username':
        return a.username.localeCompare(b.username);
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });
};

const processUserData = (users: IUserInfo[], filters: IUserFilters): IUserInfo[] => {
  let result = users;
  
  result = filterByStatus(result, filters.status);
  result = filterByRole(result, filters.role);
  result = filterByKeyword(result, filters.keyword);
  result = filterByDateRange(result, filters.dateRange);
  result = sortUsers(result, filters.sortBy);
  
  return result;
};
```

### 测试覆盖率检查
```typescript
// ✅ 检查点：关键功能有测试
describe('UserService', () => {
  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'StrongPassword123!',
        roles: ['user'],
      };
      
      const result = await UserService.createUser(userData);
      
      expect(result).toBeDefined();
      expect(result.username).toBe(userData.username);
    });
    
    it('应该在邮箱格式错误时抛出异常', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'StrongPassword123!',
        roles: ['user'],
      };
      
      await expect(UserService.createUser(userData)).rejects.toThrow('邮箱格式不正确');
    });
  });
});
```

## 📋 审查报告模板

### 代码审查报告
```markdown
## 代码审查报告

**审查文件**: src/components/UserProfile/index.vue
**审查时间**: 2024-01-01
**审查者**: AI Assistant

### 🎯 总体评价
- **质量等级**: B+ (良好)
- **主要问题**: 类型定义不完整，错误处理不够完善
- **建议**: 优化类型定义，增强错误处理

### ✅ 优点
1. 组件结构清晰，职责单一
2. 使用了Composition API
3. 样式组织规范

### ❌ 问题清单
1. **类型安全** (高优先级)
   - 第25行：`userInfo`缺少类型定义
   - 第38行：计算属性缺少返回类型

2. **错误处理** (中优先级)
   - 第45行：`fetchUserInfo`缺少try-catch
   - 第52行：网络错误未向用户提示

3. **性能优化** (低优先级)
   - 第18行：可以使用`computed`缓存复杂计算

### 🔧 修改建议
```typescript
// 修改前
const userInfo = ref(null);

// 修改后
const userInfo = ref<IUserInfo | null>(null);
```

### 📊 质量指标
- 类型覆盖率: 75%
- 错误处理覆盖率: 60%
- 测试覆盖率: 0%
- 复杂度: 低

### 🎯 后续行动
1. 完善类型定义
2. 增加错误处理
3. 编写单元测试
```

通过系统化的代码审查，可以确保代码质量持续改进，为项目的长期维护提供保障。
