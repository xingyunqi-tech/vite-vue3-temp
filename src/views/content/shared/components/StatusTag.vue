<template>
  <el-tag :type="meta.tag" size="small">{{ meta.label }}</el-tag>
</template>

<script setup lang="ts" generic="K extends string">
import { computed } from 'vue';
import { statusMeta, type StatusMeta } from '../constants';

interface Props {
  status: K;
  metaMap: Record<K, StatusMeta>;
}

const props = defineProps<Props>();

const meta = computed(() => statusMeta(props.metaMap, props.status));
</script>
