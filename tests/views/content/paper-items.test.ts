import { describe, it, expect } from 'vitest';
import type { AdminPaperDto, AdminPaperQuestionDto, AdminQuestionDto } from '@/api';
import {
  computePaperScores,
  fromAdminPaper,
  fromQuestion,
  itemScore,
  materialIds,
  moveItem,
  removeSection,
  setMaterialScore,
  toSetQuestionsDto,
  validatePaperItems,
  type PaperItem,
} from '@/views/content/paper-edit/paper-items';

const standalone = (
  questionId: string,
  sectionIndex: number,
  score: number,
  type: PaperItem['type'] = 'SINGLE',
): PaperItem => ({
  questionId,
  type,
  stem: questionId,
  sectionIndex,
  score,
  children: [],
});

const material = (questionId: string, sectionIndex: number, scores: number[]): PaperItem => ({
  questionId,
  type: 'MATERIAL',
  stem: '材料',
  sectionIndex,
  score: scores[0],
  children: scores.map((score, index) => ({
    questionId: `${questionId}-${index}`,
    type: index === 0 ? 'SINGLE' : 'SHORT_ANSWER',
    stem: '小题',
    score,
  })),
});

const row = (overrides: Partial<AdminPaperQuestionDto>): AdminPaperQuestionDto => ({
  paperId: 'p1',
  sectionIndex: 0,
  questionId: 'q',
  questionVersion: 1,
  sort: 0,
  score: 1,
  parentId: null,
  type: 'SINGLE',
  status: 'PUBLISHED',
  currentVersion: 1,
  stem: '题干',
  fileUrls: {},
  ...overrides,
});

describe('试卷分值计算', () => {
  it('总分为全部小题分值之和，客观题只计单选、多选、判断、填空', () => {
    const items = [standalone('a', 0, 1.5), standalone('b', 0, 2, 'ESSAY'), material('m', 1, [0.5, 3])];

    expect(computePaperScores(items)).toEqual({ totalScore: 7, objectiveScore: 2, questionCount: 4 });
  });

  it('按分计算避免浮点误差', () => {
    const items = [standalone('a', 0, 0.1), standalone('b', 0, 0.2, 'JUDGE')];

    expect(computePaperScores(items).totalScore).toBe(0.3);
  });

  it('材料统一设置每道小题分值', () => {
    const item = material('m', 0, [1, 2]);
    setMaterialScore(item, 2.5);

    expect(item.children.map(child => child.score)).toEqual([2.5, 2.5]);
    expect(itemScore(item)).toBe(5);
  });
});

describe('fromAdminPaper', () => {
  it('材料小题按所属材料聚合，保持顺序与小题分值', () => {
    const paper = {
      questions: [
        row({ questionId: 's2', sort: 3, sectionIndex: 1 }),
        row({ questionId: 's1', sort: 0 }),
        row({ questionId: 'c1', parentId: 'm1', sort: 1, score: 2 }),
        row({ questionId: 'c2', parentId: 'm1', sort: 2, score: 3, type: 'SHORT_ANSWER' }),
      ],
    } as AdminPaperDto;

    const items = fromAdminPaper(paper, { m1: '材料题干' });

    expect(items.map(item => item.questionId)).toEqual(['s1', 'm1', 's2']);
    expect(items[1]).toMatchObject({ type: 'MATERIAL', stem: '材料题干', score: 2 });
    expect(items[1].children.map(child => child.score)).toEqual([2, 3]);
    expect(materialIds(paper)).toEqual(['m1']);
  });
});

describe('fromQuestion', () => {
  it('材料按小题展开并使用同一分值', () => {
    const question = {
      id: 'm',
      type: 'MATERIAL',
      stem: '材料',
      children: [
        { id: 'c1', type: 'SINGLE', stem: '一' },
        { id: 'c2', type: 'JUDGE', stem: '二' },
      ],
    } as AdminQuestionDto;

    const item = fromQuestion(question, 2, 1.5);

    expect(item.sectionIndex).toBe(2);
    expect(item.children).toEqual([
      { questionId: 'c1', type: 'SINGLE', stem: '一', score: 1.5 },
      { questionId: 'c2', type: 'JUDGE', stem: '二', score: 1.5 },
    ]);
  });
});

describe('toSetQuestionsDto', () => {
  it('按分区排序，材料附带逐小题分值', () => {
    const dto = toSetQuestionsDto(
      [
        { title: ' 一 ', questionType: 'SINGLE' },
        { title: '二', questionType: 'MATERIAL' },
      ],
      [material('m', 1, [2, 3]), standalone('a', 0, 1), standalone('b', 0, 2)],
    );

    expect(dto.sections[0].title).toBe('一');
    expect(dto.questions).toEqual([
      { questionId: 'a', sectionIndex: 0, score: 1 },
      { questionId: 'b', sectionIndex: 0, score: 2 },
      { questionId: 'm', sectionIndex: 1, score: 2, childScores: [2, 3] },
    ]);
  });
});

describe('排序与分区操作', () => {
  it('只在同一分区内移动', () => {
    const a = standalone('a', 0, 1);
    const b = standalone('b', 1, 1);
    const c = standalone('c', 0, 1);

    expect(moveItem([a, b, c], a, 1).map(item => item.questionId)).toEqual(['c', 'b', 'a']);
    expect(moveItem([a, b, c], a, -1)).toEqual([a, b, c]);
  });

  it('删除分区连同题目，后续分区下标前移', () => {
    const result = removeSection(
      [
        { title: '一', questionType: 'SINGLE' },
        { title: '二', questionType: 'SINGLE' },
      ],
      [standalone('a', 0, 1), standalone('b', 1, 1)],
      0,
    );

    expect(result.sections.map(section => section.title)).toEqual(['二']);
    expect(result.items).toEqual([expect.objectContaining({ questionId: 'b', sectionIndex: 0 })]);
  });
});

describe('validatePaperItems', () => {
  const sections = [{ title: '一', questionType: 'SINGLE' as const }];

  it('合法时无错误', () => {
    expect(validatePaperItems(sections, [standalone('a', 0, 1)])).toEqual([]);
  });

  it('校验分区、重复题目、分值精度与总分上限', () => {
    const errors = validatePaperItems(
      [{ title: ' ', questionType: 'SINGLE' }],
      [
        standalone('a', 0, 1.234),
        standalone('a', 0, 999.99),
        ...Array.from({ length: 10 }, (_, i) => standalone(`x${i}`, 0, 999)),
      ],
    );

    expect(errors).toContain('第 1 个分区标题须为 1-50 字');
    expect(errors).toContain('同一题目不能重复加入');
    expect(errors).toContain('每题分值须在 0.01-999.99 之间，最多两位小数');
    expect(errors).toContain('总分不能超过 9999.99');
  });

  it('题目须归属已有分区，至少一个分区', () => {
    expect(validatePaperItems([], [standalone('a', 0, 1)])).toEqual(['分区须有 1-50 个', '存在未归属分区的题目']);
  });
});
