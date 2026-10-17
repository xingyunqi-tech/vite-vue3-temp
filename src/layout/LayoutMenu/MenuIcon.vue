<template>
  <el-icon v-if="icon">
    <component :is="icon" v-if="isVueComponent" />
    <SvgIcon v-else :name="icon as string" :size="20" />
  </el-icon>
</template>

<script setup lang="ts">
import { ElIcon } from 'element-plus';
import { computed, type Component } from 'vue';
import SvgIcon from '@/components/SvgIcon/index.vue';

interface Props {
  icon?: Component | string;
}

const props = defineProps<Props>();

const isVueComponent = computed(() => !!props.icon && typeof props.icon !== 'string');
</script>
