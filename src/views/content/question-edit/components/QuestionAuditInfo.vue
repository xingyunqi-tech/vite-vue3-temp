<template>
  <dl class="audit-info">
    <div v-for="item in items" :key="item.label" class="audit-info__item">
      <dt class="audit-info__label">{{ item.label }}</dt>
      <dd class="audit-info__value">{{ item.value }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AdminQuestionDto, QuestionOperatorDto } from '@/api';
import { EMPTY_TEXT } from '@/constants';
import { formatDateTimeFull } from '@/utils/datetime';

interface Props {
  question: AdminQuestionDto;
}

const props = defineProps<Props>();

const withTime = (operator: QuestionOperatorDto | null, time: string | null) => {
  if (!operator) return EMPTY_TEXT;
  return time ? `${operator.name}（${formatDateTimeFull(time)}）` : operator.name;
};

const items = computed(() => [
  { label: '创建人', value: props.question.creator?.name ?? EMPTY_TEXT },
  { label: '提交人', value: withTime(props.question.submitter, props.question.submittedAt) },
  { label: '审核人', value: withTime(props.question.reviewer, props.question.reviewedAt) },
]);
</script>

<style scoped lang="scss">
.audit-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0 0 16px;
  font-size: 13px;

  &__item {
    display: flex;
    gap: 6px;
  }

  &__label {
    color: var(--aix-colorTextTertiary);
  }

  &__value {
    margin: 0;
    color: var(--aix-colorText);
  }
}
</style>
