---
name: common-patterns
description: 项目通用开发模式和规范,供其他 agent 引用,作为单一真实来源
tools: Read, Grep, Glob
model: inherit
---

# 通用开发模式 (Common Patterns)

## 职责
提供项目通用的开发模式、规范和最佳实践,作为单一真实来源(Single Source of Truth),供其他 agent 文档引用,避免重复定义。

---

## 🎨 Vue 组件模式

### 图标使用规范 ⚠️ **禁止内联 SVG**

**核心原则**: 所有 SVG 必须下载为文件；禁止 `<svg>` 标签或 `v-html`；严禁硬编码 SVG 内容

#### 本地 SVG 图标 (src/assets/icons/*)

**推荐：使用 SvgIcon 组件**（`vite.config.ts` 的 `createSvgIconsPlugin` 把 `src/assets/icons/**` 自动注册为 symbol，规则是 `symbolId: '<项目名>-[dir]-[name]'`；`SvgIcon` 会按同一前缀拼 symbolId，所以 `name` 只传 `[dir]-[name]`，iconfont 的完整 id（`icon-` 开头）原样传）

```vue
<!-- ✅ 推荐：文件 src/assets/icons/common/icon-name.svg → symbolId = <项目名>-common-icon-name -->
<SvgIcon name="common-icon-name" :size="16" />

<script setup lang="ts">
import SvgIcon from '@/components/SvgIcon/index.vue';
</script>
```

**替代：直接使用 `<img>` 标签**（适用于简单场景或不需要符号复用时）

```vue
<img src="@/assets/icons/common/icon-name.svg" alt="Icon" class="w-6 h-6" />
```

#### 动态图标选择

```vue
<template>
  <!-- 方式 1: SvgIcon（推荐，支持动态 name） -->
  <SvgIcon :name="iconName" :size="size" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SvgIcon from '@/components/SvgIcon/index.vue';

interface Props {
  type?: 'primary' | 'secondary';
  size?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 16,
});

// 文件 src/assets/icons/common/icon-primary.svg / icon-secondary.svg
// → symbolId = <项目名>-common-icon-primary / <项目名>-common-icon-secondary
const iconName = computed(() =>
  props.type === 'primary' ? 'common-icon-primary' : 'common-icon-secondary'
);
</script>
```

#### 禁止的做法

```vue
<!-- ❌ 禁止：硬编码 SVG -->
<svg><path d="M..." /></svg>

<!-- ❌ 禁止：动态注入 HTML -->
<div v-html="svgContent"></div>
```

