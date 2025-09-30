# 组件开发规范

## 职责
专门负责Vue组件开发指导，包括组件设计原则、开发模式、最佳实践，区分基础组件和业务组件的开发规范。

## 🎯 组件设计原则

### 1. 单一职责原则
- **功能聚焦**: 每个组件只负责一个明确的功能
- **职责清晰**: 组件的作用和边界要明确定义
- **可测试性**: 单一职责使组件更容易测试

### 2. 可复用性原则
- **通用设计**: 基础组件应该具有通用性，避免业务耦合
- **配置灵活**: 通过Props提供灵活的配置选项
- **插槽支持**: 使用插槽提供内容定制能力

### 3. 组合优于继承
- **组合模式**: 通过组合小组件构建复杂功能
- **Hooks复用**: 使用Composition API实现逻辑复用

## 📦 组件分类体系

### 基础组件 (Base Components)
- **位置**: `src/components/`
- **特点**: 纯UI组件，无业务逻辑，高度可复用
- **命名**: 使用 `Base` 前缀，如 `BaseInput`、`BaseButton`

### 业务组件 (Business Components)
- **位置**: `src/business-components/`
- **特点**: 包含特定业务逻辑，与业务流程关联
- **命名**: 业务功能描述，如 `LoginInput`、`QrCodeLogin`

### 页面组件 (Page Components)
- **位置**: `src/views/`
- **特点**: 完整的页面实现，路由对应的组件
- **命名**: 页面名称，如 `Login`、`Home`

## 🛠️ 基础组件开发模板

### BaseInput 组件示例
```vue
<template>
  <div class="base-input">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-wrapper">
      <el-input
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :show-password="type === 'password'"
        :disabled="disabled"
        size="large"
        clearable
        @input="handleInput"
        @blur="handleBlur"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// ==================== 类型定义 ====================
interface BaseInputProps {
  /** 输入框标签 */
  label?: string;
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel';
  /** 占位符文本 */
  placeholder?: string;
  /** 输入框值 */
  modelValue?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

interface BaseInputEmits {
  /** 更新输入框值 */
  (e: 'update:modelValue', value: string): void;
  /** 输入事件 */
  (e: 'input', value: string): void;
  /** 失焦事件 */
  (e: 'blur', value: string): void;
}

// ==================== Props 和 Emits ====================
const props = withDefaults(defineProps<BaseInputProps>(), {
  label: '',
  type: 'text',
  placeholder: '',
  modelValue: '',
  disabled: false,
});

const emit = defineEmits<BaseInputEmits>();

// ==================== 响应式数据 ====================
const inputValue = ref(props.modelValue);

// ==================== 监听器 ====================
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue;
    }
  },
);

// ==================== 方法定义 ====================
const handleInput = (value: string) => {
  emit('update:modelValue', value);
  emit('input', value);
};

const handleBlur = () => {
  emit('blur', inputValue.value);
};
</script>

<style scoped lang="scss">
.base-input {
  width: 100%;
}

.input-label {
  margin-bottom: 12px;
  color: var(--colorTextHeading);
  font-size: 14.375px;
  font-weight: 400;
  line-height: 1.39;
}

.input-wrapper {
  :deep(.el-input) {
    .el-input__wrapper {
      height: 48px;
      border: 1px solid var(--colorTextQuaternary);
      border-radius: 6px;
      background: var(--colorBgContainer);
      box-shadow: none;
    }

    .el-input__inner {
      padding: 14px 12px;
      color: var(--colorTextHeading);
      font-size: 16px;
      line-height: 1.4;

      &::placeholder {
        color: var(--colorTextPlaceholder);
        font-size: 16px;
      }
    }

    &.is-focus .el-input__wrapper {
      border-color: var(--colorPrimary);
      box-shadow: 0 0 0 1px var(--colorPrimaryBorder);
    }

    &.is-disabled .el-input__wrapper {
      border-color: var(--colorBorder);
      background: var(--colorBgContainerDisabled);
    }
  }
}
</style>
```

## 🏢 业务组件开发模板

