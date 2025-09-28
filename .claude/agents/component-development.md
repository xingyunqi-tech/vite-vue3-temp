# 组件开发 Agent

## 职责
专门负责Vue组件开发指导，包括组件设计原则、开发模式、最佳实践和组件库构建，为AI生成高质量的Vue组件提供专业指导。

## 🎯 组件设计原则

### 1. 单一职责原则
- **功能聚焦**: 每个组件只负责一个明确的功能
- **职责清晰**: 组件的作用和边界要明确定义
- **可测试性**: 单一职责使组件更容易测试
- **可维护性**: 降低组件复杂度，提高可维护性

### 2. 可复用性原则
- **通用设计**: 组件应该具有通用性，避免业务耦合
- **配置灵活**: 通过Props提供灵活的配置选项
- **插槽支持**: 使用插槽提供内容定制能力
- **事件通信**: 通过事件与父组件通信

### 3. 组合优于继承
- **组合模式**: 通过组合小组件构建复杂功能
- **Hooks复用**: 使用Composition API实现逻辑复用
- **插件机制**: 通过插件扩展组件功能
- **依赖注入**: 使用provide/inject共享状态

## 📦 组件分类体系

### 基础组件 (Base Components)
```typescript
// 特点：纯UI组件，无业务逻辑，高度可复用
// 位置：src/components/base/

// 示例：Button组件
interface IButtonProps {
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  /** 按钮尺寸 */
  size?: 'large' | 'default' | 'small';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 图标 */
  icon?: string | Component;
  /** 是否为圆形按钮 */
  round?: boolean;
  /** 是否为圆角按钮 */
  circle?: boolean;
}
```

### 通用组件 (Common Components)
```typescript
// 特点：业务无关的功能组件，可在多个项目中使用
// 位置：src/components/common/

// 示例：DataTable组件
interface IDataTableProps<T = any> {
  /** 表格数据 */
  data: T[];
  /** 列定义 */
  columns: ITableColumn<T>[];
  /** 是否显示分页 */
  showPagination?: boolean;
  /** 分页配置 */
  pagination?: IPaginationConfig;
  /** 是否显示选择框 */
  selectable?: boolean;
  /** 加载状态 */
  loading?: boolean;
}
```

### 业务组件 (Business Components)
```typescript
// 特点：包含特定业务逻辑，项目专用
// 位置：src/components/business/

// 示例：UserSelector组件
interface IUserSelectorProps {
  /** 选中的用户ID列表 */
  modelValue: string[];
  /** 是否多选 */
  multiple?: boolean;
  /** 用户角色过滤 */
  roleFilter?: string[];
  /** 部门过滤 */
  departmentFilter?: string[];
}
```

### 页面组件 (Page Components)
```typescript
// 特点：完整的页面实现，路由对应的组件
// 位置：src/views/

// 示例：UserManagement页面组件
interface IUserManagementProps {
  // 页面级别的Props通常很少或没有
}
```

## 🛠️ 组件开发模板

