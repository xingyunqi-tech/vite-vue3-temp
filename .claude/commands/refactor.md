---
description: 重构代码时的最佳实践提示，确保安全、高效、符合规范
---

# 代码重构最佳实践

在开始重构前，请先阅读以下原则和步骤，确保重构安全、高效且符合项目规范。

## 🎯 重构原则

### 1. 安全第一 - 保持功能不变

#### 重构前
- [ ] **确保有测试覆盖**（单元测试 >= 80%）
- [ ] 运行 `pnpm test` 确保所有测试通过
- [ ] 记录当前功能行为
- [ ] 创建重构分支：`git checkout -b refactor/feature-name`

#### 重构中
- [ ] **小步快跑** - 每次只改一小部分
- [ ] 每次改动后立即运行测试：`pnpm test`
- [ ] 改动停在工作区，由用户确认后再提交
- [ ] 遇到问题时说明现状，回滚前先征得用户同意

#### 重构后
- [ ] 运行完整测试套件：`pnpm test`
- [ ] 运行类型检查：`pnpm type-check`
- [ ] 手动测试核心功能
- [ ] 对比重构前后的行为一致性

---

### 2. 提升代码质量

#### 消除重复代码（DRY）

> ⚠️ 下面只是演示"提取重复逻辑"这个重构手法本身，不代表项目真实的登录实现——本项目登录走本地登录页（`src/views/login/`）与 `useUserInfoStore().loginAction`，token 由 `@/utils/auth` 存于 Cookie（见 [router-development.md](../agents/router-development.md)），不要把 Token 写入 `localStorage`（见 [security-check.md](security-check.md)）。

```typescript
// ❌ 重复代码
const handleUserAction = async () => {
  try {
    await someRequest(data);
    ElMessage.success('操作成功');
    router.push('/home');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleAdminAction = async () => {
  try {
    await someRequest(data);
    ElMessage.success('操作成功');
    router.push('/admin');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

// ✅ 提取公共逻辑
const runAction = async (redirectPath: string) => {
  try {
    await someRequest(data);
    ElMessage.success('操作成功');
    router.push(redirectPath);
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleUserAction = () => runAction('/home');
const handleAdminAction = () => runAction('/admin');
```

#### 简化复杂逻辑
```typescript
// ❌ 复杂的嵌套逻辑
const processUser = (user) => {
  if (user) {
    if (user.role === 'admin') {
      if (user.permissions) {
        if (user.permissions.includes('write')) {
          return true;
        }
      }
    }
  }
  return false;
};

// ✅ 提前返回（Guard Clauses）
const processUser = (user) => {
  if (!user) return false;
  if (user.role !== 'admin') return false;
  if (!user.permissions) return false;
  return user.permissions.includes('write');
};
```

#### 改善命名
```typescript
// ❌ 不清晰的命名
const d = new Date();
const arr = [1, 2, 3];
const fn = () => { };

// ✅ 语义化命名
const currentDate = new Date();
const userIds = [1, 2, 3];
const fetchUserInfo = () => { };
```

#### 提取魔法数字/字符串
```typescript
// ❌ 魔法数字
if (user.age > 18) { }
setTimeout(() => { }, 3000);

// ✅ 使用常量
const ADULT_AGE = 18;
const TOAST_DURATION = 3000;

if (user.age > ADULT_AGE) { }
setTimeout(() => { }, TOAST_DURATION);
```

---

### 3. 遵循项目规范

请参考以下 Agent 文档确保重构符合规范：

#### TypeScript 类型
- [ ] 所有函数有明确的类型定义
- [ ] 无 `any` 类型
- [ ] Props/Emits 接口完整
- [ ] 参考 `@coding-standards`

#### Vue 组件规范
- [ ] 使用 `<script setup>` 语法
- [ ] Props 使用 `defineProps<Props>()`
- [ ] Emits 使用 `defineEmits<Emits>()`
- [ ] 参考 `@component-development`

#### CSS 变量
- [ ] **所有颜色使用 CSS 变量**（`public/assets/theme.css`）
- [ ] 无硬编码颜色值
- [ ] 运行 `pnpm checkCssVars` 检查
- [ ] 参考 `@common-patterns`

#### 数据驱动模式
- [ ] 使用 `v-for` + 数据数组
- [ ] 避免重复的模板代码
- [ ] 参考 `@common-patterns`

#### API 调用
- [ ] 使用 Orval 生成的 API（从 `@/api` 导入）
- [ ] 优先使用 Pinia Store
- [ ] 完整的错误处理
- [ ] 参考 `@api-development`

---

### 4. 重构后检查清单

#### 自动化检查
```bash
# 1. TypeScript 类型检查
pnpm type-check

# 2. 代码检查
pnpm lint

# 3. 运行测试
pnpm test

# 4. 运行构建
pnpm build
```

