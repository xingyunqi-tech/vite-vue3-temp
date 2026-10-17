---
name: page-assembler
description: 把已有的组件、Store、API 集成进页面，并补齐 loading、错误处理、分页、骨架屏。当用户说"把这些组件拼成页面""页面接上 Store""集成一下"，或已经分别生成了组件和 Store 需要串起来时使用。
license: MIT
compatibility: Requires Vue 3, Vue Router, Pinia, TypeScript
metadata:
  author: "vue-admin-template"
  version: "1.0.0"
  category: development
---

# 页面拼装器 Skill

## 功能概述

将已经开发好的 UI 组件、Store、API 自动集成到页面中，完成完整的功能拼装，节省手动集成的时间。

## 使用方式

### 基本用法

```bash
# 方式 1: 智能拼装 - 自动分析页面需要的依赖
/page-assembler src/views/user-management/index.vue

# 方式 2: 指定组件和 Store
/page-assembler src/views/user-management/index.vue \
  --components UserTable,UserForm \
  --store user

# 方式 3: 完整指定所有依赖
/page-assembler src/views/product/index.vue \
  --components ProductList,ProductFilter \
  --store product,cart \
  --api getProductList,createProduct
```

### 高级用法

```bash
# 拼装 + 添加骨架屏
/page-assembler src/views/dashboard/index.vue --with-skeleton

# 拼装 + 添加错误处理
/page-assembler src/views/order/index.vue --with-error-handling

# 拼装 + 添加分页
/page-assembler src/views/user/index.vue --with-pagination

# 完整功能拼装
/page-assembler src/views/product/index.vue \
  --components ProductList,ProductFilter,ProductForm \
  --store product \
  --with-skeleton \
  --with-pagination \
  --with-error-handling
```

## 执行流程

### 步骤 1: 分析页面现状

**读取页面文件:**
- 使用 Read 工具读取页面文件
- 分析已有的导入语句
- 分析已有的组件使用
- 分析已有的 Store 使用
- 分析已有的 API 调用

**输出示例:**
```
🔍 分析页面: src/views/user-management/index.vue

📊 当前状态:
   ✓ 已导入组件: 无
   ✓ 已使用 Store: 无
   ✓ 已调用 API: 无
   ✓ 页面结构: 基础骨架

📋 待拼装内容:
   ☐ 导入组件: UserTable, UserForm
   ☐ 使用 Store: useUserManagementStore
   ☐ 调用 Store Actions: fetchUserListAction, createUserAction, deleteUserAction
   ☐ 添加 Loading 状态
   ☐ 添加错误处理
   ☐ 添加分页逻辑
```

> 项目统一使用 **Pinia Store 直调 `polymasApi.get()/.post()`** 的数据请求模式（详见 [api-development.md](../../agents/api-development.md)、[store-generator](../store-generator/SKILL.md)）。页面组件只调用 Store Action，不直接调用 API 函数，也**不存在** `useXxxList()`/`useXxxCreate().mutateAsync()` 这类 Hook 式请求 API 或 `src/api/hooks/` 目录。

---

### 步骤 2: 检查依赖是否存在

**检查组件:**
```bash
# 检查组件文件是否存在
src/views/user-management/components/UserTable.vue  # ✓ 存在
src/views/user-management/components/UserForm.vue   # ✓ 存在
```

**检查 Store:**
```bash
# 检查 Store 文件是否存在（Store 内部封装了对 API 的调用，页面不直接依赖 API 文件）
src/store/modules/user-management.ts  # ✓ 存在
```

**检查 API:**
```bash
# 检查 Store 依赖的 API 函数是否已生成
src/api/generated/user/user.ts  # ✓ 存在（pnpm orval 生成，不存在时先运行 pnpm orval）
```

**如果依赖不存在:**
```
❌ 缺少依赖:
   ✗ src/store/modules/user-management.ts 不存在

💡 建议:
   运行以下命令生成缺少的依赖:
   /store-generator UserManagementStore --smart
```

---

### 步骤 3: 生成导入语句

根据分析结果，生成需要添加的导入语句：