### 基础组件模板
```vue
<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <i v-if="loading" class="loading-icon"></i>
    <i v-else-if="icon" :class="iconClass"></i>
    <span v-if="$slots.default" class="button-text">
      <slot></slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

// ==================== 类型定义 ====================
interface Props {
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  /** 按钮尺寸 */
  size?: 'large' | 'default' | 'small';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 图标 */
  icon?: string | Component;
  /** 是否为圆形按钮 */
  round?: boolean;
  /** 是否为圆角按钮 */
  circle?: boolean;
}

interface Emits {
  /** 点击事件 */
  (e: 'click', event: MouseEvent): void;
}

// ==================== Props 和 Emits ====================
const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'default',
  disabled: false,
  loading: false,
  round: false,
  circle: false,
});

const emit = defineEmits<Emits>();

// ==================== 计算属性 ====================
const buttonClass = computed((): string[] => {
  const classes = ['base-button'];
  
  // 类型样式
  classes.push(`base-button--${props.type}`);
  
  // 尺寸样式
  classes.push(`base-button--${props.size}`);
  
  // 状态样式
  if (props.disabled) classes.push('is-disabled');
  if (props.loading) classes.push('is-loading');
  if (props.round) classes.push('is-round');
  if (props.circle) classes.push('is-circle');
  
  return classes;
});

const iconClass = computed((): string => {
  if (typeof props.icon === 'string') {
    return props.icon;
  }
  return '';
});

// ==================== 方法定义 ====================
const handleClick = (event: MouseEvent): void => {
  if (props.disabled || props.loading) return;
  emit('click', event);
};
</script>

<style scoped lang="scss">
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;

  // 类型样式
  &--primary {
    color: #fff;
    background-color: #409eff;
    border-color: #409eff;

    &:hover:not(.is-disabled) {
      background-color: #66b1ff;
      border-color: #66b1ff;
    }
  }

  &--success {
    color: #fff;
    background-color: #67c23a;
    border-color: #67c23a;

    &:hover:not(.is-disabled) {
      background-color: #85ce61;
      border-color: #85ce61;
    }
  }

  // 尺寸样式
  &--large {
    padding: 12px 20px;
    font-size: 16px;
  }

  &--small {
    padding: 6px 12px;
    font-size: 12px;
  }

  // 状态样式
  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.is-loading {
    cursor: not-allowed;
  }

  &.is-round {
    border-radius: 20px;
  }

  &.is-circle {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
  }

  // 图标和文本间距
  .loading-icon,
  i {
    margin-right: 4px;

    &:last-child {
      margin-right: 0;
    }
  }

  .button-text {
    display: inline-block;
  }
}
</style>
```

