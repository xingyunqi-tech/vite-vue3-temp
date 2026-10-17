<template>
  <div class="paper-basic">
    <el-form-item label="标题" prop="title">
      <el-input v-model="model.title" :maxlength="TITLE_LENGTH" show-word-limit />
    </el-form-item>
    <el-form-item label="类型" prop="type">
      <el-radio-group v-model="model.type" :disabled="lockDraftOnly">
        <el-radio v-for="type in CATALOG_PAPER_TYPES" :key="type" :value="type">{{ PAPER_TYPE_LABEL[type] }}</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="年份" prop="year">
      <el-input-number
        v-model="model.year"
        :min="MIN_YEAR"
        :max="MAX_YEAR"
        :value-on-clear="null"
        controls-position="right"
        placeholder="真题年份"
      />
    </el-form-item>
    <el-form-item label="时长（分钟）" prop="durationMin">
      <el-input-number v-model="model.durationMin" :min="1" :max="MAX_DURATION" controls-position="right" />
    </el-form-item>
    <el-form-item label="多选判分" prop="multiScoringRule">
      <el-radio-group v-model="model.multiScoringRule" :disabled="lockDraftOnly">
        <el-radio v-for="(label, rule) in MULTI_SCORING_RULE_LABEL" :key="rule" :value="rule">{{ label }}</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="免费" prop="isFree">
      <el-switch v-model="model.isFree" />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { CATALOG_PAPER_TYPES, MULTI_SCORING_RULE_LABEL, PAPER_TYPE_LABEL } from '../../shared/constants';
import type { PaperBasicForm } from '../paper-basic';

interface Props {
  lockDraftOnly?: boolean;
}

withDefaults(defineProps<Props>(), { lockDraftOnly: false });

const model = defineModel<PaperBasicForm>({ required: true });

const TITLE_LENGTH = 100;
const MIN_YEAR = 1949;
const MAX_YEAR = 2100;
const MAX_DURATION = 600;
</script>
