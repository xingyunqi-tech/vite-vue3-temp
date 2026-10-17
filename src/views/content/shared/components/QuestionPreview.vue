<template>
  <div class="question-preview">
    <div class="question-preview__head">
      <el-tag size="small" type="info">{{ QUESTION_TYPE_LABEL[question.type] ?? question.type }}</el-tag>
      <span v-if="title" class="question-preview__title">{{ title }}</span>
    </div>

    <template v-if="question.type === 'MATERIAL'">
      <MarkdownContent :content="question.stem" :file-urls="urls" class="question-preview__stem" />
      <div v-if="question.material" class="question-preview__material">
        <MarkdownContent :content="question.material" :file-urls="urls" />
      </div>
      <AudioPlayer
        v-if="question.audioFileId"
        :file-id="question.audioFileId"
        :url="question.audioUrl ?? urls[question.audioFileId.toLowerCase()]"
        class="question-preview__audio"
      />
    </template>
    <MarkdownContent v-else :content="question.stem" :file-urls="urls" class="question-preview__stem" />

    <ul v-if="options.length" class="question-preview__options">
      <li
        v-for="option in options"
        :key="option.key"
        class="question-preview__option"
        :class="{ 'question-preview__option--correct': showAnswer && correctKeys.has(option.key) }"
      >
        <span class="question-preview__key">{{ option.key }}.</span>
        <MarkdownContent :content="option.content" :file-urls="urls" />
      </li>
    </ul>

    <div v-if="showAnswer && question.type !== 'MATERIAL'" class="question-preview__answer">
      <div class="question-preview__row">
        <span class="question-preview__label">答案</span>
        <MarkdownContent
          v-if="isSubjective"
          :content="answerText || '（未填写参考答案）'"
          :file-urls="urls"
          class="question-preview__value"
        />
        <span v-else class="question-preview__value">{{ answerText || '—' }}</span>
      </div>
      <div v-if="points.length" class="question-preview__row">
        <span class="question-preview__label">要点</span>
        <ol class="question-preview__points">
          <li v-for="(point, index) in points" :key="index">{{ point }}</li>
        </ol>
      </div>
    </div>

    <div v-if="showAnswer && question.analysis" class="question-preview__row">
      <span class="question-preview__label">解析</span>
      <MarkdownContent :content="question.analysis" :file-urls="urls" class="question-preview__value" />
    </div>

    <div v-if="question.children?.length" class="question-preview__children">
      <QuestionPreview
        v-for="(child, index) in question.children"
        :key="index"
        :question="child"
        :file-urls="urls"
        :show-answer="showAnswer"
        :title="`第 ${index + 1} 小题`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { QUESTION_TYPE_LABEL } from '../constants';
import { answerPoints, formatAnswer, mergeFileUrls } from '../question-form';
import AudioPlayer from './AudioPlayer.vue';
import MarkdownContent from './MarkdownContent.vue';
import type { QuestionType } from '@/api';

export interface PreviewQuestion {
  type: QuestionType;
  stem: string;
  options?: Record<string, unknown>[] | null;
  answer?: unknown;
  analysis?: string | null;
  material?: string | null;
  audioFileId?: string | null;
  audioUrl?: string | null;
  fileUrls?: Record<string, string>;
  children?: PreviewQuestion[];
}

interface Props {
  question: PreviewQuestion;
  fileUrls?: Record<string, string>;
  showAnswer?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), { showAnswer: true, title: '' });

const urls = computed(() => mergeFileUrls(props.fileUrls, props.question.fileUrls));

const options = computed(() =>
  (props.question.options ?? []).map(option => ({
    key: String(option.key ?? ''),
    content: String(option.content ?? ''),
  })),
);

const correctKeys = computed(() => {
  const keys = (props.question.answer as { keys?: unknown } | null)?.keys;
  return new Set(Array.isArray(keys) ? keys.map(String) : []);
});

const isSubjective = computed(() => ['SHORT_ANSWER', 'ESSAY'].includes(props.question.type));
const answerText = computed(() => formatAnswer(props.question.type, props.question.answer));
const points = computed(() => (props.question.type === 'SHORT_ANSWER' ? answerPoints(props.question.answer) : []));
</script>

<style scoped lang="scss">
.question-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__title {
    color: var(--aix-colorTextHeading);
    font-weight: 600;
  }

  &__material {
    max-height: 360px;
    padding: 10px 12px;
    overflow: auto;
    border-radius: 6px;
    background: var(--aix-colorFillQuaternary);
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__option {
    display: flex;
    gap: 6px;
    padding: 6px 10px;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 6px;

    &--correct {
      border-color: var(--aix-colorSuccessBorder);
      background: var(--aix-colorSuccessBg);
    }
  }

  &__key {
    flex: none;
    color: var(--aix-colorTextSecondary);
    font-weight: 600;
  }

  &__row {
    display: flex;
    gap: 12px;
  }

  &__label {
    flex: none;
    width: 40px;
    color: var(--aix-colorTextTertiary);
  }

  &__value {
    flex: 1;
    min-width: 0;
  }

  &__points {
    margin: 0;
    padding-left: 18px;
  }

  &__children {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-left: 12px;
    border-left: 3px solid var(--aix-colorPrimaryBorder);
  }
}
</style>
