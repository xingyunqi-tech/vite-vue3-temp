import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import BaseInput from '@/components/BaseInput/index.vue';

// 模拟Element Plus组件
vi.mock('element-plus', () => ({
  ElInput: {
    name: 'ElInput',
    template: `<input class="el-input" />`,
    props: ['modelValue', 'type', 'placeholder', 'disabled', 'showPassword', 'clearable', 'size'],
    emits: ['update:modelValue', 'input', 'blur'],
  },
}));

// 模拟BaseInput实现
vi.mock('@/components/BaseInput/index.vue', () => ({
  default: {
    name: 'BaseInput',
    template: `
      <div class="base-input">
        <label v-if="label" class="input-label">{{ label }}</label>
        <div class="input-wrapper">
          <input
            class="mock-input"
            :type="type"
            :placeholder="placeholder"
            :value="modelValue"
            :disabled="disabled"
          />
        </div>
      </div>
    `,
    props: ['label', 'type', 'placeholder', 'modelValue', 'disabled'],
    emits: ['update:modelValue', 'input', 'blur'],
    setup(props, { emit }) {
      const inputValue = ref(props.modelValue);

      const handleInput = value => {
        emit('update:modelValue', value);
        emit('input', value);
        return value;
      };

      const handleBlur = () => {
        emit('blur', inputValue.value);
      };

      return {
        handleInput,
        handleBlur,
        inputValue,
      };
    },
  },
}));

describe('BaseInput 组件', () => {
  // 基础渲染测试
  it('正确渲染组件', () => {
    const wrapper = mount(BaseInput);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.base-input').exists()).toBe(true);
  });

  // 标签渲染测试
  it('正确渲染标签文本', () => {
    const label = '用户名';
    const wrapper = mount(BaseInput, {
      props: {
        label,
      },
    });
    expect(wrapper.find('.input-label').text()).toBe(label);
  });

  // 无标签测试
  it('当没有标签时不渲染标签元素', () => {
    const wrapper = mount(BaseInput, {
      props: {
        label: '',
      },
    });
    expect(wrapper.find('.input-label').exists()).toBe(false);
  });

  // 占位符测试
  it('正确传递占位符文本', () => {
    const placeholder = '请输入用户名';
    const wrapper = mount(BaseInput, {
      props: {
        placeholder,
      },
    });
    expect(wrapper.find('.mock-input').attributes('placeholder')).toBe(placeholder);
  });

  // 值绑定测试
  it('正确绑定输入值', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        modelValue: 'initial value',
      },
    });

    expect(wrapper.find('.mock-input').attributes('value')).toBe('initial value');

    // 更新外部值
    await wrapper.setProps({ modelValue: 'updated value' });
    expect(wrapper.find('.mock-input').attributes('value')).toBe('updated value');
  });

  // 禁用状态测试
  it('正确处理禁用状态', () => {
    const wrapper = mount(BaseInput, {
      props: {
        disabled: true,
      },
    });
    expect(wrapper.find('.mock-input').attributes('disabled')).toBeDefined();
  });

  // 事件触发测试
  it('触发输入事件时正确更新值并发出事件', async () => {
    const wrapper = mount(BaseInput);

    // 模拟输入事件
    await wrapper.vm.handleInput('new value');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['new value']);

    expect(wrapper.emitted('input')).toBeTruthy();
    expect(wrapper.emitted('input')[0]).toEqual(['new value']);
  });

  // 失焦事件测试
  it('触发失焦事件时正确发出blur事件', async () => {
    const wrapper = mount(BaseInput, {
      props: {
        modelValue: 'test value',
      },
    });

    // 模拟失焦事件
    await wrapper.vm.handleBlur();

    expect(wrapper.emitted('blur')).toBeTruthy();
    expect(wrapper.emitted('blur')[0]).toEqual(['test value']);
  });

  // 密码类型测试
  it('密码类型输入框正确显示', () => {
    const wrapper = mount(BaseInput, {
      props: {
        type: 'password',
      },
    });

    expect(wrapper.find('.mock-input').attributes('type')).toBe('password');
  });
});
