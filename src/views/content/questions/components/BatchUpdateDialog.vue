<template>
  <el-dialog
    v-model="visible"
    title="批量修改"
    width="560px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <p class="batch-update__desc">修改选中的 {{ request?.count ?? 0 }} 道题目，只修改填写了的项</p>
    <el-form :model="form" label-width="72px" @submit.prevent>
      <el-form-item label="知识点">
        <div class="batch-update__field">
          <KnowledgePointSelect
            v-model="knowledgeModel"
            :subject-id="subjectId"
            :disabled="multiSubject"
            multiple
            leaf-only
            placeholder="不修改"
          />
          <p v-if="multiSubject" class="batch-update__hint">{{ MULTI_SUBJECT_TIP }}</p>
          <el-radio-group v-else v-model="form.mode" class="batch-update__mode">
            <el-radio :value="KnowledgePointUpdateMode.append">追加到现有知识点</el-radio>
            <el-radio :value="KnowledgePointUpdateMode.replace">覆盖现有知识点</el-radio>
          </el-radio-group>
        </div>
      </el-form-item>
      <el-form-item label="难度">
        <el-select v-model="form.difficulty" placeholder="不修改" clearable :value-on-clear="null">
          <el-option v-for="item in difficultyOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源">
        <el-select v-model="form.source" placeholder="不修改" clearable :value-on-clear="null">
          <el-option v-for="item in sourceOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="免费">
        <el-select v-model="form.isFree" placeholder="不修改" clearable :value-on-clear="null">
          <el-option v-for="item in FREE_OPTIONS" :key="item.label" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!changes" :loading="submitting" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import KnowledgePointSelect from '../../shared/components/KnowledgePointSelect.vue';
import { DIFFICULTY_MAX, DIFFICULTY_MIN, QUESTION_SOURCE_LABEL } from '../../shared/constants';
import { toBatchQuestionChanges, type BatchQuestionChanges, type BatchUpdateForm } from '../useQuestionList';
import { KnowledgePointUpdateMode } from '@/api';
import { toOptions } from '@/constants';

export interface BatchUpdateRequest {
  count: number;
  subjectIds: string[];
  /** 返回是否成功；失败时弹窗保持打开 */
  submit: (changes: BatchQuestionChanges) => Promise<boolean>;
}

const MULTI_SUBJECT_TIP = '勾选的题目属于多个科目，不能批量设置知识点';
const FREE_OPTIONS = [
  { label: '免费', value: true },
  { label: '仅会员', value: false },
];

const sourceOptions = toOptions(QUESTION_SOURCE_LABEL);
const difficultyOptions = Array.from({ length: DIFFICULTY_MAX - DIFFICULTY_MIN + 1 }, (_, i) => DIFFICULTY_MIN + i);

const createForm = (): BatchUpdateForm => ({
  knowledgePointIds: [],
  mode: KnowledgePointUpdateMode.append,
  difficulty: null,
  source: null,
  isFree: null,
});

const visible = ref(false);
const submitting = ref(false);
const form = reactive<BatchUpdateForm>(createForm());
const request = shallowRef<BatchUpdateRequest | null>(null);
let resolver: ((done: boolean) => void) | null = null;

const subjectIds = computed(() => [...new Set(request.value?.subjectIds ?? [])]);
const multiSubject = computed(() => subjectIds.value.length > 1);
const subjectId = computed(() => (multiSubject.value ? '' : (subjectIds.value[0] ?? '')));
const changes = computed(() => toBatchQuestionChanges(form));

const knowledgeModel = computed({
  get: () => form.knowledgePointIds,
  set: (value: string | string[]) => {
    form.knowledgePointIds = Array.isArray(value) ? value : value ? [value] : [];
  },
});

const settle = (done: boolean) => {
  resolver?.(done);
  resolver = null;
};

watch(visible, value => {
  if (!value) settle(false);
});

onBeforeUnmount(() => settle(false));

/** 打开弹窗，修改成功时 resolve true，取消或关闭时 resolve false */
const open = (next: BatchUpdateRequest): Promise<boolean> => {
  settle(false);
  Object.assign(form, createForm());
  request.value = next;
  submitting.value = false;
  visible.value = true;
  return new Promise(resolve => {
    resolver = resolve;
  });
};

const confirm = async () => {
  if (submitting.value || !request.value || !changes.value) return;
  submitting.value = true;
  const done = await request.value.submit(changes.value).catch(() => false);
  submitting.value = false;
  if (!done) return;
  settle(true);
  visible.value = false;
};

defineExpose({ open });
</script>

<style scoped lang="scss">
.batch-update__desc {
  margin: 0 0 16px;
  color: var(--aix-colorTextSecondary);
}

.batch-update__field {
  width: 100%;
}

.batch-update__hint {
  margin: 4px 0 0;
  color: var(--aix-colorWarningText);
  font-size: 12px;
  line-height: 20px;
}

.batch-update__mode {
  margin-top: 4px;
}
</style>
