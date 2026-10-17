<template>
  <section class="import-card">
    <div class="import-card__row">
      <el-upload
        :auto-upload="false"
        :limit="1"
        :accept="IMPORT_ACCEPT"
        :file-list="fileList"
        :on-change="handleChange"
        :on-remove="() => (fileList = [])"
        :on-exceed="handleExceed"
      >
        <el-button>选择导入包</el-button>
        <template #tip>
          <div class="import-card__tip">
            zip 导入包（content.xlsx 或 content.json + assets/），或单独的 .xlsx / .json 文件
          </div>
        </template>
      </el-upload>
    </div>
    <div class="import-card__row">
      <el-switch v-model="publishOnImport" active-text="导入即发布" />
      <span class="import-card__tip">
        不勾选时题目以草稿导入，需审核后发布；引用新题的试卷只能在题目发布后导入，或勾选导入即发布
      </span>
    </div>
    <div class="import-card__row">
      <el-button type="primary" :disabled="fileList.length === 0" :loading="submitting" @click="submit">
        开始导入
      </el-button>
      <el-link :href="IMPORT_TEMPLATE_URL" type="primary" download="content-import-template.zip">下载导入模板</el-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage, type UploadFile, type UploadUserFile } from 'element-plus';
import { ref } from 'vue';
import { IMPORT_ACCEPT, IMPORT_TEMPLATE_URL, isImportFile } from '../useImportJobs';

interface Props {
  submitting?: boolean;
}

withDefaults(defineProps<Props>(), { submitting: false });

const emit = defineEmits<{
  submit: [file: File, publishOnImport: boolean];
}>();

const fileList = ref<UploadUserFile[]>([]);
const publishOnImport = ref(false);

const handleChange = (file: UploadFile) => {
  if (!isImportFile(file.name)) {
    ElMessage.error('只支持 .zip、.xlsx、.json 文件');
    fileList.value = [];
    return;
  }
  fileList.value = [file];
};

const handleExceed = () => {
  ElMessage.warning('一次只能导入一个文件，请先移除已选文件');
};

const submit = () => {
  const raw = fileList.value[0]?.raw;
  if (raw) emit('submit', raw, publishOnImport.value);
};

const clear = () => {
  fileList.value = [];
};

defineExpose({ clear });
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
