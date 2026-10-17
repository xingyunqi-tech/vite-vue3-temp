<!--
  单字段渲染组件
  根据 IFieldSchema 类型自动渲染对应的表单控件
-->
<template>
  <!-- boolean: switch -->
  <el-switch
    v-if="field.type === 'boolean'"
    :model-value="value as boolean"
    @change="(val: boolean | string | number) => emit('change', val)"
  />

  <!-- number slider -->
  <!--
    必须用 @update:model-value，不能用 @change。
    el-slider 的 change 事件对非 range 滑块 emit 的是 `props.modelValue`（那个 prop 本身）
    而不是拖出来的新值：

        emit(CHANGE_EVENT, props.range ? [minValue, maxValue] : props.modelValue)

    这里是单向绑定，父级不响应 update:modelValue 的话 props.modelValue 永远不变，
    于是 change 每次都把旧值原样吐回来——表现为「拖完立刻弹回原值，根本改不动」。
    真实新值只走 _emit()，即 update:modelValue / input。
  -->
  <el-slider
    v-else-if="field.type === 'number' && field.inputType === 'slider'"
    class="field-slider"
    :model-value="value as number"
    :min="field.min"
    :max="field.max"
    :step="field.step"
    show-tooltip
    @update:model-value="(val: number | number[]) => emit('change', val)"
  />

  <!-- number input -->
  <el-input-number
    v-else-if="field.type === 'number'"
    :model-value="value as number"
    :min="field.min"
    :max="field.max"
    :step="field.step"
    controls-position="right"
    @change="(val: number | undefined) => emit('change', val)"
  />

  <!-- string image -->
  <div v-else-if="field.type === 'string' && field.inputType === 'image'" class="image-uploader">
    <el-upload
      v-loading="busy"
      class="image-uploader__trigger"
      :show-file-list="false"
      accept="image/*"
      :auto-upload="false"
      @change="handleImageChange"
    >
      <img v-if="value" :src="value as string" class="image-uploader__preview" />
      <div v-else class="image-uploader__placeholder">
        <el-icon :size="28"><Plus /></el-icon>
        <span>点击上传</span>
      </div>
    </el-upload>
    <div v-if="value" class="image-uploader__actions">
      <el-button text type="danger" size="small" @click="emit('change', '')">移除</el-button>
    </div>
  </div>

  <!-- string file -->
  <div v-else-if="field.type === 'string' && field.inputType === 'file'" class="file-uploader">
    <el-upload :show-file-list="false" :accept="field.accept" :auto-upload="false" @change="handleFileChange">
      <el-button type="primary" plain :loading="busy">
        <el-icon class="el-icon--left"><UploadFilled /></el-icon>
        选择文件
      </el-button>
    </el-upload>
    <div v-if="value" class="file-uploader__info">
      <el-icon><Document /></el-icon>
      <span class="file-uploader__name">{{ fileName }}</span>
      <el-button text type="danger" size="small" @click="emit('change', '')">移除</el-button>
    </div>
  </div>

  <!-- string color -->
  <!-- 清空时 el-color-picker 会 emit null，而颜色字段在 schema 里是 string：
       null 会被 validateConfig 判为类型错误剔除，表现成「清空后报错、存不下」，故收敛成空串 -->
  <el-color-picker
    v-else-if="field.type === 'string' && field.inputType === 'color'"
    :show-alpha="field.alpha"
    :model-value="(value as string) || null"
    @change="(val: string | null) => emit('change', val ?? '')"
  />

  <!-- string enumType 多选 -->
  <el-select
    v-else-if="field.type === 'string' && field.enumType && field.multiple"
    multiple
    :model-value="(value as string[]) ?? []"
    @change="(val: string[]) => emit('change', val)"
  >
    <el-option v-for="opt in field.enumType" :key="opt" :label="field.enumLabels?.[opt] ?? opt" :value="opt" />
  </el-select>

  <!-- string enumType 单选 -->
  <el-select
    v-else-if="field.type === 'string' && field.enumType"
    :model-value="value as string"
    @change="(val: string) => emit('change', val)"
  >
    <el-option v-for="opt in field.enumType" :key="opt" :label="field.enumLabels?.[opt] ?? opt" :value="opt" />
  </el-select>

  <!-- string url -->
  <el-input
    v-else-if="field.type === 'string' && field.inputType === 'url'"
    :model-value="value as string"
    placeholder="https://"
    :prefix-icon="Link"
    @input="(val: string) => emit('change', val)"
  >
    <template v-if="value" #append>
      <el-link :href="value as string" target="_blank" :underline="false">
        <el-icon><View /></el-icon>
      </el-link>
    </template>
  </el-input>

  <!-- string textarea -->
  <el-input
    v-else-if="field.type === 'string' && field.inputType === 'textarea'"
    type="textarea"
    :model-value="value as string"
    @input="(val: string) => emit('change', val)"
  />

  <!-- string password -->
  <el-input
    v-else-if="field.type === 'string' && field.inputType === 'password'"
    type="password"
    show-password
    :model-value="value as string"
    @input="(val: string) => emit('change', val)"
  />

  <!-- string default: text input -->
  <el-input v-else :model-value="value as string" @input="(val: string) => emit('change', val)" />