```typescript
// ========== 组件导入 ==========
import UserTable from './components/UserTable.vue';
import UserForm from './components/UserForm.vue';

// ========== Store 导入 ==========
// 页面只导入业务 Store，不直接导入 API 函数——Store Action 内部才调用 polymasApi
import { useUserManagementStore } from '@/store/modules/user-management';

// ========== 类型导入 ==========
import type { UserDTO, UserCreateRequest } from '@/api';

// ========== Element Plus 组件 ==========
import { ElMessage, ElMessageBox } from 'element-plus';
```

---

### 步骤 4: 生成 <script setup> 代码

```typescript
// ========== Store 初始化 ==========
// 列表数据、分页状态（queryParams/total）、loading、error 全部由 Store 维护，
// 页面组件不再本地重复维护 pagination ref。
// 约定（与 implementation-validator 的 fetchXxxListAction 范例一致）：
// fetchUserListAction(params?) 若收到 params 会先 setQueryParams(params) 合并进 queryParams，
// 再用合并后的 queryParams 发请求；不传 params 时直接用当前 queryParams——
// 所以下面 onMounted 传显式参数、handlePageChange 先 setQueryParams 再空参调用，两种写法都合法。
const userManagementStore = useUserManagementStore();

// ========== 状态管理（仅保留页面自身的 UI 状态） ==========
const dialogVisible = ref(false);
const currentUser = ref<UserDTO | null>(null);

// ========== 事件处理 ==========
const handleAdd = () => {
  currentUser.value = null;
  dialogVisible.value = true;
};

const handleEdit = (user: UserDTO) => {
  currentUser.value = user;
  dialogVisible.value = true;
};

// 注意：deleteUserAction/createUserAction 请求失败时的提示已由 ErrorModule 自动弹出（见下方"选项2:
// 添加错误处理"），这里的 catch 只处理 ElMessageBox 的取消场景，不再重复调用 ElMessage.error
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除吗？', '提示', {
      type: 'warning',
    });

    await userManagementStore.deleteUserAction(id);
    ElMessage.success('删除成功');
    await userManagementStore.fetchUserListAction(); // CRUD 后重新拉取列表
  } catch (error: any) {
    if (error === 'cancel') return; // 用户取消确认框，无需提示
    // 其余错误（请求失败）已由 ErrorModule 弹出提示，这里不重复处理
  }
};

const handleSubmit = async (data: UserCreateRequest) => {
  try {
    await userManagementStore.createUserAction(data);
    ElMessage.success('操作成功');
    dialogVisible.value = false;
    await userManagementStore.fetchUserListAction();
  } catch {
    // 请求失败的提示已由 ErrorModule 弹出，这里不重复调用 ElMessage.error
  }
};

const handlePageChange = (page: number) => {
  userManagementStore.setQueryParams({ page });
  userManagementStore.fetchUserListAction();
};

// ========== 生命周期 ==========
onMounted(() => {
  userManagementStore.fetchUserListAction({ page: 1, pageSize: 20 });
});
```

---

### 步骤 5: 生成 <template> 代码

```vue
<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="user-management__header">
      <h1 class="user-management__title">用户管理</h1>
      <div class="user-management__actions">
        <el-button type="primary" @click="handleAdd">
          添加用户
        </el-button>
      </div>
    </div>

    <!-- Loading 状态 -->
    <div v-if="userManagementStore.loading" class="user-management__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="userManagementStore.error" class="user-management__error">
      <el-empty :description="userManagementStore.error.message">
        <el-button type="primary" @click="userManagementStore.fetchUserListAction()">
          重新加载
        </el-button>
      </el-empty>
    </div>

    <!-- 内容区域 -->
    <div v-else class="user-management__content">
      <!-- 用户表格 -->
      <UserTable
        :data="userManagementStore.userList"
        :loading="userManagementStore.loading"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <!-- 分页 -->
      <el-pagination
        :current-page="userManagementStore.queryParams.page"
        :page-size="userManagementStore.queryParams.pageSize"
        :total="userManagementStore.total"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentUser ? '编辑用户' : '添加用户'"
      width="600px"
    >
      <UserForm
        :data="currentUser"
        :loading="userManagementStore.loading"
        @submit="handleSubmit"
        @cancel="dialogVisible = false"
      />
    </el-dialog>
  </div>
</template>
```

---

### 步骤 6: 应用更新

使用 Edit 工具将生成的代码集成到页面文件中：

