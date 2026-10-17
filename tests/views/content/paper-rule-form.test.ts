import { describe, it, expect } from 'vitest';
import type { PaperRule } from '@/api';
import {
  createPaperRuleForm,
  createRuleItem,
  estimateRuleScore,
  toPaperRuleDto,
  toPaperRuleForm,
  validatePaperRuleForm,
} from '@/views/content/paper-rules/paper-rule-form';

const rule: PaperRule = {
  id: 'r1',
  subjectId: 's1',
  name: '行测模考',
  durationMin: 120,
  multiScoringRule: 'PARTIAL',
  items: [
    { sectionTitle: '常识', questionType: 'SINGLE', count: 20, scorePerQuestion: 0.8 },
    {
      sectionTitle: '资料分析',
      questionType: 'MATERIAL',
      knowledgePointIds: ['k1'],
      difficultyRange: [2, 4],
      count: 10,
      scorePerQuestion: 1,
    },
  ],
  status: 'DRAFT',
  createdAt: '',
  updatedAt: '',
};

describe('组卷规则表单', () => {
  it('规则与表单互转，未限定的条件不提交', () => {
    const form = toPaperRuleForm(rule);

    expect(form.items[0]).toMatchObject({ limitDifficulty: false, knowledgePointIds: [] });
    expect(toPaperRuleDto(form)).toEqual({
      subjectId: 's1',
      name: '行测模考',
      durationMin: 120,
      multiScoringRule: 'PARTIAL',
      items: rule.items,
    });
  });

  it('预计总分为各项题数乘分值之和', () => {
    expect(estimateRuleScore(toPaperRuleForm(rule).items)).toBe(26);
  });

  it('合法规则无错误', () => {
    expect(validatePaperRuleForm(toPaperRuleForm(rule))).toEqual([]);
  });

  it('校验科目、名称、分区标题、难度范围、题数与分值', () => {
    const form = createPaperRuleForm();
    form.items = [
      { ...createRuleItem(), limitDifficulty: true, difficultyRange: [4, 2], count: 0, scorePerQuestion: 1.234 },
    ];

    expect(validatePaperRuleForm(form)).toEqual([
      '请选择科目',
      '名称须为 1-100 字',
      '第 1 项分区标题须为 1-50 字',
      '第 1 项难度范围须在 1-5 之间且下限不大于上限',
      '第 1 项题数须为 1-200',
      '第 1 项每题分值须在 0.01-999.99 之间，最多两位小数',
    ]);
  });

  it('同名分区题型须一致，总题数与总分有上限', () => {
    const form = toPaperRuleForm(rule);
    form.items = [
      { ...createRuleItem(), sectionTitle: '一', questionType: 'SINGLE', count: 200, scorePerQuestion: 999 },
      { ...createRuleItem(), sectionTitle: '一', questionType: 'JUDGE', count: 200 },
      { ...createRuleItem(), sectionTitle: '二', count: 200 },
    ];

    expect(validatePaperRuleForm(form)).toEqual(['同名分区的题型须一致', '总题数不能超过 500', '总分不能超过 9999.99']);
  });
});
