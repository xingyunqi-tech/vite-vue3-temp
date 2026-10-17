<template>
  <div class="answer-editor">
    <el-radio-group
      v-if="form.type === 'SINGLE'"
      :model-value="form.choiceKeys[0] ?? ''"
      :disabled="locked"
      @update:model-value="form.choiceKeys = $event ? [String($event)] : []"
    >
      <el-radio v-for="option in form.options" :key="option.key" :value="option.key">{{ option.key }}</el-radio>
    </el-radio-group>

    <el-checkbox-group
      v-else-if="form.type === 'MULTIPLE'"
      :model-value="form.choiceKeys"
      :disabled="locked"
      @update:model-value="form.choiceKeys = [...($event as string[])].sort()"
    >
      <el-checkbox v-for="option in form.options" :key="option.key" :value="option.key">{{ option.key }}</el-checkbox>
    </el-checkbox-group>

    <el-radio-group
      v-else-if="form.type === 'JUDGE'"
      :model-value="form.judge ?? undefined"
      :disabled="locked"
      @update:model-value="form.judge = typeof $event === 'boolean' ? $event : null"
    >
      <el-radio :value="true">对</el-radio>
      <el-radio :value="false">错</el-radio>
    </el-radio-group>

    <div v-else-if="form.type === 'FILL'" class="answer-editor__blanks">
      <div v-for="(candidates, blankIndex) in form.blanks" :key="blankIndex" class="answer-editor__blank">
        <span class="answer-editor__label">第 {{ blankIndex + 1 }} 空</span>
        <div class="answer-editor__candidates">
          <div v-for="(_, candidateIndex) in candidates" :key="candidateIndex" class="answer-editor__candidate">
            <el-input
              v-model="candidates[candidateIndex]"
              :maxlength="ANSWER_LIMITS.candidateLength"
              :disabled="locked"
              :placeholder="candidateIndex === 0 ? '答案' : '同义答案'"
            />
            <el-button
              link
              type="danger"
              :disabled="locked || candidates.length <= 1"
              @click="candidates.splice(candidateIndex, 1)"
            >
              删除
            </el-button>
          </div>
          <el-button
            link
            type="primary"
            :disabled="locked || candidates.length >= ANSWER_LIMITS.candidatesPerBlank"
            @click="candidates.push('')"
          >
            添加候选答案
          </el-button>
        </div>
        <el-button
          link
          type="danger"
          :disabled="locked || form.blanks.length <= 1"
          @click="form.blanks.splice(blankIndex, 1)"
        >
          删除此空
        </el-button>
      </div>
      <el-button :disabled="locked || form.blanks.length >= ANSWER_LIMITS.blanks" @click="form.blanks.push([''])">
        添加空
      </el-button>
      <span class="answer-editor__hint">判分时去首尾空白、全角转半角、英文忽略大小写、数字去千分位</span>
    </div>

    <div v-else-if="form.type === 'SHORT_ANSWER' || form.type === 'ESSAY'" class="answer-editor__subjective">
      <el-input
        v-model="form.reference"
        type="textarea"
        :rows="4"
        :maxlength="ANSWER_LIMITS.referenceLength"
        :disabled="locked"
        :placeholder="form.type === 'ESSAY' ? '参考范文，可留空' : '参考答案'"
      />
      <template v-if="form.type === 'SHORT_ANSWER'">
        <div v-for="(_, index) in form.points" :key="index" class="answer-editor__candidate">
          <el-input
            v-model="form.points[index]"
            :maxlength="ANSWER_LIMITS.pointLength"
            :disabled="locked"
            :placeholder="`要点 ${index + 1}`"
          />
          <el-button link type="danger" :disabled="locked" @click="form.points.splice(index, 1)">删除</el-button>
        </div>
        <el-button
          :disabled="locked || form.points.length >= ANSWER_LIMITS.points"
          class="answer-editor__add"
          @click="form.points.push('')"
        >
          添加要点
        </el-button>
      </template>
    </div>

    <span v-if="locked" class="answer-editor__hint">已发布过的题目不能修改答案，答案错误请走勘误</span>
  </div>
</template>

<script setup lang="ts">
import { ANSWER_LIMITS, type QuestionForm } from '../../shared/question-form';

interface Props {
  locked?: boolean;
}

withDefaults(defineProps<Props>(), { locked: false });

const form = defineModel<QuestionForm>('form', { required: true });
</script>

<style scoped lang="scss">
.answer-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  &__blanks,
  &__subjective {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__blank {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 12px;
    border: 1px solid var(--aix-colorBorderSecondary);
    border-radius: 6px;
  }

  &__label {
    flex: none;
    width: 52px;
    padding-top: 6px;
    color: var(--aix-colorTextSecondary);
  }

  &__candidates {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  &__candidate {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  &__add {
    align-self: flex-start;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
