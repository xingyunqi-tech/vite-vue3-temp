<template>
  <div class="agreement-page">
    <h2 class="agreement-page__title">协议管理</h2>
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
.agreement-page {
  box-sizing: border-box;
  min-height: 100%;
  padding: 20px;
  background: var(--aix-colorBgLayout);

  &__title {
    margin: 0 0 16px;
    color: var(--aix-colorTextHeading);
    font-size: 18px;
    font-weight: 600;
  }

  &__tabs {
    padding: 0 16px 16px;
    border-radius: 4px;
    background: var(--aix-colorBgContainer);
  }
}
</style>