</template>

<script setup lang="ts">
import { Plus, UploadFilled, Document, Link, View } from '@element-plus/icons-vue';
import { ElMessage, type UploadFile } from 'element-plus';
import { ref, computed } from 'vue';
import { DEFAULT_INLINE_MAX_SIZE, type IFieldSchema } from '@/plugins/site-config';
import { formatFileSize } from '@/utils/datetime';
import { handleError } from '@/utils/error-handler';

const props = defineProps<{
  field: IFieldSchema;
  value: unknown;
  /**
   * 文件上传器：给定文件返回可访问的 URL
   *
   * 不传则退回内联 base64——文件会进入配置对象，被每一次序列化/比对/持久化搬运，
   * 因此内联路径一定有体积上限（字段的 maxSize，缺省用 DEFAULT_INLINE_MAX_SIZE）。
   */
  uploader?: (file: File) => Promise<string>;
}>();

const emit = defineEmits<{
  change: [value: unknown];
}>();

// 读取 / 上传进行中
const busy = ref(false);

// 用户上传时记录的文件名，刷新后回退到从 base64 推断
const uploadedFileName = ref('');

const fileName = computed(() => {
  if (uploadedFileName.value) return uploadedFileName.value;
  // 从 data URL 推断文件类型：data:application/pdf;base64,... → 已上传文件.pdf
  // value 类型为 unknown（code 模式下用户可能输入非法值），需先做 string 守卫
  const val = props.value;
  if (typeof val !== 'string' || !val.startsWith('data:')) return '已上传文件';
  const mime = val.slice(5, val.indexOf(';'));
  const ext = mime.split('/')[1];
  return ext ? `已上传文件.${ext}` : '已上传文件';
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      // readAsDataURL 成功时为 string；类型守卫避免不安全断言
      if (typeof result === 'string') resolve(result);
      else reject(new Error('文件读取结果不是字符串'));
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 文件的统一入口：先过体积闸门，再按有无 uploader 决定走上传还是内联 base64
 *
 * @returns 写入配置的字符串（URL 或 data URL）；被拦截或出错时返回 null
 */
async function resolveFile(raw: File): Promise<string | null> {
  const explicitLimit = props.field.type === 'string' ? props.field.maxSize : undefined;
  // 接了 uploader 时文件不进配置对象，没有显式上限就不强加默认上限，交给服务端判断
  const limit = explicitLimit ?? (props.uploader ? undefined : DEFAULT_INLINE_MAX_SIZE);
  if (limit !== undefined && raw.size > limit) {
    ElMessage.error(`文件大小 ${formatFileSize(raw.size)} 超过上限 ${formatFileSize(limit)}`);
    return null;
  }

  busy.value = true;
  try {
    return props.uploader ? await props.uploader(raw) : await readAsDataUrl(raw);
  } catch (error) {
    handleError(error, { message: props.uploader ? '文件上传失败' : '文件读取失败' });
    return null;
  } finally {
    busy.value = false;
  }
}

async function handleImageChange(file: UploadFile): Promise<void> {
  if (!file.raw) return;
  const result = await resolveFile(file.raw);
  if (result !== null) emit('change', result);
}

async function handleFileChange(file: UploadFile): Promise<void> {
  if (!file.raw) return;
  const result = await resolveFile(file.raw);
  // 文件名在处理成功后再记录，避免失败时文件名与实际值不同步
  if (result === null) return;
  uploadedFileName.value = file.name;
  emit('change', result);
}
</script>

<style lang="scss" scoped>
.field-slider {
  width: 100%;
}

.image-uploader {
  display: flex;
  align-items: flex-end;
  gap: 12px;

  &__trigger {
    :deep(.el-upload) {
      display: block;
      width: 120px;
      height: 120px;
      overflow: hidden;
      transition: border-color 0.2s;
      border: 1px dashed var(--aix-colorBorder);
      border-radius: 8px;
      cursor: pointer;

      &:hover {
        border-color: var(--aix-colorPrimary);
      }
    }
  }

  &__preview {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--aix-colorTextPlaceholder);
    gap: 4px;

    span {
      font-size: 12px;
    }
  }
}

.file-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__info {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--aix-colorText);
    font-size: 13px;
  }

  &__name {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
