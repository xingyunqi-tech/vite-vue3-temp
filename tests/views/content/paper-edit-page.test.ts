import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  adminCopyPaper,
  adminGetPaper,
  adminGetQuestion,
  adminSetPaperQuestions,
  fetchAllExams,
  fetchAllSubjects,
  type AdminPaperDto,
} from '@/api';
import PaperEditPage from '@/views/content/paper-edit/index.vue';

vi.mock('@/api', () => ({
  adminCopyPaper: vi.fn(),
  adminDeletePaper: vi.fn(),
  adminGetPaper: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestions: vi.fn(async () => ({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 })),
  adminGetSubjectKnowledgePoints: vi.fn(async () => []),
  adminOfflinePaper: vi.fn(),
  adminPublishPaper: vi.fn(),
  adminSetPaperQuestions: vi.fn(async () => ({})),
  adminUpdatePaper: vi.fn(async () => ({})),
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const paper = (overrides: Partial<AdminPaperDto> = {}): AdminPaperDto => ({
  id: 'p1',
  subjectId: 's1',
  title: '行测模拟卷',
  type: 'MOCK',
  year: null,
  ownerUserId: null,
  durationMin: 120,
  sections: [{ title: '资料分析', questionType: 'MATERIAL' }],
  totalScore: 5,
  objectiveScore: 2,
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
      score: 2,
      parentId: 'm1',
      type: 'SINGLE',
      status: 'PUBLISHED',
      currentVersion: 1,
      stem: '小题一',
      fileUrls: {},
    },
    {
      paperId: 'p1',
      sectionIndex: 0,
      questionId: 'c2',
      questionVersion: 1,
      sort: 1,
      score: 3,
      parentId: 'm1',
      type: 'SHORT_ANSWER',
      status: 'PUBLISHED',
      currentVersion: 1,
      stem: '小题二',
      fileUrls: {},
    },
  ],
  ...overrides,
});

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/papers', component: { template: '<div />' } },
      { path: '/content/papers/:id', component: PaperEditPage },
    ],
  });
  await router.push('/content/papers/p1');
  const wrapper = mount(PaperEditPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
  vi.mocked(adminGetPaper).mockResolvedValue(paper());
  vi.mocked(adminGetQuestion).mockResolvedValue({ id: 'm1', stem: '根据材料回答' } as never);
  vi.mocked(fetchAllExams).mockResolvedValue([{ id: 'e1', name: '国考' } as never]);
  vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 's1', examId: 'e1', name: '行测' } as never]);
});

describe('试卷编辑页', () => {
  it('展示分区、材料小题分值与总分', async () => {
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('国考 / 行测');
    expect(wrapper.text()).toContain('共 2 题 · 总分 5 · 客观题 2');
    expect(wrapper.find('.section-card').text()).toContain('根据材料回答');
    expect(wrapper.find('.section-card').text()).toContain('每小题，合计 5');
  });

  it('修改小题分值后保存整体题目设置', async () => {
    const { wrapper } = await mountPage();
    const save = () => wrapper.findAll('button').find(button => button.text() === '保存')!;
    expect(save().attributes('disabled')).toBeDefined();

    const childScore = wrapper.findAll('.section-card__child .el-input-number')[1];
    await childScore.find('input').setValue('4');
    await childScore.find('input').trigger('change');
    await flushPromises();
    await save().trigger('click');
    await flushPromises();

    expect(adminSetPaperQuestions).toHaveBeenCalledWith('p1', {
      sections: [{ title: '资料分析', questionType: 'MATERIAL' }],
      questions: [{ questionId: 'm1', sectionIndex: 0, score: 2, childScores: [2, 4] }],
    });
  });

  it('已发布试卷冻结题目，可复制为新试卷', async () => {
    vi.mocked(adminGetPaper).mockResolvedValue(paper({ status: 'PUBLISHED' }));
    vi.mocked(adminCopyPaper).mockResolvedValue(paper({ id: 'p2' }));
    const { wrapper, router } = await mountPage();

    expect(wrapper.text()).toContain('题目、顺序与分值已冻结');
    expect(wrapper.findAll('button').some(button => button.text() === '添加题目')).toBe(false);

    await wrapper
      .findAll('button')
      .find(button => button.text() === '复制为新试卷')!
      .trigger('click');
    await flushPromises();

    expect(adminCopyPaper).toHaveBeenCalledWith('p1');
    expect(router.currentRoute.value.fullPath).toBe('/content/papers/p2');
  });

  it('有未保存修改时离开需确认', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/content/papers', component: { template: '<div />' } },
        { path: '/content/papers/:id', component: PaperEditPage },
      ],
    });
    await router.push('/content/papers/p1');
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('.section-card__title input').setValue('改过的分区');
    await router.push('/content/papers');

    expect(confirm).toHaveBeenCalledWith('有未保存的修改，确定离开？', '离开页面', expect.anything());
    expect(router.currentRoute.value.fullPath).toBe('/content/papers/p1');
  });
});
