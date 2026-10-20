import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import RejectReasonDialog, { type RejectRequest } from '@/views/content/shared/components/RejectReasonDialog.vue';

type DialogVm = { open: (request: RejectRequest) => Promise<boolean> };

const reasonError = (wrapper: ReturnType<typeof mount>) =>
  (wrapper.findComponent({ name: 'ElFormItem' }).vm as unknown as { validateMessage: string }).validateMessage;

async function openDialog(submit: RejectRequest['submit'] = vi.fn(async () => true)) {
  const wrapper = mount(RejectReasonDialog);
  const settled = vi.fn();
  (wrapper.vm as unknown as DialogVm).open({ description: '驳回为草稿', submit }).then(settled);
  await flushPromises();
  const click = async (text: string) => {
    await wrapper
      .findAll('button')
      .find(button => button.text() === text)!
      .trigger('click');
    await flushPromises();
  };
  return { wrapper, submit, settled, click };
}

describe('驳回原因弹窗', () => {
  it('展示说明与字数统计', async () => {
    const { wrapper } = await openDialog();

    expect(wrapper.text()).toContain('驳回为草稿');
    await wrapper.find('textarea').setValue('答案有误');
    expect(wrapper.find('.reject-dialog__count').text()).toBe('4 / 500');
  });

  it('字数按去除首尾空白后的长度显示', async () => {
    const { wrapper } = await openDialog();

    await wrapper.find('textarea').setValue('  答案 有误  ');
    expect(wrapper.find('.reject-dialog__count').text()).toBe('5 / 500');
  });

  it('输入框不限制原始长度', async () => {
    const { wrapper } = await openDialog();

    expect(wrapper.find('textarea').attributes('maxlength')).toBeUndefined();
  });

  it('清空输入时提示中文必填信息', async () => {
    const { wrapper } = await openDialog();

    await wrapper.find('textarea').setValue('答案有误');
    await wrapper.find('textarea').setValue('');
    await flushPromises();

    expect(reasonError(wrapper)).toBe('请填写驳回原因');
  });

  it('原因为空或只有空白时提示必填且不提交', async () => {
    const { wrapper, submit, click } = await openDialog();

    await click('驳回');
    expect(reasonError(wrapper)).toBe('请填写驳回原因');

    await wrapper.find('textarea').setValue('   ');
    await click('驳回');
    expect(reasonError(wrapper)).toBe('请填写驳回原因');
    expect(submit).not.toHaveBeenCalled();
  });

  it('去除首尾空白后超过 500 字时提示且不提交', async () => {
    const { wrapper, submit, click } = await openDialog();

    await wrapper.find('textarea').setValue('字'.repeat(501));
    await click('驳回');

    expect(reasonError(wrapper)).toBe('驳回原因不能超过 500 字');
    expect(submit).not.toHaveBeenCalled();
  });

  it('去除首尾空白后恰好 500 字时可提交', async () => {
    const { submit, click, wrapper } = await openDialog();

    await wrapper.find('textarea').setValue('字'.repeat(500));
    await click('驳回');

    expect(submit).toHaveBeenCalledWith('字'.repeat(500));
  });

  it('确认后以去除首尾空白的原因提交并关闭', async () => {
    const { wrapper, submit, settled, click } = await openDialog();

    await wrapper.find('textarea').setValue(`  ${'字'.repeat(500)}  `);
    await click('驳回');

    expect(submit).toHaveBeenCalledWith('字'.repeat(500));
    expect(settled).toHaveBeenCalledWith(true);
    expect(wrapper.findComponent({ name: 'ElDialog' }).props('modelValue')).toBe(false);
  });

  it('取消时不提交并返回 false', async () => {
    const { wrapper, submit, settled, click } = await openDialog();

    await wrapper.find('textarea').setValue('答案有误');
    await click('取消');

    expect(submit).not.toHaveBeenCalled();
    expect(settled).toHaveBeenCalledWith(false);
  });

  it('关闭后重新打开不保留错误提示与已填内容', async () => {
    const { wrapper, click } = await openDialog();

    await click('驳回');
    expect(reasonError(wrapper)).toBe('请填写驳回原因');
    await wrapper.find('textarea').setValue('答案有误');
    await wrapper.find('textarea').setValue('');
    await flushPromises();
    await click('取消');

    (wrapper.vm as unknown as DialogVm).open({ submit: vi.fn(async () => true) });
    await flushPromises();

    expect(reasonError(wrapper)).toBe('');
    expect(wrapper.find('.el-form-item__error').exists()).toBe(false);
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('');
  });

  it('提交中取消按钮禁用，关闭图标隐藏且按 ESC 不关闭', async () => {
    let finish: (done: boolean) => void = () => {};
    const submit = vi.fn(() => new Promise<boolean>(resolve => (finish = resolve)));
    const { wrapper, settled, click } = await openDialog(submit);

    await wrapper.find('textarea').setValue('答案有误');
    await click('驳回');

    const dialog = wrapper.findComponent({ name: 'ElDialog' });
    const cancel = wrapper.findAll('button').find(button => button.text() === '取消')!;
    expect(cancel.attributes('disabled')).toBeDefined();
    expect(dialog.props('showClose')).toBe(false);
    expect(dialog.props('closeOnPressEscape')).toBe(false);
    expect(dialog.props('closeOnClickModal')).toBe(false);
    expect(wrapper.find('.el-dialog__headerbtn').exists()).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
    await flushPromises();
    expect(dialog.props('modelValue')).toBe(true);
    expect(settled).not.toHaveBeenCalled();

    finish(true);
    await flushPromises();
    expect(settled).toHaveBeenCalledWith(true);
  });

  it('连续点击驳回只提交一次', async () => {
    let finish: (done: boolean) => void = () => {};
    const submit = vi.fn(() => new Promise<boolean>(resolve => (finish = resolve)));
    const { wrapper } = await openDialog(submit);

    await wrapper.find('textarea').setValue('答案有误');
    const confirmButton = wrapper.findAll('button').find(button => button.text() === '驳回')!;
    await confirmButton.trigger('click');
    await confirmButton.trigger('click');
    await flushPromises();
    await confirmButton.trigger('click');
    await flushPromises();

    expect(submit).toHaveBeenCalledTimes(1);
    finish(true);
    await flushPromises();
  });

  it('组件卸载时以 false 结束等待', async () => {
    const { wrapper, settled } = await openDialog();

    wrapper.unmount();
    await flushPromises();

    expect(settled).toHaveBeenCalledWith(false);
  });

  it('提交失败时保持打开并保留已填原因', async () => {
    const { wrapper, settled, click } = await openDialog(vi.fn(async () => false));

    await wrapper.find('textarea').setValue('答案有误');
    await click('驳回');

    expect(settled).not.toHaveBeenCalled();
    expect(wrapper.findComponent({ name: 'ElDialog' }).props('modelValue')).toBe(true);
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('答案有误');
  });
});