### LoginInput 组件示例
```vue
<template>
  <div class="login-input-container">
    <el-form 
      ref="loginFormRef" 
      :model="loginForm" 
      :rules="loginRules" 
      class="login-form" 
      @keyup.enter="handleLogin"
    >
      <el-form-item prop="phone">
        <BaseInput v-model="loginForm.phone" label="手机号" placeholder="请输入手机号" />
      </el-form-item>

      <el-form-item prop="password">
        <BaseInput
          v-model="loginForm.password"
          label="密码"
          type="password"
          placeholder="8-16位密码（大写字母+小写字母+数字）"
        />
      </el-form-item>

      <div class="form-actions">
        <el-checkbox v-model="agreedToTerms" class="agreement-checkbox">
          我已阅读并同意《用户协议》
        </el-checkbox>

        <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
          立即登录
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import BaseInput from '@/components/BaseInput/index.vue';
import { useUserStore } from '@/store';

// ==================== 类型定义 ====================
interface LoginInputEmits {
  /** 登录成功事件 */
  (e: 'login-success', token: string): void;
  /** 登录失败事件 */
  (e: 'login-error', error: Error): void;
}

// ==================== Emits ====================
const emit = defineEmits<LoginInputEmits>();

// ==================== Store ====================
const userStore = useUserStore();

// ==================== 响应式数据 ====================
const loginFormRef = ref<FormInstance>();
const loading = ref(false);
const agreedToTerms = ref(false);

const loginForm = reactive({
  phone: '',
  password: '',
});

// ==================== 表单验证规则 ====================
const loginRules: FormRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur',
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,16}$/,
      message: '密码需要8-16位，包含大写字母、小写字母和数字',
      trigger: 'blur',
    },
  ],
};

// ==================== 方法定义 ====================
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议');
    return;
  }

  try {
    await loginFormRef.value.validate();
    loading.value = true;

    const token = await userStore.loginAction({
      username: loginForm.phone,
      password: loginForm.password,
    });

    emit('login-success', token);
    ElMessage.success('登录成功！');
  } catch (error: any) {
    emit('login-error', error);
    ElMessage.error(error.message || '登录失败，请检查手机号和密码');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.login-input-container {
  width: 440px;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 36px;
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  .agreement-checkbox {
    height: 16px;

    :deep(.el-checkbox__input) {
      .el-checkbox__inner {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        border-color: var(--colorPrimary);
        background: var(--colorBgContainer);

        &::after {
          border-width: 1px;
          border-color: var(--colorBgContainer);
        }
      }

      &.is-checked .el-checkbox__inner {
        border-color: var(--colorPrimary);
        background: var(--colorPrimary);
      }
    }

    :deep(.el-checkbox__label) {
      color: var(--colorTextHeading);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.4;
    }
  }

  .login-btn {
    width: 100%;
    height: 48px;
    margin-top: 12px;
    transition: all 0.3s ease;
    border: none;
    border-radius: 6px;
    background: linear-gradient(92deg, var(--cyan-2) 0%, var(--blue-4) 100%);
    box-shadow: inset 0 -2px 0 0 var(--colorFillContent);
    color: var(--colorTextLight);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;

    &:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 -2px 0 0 var(--colorFillContent),
        0 4px 12px var(--colorPrimaryBorder);
    }

    &:active {
      transform: translateY(0);
    }

    &.is-loading {
      opacity: 0.8;
    }
  }
}
</style>
```

## 🎨 Figma设计稿还原

### 1. 使用Figma MCP获取设计数据
```typescript
// 使用Figma MCP工具获取设计稿数据
// 1. 从Figma URL获取fileKey和nodeId
// URL示例: https://www.figma.com/file/abc123/Design?node-id=123:456

// 2. 使用mcp_Framelink_Figma_MCP_get_figma_data获取设计数据
// fileKey: "abc123"
// nodeId: "123:456"

// 3. 获取组件的样式、布局、文本等信息
// 4. 根据设计数据生成符合编码规范的组件代码
```

### 2. 图片资源管理规范（重要）

#### 目录结构规范
```
src/assets/
├── images/              # 图片资源（PNG、JPG等）
│   ├── Login/          # 按页面/功能分类
│   │   ├── background.png
│   │   ├── logo.png
│   │   └── qrcode.png
│   ├── Home/
│   │   └── banner.png
│   └── common/         # 通用图片
│       └── default-avatar.png
└── icons/              # 图标资源（SVG）
    ├── Close.svg
    ├── Copy.svg
    └── user.svg
```

