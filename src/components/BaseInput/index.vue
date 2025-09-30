<template>
  <div class="base-input">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-wrapper">
      <el-input
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :show-password="type === 'password'"
        :disabled="disabled"
        size="large"
        clearable
        @input="handleInput"
        @blur="handleBlur"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// props类型
interface BaseInputProps {
  /** 输入框标签 */
  label?: string;
  /** 输入框类型 */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel';
  /** 占位符文本 */
  placeholder?: string;
  /** 输入框值 */
  modelValue?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

// props定义
const props = withDefaults(defineProps<BaseInputProps>(), {
  label: '',
  type: 'text',
  placeholder: '',
  modelValue: '',
  disabled: false,
});

// emits类型
interface BaseInputEmits {
  /** 更新输入框值 */
  (e: 'update:modelValue', value: string): void;
  /** 输入事件 */
  (e: 'input', value: string): void;
  /** 失焦事件 */
  (e: 'blur', value: string): void;
}

// emits定义
const emit = defineEmits<BaseInputEmits>();

// 内部输入值
const inputValue = ref(props.modelValue);

// 监听外部值变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== inputValue.value) {
      inputValue.value = newValue;
    }
  },
);

// 处理输入事件
const handleInput = (value: string) => {
  emit('update:modelValue', value);
  emit('input', value);
};

// 处理失焦事件
const handleBlur = () => {
  emit('blur', inputValue.value);
};
</script>

<style scoped lang="scss">
.base-input {
  width: 100%;
}

.input-label {
  margin-bottom: 12px;
  color: var(--colorTextHeading);
  font-size: 14.375px;
  font-weight: 400;
  line-height: 1.39;
}

.input-wrapper {
  :deep(.el-input) {
    .el-input__wrapper {
      height: 48px;
      border: 1px solid var(--colorTextQuaternary);
      border-radius: 6px;
      background: var(--colorBgContainer);
      box-shadow: none;
    }

    .el-input__inner {
      padding: 14px 12px;
      color: var(--colorTextHeading);
      font-size: 16px;
      line-height: 1.4;

      &::placeholder {
        color: var(--colorTextPlaceholder);
        font-size: 16px;
      }
    }

    &.is-focus .el-input__wrapper {
      border-color: var(--colorPrimary);
      box-shadow: 0 0 0 1px var(--colorPrimaryBorder);
    }

    &.is-disabled .el-input__wrapper {
      border-color: var(--colorBorder);
      background: var(--colorBgContainerDisabled);
    }
  }
}
</style>