1. **添加导入语句** (在 `<script setup>` 开始处)
2. **添加状态管理** (在导入后)
3. **添加 Store 初始化与 Action 调用** (在状态管理后)
4. **添加事件处理** (在 Store 初始化后)
5. **更新模板** (替换或扩展现有模板)

---

### 步骤 7: 输出拼装报告

```
✅ 页面拼装完成!
─────────────────────────────────────────

📄 页面: src/views/user-management/index.vue

📦 已集成内容:

   ✅ 组件集成 (2 个):
      - UserTable
      - UserForm

   ✅ Store 集成 (1 个):
      - useUserManagementStore

   ✅ Store Action 集成 (3 个):
      - fetchUserListAction (查询)
      - createUserAction (创建)
      - deleteUserAction (删除)

   ✅ 功能增强:
      - Loading 状态处理
      - 错误状态处理
      - 分页功能
      - 对话框管理

📊 代码统计:
   - 新增导入: 8 个
   - 新增函数: 5 个
   - 新增模板: 50 行

💡 下一步:
   1. 查看生成的代码? (y/n)
   2. 运行类型检查? (pnpm type-check)
   3. 启动开发服务器测试? (pnpm start)
```

---

## 高级选项

### 选项 1: 添加骨架屏 (--with-skeleton)

```vue
<!-- 添加骨架屏 Loading 状态 -->
<div v-if="userManagementStore.loading" class="user-management__skeleton">
  <el-skeleton :rows="5" animated />
</div>
```

---

### 选项 2: 添加错误处理 (--with-error-handling)

```typescript
// 错误状态直接读 Store 的 error ref（fetchUserListAction 的 catch 分支已写入）
// API 请求错误已由 ErrorModule（src/api/core/request.ts）自动弹出提示，
// 这里不要重复调用 ElMessage.error，只需要提供重试入口。
// 非请求类错误（如本地校验）用 src/utils/error-handler.ts 的 handleError/handleErrorSilently。

// 添加重试逻辑
const handleRetry = () => {
  userManagementStore.fetchUserListAction();
};
```

```vue
<!-- 添加错误状态展示 -->
<div v-else-if="userManagementStore.error" class="user-management__error">
  <el-empty :description="userManagementStore.error.message">
    <el-button type="primary" @click="handleRetry">
      重新加载
    </el-button>
  </el-empty>
</div>
```

---

### 选项 3: 添加分页 (--with-pagination)

```typescript
// 分页状态由 Store 的 queryParams/total 维护，页面只负责触发 Action
const handlePageChange = (page: number) => {
  userManagementStore.setQueryParams({ page });
  userManagementStore.fetchUserListAction();
};

const handleSizeChange = (pageSize: number) => {
  userManagementStore.setQueryParams({ pageSize, page: 1 });
  userManagementStore.fetchUserListAction();
};
```

```vue
<!-- 添加分页组件 -->
<el-pagination
  :current-page="userManagementStore.queryParams.page"
  :page-size="userManagementStore.queryParams.pageSize"
  :total="userManagementStore.total"
  :page-sizes="[10, 20, 50, 100]"
  layout="total, sizes, prev, pager, next, jumper"
  @current-change="handlePageChange"
  @size-change="handleSizeChange"
/>
```

---

## 智能分析模式

当没有指定 `--components` 和 `--store` 时，自动分析页面需要的依赖：

### 分析逻辑

1. **根据页面路径推断**:
   - `src/views/user-management/` → 查找 `src/views/user-management/components/`
   - 自动导入该目录下的所有组件

2. **根据页面名称推断 Store**:
   - `UserManagement` → `useUserManagementStore`
   - `ProductList` → `useProductStore`

3. **根据 Store 推断需要的 Action**（Store 内部封装 API 调用，页面不直接依赖 API 函数名）:
   - `useUserManagementStore` → `fetchUserListAction`, `createUserAction`, `updateUserAction`, `deleteUserAction`
   - `useProductStore` → `fetchProductListAction`, `fetchProductByIdAction`, `createProductAction`

---

## 拼装模式

### 模式 1: 列表页拼装

**特点:**
- 表格组件 + 分页
- 筛选组件
- 添加/编辑表单对话框
- 删除确认

**示例:**
```bash
/page-assembler src/views/user/index.vue \
  --components UserTable,UserFilter,UserForm \
  --store user \
  --with-pagination \
  --with-error-handling
```

