import { describe, it, expect } from 'vitest';
import type { AdminQuestionDto } from '@/api';
import {
  addOption,
  ANSWER_LIMITS,
  createQuestionForm,
  diffQuestionPayload,
  formatAnswer,
  isAnswerLocked,
  isQuestionType,
  mergeFileUrls,
  removeOption,
  selectableQuestionTypes,
  toAnswer,
  toQuestionForm,
  toQuestionPayload,
  validateQuestionForm,
} from '@/views/content/shared/question-form';

const question = (overrides: Partial<AdminQuestionDto> = {}): AdminQuestionDto => ({
  id: 'q1',
  subjectId: 's1',
  parentId: null,
  type: 'SINGLE',
  currentVersion: 0,
  stem: '题干',
  options: [
    { key: 'A', content: '甲' },
    { key: 'B', content: '乙' },
  ],
  answer: { keys: ['B'] },
  analysis: null,
  difficulty: 3,
  knowledgePointIds: ['k1'],
  material: null,
  audioFileId: null,
  source: 'ORIGINAL',
  sourceNote: null,
  status: 'DRAFT',
  isFree: true,
  sort: 0,
  contentHash: 'h',
  statAnswered: 0,
  statCorrect: 0,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  audioUrl: null,
  fileUrls: {},
  ...overrides,
});

describe('题目表单与答案结构互转', () => {
  it('单选、多选答案按字母排序', () => {
    const form = toQuestionForm(question({ type: 'MULTIPLE', answer: { keys: ['B', 'A'] } }));

    expect(form.choiceKeys).toEqual(['A', 'B']);
    expect(toAnswer(form)).toEqual({ keys: ['A', 'B'] });
  });

  it('判断题读写 value', () => {
    const form = toQuestionForm(question({ type: 'JUDGE', options: null, answer: { value: false } }));

    expect(form.judge).toBe(false);
    expect(toQuestionPayload(form)).toMatchObject({ options: null, answer: { value: false } });
  });

  it('填空题多空与候选答案去空白、丢弃空候选', () => {
    const form = toQuestionForm(
      question({ type: 'FILL', options: null, answer: { blanks: [['北京', '北京市'], ['1949']] } }),
    );
    form.blanks[0].push('  ');
    form.blanks[1][0] = ' 1949 ';

    expect(toAnswer(form)).toEqual({ blanks: [['北京', '北京市'], ['1949']] });
  });

  it('简答题保留参考答案、要点与评分标准 ID', () => {
    const form = toQuestionForm(
      question({
        type: 'SHORT_ANSWER',
        options: null,
        answer: { reference: '参考', points: ['要点一', ''], rubricId: 'r1' },
      }),
    );

    expect(toAnswer(form)).toEqual({ reference: '参考', points: ['要点一'], rubricId: 'r1' });
  });

  it('作文参考答案为空时答案为空对象', () => {
    const form = createQuestionForm('ESSAY');

    expect(toAnswer(form)).toEqual({});
  });

  it('材料题不带答案、选项与知识点，保留材料与音频', () => {
    const form = createQuestionForm('MATERIAL');
    form.material = '材料';
    form.audioFileId = 'f1';
    form.knowledgePointIds = ['k1'];

    expect(toQuestionPayload(form)).toMatchObject({
      stem: '根据以下材料回答问题。',
      options: null,
      answer: null,
      knowledgePointIds: [],
      material: '材料',
      audioFileId: 'f1',
    });
  });

  it('非材料题不提交材料与音频，空解析与来源说明提交 null', () => {
    const form = toQuestionForm(question());
    form.material = '残留';
    form.analysis = '  ';

    expect(toQuestionPayload(form)).toMatchObject({
      material: null,
      audioFileId: null,
      analysis: null,
      sourceNote: null,
    });
  });

  it('删除选项后重新编号，已选答案随之迁移', () => {
    const form = createQuestionForm('MULTIPLE');
    form.choiceKeys = ['B', 'D'];

    removeOption(form, 0);

    expect(form.options.map(option => option.key)).toEqual(['A', 'B', 'C']);
    expect(form.choiceKeys).toEqual(['A', 'C']);
  });

  it('新增选项前按顺序重新编号', () => {
    const form = createQuestionForm('SINGLE');
    form.options = [
      { key: 'B', content: '甲' },
      { key: 'D', content: '乙' },
    ];
    form.choiceKeys = ['D'];

    addOption(form);

    expect(form.options.map(option => option.key)).toEqual(['A', 'B', 'C']);
    expect(form.choiceKeys).toEqual(['B']);
  });

  it('选项最多 26 个', () => {
    const form = createQuestionForm('SINGLE');
    for (let i = 0; i < 30; i += 1) addOption(form);

    expect(form.options).toHaveLength(26);
    expect(form.options[25].key).toBe('Z');
  });

  it('答案文字表示', () => {
    expect(formatAnswer('MULTIPLE', { keys: ['A', 'C'] })).toBe('A、C');
    expect(formatAnswer('JUDGE', { value: true })).toBe('对');
    expect(formatAnswer('FILL', { blanks: [['a', 'b'], ['c']] })).toBe('第1空：a / b；第2空：c');
    expect(formatAnswer('ESSAY', {})).toBe('');
  });
});

