<!--
  空布局：不渲染侧边栏/头部/水印外壳，直接透传子路由页面。
  适用于关闭整体布局的场景（如作为子应用嵌入、由宿主提供导航外壳）。
-->
<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" />
  </router-view>
</template>
