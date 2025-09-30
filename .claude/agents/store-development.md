# Store状态管理规范

## 职责
专门负责Pinia状态管理开发指导，包括Store设计原则、状态组织、最佳实践和性能优化。

## 🎯 Store设计原则

### 1. 单一职责原则
- **模块化**: 每个Store负责一个业务领域
- **职责清晰**: State、Getters、Actions职责分明
- **避免冗余**: 不同Store间避免状态重复

### 2. 类型安全原则
- **完整类型**: 所有状态都有明确的TypeScript类型
- **类型推导**: 充分利用TypeScript的类型推导
- **避免any**: 不使用any类型

### 3. 性能优化原则
- **按需持久化**: 只持久化必要的状态
- **计算属性**: 使用computed缓存派生状态
- **避免深层嵌套**: State结构扁平化

## 📁 Store架构设计

### 目录结构
```
src/store/
├── index.ts                    # Store统一导出
└── modules/                    # Store模块
    ├── user.ts                # 用户状态
    ├── global.ts              # 全局状态
    └── app.ts                 # 应用状态
```

## 🛠️ Store开发模板

### 用户Store示例
```typescript
// store/modules/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import LoginService from '@/api/modules/login';

/**
 * 用户状态管理Store
 * 管理用户登录状态、token、角色等信息
 */
export const useUserStore = defineStore(
  'user',
  () => {
    // ==================== 状态定义 ====================
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

    // ==================== 计算属性 ====================
    /** 是否已登录 */
    const isLoggedIn = computed(() => !!token.value);

    /** 是否为管理员 */
    const isAdmin = computed(() => roles.value.includes('admin'));

    // ==================== Actions ====================
    /**
     * 设置Token值
     */
    const setTokenValue = (tokenValue: string) => {
      token.value = tokenValue;
    };

    /**
     * 设置用户ID
     */
    const setId = (idValue: string) => {
      id.value = idValue;
    };

    /**
     * 设置用户名
     */
    const setName = (nameValue: string) => {
      name.value = nameValue;
    };

    /**
     * 设置用户邮箱
     */
    const setEmail = (emailValue: string) => {
      email.value = emailValue;
    };

    /**
     * 设置用户头像
     */
    const setAvatar = (avatarValue: string) => {
      avatar.value = avatarValue;
    };

    /**
     * 设置用户角色
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
        const tokenStr = response.data?.token;
        if (!tokenStr) {
          return Promise.reject(new Error('登录失败：未获取到token'));
        }
        setTokenValue(tokenStr);
        return Promise.resolve(tokenStr);
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
      // 状态
      token,
      id,
      name,
      email,
      avatar,
      roles,
      // 计算属性
      isLoggedIn,
      isAdmin,
      // Actions
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
```

### 全局Store示例
```typescript
// store/modules/global.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_LOCALE, DEFAULT_THEME_STYLE } from '@/constants/System';
import type { LocaleKey, ThemeStyleKey } from '@/interface/System';

export const useGlobalStore = defineStore(
  'global',
  () => {
    // ==================== 语言相关 ====================
    const currentLocale = ref<LocaleKey>(DEFAULT_LOCALE as LocaleKey);

    /**
     * 切换语言
     */
    const switchLocale = (locale: LocaleKey) => {
      currentLocale.value = locale;
    };

    /**
     * 初始化语言设置
     */
    const initLocale = () => {
      if (!currentLocale.value) {
        currentLocale.value = DEFAULT_LOCALE as LocaleKey;
      }
    };

    // ==================== 主题相关 ====================
    const currentTheme = ref<ThemeStyleKey>(DEFAULT_THEME_STYLE as ThemeStyleKey);

    /**
     * 切换主题
     */
    const toggleTheme = () => {
      const newTheme: ThemeStyleKey = currentTheme.value === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    };

    /**
     * 设置主题
     */
    const setTheme = (theme: ThemeStyleKey) => {
      currentTheme.value = theme;
    };

    /**
     * 初始化主题
     */
    const initTheme = () => {
      if (!currentTheme.value) {
        currentTheme.value = DEFAULT_THEME_STYLE as ThemeStyleKey;
      }
    };

    // ==================== 高级模式相关 ====================
    const advanceMode = ref<boolean>(false);
    const clickCount = ref<number>(0);
    const clickTimer = ref<NodeJS.Timeout | null>(null);

    /**
     * 切换高级模式
     */
    const toggleAdvanceMode = () => {
      advanceMode.value = !advanceMode.value;
    };

    /**
     * 处理Logo连续点击逻辑
     */
    const handleLogoClick = (onAdvanceModeToggle?: (isEnabled: boolean) => void) => {
      clickCount.value++;

      if (clickTimer.value) {
        clearTimeout(clickTimer.value);
      }

      if (clickCount.value === 5) {
        toggleAdvanceMode();
        onAdvanceModeToggle?.(advanceMode.value);
        clickCount.value = 0;
        return;
      }

      clickTimer.value = setTimeout(() => {
        clickCount.value = 0;
      }, 500);
    };

    return {
      // 语言相关
      currentLocale,
      switchLocale,
      initLocale,

      // 主题相关
      currentTheme,
      toggleTheme,
      setTheme,
      initTheme,

      // 高级模式相关
      advanceMode,
      handleLogoClick,
    };
  },
  {
    persist: true,
  },
);
```

