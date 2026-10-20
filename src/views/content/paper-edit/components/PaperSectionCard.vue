<template>
  <div class="section-card">
    <div class="section-card__header">
      <span class="section-card__index">第 {{ index + 1 }} 部分</span>
      <el-input
        v-model="section.title"
        :maxlength="PAPER_LIMITS.sectionTitleLength"
        :disabled="frozen"
        placeholder="分区标题，如：常识判断"
        class="section-card__title"
        @input="emit('changed')"
      />
      <el-select v-model="section.questionType" :disabled="frozen" class="section-card__type" @change="emit('changed')">
        <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <span class="section-card__summary">{{ questionCount }} 题 · {{ totalScore }} 分</span>
      <template v-if="!frozen">
        <el-button type="primary" plain @click="emit('add')">添加题目</el-button>
        <el-button link type="danger" @click="emit('removeSection')">删除分区</el-button>
      </template>
    </div>

    <el-table :data="items" row-key="questionId" empty-text="尚未添加题目" class="data-table">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column label="题目" min-width="320">
        <template #default="{ row }">
          <div class="section-card__stem">{{ markdownSummary(row.stem) || '（材料）' }}</div>
          <div
            v-for="(child, childIndex) in (row as PaperItem).children"
            :key="child.questionId"
            class="section-card__child"
          >
            <span class="section-card__child-stem">
              {{ childIndex + 1 }}. [{{ QUESTION_TYPE_LABEL[child.type as QuestionType] }}]
              {{ markdownSummary(child.stem, 40) }}
            </span>
            <el-input-number
              :model-value="child.score"
              :min="PAPER_LIMITS.minScore"
              :max="PAPER_LIMITS.maxScore"
              :precision="2"
              :step="0.5"
              :disabled="frozen"
              size="small"
              controls-position="right"
              @update:model-value="handleChildScore(child, $event)"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="题型" width="90">
        <template #default="{ row }">{{ QUESTION_TYPE_LABEL[row.type as QuestionType] }}</template>
      </el-table-column>
      <el-table-column label="分值" width="160">
        <template #default="{ row }">
          <el-input-number
            :model-value="row.score"
            :min="PAPER_LIMITS.minScore"
            :max="PAPER_LIMITS.maxScore"
            :precision="2"
            :step="0.5"
            :disabled="frozen"
            size="small"
            controls-position="right"
            @update:model-value="handleScore(row as PaperItem, $event)"
          />
          <div v-if="isMaterialItem(row as PaperItem)" class="section-card__muted">
            每小题，合计 {{ itemScore(row as PaperItem) }}
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="!frozen" label="操作" width="150">
        <template #default="{ row, $index }">
          <el-button link :disabled="$index === 0" @click="emit('move', row as PaperItem, -1)">上移</el-button>
          <el-button link :disabled="$index === items.length - 1" @click="emit('move', row as PaperItem, 1)">
            下移
          </el-button>
          <el-button link type="danger" @click="emit('removeItem', row as PaperItem)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { QUESTION_TYPE_LABEL, toOptions } from '../../shared/constants';
import {
  computePaperScores,
  isMaterialItem,
  itemScore,
  PAPER_LIMITS,
  type PaperItem,
  type PaperItemChild,
} from '../paper-items';
import type { PaperSection, QuestionType } from '@/api';
import { markdownSummary } from '@/utils/markdown';

interface Props {
  index: number;
  items: PaperItem[];
  frozen: boolean;
}

const props = defineProps<Props>();

const section = defineModel<PaperSection>('section', { required: true });

const emit = defineEmits<{
  add: [];
  changed: [];
  removeSection: [];
  removeItem: [item: PaperItem];
  move: [item: PaperItem, delta: -1 | 1];
  score: [item: PaperItem, score: number];
  childScore: [child: PaperItemChild, score: number];
}>();

const typeOptions = toOptions(QUESTION_TYPE_LABEL);
/** 清空输入时不更新，失焦后输入框恢复原分值 */
const handleScore = (item: PaperItem, score: number | null | undefined) => {
  if (score != null) emit('score', item, score);
};

const handleChildScore = (child: PaperItemChild, score: number | null | undefined) => {
  if (score != null) emit('childScore', child, score);
};

const sectionSummary = computed(() => computePaperScores(props.items));
const questionCount = computed(() => sectionSummary.value.questionCount);
const totalScore = computed(() => sectionSummary.value.totalScore);
</script>

<style scoped lang="scss">
.section-card {
  padding: 16px;
  border: 1px solid var(--aix-colorBorderSecondary);
  border-radius: 8px;
  background: var(--aix-colorBgContainer);

  & + & {
    margin-top: 16px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__index {
    flex: none;
    color: var(--aix-colorTextHeading);
    font-weight: 600;
  }

  &__title {
    width: 240px;
  }

  &__type {
    width: 130px;
  }

  &__summary {
    color: var(--aix-colorTextSecondary);
  }

  &__stem {
    color: var(--aix-colorText);
  }

  &__child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 6px;
    padding-left: 12px;
  }

  &__child-stem {
    overflow: hidden;
    color: var(--aix-colorTextSecondary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__muted {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
