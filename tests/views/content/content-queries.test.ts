import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminBatchPublishQuestions,
  adminCreateSubject,
  adminDeleteExam,
  adminGetExams,
  adminGetQuestions,
  fetchAllSubjects,
  type AdminQuestionDto,
} from '@/api';
import {
  canDelete,
  canOffline,
  canPublish,
  createExamFilters,
  toExamQuery,
  useExamList,
  useSubjectList,
} from '@/views/content/exams/useExamCatalog';
import { createPaperFilters, toPaperQuery } from '@/views/content/papers/usePaperList';
import {
  canDeleteQuestion,
  canRepublishQuestion,
  createQuestionFilters,
  toQuestionQuery,
} from '@/views/content/questions/useQuestionList';
import { createReportFilters, toReportQuery } from '@/views/content/report-list/useReportList';
import { createReviewFilters, toReviewQuery, useReviewList } from '@/views/content/review/useReviewList';

vi.mock('@/api', () => ({
  adminBatchPublishQuestions: vi.fn(async () => ({ count: 6 })),
  adminCreateExam: vi.fn(),
  adminCreateSubject: vi.fn(async () => ({})),
  adminDeleteExam: vi.fn(async () => undefined),
  adminDeleteSubject: vi.fn(),
  adminGetExams: vi.fn(),
  adminGetQuestions: vi.fn(),
  adminOfflineExam: vi.fn(),
  adminOfflineSubject: vi.fn(),
  adminPublishExam: vi.fn(),
  adminPublishQuestion: vi.fn(),
  adminPublishSubject: vi.fn(),
  adminRejectQuestion: vi.fn(),
  adminUpdateExam: vi.fn(),
  adminUpdateSubject: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const emptyPage = { list: [], total: 0, page: 1, limit: 20, totalPages: 0 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('列表查询参数', () => {
  it('考试：空条件不传，关键字去空白', () => {
    expect(toExamQuery(createExamFilters(), 1, 20)).toEqual({ page: 1, limit: 20 });
    expect(toExamQuery({ keyword: ' 国考 ', category: 'CIVIL_SERVICE', status: 'DRAFT' }, 2, 50)).toEqual({
      page: 2,
      limit: 50,
      keyword: '国考',
      category: 'CIVIL_SERVICE',
      status: 'DRAFT',
    });
  });

  it('题目：只查独立题与材料，知识点需配合科目', () => {
    expect(toQuestionQuery(createQuestionFilters(), 1, 20)).toEqual({ page: 1, limit: 20, topLevel: true });
    expect(toQuestionQuery({ ...createQuestionFilters(), knowledgePointId: 'k1' }, 1, 20)).not.toHaveProperty(
      'knowledgePointId',
    );
    expect(
      toQuestionQuery(
        { subjectId: 's1', knowledgePointId: 'k1', type: 'FILL', status: 'DRAFT', source: 'PUBLIC', keyword: ' x ' },
        1,
        20,
      ),
    ).toEqual({
      page: 1,
      limit: 20,
      topLevel: true,
      subjectId: 's1',
      knowledgePointId: 'k1',
      type: 'FILL',
      status: 'DRAFT',
      source: 'PUBLIC',
      keyword: 'x',
    });
  });

  it('审核：固定查待审的独立题与材料', () => {
    expect(toReviewQuery({ ...createReviewFilters(), subjectId: 's1' }, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      status: 'REVIEWING',
      topLevel: true,
      subjectId: 's1',
    });
  });

  it('试卷：按科目、类型与状态筛选', () => {
    expect(toPaperQuery({ ...createPaperFilters(), type: 'REAL', status: 'PUBLISHED' }, 1, 10)).toEqual({
      page: 1,
      limit: 10,
      type: 'REAL',
      status: 'PUBLISHED',
    });
  });
});

describe('纠错与举报查询参数', () => {
  it('按类型筛选 AI 内容举报，空条件不传，题目 ID 去空白', () => {
    expect(toReportQuery(createReportFilters(), 1, 20)).toEqual({ page: 1, limit: 20 });
    expect(toReportQuery({ type: 'ai_content', status: 'pending', questionId: ' q1 ' }, 2, 10)).toEqual({
      page: 2,
      limit: 10,
      type: 'ai_content',
      status: 'pending',
      questionId: 'q1',
    });
    expect(toReportQuery({ ...createReportFilters(), type: 'question_error' }, 1, 20).type).toBe('question_error');
  });
});

describe('状态操作条件', () => {
  it('考试与科目：草稿或已下架可发布，已发布可下架，只有草稿可删除', () => {
    expect([canPublish('DRAFT'), canPublish('OFFLINE'), canPublish('PUBLISHED')]).toEqual([true, true, false]);
    expect([canOffline('PUBLISHED'), canOffline('DRAFT')]).toEqual([true, false]);
    expect([canDelete('DRAFT'), canDelete('OFFLINE')]).toEqual([true, false]);
  });

  it('题目：只有从未发布的草稿可删除，已下架可重新发布', () => {
    const question = (status: AdminQuestionDto['status'], currentVersion: number) =>
      ({ status, currentVersion }) as AdminQuestionDto;

    expect(canDeleteQuestion(question('DRAFT', 0))).toBe(true);
    expect(canDeleteQuestion(question('DRAFT', 2))).toBe(false);
    expect(canRepublishQuestion(question('OFFLINE', 1))).toBe(true);
  });
});

describe('useExamList / useSubjectList', () => {
  it('删除考试后刷新，当前页变空时回退一页', async () => {
    vi.mocked(adminGetExams)
      .mockResolvedValueOnce(emptyPage)
      .mockResolvedValueOnce({ ...emptyPage, list: [{ id: 'e1' } as never], total: 1 });
    const exams = useExamList();
    exams.page.value = 2;

    await exams.remove({ id: 'e9' } as never);

    expect(adminDeleteExam).toHaveBeenCalledWith('e9');
    expect(exams.page.value).toBe(1);
    expect(exams.list.value).toHaveLength(1);
  });

  it('科目按排序展示，新建时带上当前考试', async () => {
    vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 'b', sort: 2 } as never, { id: 'a', sort: 1 } as never]);
    const subjects = useSubjectList();

    await subjects.load('e1');
    await subjects.save(null, { name: '行测', sort: 0, hasSubjective: false });

    expect(subjects.subjects.value.map(item => item.id)).toEqual(['a', 'b']);
    expect(adminCreateSubject).toHaveBeenCalledWith({ name: '行测', sort: 0, hasSubjective: false, examId: 'e1' });
    expect(fetchAllSubjects).toHaveBeenLastCalledWith('e1');
  });

  it('未选考试时科目为空且不请求', async () => {
    const subjects = useSubjectList();
    await subjects.load('');

    expect(subjects.subjects.value).toEqual([]);
    expect(fetchAllSubjects).not.toHaveBeenCalled();
  });
});

describe('useReviewList', () => {
  it('批量发布选中题目并返回发布数，不刷新列表', async () => {
    const review = useReviewList();
    review.selectedIds.value = ['q1', 'm1'];

    const count = await review.batchPublish();

    expect(adminBatchPublishQuestions).toHaveBeenCalledWith({ ids: ['q1', 'm1'] });
    expect(count).toBe(6);
    expect(adminGetQuestions).not.toHaveBeenCalled();
  });

  it('操作后刷新时清空选择并重新拉取当前页', async () => {
    vi.mocked(adminGetQuestions).mockResolvedValue(emptyPage);
    const review = useReviewList();
    review.selectedIds.value = ['q1', 'm1'];

    await review.refreshAfterChange();

    expect(review.selectedIds.value).toEqual([]);
    expect(adminGetQuestions).toHaveBeenCalledTimes(1);
  });

  it('未选择时不发请求', async () => {
    expect(await useReviewList().batchPublish()).toBe(0);
    expect(adminBatchPublishQuestions).not.toHaveBeenCalled();
  });
});
