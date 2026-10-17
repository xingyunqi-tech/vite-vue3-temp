---
description: 性能优化提示，包含Vue组件、API调用、构建优化等最佳实践
---

# 性能优化最佳实践

在开始优化前，请先**测量性能**，找出真正的瓶颈，避免过早优化。

## 📊 性能测量工具

### 1. 浏览器开发者工具
```bash
# Chrome DevTools
- Performance 面板：录制性能
- Lighthouse：综合评分
- Network 面板：网络请求分析
- Memory 面板：内存分析
```

### 2. Vue DevTools
```bash
- Performance：组件渲染性能
- Timeline：组件生命周期
- Inspector：组件树分析
```

### 3. 构建分析
```bash
# 运行构建分析
pnpm analyzer

# 查看 dist/ 目录大小
du -sh dist/
```

---

## 🚀 优化清单

### 1. Vue 组件优化

#### 1.1 避免不必要的重新渲染

```typescript
// ❌ 每次父组件更新都会重新渲染
<template>
  <ChildComponent :data="expensiveComputation()" />
</template>

// ✅ 使用 computed 缓存
<template>
  <ChildComponent :data="computedData" />
</template>

<script setup lang="ts">
const computedData = computed(() => expensiveComputation());
</script>
```

#### 1.2 使用 v-memo 缓存渲染结果

```typescript
// ✅ 只有 user.id 变化时才重新渲染
<template>
  <UserCard v-memo="[user.id]" :user="user" />
</template>
```

#### 1.3 使用 v-once 渲染静态内容

```typescript
// ✅ 只渲染一次，不会更新
<template>
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticDescription }}</p>
  </div>
</template>
```

#### 1.4 拆分大组件

```typescript
// ❌ 大组件（超过 300 行）
<template>
  <div class="dashboard">
    <!-- 用户信息 -->
    <div>...</div>
    <!-- 图表 -->
    <div>...</div>
    <!-- 列表 -->
    <div>...</div>
  </div>
</template>

// ✅ 拆分为多个小组件
<template>
  <div class="dashboard">
    <UserInfo :user="user" />
    <ChartPanel :data="chartData" />
    <DataTable :items="items" />
  </div>
</template>
```

---

### 2. 列表和表格优化

#### 2.1 虚拟滚动（长列表）

```typescript
// ❌ 直接渲染 10000 条数据
<template>
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</template>

// ✅ 使用虚拟滚动（vueuc 或 vue-virtual-scroller）
<template>
  <VirtualList :items="items" :itemHeight="50">
    <template #default="{ item }">
      <div>{{ item.name }}</div>
    </template>
  </VirtualList>
</template>
```

#### 2.2 分页加载

```typescript
// ✅ 分页加载大数据
const currentPage = ref(1);
const pageSize = 20;

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return items.value.slice(start, start + pageSize);
});
```

#### 2.3 懒加载（无限滚动）

项目**没有装 `@vueuse/core` 或 TanStack Query**，用原生 `IntersectionObserver` 即可，零依赖：

```vue
<template>
  <div class="list">
    <div v-for="item in list" :key="item.id">{{ item.name }}</div>
    <div ref="sentinel" class="sentinel" />   <!-- 哨兵元素，进入视口即加载下一页 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const list = ref<Item[]>([]);
const sentinel = ref<HTMLElement | null>(null);
const page = ref(1);
const hasMore = ref(true);
const loading = ref(false);

const loadMore = async () => {
  if (loading.value || !hasMore.value) return;   // 关键：防止并发重复加载
  loading.value = true;
  try {
    const res = await fetchUsers(page.value);
    list.value.push(...res.items);
    hasMore.value = res.items.length > 0;
    page.value++;
  } finally {
    loading.value = false;
  }
};

let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) loadMore(); },
    { rootMargin: '100px' },   // 提前 100px 触发，避免用户看到加载空白
  );
  if (sentinel.value) observer.observe(sentinel.value);
});
onUnmounted(() => observer?.disconnect());   // 必须断开，否则组件卸载后仍触发
</script>
```

---

### 3. 图片和媒体优化

#### 3.1 图片懒加载

```typescript
// ✅ 使用 loading="lazy" 原生懒加载
<template>
  <img src="/path/to/image.jpg" loading="lazy" alt="description" />
</template>
```

#### 3.2 图片格式优化