#### 图片资源检查流程
```typescript
/**
 * 图片资源下载前的检查流程
 */
// 1. 检查目标目录是否存在对应图片
// 2. 如果已存在相同名称的图片，跳过下载
// 3. 如果不存在，才下载新图片
// 4. 下载后验证图片是否正确加载

// 示例：检查图片是否存在
const imagePath = 'src/assets/images/Login/background.png';
// 如果 background.png 已存在，则不需要下载
// 如果不存在，使用 Figma MCP 下载
```

#### 图片路径使用规范
```vue
<template>
  <!-- ✅ 正确：使用相对路径导入 -->
  <img :src="backgroundImage" alt="登录背景" class="bg-image" />
  
  <!-- ❌ 错误：直接硬编码路径 -->
  <img src="/src/assets/images/Login/background.png" alt="登录背景" />
</template>

<script setup lang="ts">
import backgroundImage from '@/assets/images/Login/background.png';
// 或者
// import backgroundImage from '@/assets/images/Login/background.png?url';
</script>
```

### 3. 下载Figma图片资源（详细步骤）

#### 步骤1：获取图片节点信息
```typescript
// 从 Figma 设计数据中获取图片节点
// 1. 识别需要下载的图片节点（image fills 或 SVG icons）
// 2. 获取节点ID（格式：123:456）
// 3. 确定图片类型（PNG/SVG）
```

#### 步骤2：检查本地是否已存在
```typescript
// 在下载前，先检查本地路径
// 图片命名规则：
// - 使用语义化名称（如 background.png, logo.png）
// - 避免使用节点ID作为文件名
// - 保持文件名简洁且具有描述性

// 检查路径示例：
// src/assets/images/Login/background.png
// src/assets/images/Login/logo.png
// src/assets/icons/Close.svg
```

#### 步骤3：下载图片到正确目录
```typescript
// 使用 mcp_Framelink_Figma_MCP_download_figma_images 下载
// 参数示例：
{
  fileKey: "abc123",
  localPath: "/Users/xxx/project/src/assets/images/Login/", // 绝对路径
  nodes: [
    {
      nodeId: "123:456",
      fileName: "background.png",  // 语义化文件名
      imageRef: "xxx",             // 如果是图片填充
      needsCropping: false
    },
    {
      nodeId: "789:012",
      fileName: "logo.png",
      imageRef: "yyy",
      needsCropping: false
    }
  ]
}
```

#### 步骤4：验证图片加载
```vue
<script setup lang="ts">
// 下载后，在组件中验证导入
import background from '@/assets/images/Login/background.png';
import logo from '@/assets/images/Login/logo.png';

// 确保图片正确加载
console.log('Background:', background);
console.log('Logo:', logo);
</script>
```

### 4. 设计稿还原注意事项
- ✅ **精确还原**: 严格按照设计稿的尺寸、颜色、间距
- ✅ **无冗余**: 不添加设计稿中没有的元素或层级
- ✅ **图片管理**: 检查已存在图片，避免重复下载
- ✅ **路径规范**: 图片按页面/功能分类存放在 images 目录
- ✅ **响应式**: 考虑不同屏幕尺寸的适配
- ✅ **性能优化**: 图片压缩、懒加载
- ❌ **避免过度封装**: 不要为了组件化而增加不必要的层级

## 📖 组件开发最佳实践

### 1. 数据驱动原则（核心规范）

#### 模板应该由数据驱动
```vue
<!-- ❌ 错误：硬编码在模板中 -->
<template>
  <div class="menu-list">
    <div class="menu-item">首页</div>
    <div class="menu-item">用户管理</div>
    <div class="menu-item">系统设置</div>
    <div class="menu-item">关于我们</div>
  </div>
</template>

<!-- ✅ 正确：使用数据驱动 -->
<template>
  <div class="menu-list">
    <div 
      v-for="item in menuItems" 
      :key="item.id" 
      class="menu-item"
    >
      {{ item.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
// 定义数据接口
interface MenuItem {
  id: string;
  name: string;
  path?: string;
  icon?: string;
}

// 使用响应式数据
const menuItems = ref<MenuItem[]>([
  { id: '1', name: '首页', path: '/home' },
  { id: '2', name: '用户管理', path: '/users' },
  { id: '3', name: '系统设置', path: '/settings' },
  { id: '4', name: '关于我们', path: '/about' },
]);
</script>
```

