import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminGetPaper,
  adminGetQuestion,
  adminPublishPaper,
  adminSetPaperQuestions,
  adminUpdatePaper,
  type AdminPaperDto,
  type AdminQuestionDto,
} from '@/api';
import { PaperValidationError, usePaperEditor } from '@/views/content/paper-edit/usePaperEditor';

vi.mock('@/api', () => ({
  adminCopyPaper: vi.fn(),
  adminDeletePaper: vi.fn(),
  adminGetPaper: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminOfflinePaper: vi.fn(),
  adminPublishPaper: vi.fn(),
  adminSetPaperQuestions: vi.fn(async () => ({})),
  adminUpdatePaper: vi.fn(async () => ({})),
}));

const paper = (overrides: Partial<AdminPaperDto> = {}): AdminPaperDto => ({
  id: 'p1',
  subjectId: 's1',
  title: '模拟卷',
  type: 'MOCK',
  year: null,
  ownerUserId: null,
  durationMin: 120,
  sections: [{ title: '一', questionType: 'SINGLE' }],
  totalScore: 3,
  objectiveScore: 3,
  multiScoringRule: 'ALL_OR_NOTHING',
  status: 'DRAFT',
  isFree: true,
  attemptCount: 0,
  questionCount: 2,
  createdAt: '',
  updatedAt: '',
  questions: [
    {
      paperId: 'p1',
      sectionIndex: 0,
      questionId: 'c1',
      questionVersion: 1,
      sort: 0,
      score: 1,
      parentId: 'm1',
      type: 'SINGLE',
      status: 'PUBLISHED',
      currentVersion: 1,
      stem: '小题',
      fileUrls: {},
    },
    {
      paperId: 'p1',
      sectionIndex: 0,
      questionId: 'c2',
      questionVersion: 1,
      sort: 1,
      score: 2,
      parentId: 'm1',
      type: 'SINGLE',
      status: 'PUBLISHED',
      currentVersion: 1,
      stem: '小题',
      fileUrls: {},
    },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminGetPaper).mockResolvedValue(paper());
  vi.mocked(adminGetQuestion).mockResolvedValue({ id: 'm1', stem: '材料题干' } as AdminQuestionDto);
});

describe('usePaperEditor', () => {
  it('加载试卷并聚合材料，补齐材料题干', async () => {
    const editor = usePaperEditor();
    await editor.load('p1');

    expect(editor.items.value).toHaveLength(1);
    expect(editor.items.value[0]).toMatchObject({ questionId: 'm1', stem: '材料题干' });
    expect(editor.summary.value).toEqual({ totalScore: 3, objectiveScore: 3, questionCount: 2 });
    expect(editor.dirty.value).toBe(false);
  });

  it('加入题目并保存时整体设置题目与分值', async () => {
    const editor = usePaperEditor();
    await editor.load('p1');

    const added = editor.addQuestions(0, [{ id: 'q9', type: 'JUDGE', stem: '判断' } as AdminQuestionDto], 1.5);
    await editor.save();

    expect(added).toBe(1);
    expect(adminSetPaperQuestions).toHaveBeenCalledWith('p1', {
      sections: [{ title: '一', questionType: 'SINGLE' }],
      questions: [
        { questionId: 'm1', sectionIndex: 0, score: 1, childScores: [1, 2] },
        { questionId: 'q9', sectionIndex: 0, score: 1.5 },
      ],
    });
    expect(adminUpdatePaper).not.toHaveBeenCalled();
  });

  it('已在试卷中的题目不重复加入', async () => {
    const editor = usePaperEditor();
    await editor.load('p1');

    expect(editor.addQuestions(0, [{ id: 'm1', type: 'MATERIAL', stem: '' } as AdminQuestionDto], 1)).toBe(0);
    expect(editor.dirty.value).toBe(false);
  });

  it('只提交改动的基本信息', async () => {
    const editor = usePaperEditor();
    await editor.load('p1');
    editor.basic.value.title = ' 新标题 ';

    await editor.save();

    expect(adminUpdatePaper).toHaveBeenCalledWith('p1', { title: '新标题' });
    expect(adminSetPaperQuestions).not.toHaveBeenCalled();
  });

  it('已发布试卷不提交题目，也不能改类型', async () => {
    vi.mocked(adminGetPaper).mockResolvedValue(paper({ status: 'PUBLISHED' }));
    const editor = usePaperEditor();
    await editor.load('p1');
    editor.basic.value.type = 'REAL';
    editor.basic.value.durationMin = 90;
    editor.markDirty();

    await editor.save();

    expect(editor.frozen.value).toBe(true);
    expect(adminUpdatePaper).toHaveBeenCalledWith('p1', { durationMin: 90 });
    expect(adminSetPaperQuestions).not.toHaveBeenCalled();
  });

  it('题目校验失败时不发请求', async () => {
    const editor = usePaperEditor();
    await editor.load('p1');
    editor.sections.value[0].title = '';
    editor.markDirty();

    await expect(editor.save()).rejects.toBeInstanceOf(PaperValidationError);
    expect(adminSetPaperQuestions).not.toHaveBeenCalled();
  });

  it('发布前先保存未保存的修改', async () => {
    vi.mocked(adminPublishPaper).mockResolvedValue(paper({ status: 'PUBLISHED' }));
    const editor = usePaperEditor();
    await editor.load('p1');
    editor.deleteSection(0);
    editor.addSection('JUDGE');
    editor.sections.value[0].title = '判断';

    await editor.publish().catch(() => undefined);

    expect(adminSetPaperQuestions).toHaveBeenCalledWith('p1', {
      sections: [{ title: '判断', questionType: 'JUDGE' }],
      questions: [],
    });
    expect(adminPublishPaper).toHaveBeenCalledWith('p1');
    expect(editor.paper.value?.status).toBe('PUBLISHED');
  });
});
