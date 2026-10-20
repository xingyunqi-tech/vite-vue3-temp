<template>
  <div class="page agreement-page">
    <div class="page__header">
      <h2 class="page__title">协议管理</h2>
    </div>
    <el-tabs v-model="activeType" class="agreement-page__tabs">
      <el-tab-pane v-for="item in AGREEMENT_DOCUMENTS" :key="item.type" :label="item.label" :name="item.type" lazy>
        <AgreementPanel :agreement="item" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AgreementPanel from './components/AgreementPanel.vue';
import { AGREEMENT_DOCUMENTS, type AgreementDocument } from '@/constants/agreement';

const activeType = ref<AgreementDocument['type']>(AGREEMENT_DOCUMENTS[0].type);
</script>

<style scoped lang="scss">
@use '@/styles/page';

.agreement-page {
  &__tabs {
    padding: 0 16px 16px;
    border-radius: 8px;
    background: var(--aix-colorBgContainer);
  }
}
</style>