#### 数据驱动的优势
```typescript
// 1. 便于后续接口对接
const fetchMenuItems = async () => {
  const response = await MenuApi.getMenuList();
  menuItems.value = response.data;
};

// 2. 便于数据过滤和处理
const activeItems = computed(() => 
  menuItems.value.filter(item => item.active)
);

// 3. 便于动态修改
const addMenuItem = (item: MenuItem) => {
  menuItems.value.push(item);
};
```

### 2. Props 设计原则
```typescript
// ✅ 正确：完整的Props定义
interface Props {
  /** 必需属性：明确类型 */
  data: ITableData[];
  /** 可选属性：提供默认值 */
  size?: 'small' | 'medium' | 'large';
  /** 布尔属性：默认false */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  loading: false,
});

// ❌ 错误：缺少类型定义
const props = defineProps(['data', 'size']);
```

### 3. 事件设计原则
```typescript
// ✅ 正确：完整的事件定义
interface Emits {
  /** 提交事件：提供完整的上下文信息 */
  (e: 'submit', data: IFormData): void;
  /** 更新事件：支持v-model */
  (e: 'update:modelValue', value: string): void;
}

const emit = defineEmits<Emits>();

// ❌ 错误：缺少类型定义
const emit = defineEmits(['submit', 'cancel']);
```

### 4. 样式规范（重要）

#### 4.1 颜色变量使用规范
```scss
// ✅ 正确：使用 public/theme.css 中定义的CSS变量
.component {
  // 文本颜色
  color: var(--colorTextHeading);          // 标题文本
  // color: var(--colorText);               // 普通文本
  // color: var(--colorTextSecondary);      // 次要文本
  // color: var(--colorTextTertiary);       // 三级文本
  // color: var(--colorTextPlaceholder);    // 占位符文本
  
  // 背景颜色
  background: var(--colorBgContainer);     // 容器背景
  // background: var(--colorBgLayout);      // 布局背景
  // background: var(--colorBgElevated);    // 浮层背景
  
  // 边框颜色
  border: 1px solid var(--colorBorder);    // 默认边框
  // border: 1px solid var(--colorBorderSecondary);  // 次要边框
  
  // 主题色
  // background: var(--colorPrimary);       // 主色
  // color: var(--colorPrimaryText);        // 主色文本
  // border-color: var(--colorPrimaryBorder); // 主色边框
}

// ❌ 错误：硬编码颜色值
.component {
  color: #333;              // 不要用硬编码
  background: #fff;         // 不要用硬编码
  border: 1px solid #e0e0e0;  // 不要用硬编码
}

// ✅ 正确：使用主题色板变量
.highlight {
  background: linear-gradient(92deg, var(--cyan-2) 0%, var(--blue-4) 100%);
}

.success-text {
  color: var(--colorSuccess);
}

.error-text {
  color: var(--colorError);
}

.warning-bg {
  background: var(--colorWarningBg);
  border: 1px solid var(--colorWarningBorder);
}
```

#### 4.2 样式选择器规范
```scss
// ❌ 错误：直接使用标签名
h1 {
  font-size: 24px;
  color: var(--colorTextHeading);
}

p {
  color: var(--colorText);
}

div {
  padding: 20px;
}

// ✅ 正确：为每个元素添加class
.page-title {
  font-size: 24px;
  color: var(--colorTextHeading);
}

.page-content {
  color: var(--colorText);
}

.content-wrapper {
  padding: 20px;
}

// ✅ 正确：使用语义化class名称
.menu-item {
  padding: 12px 16px;
  color: var(--colorText);
  
  &:hover {
    background: var(--controlItemBgHover);
    color: var(--colorPrimary);
  }
  
  &--active {
    background: var(--controlItemBgActive);
    color: var(--colorPrimary);
  }
}
```

