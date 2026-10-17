<template>
  <div class="audio-player">
    <audio v-if="url" :src="url" controls preload="none" class="audio-player__audio" />
    <span v-else class="audio-player__hint">音频无法加载（文件 {{ fileId }}）</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  fileId: string;
  url?: string | null;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.audio-player {
  &__audio {
    width: 100%;
    max-width: 420px;
  }

  &__hint {
    color: var(--aix-colorTextTertiary);
    font-size: 12px;
  }
}
</style>