describe('validateQuestionForm', () => {
  const validSingle = () => {
    const form = createQuestionForm('SINGLE');
    form.stem = '题干';
    form.options = [
      { key: 'A', content: '甲' },
      { key: 'B', content: '乙' },
    ];
    form.choiceKeys = ['A'];
    return form;
  };

  it('合法单选题无错误', () => {
    expect(validateQuestionForm(validSingle())).toEqual([]);
  });

  it('单选须恰好一个答案，选项至少两个且内容非空', () => {
    const form = validSingle();
    form.choiceKeys = ['A', 'B'];
    form.options = [{ key: 'A', content: '' }];

    const errors = validateQuestionForm(form);
    expect(errors).toContain('单选题须选择 1 个正确选项');
    expect(errors).toContain('选择题须有 2-26 个选项');
    expect(errors).toContain('选项内容不能为空');
    expect(errors).toContain('答案须为已有选项');
  });

  it('选项字母不能重复', () => {
    const form = validSingle();
    form.options = [
      { key: 'A', content: '甲' },
      { key: 'A', content: '乙' },
    ];

    expect(validateQuestionForm(form)).toEqual(['选项字母不能重复']);
  });

  it('知识点只能是叶子', () => {
    const form = validSingle();
    form.knowledgePointIds = ['leaf', 'branch'];

    expect(validateQuestionForm(form, { leafIds: new Set(['leaf']) })).toEqual(['只能关联叶子知识点']);
  });

  it('填空空数与候选数受上限约束', () => {
    const form = createQuestionForm('FILL');
    form.stem = '题干';
    form.blanks = Array.from({ length: ANSWER_LIMITS.blanks + 1 }, () => ['x']);
    form.blanks[0] = Array.from({ length: ANSWER_LIMITS.candidatesPerBlank + 1 }, () => 'y');
    form.blanks[1] = ['z'.repeat(ANSWER_LIMITS.candidateLength + 1)];

    const errors = validateQuestionForm(form);
    expect(errors).toContain('填空题须有 1-20 个空');
    expect(errors).toContain('第 1 空须有 1-10 个候选答案');
    expect(errors).toContain('第 2 空的候选答案不能超过 500 字');
  });

  it('空的填空候选视为未填写', () => {
    const form = createQuestionForm('FILL');
    form.stem = '题干';
    form.blanks = [['  ']];

    expect(validateQuestionForm(form)).toEqual(['第 1 空须有 1-10 个候选答案']);
  });

  it('简答须有参考答案，要点不超过 20 条', () => {
    const form = createQuestionForm('SHORT_ANSWER');
    form.stem = '题干';
    form.points = Array.from({ length: ANSWER_LIMITS.points + 1 }, (_, i) => `要点${i}`);

    const errors = validateQuestionForm(form);
    expect(errors).toContain('简答题须填写参考答案');
    expect(errors).toContain('要点不能超过 20 条');
  });

  it('判断题须选择答案', () => {
    const form = createQuestionForm('JUDGE');
    form.stem = '题干';

    expect(validateQuestionForm(form)).toEqual(['请选择判断题答案']);
  });

  it('材料须有材料内容或音频，小题不能是材料题', () => {
    const form = createQuestionForm('MATERIAL');

    expect(validateQuestionForm(form, { isSubQuestion: true })).toEqual([
      '小题不能是材料题',
      '材料内容与音频至少填写一项',
    ]);
    form.audioFileId = 'f1';
    expect(validateQuestionForm(form)).toEqual([]);
  });

  it('题干必填', () => {
    const form = validSingle();
    form.stem = '   ';

    expect(validateQuestionForm(form)).toEqual(['题干不能为空']);
  });
});

