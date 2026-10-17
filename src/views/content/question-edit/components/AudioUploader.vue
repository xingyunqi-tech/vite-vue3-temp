<template>
  <div class="audio-uploader">
    <AudioPlayer v-if="modelValue" :file-id="modelValue" :url="audioUrls[modelValue]" />
    <div class="audio-uploader__actions">
      <el-button size="small" :loading="uploading" :disabled="disabled" @click="fileInput?.click()">
        {{ modelValue ? '更换音频' : '上传音频' }}
      </el-button>
      <el-button
        v-if="modelValue"
        size="small"
        link
        type="danger"
        :disabled="disabled"
        @click="emit('update:modelValue', null)"
      >
        移除
      </el-button>
      <span class="audio-uploader__hint">支持 mp3、m4a</span>
    </div>
    <input ref="fileInput" type="file" accept=".mp3,.m4a" class="audio-uploader__file" @change="handleChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AudioPlayer from '../../shared/components/AudioPlayer.vue';
import { uploadContentFile, type FileType } from '@/api';

interface Props {
  modelValue: string | null;
  audioUrls: Record<string, string>;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), { disabled: false });

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  uploaded: [file: FileType];
}>();

const fileInput = ref<HTMLInputElement>();
const uploading = ref(false);

const handleChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  uploading.value = true;
  await uploadContentFile(file, 'audio')
    .then(uploaded => {
      emit('uploaded', uploaded);
      emit('update:modelValue', uploaded.id);
    })
    .catch(() => undefined);
  uploading.value = false;
};
</script>

<style scoped lang="scss">
.audio-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }

  &__file {
    display: none;
  }
}
</style>
