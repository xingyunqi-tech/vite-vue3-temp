<template>
  <el-dialog
    v-model="visible"
    title="驳回题目"
    width="520px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <p v-if="request?.description" class="reject-dialog__desc">{{ request.description }}</p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="驳回原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="4"
          placeholder="说明需要修改的地方，提交人会在题目编辑页看到"
        />
        <span class="reject-dialog__count">{{ reasonLength }} / {{ REJECT_REASON_MAX_LENGTH }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="warning" :loading="submitting" @click="confirm">驳回</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormItemRule, FormRules } from 'element-plus';
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import { REJECT_REASON_MAX_LENGTH } from '../constants';

export interface RejectRequest {
  description?: string;
  /** 以去除首尾空白的原因发起驳回，返回是否成功；失败时弹窗保持打开 */
  submit: (reason: string) => Promise<boolean>;
}

const visible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ reason: '' });
const request = shallowRef<RejectRequest | null>(null);
let resolver: ((done: boolean) => void) | null = null;

const reasonLength = computed(() => form.reason.trim().length);

const validateReason: FormItemRule['validator'] = (_rule, value: string, callback) => {
  const length = value.trim().length;
  if (length === 0) callback(new Error('请填写驳回原因'));
  else if (length > REJECT_REASON_MAX_LENGTH) callback(new Error(`驳回原因不能超过 ${REJECT_REASON_MAX_LENGTH} 字`));
  else callback();
};

const rules: FormRules = {
  reason: [{ required: true, validator: validateReason, trigger: ['blur', 'change'] }],
};

const settle = (done: boolean) => {
  resolver?.(done);
  resolver = null;
};

watch(visible, value => {
  if (value) return;
  settle(false);
  formRef.value?.resetFields();
});

onBeforeUnmount(() => settle(false));

/** 打开弹窗，驳回成功时 resolve true，取消或关闭时 resolve false */
const open = (next: RejectRequest): Promise<boolean> => {
  settle(false);
  formRef.value?.resetFields();
  request.value = next;
  form.reason = '';
  submitting.value = false;
  visible.value = true;
  return new Promise(resolve => {
    resolver = resolve;
  });
};

const confirm = async () => {
  if (submitting.value) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || !request.value || submitting.value) return;
  submitting.value = true;
  const done = await request.value.submit(form.reason.trim()).catch(() => false);
  submitting.value = false;
  if (!done) return;
  settle(true);
  visible.value = false;
};

defineExpose({ open });
</script>

<style scoped lang="scss">
.reject-dialog__desc {
  margin: 0 0 12px;
  color: var(--aix-colorTextSecondary);
}

.reject-dialog__count {
  width: 100%;
  color: var(--aix-colorTextTertiary);
  font-size: 12px;
  line-height: 20px;
  text-align: right;
}
</style>