### 业务组件模板
```vue
<template>
  <div class="user-selector">
    <div class="selector-header">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      
      <div class="filter-controls">
        <el-select
          v-model="selectedRole"
          placeholder="选择角色"
          clearable
          @change="handleRoleChange"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role.value"
            :label="role.label"
            :value="role.value"
          />
        </el-select>
      </div>
    </div>

    <div class="selector-content">
      <div v-if="loading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>
      
      <div v-else-if="error" class="error-state">
        <el-empty description="加载失败">
          <el-button @click="fetchUsers">重试</el-button>
        </el-empty>
      </div>
      
      <div v-else class="user-list">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          :class="['user-item', { 'is-selected': isSelected(user.id) }]"
          @click="handleUserSelect(user)"
        >
          <el-avatar :src="user.avatar" :size="40">
            {{ user.username.charAt(0).toUpperCase() }}
          </el-avatar>
          
          <div class="user-info">
            <div class="user-name">{{ user.username }}</div>
            <div class="user-email">{{ user.email }}</div>
            <div class="user-roles">
              <el-tag
                v-for="role in user.roles"
                :key="role"
                size="small"
                type="info"
              >
                {{ role }}
              </el-tag>
            </div>
          </div>
          
          <div class="selection-indicator">
            <el-icon v-if="isSelected(user.id)" color="#409eff">
              <Check />
            </el-icon>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPagination" class="selector-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Check } from '@element-plus/icons-vue';
import { UserApi } from '@/api/modules/user';
import { debounce } from 'lodash-es';
import type { IUserInfo } from '@/interface/Api';

// ==================== 类型定义 ====================
interface Props {
  /** 选中的用户ID列表 */
  modelValue: string[];
  /** 是否多选 */
  multiple?: boolean;
  /** 用户角色过滤 */
  roleFilter?: string[];
  /** 部门过滤 */
  departmentFilter?: string[];
  /** 是否显示分页 */
  showPagination?: boolean;
  /** 每页大小 */
  pageSize?: number;
}

interface Emits {
  /** 更新选中值 */
  (e: 'update:modelValue', value: string[]): void;
  /** 用户选择事件 */
  (e: 'select', user: IUserInfo): void;
  /** 用户取消选择事件 */
  (e: 'unselect', user: IUserInfo): void;
}

interface IRoleOption {
  label: string;
  value: string;
}

// ==================== Props 和 Emits ====================
const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  roleFilter: () => [],
  departmentFilter: () => [],
  showPagination: true,
  pageSize: 20,
});

const emit = defineEmits<Emits>();

// ==================== 响应式数据 ====================
const users = ref<IUserInfo[]>([]);
const loading = ref(false);
const error = ref<string>('');
const searchKeyword = ref<string>('');
const selectedRole = ref<string>('');
const currentPage = ref(1);
const pageSize = ref(props.pageSize);
const total = ref(0);

// 角色选项
const roleOptions = ref<IRoleOption[]>([
  { label: '管理员', value: 'admin' },
  { label: '用户', value: 'user' },
  { label: '访客', value: 'guest' },
]);

// ==================== 计算属性 ====================
const filteredUsers = computed((): IUserInfo[] => {
  let result = users.value;

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(user =>
      user.username.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    );
  }

  // 角色过滤
  if (selectedRole.value) {
    result = result.filter(user => user.roles.includes(selectedRole.value));
  }

  // Props角色过滤
  if (props.roleFilter.length > 0) {
    result = result.filter(user =>
      user.roles.some(role => props.roleFilter.includes(role))
    );
  }

  return result;
});

const selectedUserIds = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', value),
});

// ==================== 方法定义 ====================
/**
 * 获取用户列表
 */
const fetchUsers = async (): Promise<void> => {
  loading.value = true;
  error.value = '';

  try {
    const response = await UserApi.getUserList({
      page: currentPage.value,
      pageSize: pageSize.value,
    });

    users.value = response.data;
    total.value = response.total;
  } catch (err) {
    error.value = '获取用户列表失败';
    console.error('获取用户列表失败:', err);
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 判断用户是否已选中
 */
const isSelected = (userId: string): boolean => {
  return selectedUserIds.value.includes(userId);
};

/**
 * 处理用户选择
 */
const handleUserSelect = (user: IUserInfo): void => {
  const userId = user.id;
  const currentSelection = [...selectedUserIds.value];

  if (isSelected(userId)) {
    // 取消选择
    const index = currentSelection.indexOf(userId);
    currentSelection.splice(index, 1);
    emit('unselect', user);
  } else {
    // 选择用户
    if (props.multiple) {
      currentSelection.push(userId);
    } else {
      currentSelection.splice(0, currentSelection.length, userId);
    }
    emit('select', user);
  }

  selectedUserIds.value = currentSelection;
};

/**
 * 处理搜索
 */
const handleSearch = debounce((keyword: string) => {
  searchKeyword.value = keyword;
}, 300);

/**
 * 处理角色变化
 */
const handleRoleChange = (role: string): void => {
  selectedRole.value = role;
};

/**
 * 处理页面大小变化
 */
const handleSizeChange = (size: number): void => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchUsers();
};

/**
 * 处理页面变化
 */
const handlePageChange = (page: number): void => {
  currentPage.value = page;
  fetchUsers();
};

// ==================== 生命周期 ====================
onMounted(() => {
  fetchUsers();
});

// ==================== 监听器 ====================
watch(
  [() => props.roleFilter, () => props.departmentFilter],
  () => {
    fetchUsers();
  },
  { deep: true }
);
</script>

<style scoped lang="scss">
.user-selector {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;

  .selector-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid #ebeef5;

    .filter-controls {
      display: flex;
      gap: 8px;
    }
  }

  .selector-content {
    min-height: 300px;
    max-height: 400px;
    overflow-y: auto;

    .loading-state,
    .error-state {
      padding: 40px;
    }

    .user-list {
      .user-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #f5f7fa;
        cursor: pointer;
        transition: background-color 0.3s;

        &:hover {
          background-color: #f5f7fa;
        }

        &.is-selected {
          background-color: #ecf5ff;
        }

        .user-info {
          flex: 1;
          margin-left: 12px;

          .user-name {
            font-size: 14px;
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .user-email {
            font-size: 12px;
            color: #909399;
            margin-bottom: 4px;
          }

          .user-roles {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }
        }

        .selection-indicator {
          width: 20px;
          text-align: center;
        }
      }
    }
  }

  .selector-footer {
    padding: 16px;
    border-top: 1px solid #ebeef5;
    text-align: center;
  }
}
</style>
```

## 🔧 组件开发最佳实践

