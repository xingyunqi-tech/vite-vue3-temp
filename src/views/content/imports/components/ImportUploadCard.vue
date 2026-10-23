<template>
  <section class="import-card">
    <div class="import-card__row">
      <el-upload
        :auto-upload="false"
        :limit="1"
        :disabled="disabled"
        :accept="IMPORT_ACCEPT"
        :file-list="fileList"
        :on-change="handleChange"
        :on-remove="handleRemove"
        :on-exceed="handleExceed"
      >
        <el-button>选择导入包</el-button>
        <template #tip>
          <div class="import-card__tip">
            zip 导入包（content.xlsx 或 content.json + assets/），或单独的 .xlsx / .json 文件；选项可写 optionA–optionZ
            列，或单列 options 每行一个
          </div>
        </template>
      </el-upload>
    </div>
    <div class="import-card__row">
      <template v-if="userStore.isAdmin">
        <el-switch v-model="publishOnImport" :disabled="disabled" active-text="导入即发布" />
        <span class="import-card__tip">
          不勾选时题目以草稿导入，需审核后发布；引用新题的试卷只能在题目发布后导入，或勾选导入即发布
        </span>
      </template>
      <span v-else class="import-card__tip">题目以草稿导入，需审核后发布；引用新题的试卷只能在题目发布后导入</span>
    </div>
    <div class="import-card__row">
      <el-button type="primary" :disabled="!file || disabled" :loading="checking" @click="emit('precheck')">
        预检
      </el-button>
      <el-button :disabled="!file || checking || disabled" @click="emit('reset')">重置</el-button>
      <el-link :href="IMPORT_TEMPLATE_URL" type="primary" download="content-import-template.zip">下载导入模板</el-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage, type UploadFile, type UploadUserFile } from 'element-plus';
import { ref, watch } from 'vue';
import { IMPORT_ACCEPT, IMPORT_TEMPLATE_URL, isImportFile } from '../useImportJobs';
import { useUserInfoStore } from '@/store/modules/user-info';

interface Props {
  checking?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), { checking: false, disabled: false });

const emit = defineEmits<{
  precheck: [];
  reset: [];
}>();

const file = defineModel<File | null>('file', { default: null });
const publishOnImport = defineModel<boolean>('publishOnImport', { default: false });

const userStore = useUserInfoStore();

const fileList = ref<UploadUserFile[]>([]);

watch(file, value => {
  if (!value) fileList.value = [];
});

const handleChange = (uploadFile: UploadFile) => {
  if (!isImportFile(uploadFile.name)) {
    ElMessage.error('只支持 .zip、.xlsx、.json 文件');
    fileList.value = [];
    file.value = null;
    return;
  }
  fileList.value = [uploadFile];
  file.value = uploadFile.raw ?? null;
};

const handleRemove = () => {
  fileList.value = [];
  file.value = null;
};

const handleExceed = () => {
  ElMessage.warning('一次只能导入一个文件，请先移除已选文件');
};
</script>

<style scoped lang="scss">
.import-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 8px;
  background: var(--aix-colorBgContainer);

  &__row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__tip {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