```bash
# 使用现代图片格式
- WebP：比 JPEG 小 25-35%
- AVIF：比 WebP 更小

# 响应式图片
<img
  srcset="
    /image-small.webp 400w,
    /image-medium.webp 800w,
    /image-large.webp 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="/image.webp"
  alt="description"
/>
```

#### 3.3 图片压缩

```bash
# 使用 vite-plugin-imagemin 自动压缩
pnpm add -D vite-plugin-imagemin
```

---

### 4. API 调用优化

#### 4.1 使用 Pinia Store 缓存

```typescript
// ✅ 在 Store 里保存已拉取的数据，页面间共享
import { useUserInfoStore } from '@/store/modules/user-info';
import { storeToRefs } from 'pinia';

const userStore = useUserInfoStore();
const { info, isLoggedIn } = storeToRefs(userStore);
```

#### 4.2 并行请求

```typescript
// ❌ 串行请求（慢）
const user = await getUserInfo();
const orders = await getUserOrders(user.id);
const products = await getUserProducts(user.id);

// ✅ 并行请求（快）
const [user, orders, products] = await Promise.all([
  getUserInfo(),
  getUserOrders(),
  getUserProducts(),
]);
```

#### 4.3 请求去重

```typescript
// ✅ Orval mutator 对 GET/HEAD 默认去重，写方法默认不去重
// 参考 src/api/core/mutator.ts
```

#### 4.4 预加载数据

```typescript
// ✅ 路由守卫预加载数据
router.beforeEach(async (to, from, next) => {
  if (to.name === 'UserDetail') {
    await prefetchUserData(to.params.id);
  }
  next();
});
```

---

### 5. 路由和代码分割

#### 5.1 路由懒加载

```typescript
// ✅ 路由组件懒加载（已配置）
const routes = [
  {
    path: '/user',
    component: () => import('@/views/user/index.vue'),
  },
];
```

#### 5.2 组件懒加载

```typescript
// ✅ 动态导入组件
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
);
</script>
```

#### 5.3 预加载关键路由

```typescript
// ✅ 使用 webpackPrefetch 预加载
const UserDetail = () => import(
  /* webpackPrefetch: true */
  '@/views/user/detail.vue'
);
```

---

### 6. 构建优化

#### 6.1 依赖分析

```bash
# 运行构建分析
pnpm analyzer

# 查看依赖大小
- 移除不必要的依赖
- 替换大依赖为轻量级替代品
- 使用 CDN 加载大依赖
```

#### 6.2 Tree Shaking

```typescript
// ✅ 按需导入（推荐）
import { debounce } from 'lodash-es';

// ❌ 全量导入（避免）
import _ from 'lodash';
```

#### 6.3 代码压缩

`vite.config.ts` 的 `build` 未配置 `minify`，沿用 Vite 8 的默认压缩器；项目没有配置删除 `console` / `debugger`，
不要假设构建产物里的 `console` 已被移除。需要时在 `build` 段显式配置，并以 Vite 8 文档为准。

#### 6.4 CSS 优化

```bash
# PurgeCSS 移除未使用的 CSS
# UnoCSS 自动优化（已配置）
```

---

### 7. 运行时优化

#### 7.1 使用 Object.freeze 冻结静态数据

```typescript
// ✅ 冻结大数组/对象，避免响应式开销
const staticData = Object.freeze([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  // ... 1000 items
]);
```

#### 7.2 使用 shallowRef/shallowReactive

```typescript
// ✅ 只追踪第一层响应式
import { shallowRef } from 'vue';

const largeObject = shallowRef({
  nested: {
    deep: {
      data: 'value',
    },
  },
});
```

#### 7.3 使用 markRaw 标记非响应式对象

```typescript
// ✅ 标记第三方库实例为非响应式
import { markRaw } from 'vue';
import SomeLibrary from 'some-library';

const instance = markRaw(new SomeLibrary());
```

---

### 8. 网络优化

⚠️ 以下 `nginx.conf` 片段是**部署环境的参考配置**，不在本仓库内（仓库中没有 nginx 配置文件，由运维在部署环境单独维护），不要以为项目里已经有这份文件。

#### 8.1 启用 HTTP/2

```nginx
# nginx.conf（部署环境配置示例，非本仓库文件）
listen 443 ssl http2;
```