**详见**: [component-development.md#svg-使用规范](component-development.md#svg-使用规范)

---

### Props 定义规范

#### 完整的 Props 定义模板
```typescript
// ✅ 正确：完整的 Props 定义
interface Props {
  /** 用户ID */
  userId: string;
  /** 显示模式 */
  mode?: 'card' | 'list';
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 用户信息 */
  userInfo?: IUserInfo;
  /** 标签列表 */
  tags?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'card',
  showActions: true,
  tags: () => [],
});

// ❌ 错误：缺少类型定义
const props = defineProps(['userId', 'mode']);

// ❌ 错误：使用 any 类型
interface Props {
  data: any;  // 应该定义具体类型
}
```

#### Props 使用原则
1. **所有 Props 必须在模板中使用** - 避免定义未使用的参数
2. **Props 类型必须明确** - 不使用 `any` 类型
3. **可选属性使用 `?`** - 明确标识可选参数
4. **数组/对象默认值使用函数** - 避免引用类型共享

#### Props 命名规范
```typescript
// ✅ 正确：使用 camelCase
interface Props {
  userId: string;
  showActions: boolean;
  maxCount: number;
}

// ❌ 错误：使用 snake_case 或 PascalCase
interface Props {
  user_id: string;    // 应该是 userId
  ShowActions: boolean; // 应该是 showActions
}
```

### Emits 定义规范

#### 完整的 Emits 定义模板
```typescript
// ✅ 正确：完整的 Emits 定义
interface Emits {
  /** 更新事件 */
  (e: 'update', user: IUserInfo): void;
  /** 删除事件 */
  (e: 'delete', userId: string): void;
  /** v-model 更新事件 */
  (e: 'update:modelValue', value: string): void;
}

const emit = defineEmits<Emits>();

// 调用示例
emit('update', userInfo);
emit('delete', userId);
emit('update:modelValue', newValue);

// ❌ 错误：缺少类型定义
const emit = defineEmits(['update', 'delete']);
```

#### Emits 命名规范
```typescript
// ✅ 正确：普通事件用小写动词，v-model 用 update:xxx（camelCase 属性名）
interface Emits {
  (e: 'submit', data: IFormData): void;
  (e: 'cancel'): void;
  (e: 'update:modelValue', value: string): void;   // v-model
  (e: 'update:currentPage', page: number): void;   // v-model:currentPage
}

// ❌ 错误：事件名加 on 前缀
interface Emits {
  (e: 'onSubmit', data: IFormData): void;  // 应该是 'submit'
}
```

> ⚠️ v-model 事件名必须写成 `update:modelValue` 这种 camelCase 形式（Vue 官方风格）。
> 写成 `update:model-value` 虽然模板里能触发，但 `defineEmits` 的类型声明与 `v-model`
> 期望的签名对不上，父组件用 `v-model` 时会丢失类型检查。

### 组件响应式数据规范

```typescript
// ✅ 正确：明确的类型定义
const userInfo = ref<IUserInfo | null>(null);
const loading = ref<boolean>(false);
const userList = ref<IUserInfo[]>([]);

// ✅ 正确：计算属性有返回类型
const displayName = computed((): string => {
  return userInfo.value?.username || '未知用户';
});

// 项目里角色是单数字段 info.role（RoleType，值为大写），不是 roles 数组
const isAdmin = computed((): boolean => {
  return userInfo.value?.role === ROLES.ADMIN;
});

// ❌ 错误：缺少类型定义
const userInfo = ref(null);
const loading = ref(false);

// ❌ 错误：计算属性缺少返回类型
const displayName = computed(() => {
  return userInfo.value?.username || '未知用户';
});
```

### 组件嵌套规范 ⚠️ **重要**

**核心原则：避免过深嵌套**

- **避免组件层层嵌套**（优先拆分为平级组件）
- **避免 DOM 过深嵌套**
- **避免 SCSS 选择器过深嵌套**
- **使用 Flex/Grid 替代不必要的包装层**

> **详细规范**: [component-development.md#组件嵌套深度规范](component-development.md#组件嵌套深度规范)

### 骨架屏模式

> **详细指南**: [component-development.md#骨架屏开发规范](component-development.md#骨架屏开发规范)

⚠️ 项目**只有组件级骨架屏**，不存在路由级骨架屏（`RouteMeta` 没有 `skeleton` 字段，
也没有任何地方消费它）。不要写 `meta: { skeleton: ... }`。

**两种用法**：

1. **`useSkeleton()` composable** —— 管理 loading/visible，内置防闪烁（`delay` 短请求不闪、
   `minDuration` 最小展示时长）

```typescript
import { useSkeleton } from '@/composables/useSkeleton';

const skeleton = useSkeleton({ delay: 200, minDuration: 300 });
onMounted(() => skeleton.withLoading(async () => {
  data.value = await fetchData();
}));
onUnmounted(() => skeleton.cleanup());   // 清理定时器
```
返回 `{ loading, visible, startLoading, stopLoading, withLoading, cleanup }`，
模板用 `visible` 控制骨架屏显隐（而不是 `loading`）。

2. **直接用 Element Plus `el-skeleton`** —— 简单场景

```vue
<el-skeleton v-if="loading" :rows="5" animated />
<div v-else>{{ data }}</div>
```

**预置骨架屏组件**（`src/components/Skeleton/`）: `CardSkeleton` | `TableSkeleton` | `SkeletonWrap`

---

## 🎨 数据驱动模式

### 列表渲染规范

#### 使用 v-for + 数据数组
```vue
<!-- ✅ 正确：数据驱动的列表 -->
<template>
  <div class="menu-list">
    <div
      v-for="item in menuItems"
      :key="item.id"
      class="menu-item"
      @click="handleMenuClick(item)"
    >
      {{ item.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface MenuItem {
  id: string;
  label: string;
  icon?: string;
}

interface Props {
  menuItems: MenuItem[];
}

const props = defineProps<Props>();

const handleMenuClick = (item: MenuItem) => {
  console.log('Clicked:', item.label);
};
</script>

<!-- ❌ 错误：硬编码列表内容 -->
<template>
  <div class="menu-list">
    <div class="menu-item">首页</div>
    <div class="menu-item">用户管理</div>
    <div class="menu-item">设置</div>
  </div>
</template>
```

### 业务数据通过 Props 传入

#### 业务组件示例
```vue
<!-- ✅ 正确：统计数字通过 Props 传入 -->
<template>
  <div class="stats-card">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div class="trend">{{ trend }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 统计标签 */
  label: string;
  /** 统计值 */
  value: number | string;
  /** 趋势文本 */
  trend?: string;
}

const props = defineProps<Props>();
</script>

<!-- ❌ 错误：硬编码业务数据 -->
<template>
  <div class="stats-card">
    <div class="label">用户总数</div>
    <div class="value">1,234</div>
    <div class="trend">+12%</div>
  </div>
</template>
```

### 数据接口类型定义

```typescript
// ✅ 正确：完整的数据接口
interface IStatsCard {
  id: string;
  label: string;
  value: number | string;
  trend?: string;
  icon?: string;
}

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number;
  children?: MenuItem[];
}

// 在组件中使用
interface Props {
  statsData: IStatsCard[];
  menuItems: MenuItem[];
}

// ❌ 错误：缺少类型定义
const statsData = ref([
  { label: '用户总数', value: 1234 },  // 没有类型约束
]);
```

---

## 🎨 CSS 变量使用规范

### 必须使用 public/assets/theme.css 中定义的 CSS 变量

项目在 `public/assets/theme.css` 中定义了完整的 CSS 变量系统（301 个），所有样式中的颜色**必须**使用这些变量,**禁止硬编码颜色值**。

> ⚠️ **变量一律带 `--aix-` 前缀**（如 `var(--aix-colorText)`）——theme.css 由 `@aix/theme`
> 设计系统派生生成，运行 `pnpm genThemeCss` 重建，**请勿手改该文件**。
> 漏掉前缀（如 `--colorText`）就是未定义变量，样式会静默失效且不报错。
> 不确定变量名时，直接 grep `public/assets/theme.css` 确认。

#### 品牌主色只有一个来源

`src/constants/system.ts` 的 `BRAND_PRIMARY` 是品牌色的**唯一声明处**：它既是 theme.css 的生成
seed，也是设置页运行时覆盖主题色的派生基准，还是主题色字段的默认值。换品牌色只改这一行，
然后跑 `pnpm genThemeCss`。**不要在 scss 里另写色值**——`src/styles/theme.scss` 的
`--polymas-color-theme` 已经是 `var(--aix-colorPrimary)` 的别名，写死就会漂移。

#### Element Plus 组件怎么跟随主题

Element 不读 `--aix-*`，它有自己的一套变量，项目通过三条链把两边接起来：

| Element 变量 | 怎么跟随 | 在哪 |
|---|---|---|
| `--el-color-primary` | 指向 `--polymas-color-theme` → `--aix-colorPrimary` | `styles/theme.scss` |
| `--el-color-primary-light-3/5/7/8/9`、`-dark-2` | `color-mix` 复刻 Element 自身算法，跟随 `--aix-colorPrimary` | `styles/theme.scss` |
| `--el-border-radius-base` / `-small` | 站点主题运行时写入行内样式 | `plugins/site-config/theme.ts` |

> ⚠️ 只改 `--el-color-primary` 是不够的：Element 的 hover / plain / 禁用态、tag 浅底、
> menu 选中底读的都是 `light-*` 阶梯，漏掉就会「主色变了但这些地方还是原生蓝」。

**⚠️ Figma 设计稿还原例外**: 当还原 Figma 设计稿时,如果设计稿中明确标注了颜色和尺寸数值,**优先使用 Figma 标注的数值**。只有在 Figma 没有明确标注时,才使用 CSS 变量。

#### 文本颜色变量
```scss
.component {
  // ✅ 正确：使用 CSS 变量
  color: var(--aix-colorTextHeading);        // 标题文本 rgba(0,0,0,0.88)
  color: var(--aix-colorText);               // 普通文本 rgba(0,0,0,0.88)
  color: var(--aix-colorTextSecondary);      // 次要文本 rgba(0,0,0,0.65)
  color: var(--aix-colorTextTertiary);       // 三级文本 rgba(0,0,0,0.45)
  color: var(--aix-colorTextPlaceholder);    // 占位符 rgba(0,0,0,0.25)
  color: var(--aix-colorTextQuaternary);     // 四级文本 rgba(0,0,0,0.25)

  // ❌ 错误：硬编码颜色
  color: #333;
  color: rgba(0,0,0,0.88);
}
```

#### 背景颜色变量
```scss
.component {
  // ✅ 正确：使用 CSS 变量
  background: var(--aix-colorBgContainer);   // 容器背景 #ffffff
  background: var(--aix-colorBgLayout);      // 布局背景 #f5f5f5
  background: var(--aix-colorBgElevated);    // 浮层背景 #ffffff
  background: var(--aix-colorBgMask);        // 遮罩背景 rgba(0,0,0,0.45)
  background: var(--aix-colorBgBase);        // 基础背景 #ffffff

  // ❌ 错误：硬编码颜色
  background: #fff;
  background: #f5f5f5;
}
```

#### 边框颜色变量
```scss
.component {
  // ✅ 正确：使用 CSS 变量
  border: 1px solid var(--aix-colorBorder);           // 默认边框 #d9d9d9
  border: 1px solid var(--aix-colorBorderSecondary);  // 次要边框 #eeeeee

  // ❌ 错误：硬编码颜色
  border: 1px solid #e0e0e0;
}
```

#### 主题色变量
```scss
.component {
  // ✅ 正确：使用 CSS 变量
  background: var(--aix-colorPrimary);         // 主色 rgb(21, 70, 242)
  color: var(--aix-colorPrimaryText);          // 主色文本
  border-color: var(--aix-colorPrimaryBorder); // 主色边框
  background: var(--aix-colorPrimaryBg);       // 主色浅背景

  // ❌ 错误：硬编码主题色（且值会随主题切换而失效）
  background: rgb(21, 70, 242);
}
```

#### 状态颜色变量
```scss
.component {
  // ✅ 正确：使用 CSS 变量
  color: var(--aix-colorSuccess);            // 成功色
  color: var(--aix-colorWarning);            // 警告色
  color: var(--aix-colorError);              // 错误色
  color: var(--aix-colorInfo);               // 信息色

  // ❌ 错误：硬编码状态颜色
  color: #52c41a;  // 应该使用 var(--aix-colorSuccess)
  color: #ff4d4f;  // 应该使用 var(--aix-colorError)
}
```

#### 色板变量（辅助色）
```scss
.component {
  // ✅ 正确：使用色板变量
  background: var(--aix-tokenCyan1);   // 青色系列 (1-10)
  background: var(--aix-tokenCyan2);
  background: var(--aix-tokenBlue4);   // 蓝色系列
  background: var(--aix-tokenGreen5);  // 绿色系列
  background: var(--aix-tokenRed6);    // 红色系列

  // ❌ 错误：硬编码辅助色
  background: #e6f7ff;
}
```

---

## 📦 CSS 盒模型规范

> **详细指南**: Figma 转 CSS 的完整流程详见 [figma-extraction-guide.md#figma-转-css-盒模型](figma-extraction-guide.md#figma-转-css-盒模型)

### ⚠️ 核心原则

**Figma 尺寸包含 padding** - Figma 中标注的 width/height 是整体尺寸，包含 padding 和 border

```scss
// Figma: height: 80px, padding: 12px 0

// ✅ 正确
.element {
  box-sizing: border-box;  // 关键！
  height: 80px;            // 直接使用 Figma 值
  padding: 12px 0;
}
// 结果：总高度 = 80px ✅

// ❌ 错误
.element {
  height: 80px;            // 没有 box-sizing
  padding: 12px 0;
}
// 结果：总高度 = 104px ❌
```

### 快速检查清单

- [ ] 添加 `box-sizing: border-box`
- [ ] height/width 直接使用 Figma 值
- [ ] padding/border 直接使用 Figma 值
- [ ] 浏览器验证实际尺寸 = Figma 标注

### 全局设置

```scss
// 推荐在全局样式中设置
*, *::before, *::after {
  box-sizing: border-box;
}
```

---

## 🎨 样式选择器规范

### 禁止直接使用标签选择器

在组件样式中**禁止**直接使用标签名作为选择器,必须为每个元素添加语义化的 class。

```scss
// ❌ 错误：直接使用标签选择器
h1 {
  font-size: 24px;
  color: var(--aix-colorTextHeading);
}

h2 {
  font-size: 20px;
}

p {
  color: var(--aix-colorText);
}

div {
  padding: 20px;
}

// ✅ 正确：为每个元素添加 class
.page-title {
  font-size: 24px;
  color: var(--aix-colorTextHeading);
}

.section-title {
  font-size: 20px;
  color: var(--aix-colorTextHeading);
}

.text-content {
  color: var(--aix-colorText);
}

.content-wrapper {
  padding: 20px;
}
```

### BEM 命名规范

推荐使用 BEM (Block-Element-Modifier) 命名规范:

```scss
// ✅ 正确：BEM 命名
.user-card {
  // Block
  padding: 20px;
  border: 1px solid var(--aix-colorBorder);

  &__header {
    // Element
    display: flex;
    justify-content: space-between;
  }

  &__title {
    // Element
    font-size: 18px;
    color: var(--aix-colorTextHeading);
  }

  &__content {
    // Element
    margin-top: 16px;
  }

  &--large {
    // Modifier
    padding: 32px;
  }

  &--highlighted {
    // Modifier
    border-color: var(--aix-colorPrimary);
  }
}

// ❌ 错误：没有明确的命名规范
.card {
  .header {
    .title {
      span {
        // 嵌套过深
      }
    }
  }
}
```

### 选择器嵌套深度限制

样式嵌套深度不超过 3 层:

> 📌 这是**团队约定**，不是 lint 门禁——`stylelint.config.mjs` 实际配置的是
> `max-nesting-depth: 10`（存量代码嵌套较深，已主动放宽）。超过 3 层不会报错，但应主动拆分。

```scss
// ✅ 正确：嵌套不超过 3 层
.user-management {
  &__header {
    .search-input {
      // 2 层嵌套
      width: 100%;
    }
  }
}

// ❌ 错误：嵌套过深
.user-management {
  .container {
    .header {
      .search-bar {
        .input {
          // 5 层嵌套，过深
        }
      }
    }
  }
}
```

---

## 🎨 RGB 颜色函数规范

### 必须使用新语法形式

项目中使用 RGB 颜色时,**必须**使用新语法 `rgb(r g b / alpha)`,**禁止**使用旧语法 `rgba(r, g, b, alpha)`。

```scss
// ✅ 正确：使用新语法 rgb()
.component {
  color: rgb(0 0 0 / 0.88);
  background: rgb(255 255 255 / 0.5);
  border-color: rgb(0 180 180 / 1);
}

// ❌ 错误：使用旧语法 rgba()
.component {
  color: rgba(0, 0, 0, 0.88);
  background: rgba(255, 255, 255, 0.5);
}

// ❌ 错误：使用逗号分隔的 rgb()
.component {
  color: rgb(0, 0, 0);
}
```

### Alpha 通道规范

- **不透明色**: 可以省略 alpha 值或使用 `/ 1`
- **半透明色**: 必须使用 `/ alpha` 语法

```scss
// ✅ 正确：不透明色
.component {
  color: rgb(0 0 0);           // 省略 alpha
  color: rgb(0 0 0 / 1);       // 明确 alpha = 1
}

// ✅ 正确：半透明色
.component {
  color: rgb(0 0 0 / 0.88);
  background: rgb(255 255 255 / 0.5);
}

// ❌ 错误：使用逗号
.component {
  color: rgb(0, 0, 0, 0.88);
}
```

---

## 🎨 CSS 数值规范

- **不要补零凑精度**：`opacity: 0.88` 就写 `0.88`，不必写成 `0.880`；`line-height: 1.42` 同理。
- **不要保留无意义的亚像素**：Figma 因画板缩放导出的 `14.375px`、`123.456px` 这类值，
  应就近取整到设计意图（`14px` / `123px`）。字号、边框、圆角尤其要取整，否则跨浏览器渲染会发虚。
- **0 值不带单位**：写 `margin: 0`，不写 `0px`。
- **确实需要小数的场景**（百分比宽度、`flex-basis`、`transform` 比例）按实际需要保留 2–3 位即可，不做统一要求。

---

## 🔧 错误处理模式

### 异步函数错误处理

```typescript
// ✅ 正确：完整的错误处理
// 注意：API 请求错误已由 ErrorModule（src/api/core/request.ts）自动弹出提示，
// 这里只需维护本地状态，不要重复调用 ElMessage.error 导致提示弹两次
const fetchUserInfo = async (): Promise<void> => {
  loading.value = true;
  error.value = null;

  try {
    const response = await getAuthUserInfo();
    userInfo.value = response;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '获取用户信息失败';
    console.error('获取用户信息失败:', err);
  } finally {
    loading.value = false;
  }
};

// ❌ 错误：缺少错误处理
const fetchUserInfo = async () => {
  const response = await getAuthUserInfo();
  userInfo.value = response;
};
```

### Store Actions 错误处理

```typescript
// ✅ 正确：Store Action 错误处理
const loginAction = async (credentials: ILoginRequest): Promise<void> => {
  loading.value = true;

  try {
    const response = await postAuthLogin(credentials);
    userInfo.value = response.userInfo;

    // 持久化：Store 用 defineStore 的 persist 选项（localforage + IndexedDB）；
    // token 不在这里存 —— 本项目由 SSO 写入 Cookie，Store 里是 computed(() => getToken())
  } catch (error) {
    console.error('登录失败:', error);
    throw error;  // 重新抛出,让调用方处理
  } finally {
    loading.value = false;
  }
};

// ❌ 错误：吞掉错误
const loginAction = async (credentials: ILoginRequest) => {
  try {
    const response = await postAuthLogin(credentials);
    token.value = response.token;
  } catch (error) {
    console.error(error);  // 只打印,不抛出,调用方无法知道失败
  }
};
```

---

## 📋 导入规范

> **完整规范**: 详见 [coding-standards.md#导入规范](coding-standards.md#导入规范)

**导入顺序**: Vue 核心 → 第三方库 → 项目 API → Store → 工具函数 → 组件 → 类型

```typescript
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { postAuthLogin } from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import type { LoginRequest } from '@/api';
```

**核心原则**:
- 类型导入使用 `type` 关键字
- 项目内部使用 `@/` 别名
- 同目录使用相对路径

---

## 📋 快速参考清单

### Vue 组件开发检查
- [ ] Props 和 Emits 有完整的 TypeScript 接口定义
- [ ] 所有 Props 都在模板中使用
- [ ] 响应式数据类型明确
- [ ] 计算属性有返回类型注解
- [ ] 异步函数有完善的错误处理

### 组件嵌套检查 ⚠️ **重要**
- [ ] 避免组件层层嵌套
- [ ] 避免 DOM 过深嵌套
- [ ] 避免 SCSS 选择器过深嵌套
- [ ] 优先拆分为平级组件，而不是嵌套更深
- [ ] 使用 Flex/Grid 替代不必要的包装层
- [ ] 删除所有无意义的包装元素

### 样式开发检查
- [ ] 所有颜色使用 `var(--aix-colorXxx)` CSS 变量
- [ ] 不直接使用标签选择器 (`h1`, `p`, `div`)
- [ ] 每个元素都有语义化的 class 名称
- [ ] 避免样式选择器过深嵌套
- [ ] RGB 颜色使用新语法 `rgb(r g b / alpha)`

### 数据驱动检查
- [ ] 列表内容使用 `v-for` + 数据数组
- [ ] 业务数据通过 Props 传入
- [ ] 避免在模板中硬编码内容
- [ ] 定义了完整的数据接口类型

### 骨架屏使用检查
- [ ] 页面/组件异步加载用了 `useSkeleton()`（带 delay + minDuration 防闪烁）
- [ ] 模板用 `skeleton.visible` 而不是 `loading` 控制显隐
- [ ] 组件卸载时调用了 `skeleton.cleanup()`
- [ ] 骨架屏启用了 `animated` 动画
- [ ] 骨架屏尺寸与实际内容匹配
- [ ] 使用 TypeScript 类型安全配置

---

## 📚 相关文档

本文档作为通用模式的单一真实来源,被以下 agent 文档引用:

- [coding-standards.md#编码规范概览](coding-standards.md#编码规范概览) - 编码规范
- [component-development.md#组件开发规范](component-development.md#组件开发规范) - 组件开发
- [store-development.md#store设计原则](store-development.md#store设计原则) - 状态管理
- [testing.md#测试策略](testing.md#测试策略) - 测试规范

当其他文档中需要使用这些通用模式时,应该引用本文档,避免重复定义。

**引用示例**:
```markdown
> **Props定义规范**: 详见 [common-patterns.md#props-定义规范](common-patterns.md#props-定义规范)
> **CSS变量使用规范**: 详见 [common-patterns.md#css-变量使用规范](common-patterns.md#css-变量使用规范)
```
