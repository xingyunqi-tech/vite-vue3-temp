import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import AnswerEditor from '@/views/content/shared/components/AnswerEditor.vue';
import { createQuestionForm } from '@/views/content/shared/question-form';

const fillForm = () => ({ ...createQuestionForm('FILL'), blanks: [['北京'], ['1949']] });

const buttonTexts = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').map(button => button.text());

describe('AnswerEditor', () => {
  it('填空题默认可以增删空', () => {
    const wrapper = mount(AnswerEditor, { props: { form: fillForm() } });

    expect(buttonTexts(wrapper)).toContain('添加空');
    expect(buttonTexts(wrapper).filter(text => text === '删除此空')).toHaveLength(2);
  });

  it('fixedBlanks 时不能增删空，仍可增删候选答案', async () => {
    const form = fillForm();
    const wrapper = mount(AnswerEditor, { props: { form, fixedBlanks: true } });

    expect(buttonTexts(wrapper)).not.toContain('添加空');
    expect(buttonTexts(wrapper)).not.toContain('删除此空');
    await wrapper
      .findAll('button')
      .find(button => button.text() === '添加候选答案')!
      .trigger('click');
    expect(form.blanks[0]).toEqual(['北京', '']);
  });
});
