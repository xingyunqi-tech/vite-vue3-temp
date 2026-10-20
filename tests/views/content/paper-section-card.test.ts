import { flushPromises, mount } from '@vue/test-utils';
import { ElInputNumber } from 'element-plus';
import { describe, it, expect } from 'vitest';
import PaperSectionCard from '@/views/content/paper-edit/components/PaperSectionCard.vue';
import type { PaperItem } from '@/views/content/paper-edit/paper-items';

const item = { questionId: 'q1', sectionIndex: 0, type: 'SINGLE', stem: '题干', score: 2 } as PaperItem;

const mountCard = () =>
  mount(PaperSectionCard, {
    props: {
      index: 0,
      items: [item],
      frozen: false,
      section: { title: '一、单选题', type: 'SINGLE' } as never,
    },
  });

describe('PaperSectionCard', () => {
  it('清空分值时不提交分值', async () => {
    const wrapper = mountCard();
    await flushPromises();

    wrapper.findComponent(ElInputNumber).vm.$emit('update:modelValue', null);

    expect(wrapper.emitted('score')).toBeUndefined();
  });

  it('修改分值时提交新分值', async () => {
    const wrapper = mountCard();
    await flushPromises();

    wrapper.findComponent(ElInputNumber).vm.$emit('update:modelValue', 3);

    expect(wrapper.emitted('score')).toEqual([[item, 3]]);
  });
});
