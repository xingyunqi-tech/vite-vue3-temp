import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ConfigValueDialog from '@/views/system/config/components/ConfigValueDialog.vue';
import type { RemoteConfigRow } from '@/views/system/config/useRemoteConfig';

const row = (overrides: Partial<RemoteConfigRow>): RemoteConfigRow => ({
  key: 'wrongBook.masterThreshold',
  type: 'number',
  defaultValue: 3,
  isPublic: true,
  description: '错题连续答对阈值',
  value: 4,
  stored: true,
  updatedAt: null,
  loadFailed: false,
  ...overrides,
});

async function openDialog(target: RemoteConfigRow) {
  const wrapper = mount(ConfigValueDialog, { props: { modelValue: false, row: target } });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
}

describe('ConfigValueDialog', () => {
  it('展示说明、类型、默认值与是否公开', async () => {
    const wrapper = await openDialog(row({}));
    const text = wrapper.text();

    expect(text).toContain('错题连续答对阈值');
    expect(text).toContain('数字');
    expect(text).toContain('3');
    expect(text).toContain('是');
  });

  it('number 类型用数字输入框，保存时提交数值', async () => {
    const wrapper = await openDialog(row({}));
    const input = wrapper.find('.config-dialog__number input');
    expect((input.element as HTMLInputElement).value).toBe('4');

    await input.setValue('6');
    await input.trigger('change');
    await wrapper.find('.config-dialog__submit').trigger('click');

    expect(wrapper.emitted('submit')).toEqual([[{ key: 'wrongBook.masterThreshold', value: 6 }]]);
  });

  it('boolean 类型用开关', async () => {
    const wrapper = await openDialog(row({ key: 'ai.enabled', type: 'boolean', defaultValue: true, value: true }));

    await wrapper.find('.config-dialog__switch').trigger('click');
    await wrapper.find('.config-dialog__submit').trigger('click');

    expect(wrapper.emitted('submit')).toEqual([[{ key: 'ai.enabled', value: false }]]);
  });

  it('string 类型用文本框', async () => {
    const wrapper = await openDialog(
      row({ key: 'ai.model', type: 'string', defaultValue: undefined, value: undefined, stored: false }),
    );

    await wrapper.find('.config-dialog__string input').setValue('model-x');
    await wrapper.find('.config-dialog__submit').trigger('click');

    expect(wrapper.emitted('submit')).toEqual([[{ key: 'ai.model', value: 'model-x' }]]);
  });

  it('json 不合法时提示且不提交', async () => {
    const wrapper = await openDialog(
      row({ key: 'alert.thresholds', type: 'json', defaultValue: undefined, value: { a: 1 } }),
    );
    const textarea = wrapper.find('.config-dialog__json textarea');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{\n  "a": 1\n}');

    await textarea.setValue('{a:1}');
    await wrapper.find('.config-dialog__submit').trigger('click');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.find('.config-dialog__error').text()).toBe('JSON 格式不正确');
  });
});