### 1. Props 设计原则
```typescript
// ✅ 好的Props设计
interface Props {
  /** 必需属性：明确类型 */
  data: ITableData[];
  
  /** 可选属性：提供默认值 */
  size?: 'small' | 'medium' | 'large';
  
  /** 布尔属性：默认false */
  loading?: boolean;
  
  /** 函数属性：明确签名 */
  onRowClick?: (row: ITableData, index: number) => void;
  
  /** 对象属性：使用接口定义 */
  pagination?: IPaginationConfig;
}

// ❌ 不好的Props设计
interface BadProps {
  data: any; // 类型不明确
  config: object; // 类型过于宽泛
  callback: Function; // 函数签名不明确
}
```

### 2. 事件设计原则
```typescript
// ✅ 好的事件设计
interface Emits {
  /** 行点击事件：提供完整的上下文信息 */
  (e: 'row-click', row: ITableData, index: number, event: MouseEvent): void;
  
  /** 选择变化事件：提供新旧值 */
  (e: 'selection-change', newSelection: string[], oldSelection: string[]): void;
  
  /** 更新事件：支持v-model */
  (e: 'update:modelValue', value: any): void;
}

// ❌ 不好的事件设计
interface BadEmits {
  (e: 'click'): void; // 缺少上下文信息
  (e: 'change', data: any): void; // 类型不明确
}
```

### 3. 插槽设计原则
```vue
<template>
  <div class="data-table">
    <!-- 表格头部插槽 -->
    <div class="table-header">
      <slot name="header" :data="data" :loading="loading">
        <h3>数据表格</h3>
      </slot>
    </div>

    <!-- 表格内容 -->
    <table class="table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            <!-- 表头插槽 -->
            <slot :name="`header-${column.key}`" :column="column">
              {{ column.title }}
            </slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in data" :key="row.id">
          <td v-for="column in columns" :key="column.key">
            <!-- 单元格插槽 -->
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :column="column"
              :index="index"
              :value="row[column.key]"
            >
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 表格底部插槽 -->
    <div class="table-footer">
      <slot name="footer" :data="data" :total="total">
        <div>共 {{ total }} 条记录</div>
      </slot>
    </div>
  </div>
</template>
```

### 4. 组合式API最佳实践
```typescript
// ✅ 使用组合式函数复用逻辑
export function useTableSelection<T extends { id: string }>(
  data: Ref<T[]>,
  multiple = true
) {
  const selectedIds = ref<string[]>([]);
  
  const selectedItems = computed(() => {
    return data.value.filter(item => selectedIds.value.includes(item.id));
  });
  
  const isSelected = (id: string): boolean => {
    return selectedIds.value.includes(id);
  };
  
  const toggleSelection = (item: T): void => {
    const id = item.id;
    const index = selectedIds.value.indexOf(id);
    
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    } else {
      if (multiple) {
        selectedIds.value.push(id);
      } else {
        selectedIds.value = [id];
      }
    }
  };
  
  const clearSelection = (): void => {
    selectedIds.value = [];
  };
  
  const selectAll = (): void => {
    selectedIds.value = data.value.map(item => item.id);
  };
  
  return {
    selectedIds: readonly(selectedIds),
    selectedItems,
    isSelected,
    toggleSelection,
    clearSelection,
    selectAll,
  };
}

// 在组件中使用
const { selectedIds, selectedItems, isSelected, toggleSelection } = 
  useTableSelection(tableData, true);
```

### 5. 组件测试策略
```typescript
// 组件单元测试
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import UserSelector from '../UserSelector.vue';

describe('UserSelector', () => {
  const mockUsers = [
    { id: '1', username: 'user1', email: 'user1@example.com', roles: ['user'] },
    { id: '2', username: 'user2', email: 'user2@example.com', roles: ['admin'] },
  ];

  it('应该正确渲染用户列表', () => {
    const wrapper = mount(UserSelector, {
      props: {
        modelValue: [],
        users: mockUsers,
      },
    });

    expect(wrapper.findAll('.user-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('user1');
    expect(wrapper.text()).toContain('user2');
  });

  it('应该正确处理用户选择', async () => {
    const wrapper = mount(UserSelector, {
      props: {
        modelValue: [],
        users: mockUsers,
      },
    });

    await wrapper.find('.user-item').trigger('click');
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('select')).toBeTruthy();
  });

  it('应该支持搜索功能', async () => {
    const wrapper = mount(UserSelector, {
      props: {
        modelValue: [],
        users: mockUsers,
      },
    });

    const searchInput = wrapper.find('input[placeholder="搜索用户"]');
    await searchInput.setValue('user1');

    // 验证过滤结果
    expect(wrapper.findAll('.user-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('user1');
    expect(wrapper.text()).not.toContain('user2');
  });
});
```