## 📖 Store开发最佳实践

### 1. 状态定义规范
```typescript
// ✅ 正确：明确的类型定义
const token = ref<string>('');
const userInfo = ref<IUserInfo | null>(null);
const roles = ref<string[]>([]);

// ❌ 错误：缺少类型定义
const token = ref('');
const userInfo = ref(null);
const roles = ref([]);
```

### 2. Computed使用规范
```typescript
// ✅ 正确：使用computed缓存派生状态
const isLoggedIn = computed(() => !!token.value);
const hasAdminRole = computed(() => roles.value.includes('admin'));

// ❌ 错误：每次调用都重新计算
const getIsLoggedIn = () => !!token.value;
```

### 3. Actions命名规范
```typescript
// ✅ 正确：清晰的Action命名
const loginAction = async (credentials: LoginRequest) => {
  // 登录逻辑
};

const logoutAction = async () => {
  // 登出逻辑
};

// ❌ 错误：不清晰的命名
const doLogin = async (data: any) => {
  // 登录逻辑
};
```

### 4. 状态重置规范
```typescript
// ✅ 正确：提供重置方法
const resetUserState = () => {
  token.value = '';
  id.value = '';
  name.value = '';
  email.value = '';
  avatar.value = '';
  roles.value = [];
};

// 在退出登录时调用
const logoutAction = async () => {
  try {
    await LogoutService.logout();
  } finally {
    resetUserState();
  }
};
```

### 5. 持久化配置
```typescript
// ✅ 正确：有选择地持久化
export const useUserStore = defineStore(
  'user',
  () => {
    // ... store内容
  },
  {
    persist: true, // 简单配置，持久化所有状态
  },
);

// 或者精确控制持久化内容
export const useUserStore = defineStore(
  'user',
  () => {
    // ... store内容
  },
  {
    persist: {
      // 只持久化必要的状态
      paths: ['token', 'userInfo'],
    },
  },
);
```

## 📂 Store组织结构

### 按业务领域划分
```
src/store/modules/
├── user.ts          # 用户相关状态
├── global.ts        # 全局配置状态
├── app.ts           # 应用状态
├── permission.ts    # 权限相关状态
└── settings.ts      # 用户设置状态
```

### Store导出
```typescript
// store/index.ts
export * from './modules/user';
export * from './modules/global';
export * from './modules/app';
```

## 📋 Store开发快速检查清单

### 状态定义检查
- [ ] 所有状态都有明确的TypeScript类型定义
- [ ] 状态初始值合理
- [ ] 避免深层嵌套的状态结构
- [ ] 相关状态组织在同一Store中

### Actions检查
- [ ] Actions有完整的JSDoc注释
- [ ] 异步Actions有完善的错误处理
- [ ] Actions命名清晰，描述明确
- [ ] 复杂逻辑拆分为多个Actions

### 计算属性检查
- [ ] 使用computed而不是函数
- [ ] 计算属性有明确的返回类型
- [ ] 避免在computed中执行副作用

### 性能优化检查
- [ ] 只持久化必要的状态
- [ ] 避免频繁的状态更新
- [ ] 大型对象使用shallowRef
- [ ] 合理使用computed缓存

## ❓ 常见问题

### Q: 什么时候应该创建新的Store？
**A**: 符合以下条件之一就应该创建新Store：
- 不同业务领域的状态
- 状态间没有强耦合关系
- Store文件超过200行
- 需要独立的持久化配置

### Q: 如何在组件中使用Store？
**A**: 
```typescript
// 在setup中使用
import { useUserStore } from '@/store';

const userStore = useUserStore();

// 访问状态
console.log(userStore.token);

// 调用Actions
await userStore.loginAction({ username, password });

// 使用computed
const isLoggedIn = computed(() => userStore.isLoggedIn);
```

### Q: 如何在Store之间共享状态？
**A**: 
```typescript
// store1中访问store2
import { useStore2 } from './store2';

export const useStore1 = defineStore('store1', () => {
  const store2 = useStore2();
  
  const someAction = () => {
    // 访问store2的状态
    console.log(store2.someState);
  };
  
  return { someAction };
});
```

### Q: 如何处理Store中的异步操作？
**A**: 
```typescript
// ✅ 正确：完善的异步处理
const fetchUserInfo = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await UserApi.getInfo();
    userInfo.value = response.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取失败';
    throw err;
  } finally {
    loading.value = false;
  }
};
```

### Q: 如何优化Store性能？
**A**: 
```typescript
// 1. 使用shallowRef处理大型对象
const largeData = shallowRef<ILargeData>({});

// 2. 避免不必要的响应式
const config = markRaw({ /* 配置对象 */ });

// 3. 合理使用computed
const filteredData = computed(() => {
  return data.value.filter(item => item.active);
});

// 4. 按需持久化
export const useStore = defineStore('store', () => {
  // ...
}, {
  persist: {
    paths: ['token'], // 只持久化token
  },
});
```

通过遵循这些Store开发规范，可以构建出清晰、高效、可维护的状态管理系统。
