import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  adminDeleteQuestion,
  adminGetQuestions,
  adminSubmitQuestion,
  fetchAllExams,
  fetchAllSubjects,
  type AdminQuestionDto,
} from '@/api';
import QuestionsPage from '@/views/content/questions/index.vue';

vi.mock('@/api', () => ({
  adminDeleteQuestion: vi.fn(async () => undefined),
  adminGetQuestion: vi.fn(),
  adminGetQuestions: vi.fn(),
  adminGetQuestionVersions: vi.fn(async () => []),
  adminGetSubjectKnowledgePoints: vi.fn(async () => []),
  adminOfflineQuestion: vi.fn(),
  adminPublishQuestion: vi.fn(),
  adminSubmitQuestion: vi.fn(async () => ({})),
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const question = (overrides: Partial<AdminQuestionDto>): AdminQuestionDto =>
  ({
    id: 'q1',
    subjectId: 's1',
    parentId: null,
    type: 'SINGLE',
    currentVersion: 0,
    stem: '下列说法正确的是',
    options: [],
    answer: null,
    analysis: null,
    difficulty: 3,
    knowledgePointIds: [],
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
    ...overrides,
  }) as AdminQuestionDto;

const rows = [
  question({ id: 'draft' }),
  question({ id: 'published', status: 'PUBLISHED', currentVersion: 2, type: 'MATERIAL', material: '资料分析材料' }),
];

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/questions', component: QuestionsPage },
      { path: '/content/questions/:id', component: { template: '<div />' } },
      { path: '/feedback/errata/create', component: { template: '<div />' } },
    ],
  });
  await router.push('/content/questions');
  const wrapper = mount(QuestionsPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

function rowButtons(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], index: number) {
  const row = wrapper.findAll('.el-table__body tr.el-table__row')[index];
  return row.findAll('button').map(button => button.text());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(fetchAllExams).mockResolvedValue([{ id: 'e1', name: '国考' } as never]);
  vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 's1', examId: 'e1', name: '行测' } as never]);
  vi.mocked(adminGetQuestions).mockResolvedValue({ list: rows, total: 2, page: 1, limit: 20, totalPages: 1 });
});

describe('题目列表页', () => {
  it('默认只查独立题与材料，展示题型、科目与状态', async () => {
    const { wrapper } = await mountPage();

    expect(adminGetQuestions).toHaveBeenCalledWith({ page: 1, limit: 20, topLevel: true }, { disableDedup: true });
    const text = wrapper.find('.el-table__body').text();
    expect(text).toContain('下列说法正确的是');
    expect(text).toContain('资料分析材料');
    expect(text).toContain('国考 / 行测');
    expect(text).toContain('材料题');
    expect(text).toContain('已发布');
  });

  it('按状态给出可用操作', async () => {
    const { wrapper } = await mountPage();

    expect(rowButtons(wrapper, 0)).toEqual(['预览', '编辑', '提交审核', '删除']);
    expect(rowButtons(wrapper, 1)).toEqual(['预览', '编辑', '版本', '下架']);
  });

  it('发布过的非材料题可发起勘误', async () => {
    vi.mocked(adminGetQuestions).mockResolvedValue({
      list: [question({ id: 'single', status: 'PUBLISHED', currentVersion: 1 })],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const { wrapper, router } = await mountPage();

    expect(rowButtons(wrapper, 0)).toEqual(['预览', '编辑', '版本', '勘误', '下架']);
    await wrapper
      .findAll('button')
      .find(button => button.text() === '勘误')!
      .trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/feedback/errata/create?questionId=single');
  });

  it('提交审核后刷新列表', async () => {
    const { wrapper } = await mountPage();

    const row = wrapper.findAll('.el-table__body tr.el-table__row')[0];
    await row
      .findAll('button')
      .find(button => button.text() === '提交审核')!
      .trigger('click');
    await flushPromises();

    expect(adminSubmitQuestion).toHaveBeenCalledWith('draft');
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
    expect(ElMessage.success).toHaveBeenCalledWith('已提交审核');
  });

  it('确认后删除草稿，取消则不删除', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm');
    const { wrapper } = await mountPage();
    const deleteButton = () =>
      wrapper
        .findAll('.el-table__body tr.el-table__row')[0]
        .findAll('button')
        .find(button => button.text() === '删除')!;

    confirm.mockRejectedValueOnce('cancel');
    await deleteButton().trigger('click');
    await flushPromises();
    expect(adminDeleteQuestion).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce('confirm' as never);
    await deleteButton().trigger('click');
    await flushPromises();
    expect(adminDeleteQuestion).toHaveBeenCalledWith('draft');
  });

  it('点击编辑进入编辑页', async () => {
    const { wrapper, router } = await mountPage();

    const row = wrapper.findAll('.el-table__body tr.el-table__row')[1];
    await row
      .findAll('button')
      .find(button => button.text() === '编辑')!
      .trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/content/questions/published');
  });
});
