import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import QuestionPreview from '@/views/content/shared/components/QuestionPreview.vue';

const FILE_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('题目预览', () => {
  it('渲染选项、公式与正确答案高亮', () => {
    const wrapper = mount(QuestionPreview, {
      props: {
        question: {
          type: 'MULTIPLE',
          stem: '计算 $\\frac{1}{2}$',
          options: [
            { key: 'A', content: '甲' },
            { key: 'B', content: '乙' },
            { key: 'C', content: '丙' },
          ],
          answer: { keys: ['A', 'C'] },
          analysis: '解析内容',
        },
      },
    });

    expect(wrapper.find('.katex').exists()).toBe(true);
    expect(wrapper.findAll('.question-preview__option--correct').map(item => item.text())).toEqual(['A.甲', 'C.丙']);
    expect(wrapper.text()).toContain('A、C');
    expect(wrapper.text()).toContain('解析内容');
  });

  it('隐藏答案时不展示答案与解析', () => {
    const wrapper = mount(QuestionPreview, {
      props: {
        question: { type: 'JUDGE', stem: '题干', answer: { value: true }, analysis: '解析' },
        showAnswer: false,
      },
    });

    expect(wrapper.text()).not.toContain('解析');
    expect(wrapper.text()).not.toContain('对');
  });

  it('简答展示参考答案与要点', () => {
    const wrapper = mount(QuestionPreview, {
      props: {
        question: {
          type: 'SHORT_ANSWER',
          stem: '简述',
          answer: { reference: '参考答案', points: ['要点一', '要点二'] },
        },
      },
    });

    expect(wrapper.text()).toContain('参考答案');
    expect(wrapper.findAll('.question-preview__points li').map(item => item.text())).toEqual(['要点一', '要点二']);
  });

  it('材料题用题目自带的 fileUrls 解析图片（键大小写不敏感），用 audioUrl 播放音频，小题用各自的 fileUrls', () => {
    const wrapper = mount(QuestionPreview, {
      props: {
        question: {
          type: 'MATERIAL',
          stem: '根据以下材料回答问题。',
          material: `![图表](file:${FILE_ID})`,
          audioFileId: 'a1',
          audioUrl: 'https://cdn/a.mp3',
          fileUrls: { [FILE_ID.toUpperCase()]: 'https://cdn/chart.png' },
          children: [
            {
              type: 'JUDGE',
              stem: '小题一 ![](file:11111111-1111-1111-1111-111111111111)',
              answer: { value: false },
              fileUrls: { '11111111-1111-1111-1111-111111111111': 'https://cdn/child.png' },
            },
          ],
        },
      },
    });

    expect(wrapper.find('.question-preview__material img').attributes('src')).toBe('https://cdn/chart.png');
    expect(wrapper.find('audio').attributes('src')).toBe('https://cdn/a.mp3');
    expect(wrapper.find('.question-preview__children img').attributes('src')).toBe('https://cdn/child.png');
    expect(wrapper.text()).toContain('第 1 小题');
  });

  it('无 audioUrl 时从 fileUrls 取音频地址，都没有时提示无法加载', () => {
    const fromMap = mount(QuestionPreview, {
      props: {
        question: { type: 'MATERIAL', stem: '听力', audioFileId: 'A1' },
        fileUrls: { a1: 'https://cdn/a.mp3' },
      },
    });
    expect(fromMap.find('audio').attributes('src')).toBe('https://cdn/a.mp3');

    const missing = mount(QuestionPreview, {
      props: { question: { type: 'MATERIAL', stem: '听力', audioFileId: 'a2' } },
    });
    expect(missing.find('audio').exists()).toBe(false);
    expect(missing.text()).toContain('音频无法加载');
  });
});
