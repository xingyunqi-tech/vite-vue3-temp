---
name: component-development
description: Vue组件开发指导，包括组件设计原则、开发模式、最佳实践，区分基础组件和业务组件的开发规范
tools: Read, Grep, Glob, WebFetch, WebSearch
model: inherit
---

# 组件开发规范

## 职责
专门负责Vue组件开发指导，包括组件设计原则、开发模式、最佳实践，区分基础组件和业务组件的开发规范。

> **通用规范参考**: 本文档中使用的通用开发模式详见 [common-patterns.md](common-patterns.md),包括:
> - [Props/Emits 定义规范](common-patterns.md#props-定义规范)
> - [数据驱动模式](common-patterns.md#数据驱动模式)
> - [CSS 变量使用规范](common-patterns.md#css-变量使用规范)
> - [CSS 盒模型规范](common-patterns.md#css-盒模型规范) ⚠️ **重要**
> - [样式选择器规范](common-patterns.md#样式选择器规范)
> - [错误处理模式](common-patterns.md#错误处理模式)

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

## 📐 页面布局约定

- **全局Layout已提供**: 项目已在 `src/layout/` 目录实现完整的头部、侧边导航等布局，不需要在业务页面或组件中重复构建。
- **遵循现有容器**: 页面开发时应直接在既有 Layout 提供的主内容区域内组合业务组件，保持与全局布局的一致性。
- **处理含 Layout 的设计稿**: 如果设计稿包含头部或侧栏，仅作为参考，上线代码仍需要复用现有 Layout 结构，避免重复创建 header、nav 等外围元素。

## 🎨 视觉规范补充

- **颜色和尺寸** ⚠️ **重要**: 还原 Figma 设计稿时,**优先使用 Figma 中标注的颜色和尺寸数值**，先保证还原度；等设计体系稳定后再统一替换为 CSS 变量。只有在 Figma 没有明确标注时,才直接使用 `public/assets/theme.css` 中的变量。
  - 📌 硬编码色值会被 `pnpm checkCssVars` 列出——**这是「待替换清单」，不是错误**。该脚本是手动巡检工具，不在 pre-commit 门禁内（门禁是 lint-staged、type-check、test，模板真源另加 check:template），不会阻塞提交。
  - 替换时机：设计稿定稿、或该色值在多处复用时，去 `theme.css` 找语义最接近的 `var(--aix-*)` 换掉。
- **字体**: 默认字体使用 `"'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif"`。当设计稿的 `font-family` 明确为其他字体时，再在组件/页面样式中单独声明该字体；不得自行更换或追加未标注的字体。
- **间距**: 组件和页面的 `padding`、`margin` 必须严格遵循设计稿标注，禁止随意估计数值；建议在开发前记录关键尺寸，确保还原度。
- **盒模型** ⚠️ **重要**:
  - **Figma 尺寸包含 padding**: Figma 中标注的 width/height 是整体尺寸，包含 padding 和 border
  - **必须使用 border-box**: 凡是同时设置了 `width/height` 和 `padding` 的元素，**必须**声明 `box-sizing: border-box;`
  - **直接使用 Figma 值**: height/width 直接使用 Figma 标注值，不要手动计算内容区尺寸
  - 详见 [common-patterns.md#css-盒模型规范](common-patterns.md#css-盒模型规范)
- **装饰图层**: 若设计稿只是单纯的背景色或渐变，可直接使用 CSS；不要额外添加无意义的 DOM 结构模拟光晕或遮罩层。
- **布局方式**: 优先通过设计稿标注的 padding、margin、栅格还原布局；仅当设计稿明确给出绝对坐标或层级需求时再使用定位，避免为了省事而用 `position: absolute` 解决问题。
- **背景图片**: 当元素的背景图与容器尺寸一致时直接使用 `background`；若尺寸不一致或需偏移位置，可在容器内使用绝对定位的元素承载图片并配合 `overflow` 控制。
- **颜色函数**: 必须使用 rgb() 的新语法形式（如 `rgb(0 0 0 / 0.5)`），禁止使用 rgba() 函数。详见 [common-patterns.md#RGB颜色函数规范](common-patterns.md)

## 📦 组件分类体系

### 基础组件 (Base Components)
- **位置**: `src/components/`
- **特点**: 纯UI组件，无业务逻辑，高度可复用
- **命名**: PascalCase，如 `ErrorBoundary`、`Skeleton`

### 页面级组件 (Page-specific Components)
- **位置**: `src/views/[page]/components/`
- **特点**: 特定页面的专属组件，包含特定业务逻辑，与业务流程关联
- **命名**: 业务功能描述，如 `LoginInput`、`QrCodeLogin`
- **说明**: 页面级组件放在对应页面目录下的 `components` 子目录中

### 页面组件 (Page Components)
- **位置**: `src/views/`
- **特点**: 完整的页面实现，路由对应的组件
- **命名**: 页面名称，如 `Login`、`Home`

#### 页面路由规范
- **同步配置**: 创建新页面组件时,必须同步在 `src/router/routes/static.ts`（无需动态权限）或 `src/router/routes/async.ts`（需 `meta.roles` 权限）配置路由，**不是** `src/router/index.ts`
- **命名规范**:
  - 路由 `path` 使用小写和短横线 (如 `/user-management`)
  - 路由 `name` 使用大驼峰 (如 `UserManagement`)
  - 路由 `name` 必须全局唯一
- **元信息完整**: 必须设置 `meta.title`,根据需要设置 `meta.requiresAuth` 等

```typescript
// ✅ 正确：完整的路由配置示例
{
  path: '/user-management',
  name: 'UserManagement',
  component: () => import('@/views/user-management/index.vue'),
  meta: {
    title: '功能名称',
    requiresAuth: true,
    roles: [ROLES.ADMIN, ROLES.TEACHER],  // 用 @/constants 的常量，值为大写；不要写 ['admin']
  }
}

// ❌ 错误：路由命名不规范
{
  path: '/userManagement',        // 应该使用短横线
  name: 'user-management',        // 应该使用大驼峰
  component: () => import('@/views/user-management/index.vue')
  // 缺少 meta 配置
}
```

### 骨架屏组件 (Skeleton Components)
- **位置**: `src/components/Skeleton/`
- **特点**: 在页面/组件加载时显示，提升用户体验
- **命名**: 使用 `Skeleton` 后缀

## 🦴 骨架屏开发规范

### ⚠️ 只有组件级骨架屏

项目**不存在路由级骨架屏**——`RouteMeta` 没有 `skeleton` 字段，也没有任何地方消费它。
不要写 `meta: { skeleton: ... }`，那是无效配置。

#### 1. useSkeleton composable（推荐）

`src/composables/useSkeleton.ts` 管理 loading/visible 状态，内置防闪烁：

```vue
<template>
  <CardSkeleton v-if="skeleton.visible.value" :count="4" />
  <div v-else class="content">{{ data }}</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useSkeleton } from '@/composables/useSkeleton';
import { CardSkeleton } from '@/components/Skeleton';

const data = ref<IDataItem[]>([]);
// delay: 短请求不显示骨架屏；minDuration: 最小展示时长，防止一闪而过
const skeleton = useSkeleton({ delay: 200, minDuration: 300 });

onMounted(() => skeleton.withLoading(async () => {
  data.value = await fetchData();
}));
onUnmounted(() => skeleton.cleanup());  // 清理定时器，避免卸载后仍修改 ref
</script>
```

`UseSkeletonOptions`: `initialLoading`(默认 true) / `minDuration`(默认 300) / `delay`(默认 0)
返回值: `{ loading, visible, startLoading, stopLoading, withLoading, cleanup }`

> 模板里用 **`visible`** 控制显隐，不是 `loading`——`visible` 才计入了 delay 与 minDuration。

#### 2. Element Plus el-skeleton（简单场景）

```vue
<template>
  <el-skeleton v-if="loading" :rows="5" animated />
  <div v-else class="content">
    <div v-for="item in data" :key="item.id">{{ item.name }}</div>
  </div>
</template>
```

### 预置骨架屏组件

统一从 `@/components/Skeleton` 导入（`index.ts` 只导出下面 3 个）：

| 组件 | 位置 | 使用场景 |
|------|------|---------|
| **CardSkeleton** | `src/components/Skeleton/CardSkeleton/` | 卡片布局 |
| **TableSkeleton** | `src/components/Skeleton/TableSkeleton/` | 数据表格页面 |
| **SkeletonWrap** | `src/components/Skeleton/SkeletonWrap/` | 骨架屏包装容器 |

> 另有 `src/layout/LayoutMenu/MenuSkeleton.vue`，是 Layout 侧边栏专用，不对外导出。

### 自定义骨架屏 Props 规范

```typescript
// ✅ 正确：完整的 Props 定义
interface CardSkeletonProps {
  /** 卡片数量 */
  count?: number;
  /** 每个卡片的行数 */
  rows?: number;
  /** 每行卡片列数 */
  columns?: number;
  /** 是否显示动画 */
  animated?: boolean;
}

const props = withDefaults(defineProps<CardSkeletonProps>(), {
  count: 4,
  rows: 4,
  columns: 2,
  animated: true,
});
```

### 使用原则

1. **优先 useSkeleton** - 有防闪烁处理，体验更好
2. **简单场景用 el-skeleton** - 局部小块加载
3. **动画增强** - 启用 `animated` 属性
4. **尺寸匹配** - 骨架屏尺寸与实际内容接近，避免布局跳动

## 🎯 组件层级开发规范(重要)

### 复杂组件的正确开发顺序

当需要开发包含复杂交互的业务组件时,必须遵循以下开发顺序:

#### 步骤1: 分析组件需求,识别基础能力
```
问题: 需要开发"功能日历"组件
分析:
- 基础能力: 日历展示、日期选择
- 业务能力: 显示预约状态、处理预约逻辑
结论: 需要先开发基础日历组件
```

#### 步骤2: 开发基础组件
```vue
<!-- src/components/BaseCalendar/index.vue -->
<!-- 纯UI日历组件,不包含任何业务逻辑 -->
<template>
  <div class="base-calendar">
    <!-- 通用日历UI实现 -->
  </div>
</template>

<script setup lang="ts">
// 只包含日历展示和选择的通用逻辑
// 不涉及功能名称等业务逻辑
</script>
```

#### 步骤3: 基于基础组件开发页面级组件
```vue
<!-- src/views/schedule/components/ScheduleCalendar/index.vue -->
<!-- 基于BaseCalendar封装的业务日历 -->
<template>
  <div class="schedule-calendar">
    <BaseCalendar
      v-model="selectedDate"
      :marked-dates="scheduledDates"
      @date-select="handleDateSelect"
    />
    <!-- 添加业务相关的日程信息展示 -->
  </div>
</template>

<script setup lang="ts">
import BaseCalendar from '@/components/BaseCalendar/index.vue';
// 添加日程管理的业务逻辑
</script>
```

#### 步骤4: 在页面中使用业务组件
```vue
<!-- src/views/schedule/index.vue -->
<template>
  <div class="schedule-page">
    <ScheduleCalendar @schedule="handleSchedule" />
  </div>
</template>
```

### 组件层级关系图
```
页面组件 (Page)
    ↓ 使用
业务组件 (Business)
    ↓ 基于
基础组件 (Base)
```

### 错误示例 ❌
```vue
<!-- 错误: 直接在业务组件中实现所有功能,没有抽象基础组件 -->
<template>
  <div class="schedule-calendar">
    <!-- 直接实现日历UI + 业务逻辑 -->
    <!-- 导致组件难以复用,逻辑耦合 -->
  </div>
</template>
```

### 正确示例 ✅
```vue
<!-- 1. 先开发 BaseCalendar (基础组件) -->
<!-- 2. 再开发 ScheduleCalendar (业务组件,基于BaseCalendar) -->
<!-- 3. 页面中使用 ScheduleCalendar -->
```

## 🎨 设计稿还原规范

### 1. 获取设计数据和资源

使用 Figma MCP 提取设计稿信息并下载资源。

**详细指导**: [figma-extraction-guide.md#完整提取流程总结](figma-extraction-guide.md#完整提取流程总结)

完成以下步骤后，进入组件实现阶段：

- [ ] 提取 fileKey 和 nodeId（从 Figma URL）
- [ ] 使用 `mcp__figma__get_figma_data` 获取设计数据
- [ ] 提取设计 Token（间距、颜色、字体、特效）
- [ ] 下载 SVG 图标到 `src/assets/icons/[project-name]/`（使用小写短横线格式 kebab-case）
- [ ] 下载 PNG 图片到 `src/assets/images/[project-name]/`（使用小写短横线格式 kebab-case）

### 2. SVG 使用规范 ⚠️ **重要 - 禁止内联 SVG**

**核心原则**: 详见 [common-patterns.md#图标使用规范](common-patterns.md#图标使用规范)（所有 SVG 必须下载为文件，严禁 `<svg>` 标签或 `v-html`）

**首选 SvgIcon 组件**：`vite.config.ts` 的 `createSvgIconsPlugin` 已把 `src/assets/icons/**` 注册为 symbol（`symbolId: '<项目名>-[dir]-[name]'`），用 SvgIcon 可以通过 `color` / `currentColor` 直接换色，无需准备多份切图。

```vue
<!-- 文件 src/assets/icons/common/icon-user.svg → name 传 "common-icon-user" -->
<SvgIcon name="common-icon-user" :size="16" />
```

`<img>` 仅用于**纯装饰、不需要换色**的图片型 SVG。

**资源目录**:
```
src/assets/
├── icons/[project-name]/  # SVG 图标（kebab-case）
└── images/[project-name]/ # PNG/JPG 图片（kebab-case）
```

**颜色控制**: 用 SvgIcon 的 `color` prop 或父级 `currentColor` 换色。只有在图标含多色、无法用单色渲染时，才准备多个颜色版本切图。

### 3. PC 端设计稿规范

#### 设计稿尺寸约定
- **设计稿宽度**: PC 端设计稿一般为 1920px
- **响应式处理**: 页面中较宽的部分一般设置宽度自适应，避免内容超出
- **固定宽度组件**: 组件本身保持设计稿标注的固定宽度
- **容器自适应**: 布局容器使用 `width: 100%` 或 `flex: 1` 实现自适应

### 4. 视觉还原规范

#### 尺寸规范（重要）
- ✅ **组件宽度精确匹配**: 组件的宽度尽量与设计稿保持一致
- ✅ **高度自适应**: 组件高度一般使用自适应，让内容撑开高度
- ✅ **像素级精确**: 使用设计稿中的具体数值，不能随意调整宽度

```scss
// ✅ 正确：宽度匹配设计稿，高度自适应
.login-container {
  width: 440px;        // 设计稿标注的精确宽度
  // height: auto;     // 高度自适应，让内容撑开
}

.user-card {
  width: 320px;        // 精确匹配设计稿
  // height: auto;     // 高度自适应
  padding: 24px;       // 设计稿标注的内边距
}

.button {
  width: 120px;        // 按钮精确宽度
  height: 48px;        // 按钮等交互元素可以固定高度
  border-radius: 6px;  // 精确圆角值
}

// ✅ 正确：容器类组件使用自适应高度
.content-wrapper {
  width: 100%;         // 容器宽度
  min-height: 0;       // 高度由内容决定
  padding: 20px;
}

// ❌ 错误：随意调整宽度
.login-container {
  width: 400px;        // 偏离设计稿的440px
}

.user-card {
  width: 100%;         // 应该使用设计稿的320px
}
```

#### 其他还原要求
- ✅ **精确还原**: 严格按照设计稿的尺寸、颜色、间距
- ✅ **无冗余**: 不添加设计稿中没有的元素或层级
- ✅ **图片管理**: 检查已存在图片，避免重复下载
- ✅ **路径规范**: 图片按页面/功能分类存放在 images 目录
- ✅ **性能优化**: 图片压缩、懒加载
- ✅ **完整还原**: 参考完整设计稿，不遗漏任何设计元素和交互
- ✅ **使用合适组件**: 使用设计系统中对应的组件进行还原，保持一致性
- ❌ **避免过度封装**: 不要为了组件化而增加不必要的层级

> ⚠️ **注意**: `postcss.config.ts` 里**只有 autoprefixer**，没有配置任何 px 转换插件
> （无 postcss-pxtorem / postcss-px-to-viewport）——写下的 px 就是最终 px，不会被自动适配。
>
> 这是 PC 管理后台的合理选择：用**弹性布局**做适应，而不是整体缩放。
> - 外层容器 `width: 100%` / `flex: 1`，内容区给 `max-width` + `margin: 0 auto`
> - 卡片列表用 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
> - 确需断点时在组件内写 `@media`，不要指望构建层帮你转换单位

## 📖 组件开发最佳实践

### 1. 组件参数使用原则（核心规范）

> **详细规范**: 完整的 Props/Emits 定义规范详见 [common-patterns.md#props-定义规范](common-patterns.md#props-定义规范)

#### 核心原则
- 所有定义的 Props 都必须在模板中使用
- 避免硬编码数据,通过 Props 传入
- Props 类型必须明确,不使用 `any`

### 2. 数据驱动原则（核心规范）

> **详细规范**: 完整的数据驱动模式详见 [common-patterns.md#数据驱动模式](common-patterns.md#数据驱动模式)

#### 核心原则
- 列表内容使用 `v-for` + 数据数组
- 业务数据通过 Props 传入
- 避免在模板中硬编码内容

### 3. 组件间距和布局规范（重要）

#### 4.1 组件间距还原规范
```scss
// ✅ 正确：严格按照设计稿的组件间距
.home-content {
  // 参考完整设计稿中的布局间距
  .welcome-section {
    margin-bottom: 32px;      // 设计稿标注的精确间距
  }

  .stats-section {
    margin-bottom: 24px;      // 与设计稿保持一致
  }

  .cards-grid {
    gap: 16px;                // 卡片之间的精确间距
    margin-top: 20px;         // 顶部间距
  }
}

// 页面级别的组件布局
.page-layout {
  .header {
    height: 64px;             // Header精确高度
    margin-bottom: 24px;      // Header与内容的间距
  }

  .main-content {
    padding: 0 24px;          // 页面内容边距
  }

  .sidebar {
    width: 240px;             // 侧边栏精确宽度
    margin-right: 16px;       // 与主内容的间距
  }
}

// ❌ 错误：随意设置间距，未参考设计稿
.content {
  margin: 20px;              // 应该根据设计稿具体标注
  padding: 15px;             // 应该使用设计稿的精确值
}

.card-list {
  gap: 10px;                 // 应该使用设计稿标注的间距
}
```

#### 4.2 完整布局还原原则
```vue
<!-- ✅ 正确：基于完整设计稿的布局还原 -->
<template>
  <div class="home-page">
    <!-- 顶部欢迎区域 -->
    <section class="welcome-section">
      <WelcomeCard />
    </section>

    <!-- 统计卡片区域 -->
    <section class="stats-section">
      <div class="stats-grid">
        <StatsCard v-for="item in statsData" :key="item.id" v-bind="item" />
      </div>
    </section>

    <!-- 功能卡片区域 -->
    <section class="features-section">
      <div class="features-grid">
        <ProductCard />
        <OrderCard />
        <UserCard />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
// 严格按照完整设计稿的布局和间距
.home-page {
  padding: 24px;             // 页面内边距

  .welcome-section {
    margin-bottom: 32px;     // 与下一部分的间距
  }

  .stats-section {
    margin-bottom: 40px;     // 统计区域与功能区域的间距

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;             // 统计卡片间距
    }
  }

  .features-section {
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;             // 功能卡片间距
    }
  }
}
</style>

<!-- ❌ 错误：未参考完整设计稿，随意组织布局 -->
<template>
  <div class="home">
    <div class="content">
      <WelcomeCard />
      <StatsCard />
      <ProductCard />
    </div>
  </div>
</template>
```

### 4. 组件嵌套深度规范 ⚠️ **重要**

**核心原则：**
1. **避免组件层层嵌套**（优先拆分为平级组件）
2. **避免 DOM 过深嵌套**
3. **避免 SCSS 选择器过深嵌套**
4. **使用 Flex/Grid 替代不必要的包装层**
5. **删除无意义的包装元素**

### 5. 样式规范（重要）

> **详细规范**:
> - [CSS变量使用规范](common-patterns.md#css-变量使用规范) - 必须使用 `public/assets/theme.css` 中的 CSS 变量
> - [样式选择器规范](common-patterns.md#样式选择器规范) - 禁止直接使用标签选择器
> - [RGB颜色函数规范](common-patterns.md#rgb-颜色函数规范) - 使用新语法 `rgb(r g b / alpha)`
> - [CSS数值规范](common-patterns.md#css-数值规范) - 不补零凑精度，Figma 亚像素值取整

#### 核心原则
- 使用 BEM 命名规范
- 避免深层嵌套(≤3层)
- 所有颜色使用 CSS 变量

### 6. 避免冗余DOM和样式（重点）

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
    color: var(--aix-colorTextHeading);
    font-size: 14px;
  }

  :deep(.el-input) {
    .el-input__wrapper {
      height: 48px;
      border: 1px solid var(--aix-colorTextQuaternary);
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
          color: var(--aix-colorTextHeading);
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

### 文件夹组织原则 ⚠️ **重要**

**核心原则：**
1. **避免目录层级过深**
2. **按功能模块分组**（避免所有文件扁平化在一起）
3. **跨模块共享组件放 `shared/` 目录**

**模块命名规范：**
- 使用小写单词，多个单词用短横线连接
- 语义清晰，体现业务功能

## 📋 组件开发快速检查清单

### 文件夹组织检查 ⚠️ **重要**
- [ ] 避免文件夹层级过深
- [ ] 组件已按功能模块分组（避免所有文件扁平化在一起）
- [ ] 模块划分清晰，语义明确
- [ ] 跨模块共享组件已放入 `shared/` 目录
- [ ] 导入路径已更新为模块化路径

### SVG 图标使用检查 ⚠️ **重要 - 必须遵守**
- [ ] 严格禁止在组件中使用 `<svg>` 标签（内联 SVG）
- [ ] 严格禁止使用 `v-html` 插入 SVG 内容
- [ ] 所有 SVG 图标必须通过 Figma MCP 下载为文件
- [ ] SVG 图标优先用 `<SvgIcon name="[dir]-[name]" />`；纯装饰、不换色时才用 `<img src="@/assets/icons/[project]/xxx.svg" />`
- [ ] SVG 文件已按项目分类存放在 `src/assets/icons/[project-name]/` 目录
- [ ] 项目目录名使用小写短横线格式（kebab-case）
- [ ] 图标文件名语义化（如 `icon-chat.svg`，而非 `icon-123.svg`）

### 图片资源检查
- [ ] PNG/JPG 图片已按页面/功能分类存放在 `src/assets/images/[project-name]/` 目录
- [ ] 下载前已检查本地是否存在同名图片
- [ ] 图片路径使用导入方式而非硬编码
- [ ] 图片文件命名语义化（如 `background.png`，而非 `image-123.png`）
- [ ] 大图片已按用途分类到子目录（logos/、backgrounds/、avatars/ 等）

### 参数使用检查
- [ ] 组件定义的所有Props都在模板中使用
- [ ] 没有定义但未使用的Props参数
- [ ] 硬编码的数据已改为通过Props传入
- [ ] Props类型定义完整且准确（参考 [common-patterns.md#props-定义规范](common-patterns.md#props-定义规范)）
- [ ] 模板中的数据绑定与Props一致

### 数据驱动检查
- [ ] 列表、菜单等重复内容使用 `v-for` + 数据数组
- [ ] 避免在模板中硬编码内容
- [ ] 业务类的静态文本和数字应通过props传入，便于数据对接
- [ ] 统计数字、状态文本等业务数据应作为props传入，不应硬编码
- [ ] 定义了完整的数据接口类型
- [ ] 数据结构便于后续接口对接
- [ ] 使用计算属性处理派生数据

### 尺寸和间距检查
- [ ] 组件宽度严格按照设计稿标注
- [ ] 组件高度使用自适应，让内容撑开高度
- [ ] 按钮等交互元素可使用固定高度
- [ ] 内边距（padding）与设计稿保持一致
- [ ] 外边距（margin）与设计稿保持一致
- [ ] 组件间距与完整设计稿布局一致
- [ ] 边框圆角值精确匹配设计稿
- [ ] 字体大小和行高符合设计稿
- [ ] 避免随意调整设计稿中的尺寸值
- [ ] 参考完整设计稿确定组件在页面中的位置和间距
- [ ] 宽度用弹性布局适应（`100%` / `flex` / `grid auto-fill`），不依赖构建层做 px 转换

### 组件嵌套检查 ⚠️ **重要**
- [ ] 避免组件层层嵌套
- [ ] 避免 DOM 过深嵌套
- [ ] 避免 SCSS 选择器过深嵌套
- [ ] 能用单个元素不用多个
- [ ] 优先拆分为平级组件，而不是嵌套更深
- [ ] 使用 Flex/Grid 替代不必要的包装层
- [ ] 每个 div 都有明确的布局或样式目的
- [ ] 删除所有无意义的包装元素

### 样式规范检查
- [ ] 使用 `public/assets/theme.css` 中定义的CSS变量（参考 [common-patterns.md#css-变量使用规范](common-patterns.md#css-变量使用规范)）
- [ ] 所有颜色使用 `var(--aix-colorXxx)` 而非硬编码
- [ ] 不直接使用标签名选择器（如 `h1`, `p`, `div`）
- [ ] 每个元素都添加了语义化的 class 名称
- [ ] 遵循 BEM 命名规范或项目统一规范
- [ ] 避免样式选择器过深嵌套
- [ ] 避免冗余样式

### 基础组件检查
- [ ] 无业务逻辑，纯UI组件
- [ ] Props和Emits有完整的TypeScript接口定义（参考 [common-patterns.md#props-定义规范](common-patterns.md#props-定义规范)）
- [ ] DOM结构简洁，无冗余层级
- [ ] 样式使用scoped避免污染
- [ ] 支持v-model（如适用）

### 业务组件检查
- [ ] 业务逻辑清晰
- [ ] 使用基础组件而不是重复造轮子
- [ ] Props和Emits有完整的类型定义
- [ ] 错误处理完善（参考 [common-patterns.md#错误处理模式](common-patterns.md#错误处理模式)）
- [ ] 加载状态处理
- [ ] 与Store集成（如需要）

## ❓ 常见问题

### Q: 全局公用组件和页面级组件如何区分？
**A**:
- **全局公用组件**: 不包含业务逻辑或包含通用业务逻辑，可在多个页面复用，放在`src/components/`
- **页面级组件**: 特定页面的专属组件，包含特定业务逻辑，仅在所属页面使用，放在`src/views/[page]/components/`

### Q: 什么时候应该拆分组件？
**A**: 符合以下条件之一就应该考虑拆分：
- 组件代码超过 200 行（建议评估的软阈值；超过 300 行是下方"组件质量标准"中的硬性上限，必须拆分）
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
3. 定义Props和Emits类型（参考 common-patterns.md）
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
- **样式嵌套**: ≤ 3层（团队约定；stylelint 实配 `max-nesting-depth: 10`，超出不报错）
- **组件文件大小**: ≤ 300行（硬性上限；超过 200 行即应评估拆分，见上方 FAQ）
- **Props数量**: ≤ 10个
- **设计稿还原度**: ≥ 95%

通过遵循这些组件开发规范，可以创建出高质量、简洁、可复用、易维护的Vue组件。
