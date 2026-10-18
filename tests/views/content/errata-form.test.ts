import { describe, it, expect } from 'vitest';
import { question } from './feedback-fixtures';
import {
  createErrataDraft,
  errataChanges,
  toCreateErrataDto,
  validateErrataDraft,
} from '@/views/content/shared/errata-form';
import { toQuestionForm } from '@/views/content/shared/question-form';

const setup = (overrides: Parameters<typeof question>[0] = {}, reportIds: number[] = []) => {
  const source = question(overrides);
  return { source, original: toQuestionForm(source), draft: createErrataDraft(source, reportIds) };
};

describe('勘误表单模型', () => {
  it('以题目当前答案与解析初始化，带入纠错单', () => {
    const { draft } = setup({}, [7]);

    expect(draft.form.choiceKeys).toEqual(['A']);
    expect(draft.form.analysis).toBe('原解析');
    expect(draft.reportIds).toEqual([7]);
    expect(draft.reply).toBe('');
  });

  it('答案与解析都未修改时提示没有变化', () => {
    const { original, draft } = setup();

    expect(errataChanges(original, draft.form)).toEqual({ answer: false, analysis: false });
    expect(validateErrataDraft(original, draft)).toEqual(['答案与解析没有变化']);
  });

  it('只改答案时不提交解析', () => {
    const { source, original, draft } = setup({}, [7]);
    draft.form.choiceKeys = ['B'];
    draft.reply = '  已更正  ';

    expect(validateErrataDraft(original, draft)).toEqual([]);
    expect(toCreateErrataDto(source, original, draft)).toEqual({
      answer: { keys: ['B'] },
      reply: '已更正',
      reportIds: [7],
    });
  });

  it('只改解析时原样提交题目当前答案', () => {
    const { source, original, draft } = setup({
      type: 'FILL',
      options: null,
      answer: { blanks: [[' 北京 ', '北京市']] },
    });
    draft.form.analysis = '新解析';

    expect(toCreateErrataDto(source, original, draft).answer).toBe(source.answer);
  });

  it('只改解析时提交原答案与新解析，清空解析提交 null', () => {
    const { source, original, draft } = setup();
    draft.form.analysis = '新解析';

    expect(errataChanges(original, draft.form)).toEqual({ answer: false, analysis: true });
    expect(toCreateErrataDto(source, original, draft)).toEqual({ answer: { keys: ['A'] }, analysis: '新解析' });

    draft.form.analysis = '   ';
    expect(toCreateErrataDto(source, original, draft)).toEqual({ answer: { keys: ['A'] }, analysis: null });
  });

  it('填空题可以改候选答案，不能改空数', () => {
    const { source, original, draft } = setup({
      type: 'FILL',
      options: null,
      answer: { blanks: [['北京'], ['1949']] },
    });
    draft.form.blanks[0].push('北京市');

    expect(validateErrataDraft(original, draft)).toEqual([]);
    expect(toCreateErrataDto(source, original, draft).answer).toEqual({ blanks: [['北京', '北京市'], ['1949']] });

    draft.form.blanks.push(['新空']);
    expect(validateErrataDraft(original, draft)).toContain('勘误不能修改填空空数');
  });

  it('不能修改题型与选项', () => {
    const { original, draft } = setup();
    draft.form.choiceKeys = ['B'];
    draft.form.options = draft.form.options.slice(0, 2);
    draft.form.type = 'MULTIPLE';

    const errors = validateErrataDraft(original, draft);
    expect(errors).toContain('勘误不能修改题型');
    expect(errors).toContain('勘误不能修改选项');
  });

  it('沿用题目表单的答案校验，主观题保留评分标准', () => {
    const { source, original, draft } = setup({
      type: 'SHORT_ANSWER',
      options: null,
      answer: { reference: '参考', points: ['要点'], rubricId: 'r1' },
    });
    draft.form.reference = ' ';
    expect(validateErrataDraft(original, draft)).toContain('简答题须填写参考答案');

    draft.form.reference = '新参考';
    expect(toCreateErrataDto(source, original, draft).answer).toEqual({
      reference: '新参考',
      points: ['要点'],
      rubricId: 'r1',
    });
  });

  it('回复不能超过 1000 字', () => {
    const { original, draft } = setup();
    draft.form.choiceKeys = ['C'];
    draft.reply = '字'.repeat(1001);

    expect(validateErrataDraft(original, draft)).toEqual(['回复不能超过 1000 字']);
  });
});