## 📚 组件文档规范

### 组件README模板
```markdown
# UserSelector 用户选择器

## 概述
用户选择器组件，支持单选/多选用户，提供搜索、过滤等功能。

## 基本用法
```vue
<template>
  <UserSelector
    v-model="selectedUsers"
    :multiple="true"
    @select="handleUserSelect"
  />
</template>

<script setup>
import { ref } from 'vue';
import UserSelector from '@/components/UserSelector/index.vue';

const selectedUsers = ref([]);

const handleUserSelect = (user) => {
  console.log('选中用户:', user);
};
</script>
```

## API

### Props
| 参数 | 说明 | 类型 | 默认值 | 必需 | 可选 |
|------|------|------|--------|------|
| modelValue | 选中的用户ID列表 | `string[]` | `[]` | 是 | 是 |
| multiple | 是否多选 | `boolean` | `true` | 否 | 是 |
| roleFilter | 角色过滤 | `string[]` | `[]` | 否 | 是 |
| showPagination | 是否显示分页 | `boolean` | `true` | 否 | 是 |

### Events
| 事件名 | 说明 | 参数 | 可选 |
|--------|------|------|
| update:modelValue | 选中值变化 | `(value: string[]) => void` |
| select | 选中用户 | `(user: IUserInfo) => void` |
| unselect | 取消选中用户 | `(user: IUserInfo) => void` |

### Slots
| 插槽名 | 说明 | 参数 | 可选 |
|--------|------|------|
| header | 自定义头部 | `{ users, loading }` | 是 |
| user-item | 自定义用户项 | `{ user, selected }` | 是 |
| empty | 自定义空状态 | - | 是 |

## 示例

### 单选模式
```vue
<UserSelector
  v-model="selectedUser"
  :multiple="false"
/>
```

### 角色过滤
```vue
<UserSelector
  v-model="selectedUsers"
  :role-filter="['admin', 'manager']"
/>
```

### 自定义用户项
```vue
<UserSelector v-model="selectedUsers">
  <template #user-item="{ user, selected }">
    <div class="custom-user-item">
      <img :src="user.avatar" :alt="user.username" />
      <span>{{ user.username }}</span>
      <el-tag v-if="selected" type="success">已选</el-tag>
    </div>
  </template>
</UserSelector>
```
```

## 🎨 样式规范

### CSS变量系统
```scss
// 组件样式变量
:root {
  // 颜色变量
  --user-selector-bg: #ffffff;
  --user-selector-border: #dcdfe6;
  --user-selector-hover: #f5f7fa;
  --user-selector-selected: #ecf5ff;
  
  // 尺寸变量
  --user-selector-padding: 16px;
  --user-selector-item-height: 60px;
  --user-selector-border-radius: 4px;
  
  // 字体变量
  --user-selector-font-size: 14px;
  --user-selector-font-weight: 400;
}

// 组件样式
.user-selector {
  background: var(--user-selector-bg);
  border: 1px solid var(--user-selector-border);
  border-radius: var(--user-selector-border-radius);
  
  &__item {
    height: var(--user-selector-item-height);
    padding: var(--user-selector-padding);
    font-size: var(--user-selector-font-size);
    
    &:hover {
      background: var(--user-selector-hover);
    }
    
    &.is-selected {
      background: var(--user-selector-selected);
    }
  }
}
```

### 响应式设计
```scss
.user-selector {
  // 桌面端样式
  @media (min-width: 768px) {
    .user-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
  }
  
  // 移动端样式
  @media (max-width: 767px) {
    .selector-header {
      flex-direction: column;
      gap: 8px;
    }
    
    .user-item {
      padding: 12px;
      
      .user-info {
        .user-name {
          font-size: 16px;
        }
      }
    }
  }
}
```

通过遵循这些组件开发规范和最佳实践，可以创建出高质量、可复用、易维护的Vue组件，为项目的长期发展提供坚实的基础。