#### 8.2 启用 Gzip/Brotli 压缩

```nginx
# nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

#### 8.3 设置缓存策略

```nginx
# 静态资源缓存 1 年
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

#### 8.4 使用 CDN

```html
<!-- 使用 CDN 加载大依赖 -->
<script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
```

---

## 🎯 性能目标

### Lighthouse 评分目标

| 指标 | 目标 | 说明 |
|------|------|------|
| **Performance** | >= 90 | 性能评分 |
| **FCP** | < 1.5s | 首次内容绘制 |
| **LCP** | < 2.5s | 最大内容绘制 |
| **TTI** | < 3.5s | 可交互时间 |
| **TBT** | < 200ms | 总阻塞时间 |
| **CLS** | < 0.1 | 累积布局偏移 |

### 构建产物大小目标

| 产物 | 目标 | 说明 |
|------|------|------|
| **index.html** | < 10 KB | HTML 文件 |
| **CSS** | < 100 KB | 样式文件 |
| **JS (vendor)** | < 500 KB | 第三方依赖 |
| **JS (app)** | < 200 KB | 应用代码 |
| **Total** | < 1 MB | 总大小（Gzip 后） |

---

## 🔍 性能检查流程

```bash
# 1. 运行构建分析
pnpm analyzer

# 2. 检查构建产物大小
du -sh dist/
du -sh dist/assets/*.js

# 3. 运行 Lighthouse
# Chrome DevTools > Lighthouse > Generate Report

# 4. 运行性能测试
# Chrome DevTools > Performance > Record

# 5. 检查内存泄漏
# Chrome DevTools > Memory > Take Heap Snapshot
```

---

## 📚 常见性能问题和解决方案

### 问题 1: 首屏加载慢

**原因:**
- 初始包太大
- 同步请求过多
- 图片未优化

**解决方案:**
- [ ] 路由懒加载
- [ ] 代码分割
- [ ] 预加载关键数据
- [ ] 图片懒加载和压缩
- [ ] 使用骨架屏提升感知性能

### 问题 2: 列表滚动卡顿

**原因:**
- 渲染节点过多
- 重复计算
- 图片未懒加载

**解决方案:**
- [ ] 虚拟滚动
- [ ] 使用 `v-memo` 缓存
- [ ] 图片懒加载
- [ ] 避免复杂计算

### 问题 3: 页面交互延迟

**原因:**
- 主线程阻塞
- 频繁的 DOM 操作
- 重排/重绘过多

**解决方案:**
- [ ] 使用防抖/节流
- [ ] 批量更新 DOM
- [ ] 使用 CSS 动画代替 JS 动画
- [ ] 避免强制同步布局

### 问题 4: 内存泄漏

**原因:**
- 事件监听未清理
- 定时器未清理
- 闭包引用

**解决方案:**
- [ ] `onBeforeUnmount` 清理事件监听
- [ ] 清理定时器
- [ ] 清理 Pinia Store 订阅
- [ ] 使用 WeakMap 存储对象

---

## 🛠️ 优化工具推荐

### 性能监控
- **Lighthouse** - 综合性能评分
- **WebPageTest** - 详细性能分析
- **Chrome DevTools** - 实时性能分析

### 构建优化

| 工具 | 状态 |
|---|---|
| `vite-plugin-compression2` | ✅ **已配置**（Gzip/Brotli） |
| `rollup-plugin-visualizer` | ✅ **已配置**（`pnpm analyzer` 查看） |
| `vite-plugin-imagemin` | ⬜ 未安装，需图片压缩时自行引入 |

### 运行时优化

以下**均未安装**，引入前先评估是否真有必要（能用原生 API 解决就别加依赖）：

| 工具 | 用途 | 原生替代 |
|---|---|---|
| `vue-virtual-scroller` | 虚拟滚动 | 万级以下列表用分页 / `content-visibility: auto` |
| `@vueuse/core` | 组合式工具集 | 单个需求自己写 composable，放 `src/composables/` |

---

## 📖 相关资源

### Agent 文档
- `@component-development` - 组件开发规范
- `@common-patterns` - 通用开发模式

### 官方文档
- [Vue Performance Guide](https://vuejs.org/guide/best-practices/performance.html)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Web.dev Performance](https://web.dev/performance/)

---

**记住：过早优化是万恶之源。先测量，再优化，最后验证效果。**