---

### 模式 2: 详情页拼装

**特点:**
- 详情展示组件
- 编辑按钮
- 返回按钮

**示例:**
```bash
/page-assembler src/views/user/detail.vue \
  --components UserDetail,UserEdit \
  --store user \
  --api getUserById,updateUser
```

---

### 模式 3: 表单页拼装

**特点:**
- 表单组件
- 提交和取消按钮
- 表单验证

**示例:**
```bash
/page-assembler src/views/user/create.vue \
  --components UserForm \
  --api createUser \
  --with-error-handling
```

---

## 最佳实践

### 1. 先生成组件，再拼装

```bash
# 步骤 1: 生成组件
/component-generator UserTable --type business
/component-generator UserForm --type business --with-form

# 步骤 2: 拼装页面
/page-assembler src/views/user/index.vue \
  --components UserTable,UserForm \
  --store user
```

---

### 2. 渐进式拼装

```bash
# 第一次: 基础拼装
/page-assembler src/views/user/index.vue --components UserTable

# 第二次: 添加表单
/page-assembler src/views/user/index.vue --components UserForm

# 第三次: 添加分页
/page-assembler src/views/user/index.vue --with-pagination
```

---

### 3. 拼装后立即测试

```bash
# 拼装完成
/page-assembler src/views/user/index.vue --components UserTable,UserForm

# 类型检查
pnpm type-check

# 启动开发服务器
pnpm start

# 访问页面测试
http://localhost:5173/user
```

---

## 与其他 Skills 配合

### 完整开发流程

```bash
# 步骤 1: 设计架构
/architecture-designer docs/prd/user.md --create-structure --create-todos

# 步骤 2: 同步 API
pnpm orval

# 步骤 3: 生成 Store
/store-generator UserStore --smart

# 步骤 4: 生成页面骨架
/component-generator UserManagement --type page --with-router

# 步骤 5: 生成组件
/component-generator UserTable --type business
/component-generator UserForm --type business --with-form

# 步骤 6: 拼装页面 (重要!)
/page-assembler src/views/user-management/index.vue \
  --components UserTable,UserForm \
  --store user \
  --with-pagination \
  --with-error-handling

# 步骤 7: 质量检查
/test-coverage-checker --auto-generate
pnpm lint
pnpm type-check
```

---

## 相关文档

- [component-development.md](../../agents/component-development.md) - 组件开发规范
- [store-development.md](../../agents/store-development.md) - Store 开发规范
- [api-development.md](../../agents/api-development.md) - API 开发规范

---

## 常见问题

### Q1: 拼装会覆盖我的代码吗？

**A:** 不会完全覆盖，会智能合并：
- 已有的导入不会重复
- 已有的函数不会覆盖
- 会在合适的位置插入新代码

### Q2: 拼装后的代码可以修改吗？

**A:** 当然可以！拼装生成的代码是基础模板，可以根据需求修改。

### Q3: 如何处理复杂的组件集成？

**A:** 分步拼装：
```bash
# 第一步: 基础拼装
/page-assembler src/views/user/index.vue --components UserTable

# 第二步: 添加表单
/page-assembler src/views/user/index.vue --components UserForm

# 手动调整代码...
```

### Q4: 拼装失败了怎么办？

**A:**
1. 检查依赖是否存在
2. 检查文件路径是否正确
3. 使用 Git 回滚: `git restore src/views/user/index.vue`
4. 手动集成

---

## 示例工作流

### 场景: 用户管理页面拼装

```bash
# 步骤 1: 查看页面现状
cat src/views/user-management/index.vue

# 步骤 2: 拼装页面
/page-assembler src/views/user-management/index.vue \
  --components UserTable,UserForm,UserFilter \
  --store user \
  --with-pagination \
  --with-error-handling

# 步骤 3: 查看拼装结果
cat src/views/user-management/index.vue

# 步骤 4: 类型检查
pnpm type-check

# 步骤 5: 启动开发服务器测试
pnpm start

# 步骤 6: 如果有问题，调整代码
# 编辑 src/views/user-management/index.vue

# 步骤 7: 提交代码
git add src/views/user-management/
git commit -m "feat: assemble user management page"
```

---

**提示**: 页面拼装器可以节省 60% 的手动集成时间，让你专注于业务逻辑！
