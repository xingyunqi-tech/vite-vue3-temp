import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import BatchResultDialog from '@/views/content/shared/components/BatchResultDialog.vue';

const failures = [
  { id: 'q1', label: '下列说法正确的是', message: '题目状态不允许此操作' },
  { id: 'q2', label: '', message: '题目不存在' },
];

async function mountDialog(props: Record<string, unknown> = {}) {
  const wrapper = mount(BatchResultDialog, {
    props: { modelValue: true, succeeded: 3, failures, ...props },
  });
  await flushPromises();
  return wrapper;
}

describe('批量操作结果弹窗', () => {
  it('展示成功数、失败数与每条失败原因', async () => {
    const wrapper = await mountDialog();

    expect(wrapper.find('.batch-result__summary').text()).toBe('成功 3 项，失败 2 项');
    const rows = wrapper.findAll('.el-table__body tr.el-table__row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('下列说法正确的是');
    expect(rows[0].text()).toContain('题目状态不允许此操作');
    expect(rows[1].text()).toContain('题目不存在');
  });

  it('没有摘要的失败项显示 id', async () => {
    const wrapper = await mountDialog();

    expect(wrapper.findAll('.batch-result__link')[1].text()).toBe('q2');
  });

  it('使用传入的标题与名称列', async () => {
    const wrapper = await mountDialog({ title: '导入结果', itemLabel: '试卷' });

    expect(wrapper.find('.el-dialog__title').text()).toBe('导入结果');
    expect(wrapper.find('.el-table__header').text()).toContain('试卷');
  });

  it('点击名称抛出该项 id', async () => {
    const wrapper = await mountDialog();

    await wrapper.findAll('.batch-result__link')[0].trigger('click');

    expect(wrapper.emitted('select')).toEqual([['q1']]);
  });

  it('点击关闭更新显示状态', async () => {
    const wrapper = await mountDialog();

    await wrapper
      .findAll('button')
      .find(button => button.text() === '关闭')!
      .trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });
});
