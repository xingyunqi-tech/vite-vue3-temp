import { isAxiosError } from 'axios';
import { ElMessage } from 'element-plus';
import { computed, ref, shallowRef, watch } from 'vue';
import { adminPrecheckImport, requestErrorMessage, uploadContentFile } from '@/api';
import type { ImportPrecheckResultDto } from '@/api';

export const PRECHECK_ERROR_LIMIT = 500;

const PAYLOAD_TOO_LARGE = 413;
const UNPROCESSABLE_ENTITY = 422;

export type PrecheckFailureKind = 'tooLarge' | 'unparsable';

export interface PrecheckFailure {
  kind: PrecheckFailureKind;
  message: string;
}

export type PrecheckStep = 'upload' | 'result';

function failureKind(error: unknown): PrecheckFailureKind | null {
  if (!isAxiosError(error)) return null;
  const status = error.response?.status;
  if (status === PAYLOAD_TOO_LARGE) return 'tooLarge';
  if (status === UNPROCESSABLE_ENTITY) return 'unparsable';
  return null;
}

/** 导入包只上传一次，预检与创建任务共用同一个文件 ID；更换文件时清空预检状态 */
export function useImportPrecheck() {
  const file = shallowRef<File | null>(null);
  const publishOnImport = ref(false);
  const fileId = ref('');
  const result = shallowRef<ImportPrecheckResultDto | null>(null);
  const checkedPublish = ref(false);
  const failure = ref<PrecheckFailure | null>(null);
  const checking = ref(false);
  let requestSeq = 0;

  const step = computed<PrecheckStep>(() => (result.value || failure.value?.kind === 'tooLarge' ? 'result' : 'upload'));
  const stale = computed(() => !!result.value && checkedPublish.value !== publishOnImport.value);
  const errorCount = computed(() => result.value?.errors.length ?? 0);
  const errorCountText = computed(() => (result.value?.truncated ? `${PRECHECK_ERROR_LIMIT}+` : `${errorCount.value}`));

  const clearResult = () => {
    requestSeq += 1;
    checking.value = false;
    result.value = null;
    failure.value = null;
  };

  watch(
    file,
    () => {
      fileId.value = '';
      clearResult();
    },
    { flush: 'sync' },
  );

  const ensureUploaded = async (target: File): Promise<string> => {
    if (fileId.value) return fileId.value;
    return (await uploadContentFile(target, 'import')).id;
  };

  const runPrecheck = async (id: string, publish: boolean, seq: number) => {
    try {
      const res = await adminPrecheckImport(
        { fileId: id, publishOnImport: publish },
        { disableDedup: true, isIgnoreToast: true },
      );
      if (seq !== requestSeq) return;
      result.value = res;
      checkedPublish.value = publish;
    } catch (error) {
      if (seq !== requestSeq) return;
      const kind = failureKind(error);
      if (kind) failure.value = { kind, message: requestErrorMessage(error) };
      else ElMessage.error(requestErrorMessage(error));
    }
  };

  const precheck = async () => {
    const target = file.value;
    if (!target) return;
    clearResult();
    const seq = requestSeq;
    const publish = publishOnImport.value;
    checking.value = true;
    const id = await ensureUploaded(target).catch(() => '');
    if (seq !== requestSeq) return;
    if (id) {
      fileId.value = id;
      await runPrecheck(id, publish, seq);
    }
    if (seq === requestSeq) checking.value = false;
  };

  const reset = () => {
    file.value = null;
  };

  return {
    file,
    publishOnImport,
    fileId,
    result,
    failure,
    checking,
    step,
    stale,
    errorCount,
    errorCountText,
    precheck,
    reset,
  };
}