#### 4.3 完整的样式示例
```vue
<template>
  <div class="user-card">
    <div class="user-card__header">
      <h3 class="user-card__title">{{ user.name }}</h3>
      <span class="user-card__status user-card__status--active">在线</span>
    </div>
    <div class="user-card__body">
      <p class="user-card__email">{{ user.email }}</p>
      <p class="user-card__phone">{{ user.phone }}</p>
    </div>
    <div class="user-card__footer">
      <button class="user-card__btn user-card__btn--primary">编辑</button>
      <button class="user-card__btn user-card__btn--danger">删除</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 使用BEM命名规范 + CSS变量
.user-card {
  padding: 20px;
  border: 1px solid var(--colorBorder);
  border-radius: 8px;
  background: var(--colorBgContainer);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  &__title {
    margin: 0;
    color: var(--colorTextHeading);
    font-size: 18px;
    font-weight: 600;
  }

  &__status {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    
    &--active {
      color: var(--colorSuccessText);
      background: var(--colorSuccessBg);
      border: 1px solid var(--colorSuccessBorder);
    }
    
    &--offline {
      color: var(--colorTextSecondary);
      background: var(--colorFillAlter);
      border: 1px solid var(--colorBorder);
    }
  }

  &__body {
    margin-bottom: 16px;
  }

  &__email,
  &__phone {
    margin: 8px 0;
    color: var(--colorTextSecondary);
    font-size: 14px;
  }

  &__footer {
    display: flex;
    gap: 12px;
  }

  &__btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;
    
    &--primary {
      color: var(--colorTextLight);
      background: var(--colorPrimary);
      
      &:hover {
        background: var(--colorPrimaryHover);
      }
    }
    
    &--danger {
      color: var(--colorTextLight);
      background: var(--colorError);
      
      &:hover {
        background: var(--colorErrorHover);
      }
    }
  }
}
</style>
```

### 4. 避免冗余DOM和样式（重点）

#### DOM结构优化原则
```vue
<!-- ✅ 正确：简洁的DOM结构 -->
<template>
  <div class="base-input">
    <label v-if="label" class="input-label">{{ label }}</label>
    <el-input v-model="inputValue" />
  </div>
</template>

<!-- ❌ 错误：冗余的DOM层级 -->
<template>
  <div class="base-input-container">
    <div class="base-input-wrapper">
      <div class="base-input-inner">
        <div class="label-wrapper">
          <label>{{ label }}</label>
        </div>
        <div class="input-wrapper">
          <el-input v-model="inputValue" />
        </div>
      </div>
    </div>
  </div>
</template>
```

#### 样式优化原则
```scss
// ✅ 正确：简洁的样式，避免冗余
.base-input {
  width: 100%;

  .input-label {
    margin-bottom: 12px;
    color: var(--colorTextHeading);
    font-size: 14.375px;
  }

  :deep(.el-input) {
    .el-input__wrapper {
      height: 48px;
      border: 1px solid var(--colorTextQuaternary);
    }
  }
}

// ❌ 错误：过度嵌套和冗余样式
.base-input-container {
  .base-input-wrapper {
    .base-input-inner {
      .label-wrapper {
        label {
          display: block;
          margin-bottom: 12px;
          padding: 0;
          border: none;
          background: none;
          color: var(--colorTextHeading);
        }
      }
      .input-wrapper {
        position: relative;
        display: block;
        width: 100%;
        // ... 更多冗余样式
      }
    }
  }
}
```

#### 代码优化检查清单
- [ ] **只在必要时添加包装div**
- [ ] **能用单个元素不用多个**
- [ ] **避免超过3层的DOM嵌套**
- [ ] **避免超过3层的样式嵌套**
- [ ] **不添加没有实际作用的div**
- [ ] **使用Flex/Grid减少嵌套**
- [ ] **删除未使用的CSS代码**

## 📂 组件目录结构

### 基础组件
```
src/components/
├── BaseInput/
│   └── index.vue
├── BaseButton/
│   └── index.vue
└── BaseTable/
    └── index.vue
```

### 业务组件
```
src/business-components/
├── LoginInput/
│   └── index.vue
├── QrCodeLogin/
│   └── index.vue
└── UserSelector/
    └── index.vue
```

### 页面组件
```
src/views/
├── Login/
│   └── index.vue
├── Home/
│   └── index.vue
└── User/
    └── index.vue
```

## 📋 组件开发快速检查清单

### 图片资源检查（新增）
- [ ] 图片已按页面/功能分类存放在 `src/assets/images/` 目录
- [ ] 图标已存放在 `src/assets/icons/` 目录
- [ ] 下载前已检查本地是否存在同名图片
- [ ] 图片路径使用导入方式而非硬编码
- [ ] 图片文件命名语义化（如 `background.png`，而非 `image-123.png`）

### 数据驱动检查（新增）
- [ ] 列表、菜单等重复内容使用 `v-for` + 数据数组
- [ ] 避免在模板中硬编码内容
- [ ] 定义了完整的数据接口类型
- [ ] 数据结构便于后续接口对接
- [ ] 使用计算属性处理派生数据

