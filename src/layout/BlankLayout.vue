<!--
  空布局：不渲染侧边栏/头部/水印外壳，直接透传子路由页面。
-->
<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>