describe('diffQuestionPayload', () => {
  it('只包含改动的字段', () => {
    const original = toQuestionPayload(toQuestionForm(question({ stem: '![](https://cdn/a.png)' })));
    const form = toQuestionForm(question({ stem: '![](https://cdn/a.png)' }));
    form.analysis = '新解析';

    expect(diffQuestionPayload(original, toQuestionPayload(form))).toEqual({ analysis: '新解析' });
  });

  it('知识点只是顺序不同时不算改动', () => {
    const original = toQuestionPayload(toQuestionForm(question({ knowledgePointIds: ['a', 'b'] })));
    const form = toQuestionForm(question({ knowledgePointIds: ['a', 'b'] }));
    form.knowledgePointIds = ['b', 'a'];

    expect(diffQuestionPayload(original, toQuestionPayload(form))).toEqual({});
  });

  it('选项内容改动时提交整组选项', () => {
    const original = toQuestionPayload(toQuestionForm(question()));
    const form = toQuestionForm(question());
    form.options[0].content = '丙';

    expect(diffQuestionPayload(original, toQuestionPayload(form))).toEqual({
      options: [
        { key: 'A', content: '丙' },
        { key: 'B', content: '乙' },
      ],
    });
  });
});

describe('isAnswerLocked', () => {
  it('发布过的题目锁定答案', () => {
    expect(isAnswerLocked(question({ currentVersion: 1 }))).toBe(true);
    expect(isAnswerLocked(question())).toBe(false);
    expect(isAnswerLocked(null)).toBe(false);
  });
});

describe('题型选择', () => {
  it('新建可选全部题型，小题不能选材料题', () => {
    expect(selectableQuestionTypes()).toContain('MATERIAL');
    expect(selectableQuestionTypes({ isSubQuestion: true })).not.toContain('MATERIAL');
  });

  it('编辑已有题目时不能在材料与非材料题型间切换', () => {
    expect(selectableQuestionTypes({ editingType: 'SINGLE' })).not.toContain('MATERIAL');
    expect(selectableQuestionTypes({ editingType: 'SINGLE' })).toContain('FILL');
    expect(selectableQuestionTypes({ editingType: 'MATERIAL' })).toEqual(['MATERIAL']);
  });

  it('识别合法题型', () => {
    expect(isQuestionType('FILL')).toBe(true);
    expect(isQuestionType('HACK')).toBe(false);
    expect(isQuestionType(undefined)).toBe(false);
  });
});

describe('mergeFileUrls', () => {
  it('合并多个地址表，键转为小写，后者覆盖前者', () => {
    expect(mergeFileUrls({ AB: 'x' }, null, { ab: 'y', Cd: 'z' })).toEqual({ ab: 'y', cd: 'z' });
  });
});