#### 手动检查
- [ ] 功能行为与重构前一致
- [ ] 无性能退化
- [ ] 代码可读性提升
- [ ] 无新增技术债务

---

## 🔄 常见重构模式

### 模式 1: 组件拆分

**场景:** 组件代码超过 300 行，职责过多

```typescript
// ❌ 大组件
<template>
  <div class="user-page">
    <!-- 用户信息 -->
    <div class="user-info">...</div>
    <!-- 用户列表 -->
    <div class="user-list">...</div>
    <!-- 用户统计 -->
    <div class="user-stats">...</div>
  </div>
</template>

// ✅ 拆分为多个小组件
<template>
  <div class="user-page">
    <UserInfo :user="user" />
    <UserList :users="users" @select="handleSelect" />
    <UserStats :stats="stats" />
  </div>
</template>
```

**步骤:**
1. 使用 `/component-generator UserInfo --type basic` 生成组件
2. 移动相关代码到新组件
3. 定义 Props/Emits 接口
4. 运行测试确保功能正常

---

### 模式 2: 提取 Composable

**场景:** 多个组件有相同的逻辑

```typescript
// ❌ 重复逻辑
// ComponentA.vue
const loading = ref(false);
const error = ref<Error | null>(null);
const fetchData = async () => {
  loading.value = true;
  try {
    // fetch data
  } catch (e) {
    error.value = e;
  } finally {
    loading.value = false;
  }
};

// ComponentB.vue
// 相同的逻辑...

// ✅ 提取为 Composable
// src/composables/useAsync.ts
export const useAsync = <T>(fn: () => Promise<T>) => {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<T | null>(null);

  const execute = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fn();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, data, execute };
};

// ComponentA.vue
const { loading, error, data, execute } = useAsync(() => getUserInfo());
```

---

### 模式 3: 状态提升到 Pinia Store

**场景:** 多个组件共享状态，通过 props 传递多层

```typescript
// ❌ Props 层层传递
<GrandParent :user="user">
  <Parent :user="user">
    <Child :user="user" />
  </Parent>
</GrandParent>

// ✅ 使用 Pinia Store（用户信息复用 useUserInfoStore，其他共享状态用 /store-generator 生成）
import { useUserInfoStore } from '@/store/modules/user-info';

const userStore = useUserInfoStore();
const user = computed(() => userStore.info);
```

---

### 模式 4: 优化性能

**场景:** 组件渲染性能问题

```typescript
// ❌ 每次都重新计算
<template>
  <div>{{ expensiveComputation() }}</div>
</template>

<script setup lang="ts">
const expensiveComputation = () => {
  // 耗时计算
  return result;
};
</script>

// ✅ 使用 computed 缓存
<template>
  <div>{{ computedValue }}</div>
</template>

<script setup lang="ts">
const computedValue = computed(() => {
  // 耗时计算
  return result;
});
</script>
```

---

## 🚀 重构工作流程

### 完整流程

```bash
# 1. 创建重构分支
git checkout -b refactor/feature-name

# 2. 运行测试（确保初始状态正常）
pnpm test

# 3. 开始重构（小步快跑）
# - 提取重复代码
# - 简化复杂逻辑
# - 改善命名
# - 遵循项目规范

# 4. 每次改动后测试
pnpm test

# 5. 改动停在工作区，等用户确认后再提交

# 6. 重构完成后，运行完整检查
pnpm type-check
pnpm lint
pnpm test
pnpm build

# 7. 提交 PR
git push origin refactor/feature-name

# 8. 审查代码
# 参考 /review-pr 查看审查清单
```

---

## 📚 相关资源

### Agent 文档
- `@common-patterns` - 通用开发模式
- `@component-development` - 组件开发规范
- `@api-development` - API 调用规范
- `@store-development` - Pinia Store 规范
- `@coding-standards` - 编码规范

### 自动化工具
- `pnpm type-check` - 类型检查
- `pnpm lint` - 代码检查
- `pnpm test` - 运行测试
- `pnpm build` - 构建检查

---

## ⚠️ 重构注意事项

### 不要过度重构
- ❌ 不要为了重构而重构
- ❌ 不要改变公共 API（影响其他代码）
- ❌ 不要在重构时添加新功能

### 保持沟通
- ✅ 大规模重构前与团队讨论
- ✅ 重构 PR 要有清晰的说明
- ✅ 分步提交，方便 Code Review

### 优先级
1. **安全性** - 确保功能不变
2. **可读性** - 代码更易理解
3. **可维护性** - 代码更易修改
4. **性能** - 优化性能问题

---

**现在开始重构吧！记得小步快跑，频繁测试，确保安全。**