### 样式规范检查（强化）
- [ ] 使用 `public/theme.css` 中定义的CSS变量
- [ ] 所有颜色使用 `var(--colorXxx)` 而非硬编码
- [ ] 不直接使用标签名选择器（如 `h1`, `p`, `div`）
- [ ] 每个元素都添加了语义化的 class 名称
- [ ] 遵循 BEM 命名规范或项目统一规范
- [ ] 避免深层嵌套选择器（不超过3层）
- [ ] 响应式设计（如需要）
- [ ] 避免冗余样式

### 基础组件检查
- [ ] 无业务逻辑，纯UI组件
- [ ] Props和Emits有完整的TypeScript接口定义
- [ ] DOM结构简洁，无冗余层级
- [ ] 样式使用scoped避免污染
- [ ] 支持v-model（如适用）

### 业务组件检查
- [ ] 业务逻辑清晰
- [ ] 使用基础组件而不是重复造轮子
- [ ] Props和Emits有完整的类型定义
- [ ] 错误处理完善
- [ ] 加载状态处理
- [ ] 与Store集成（如需要）

## ❓ 常见问题

### Q: 基础组件和业务组件如何区分？
**A**: 
- **基础组件**: 不包含业务逻辑，可在任何项目中复用，放在`src/components/`
- **业务组件**: 包含特定业务逻辑，与当前项目业务关联，放在`src/business-components/`

### Q: 什么时候应该拆分组件？
**A**: 符合以下条件之一就应该拆分：
- 组件代码超过200行
- 组件职责超过一个
- 有独立的业务逻辑
- 需要在多处复用

### Q: 如何避免冗余的DOM结构？
**A**: 
```vue
<!-- 评估每个div是否必要 -->
<!-- ✅ 必要的div：用于布局或样式容器 -->
<div class="form-actions">
  <el-checkbox v-model="agreed">同意协议</el-checkbox>
  <el-button @click="submit">提交</el-button>
</div>

<!-- ❌ 不必要的div：仅用于包装单个元素 -->
<div class="button-wrapper">
  <el-button @click="submit">提交</el-button>
</div>

<!-- ✅ 直接使用：单个元素不需要包装 -->
<el-button @click="submit">提交</el-button>
```

**原则**：
- 只在确实需要时才添加包装div
- 能用单个元素实现的不要用多个
- 使用Flex/Grid布局减少嵌套
- 避免为了样式而添加无意义的div
- 参考Figma设计稿的实际层级结构

### Q: 如何设计灵活的Props接口？
**A**: 
```typescript
interface Props {
  // 1. 必需的核心数据
  data: IUserInfo[];
  // 2. 可选的配置项（提供默认值）
  size?: 'small' | 'medium' | 'large';
  // 3. 行为控制开关
  showAvatar?: boolean;
  // 4. 自定义函数（明确签名）
  onRowClick?: (user: IUserInfo) => void;
}
```

## 🚀 组件开发工作流程

### 1. 从Figma设计稿开始
```
1. 获取Figma设计稿链接
2. 使用Figma MCP获取设计数据
3. 下载图片资源到src/assets/images/或icons/
4. 分析组件结构和样式
```

### 2. 组件开发步骤
```
1. 确定组件类型（基础/业务/页面）
2. 创建组件目录和文件
3. 定义Props和Emits类型
4. 实现组件逻辑（无冗余代码）
5. 精确还原设计稿样式
6. 测试组件功能
```

### 3. 代码质量检查
```
- [ ] 符合编码规范
- [ ] 无冗余DOM层级（≤3层）
- [ ] 无冗余样式代码
- [ ] 类型定义完整
- [ ] 使用CSS变量
- [ ] 图片资源已分类存放
```

## 📊 组件质量标准

### 可接受的质量指标
- **DOM层级**: ≤ 3层嵌套
- **样式嵌套**: ≤ 3层
- **组件文件大小**: ≤ 300行
- **Props数量**: ≤ 10个
- **设计稿还原度**: ≥ 95%

### 代码简洁度评估
```typescript
// 评估DOM层级
const domLevels = countDOMNesting(template);
// 目标: ≤ 3

// 评估样式嵌套
const styleLevels = countStyleNesting(styles);
// 目标: ≤ 3

// 评估代码行数
const lines = countCodeLines(component);
// 目标: ≤ 300
```

通过遵循这些组件开发规范，可以创建出高质量、简洁、可复用、易维护的Vue组件。
