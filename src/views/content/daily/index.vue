<template>
  <div class="content-page">
    <div class="content-page__header">
      <h2 class="content-page__title">每日一练</h2>
    </div>

    <el-form inline @submit.prevent="search">
      <el-form-item label="科目">
        <SubjectCascader v-model="subjectId" :options="subjectOptions" :clearable="false" />
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          :clearable="false"
          class="daily-page__range"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" :disabled="!subjectId">查询</el-button>
      </el-form-item>
      <el-form-item label="生成日期">
        <el-date-picker
          v-model="regenerateDate"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled-date="isPastDate"
          :clearable="false"
          class="daily-page__date"
        />
        <el-button
          class="daily-page__regenerate"
          :disabled="!subjectId || !queried"
          :loading="regenerating"
          @click="handleRegenerate(regenerateDate)"
        >
          生成 / 重新生成
        </el-button>
      </el-form-item>
    </el-form>
    <p class="content-page__muted daily-page__hint">
      每天 00:05（北京时间）自动为已发布科目生成；当日及以后的题组在无人作答时可重新生成
    </p>

    <el-empty v-if="!queried" description="选择科目后查询" :image-size="80" />
    <el-table v-else v-loading="loading" :data="sets" row-key="id" class="data-table">
      <el-table-column type="expand" width="40">
        <template #default="{ row }">
          <ol class="daily-page__questions">
            <li
              v-for="question in (row as AdminDailyQuestionSetDto).questions"
              :key="question.id"
              class="daily-page__question"
            >
              <el-tag size="small" type="info">{{ QUESTION_TYPE_LABEL[question.type] }}</el-tag>
              <span v-if="question.parentId" class="content-page__muted">材料小题</span>
              <span>{{ markdownSummary(question.stem, 100) }}</span>
            </li>
          </ol>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="140" />
      <el-table-column label="题数" width="100">
        <template #default="{ row }">{{ row.questionIds.length }}</template>
      </el-table-column>
      <el-table-column label="生成时间" min-width="170">
        <template #default="{ row }">{{ formatDateTimeFull(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="canRegenerate(row.date)"
            link
            type="primary"
            :disabled="regenerating"
            @click="handleRegenerate(row.date)"
          >
            重新生成
          </el-button>
          <span v-else class="content-page__muted">已过期</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { onMounted, ref, watch } from 'vue';
import { confirmAction, runAction } from '../shared/actions';
import SubjectCascader from '../shared/components/SubjectCascader.vue';
import { QUESTION_TYPE_LABEL } from '../shared/constants';
import { useSubjectOptions } from '../shared/useSubjectOptions';
import { businessToday, canRegenerate, defaultDateRange, useDailySets, validateDateRange } from './useDailySets';
import type { AdminDailyQuestionSetDto } from '@/api';
import dayjs from '@/plugins/dayjs';
import { formatDateTimeFull } from '@/utils/datetime';
import { markdownSummary } from '@/utils/markdown';

const { options: subjectOptions, load: loadSubjects, subjectLabel } = useSubjectOptions();
const { sets, loading, queriedSubjectId, load, regenerate } = useDailySets();

const subjectId = ref('');
const range = ref<[string, string]>(defaultDateRange());
const regenerateDate = ref(businessToday());
const queried = ref(false);
const regenerating = ref(false);

watch(subjectId, () => {
  queried.value = false;
});

const isPastDate = (date: Date) => !canRegenerate(dayjs(date).format('YYYY-MM-DD'));

const search = async () => {
  if (!subjectId.value) return;
  const error = validateDateRange(range.value);
  if (error) {
    ElMessage.error(error);
    return;
  }
  const target = subjectId.value;
  await load(target, range.value)
    .then(() => {
      queried.value = subjectId.value === target;
    })
    .catch(() => undefined);
};

const handleRegenerate = async (date: string) => {
  const message = `重新生成「${subjectLabel(queriedSubjectId.value)}」${date} 的题组？已有用户作答时无法重新生成`;
  if (!(await confirmAction(message, '重新生成题组'))) return;
  regenerating.value = true;
  try {
    await runAction(async () => {
      const result = await regenerate(date);
      if (result) ElMessage.success(`已生成 ${result.questionIds.length} 道题`);
    });
  } finally {
    regenerating.value = false;
  }
};

onMounted(() => {
  loadSubjects().catch(() => undefined);
});
</script>

<style scoped lang="scss">
@use '../shared/content-page';

.daily-page {
  &__range {
    width: 260px;
  }

  &__date {
    width: 150px;
  }

  &__regenerate {
    margin-left: 8px;
  }

  &__hint {
    margin: 0 0 12px;
    font-size: 12px;
  }

  &__questions {
    margin: 0;
    padding: 8px 24px 8px 48px;
  }

  &__question {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
}
</style>
