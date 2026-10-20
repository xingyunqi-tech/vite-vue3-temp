import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { adminGetPapers, fetchAllExams, fetchAllSubjects, type AdminPaperDto } from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import PapersPage from '@/views/content/papers/index.vue';

vi.mock('@/api', () => ({
  adminCopyPaper: vi.fn(),
  adminCreatePaper: vi.fn(),
  adminDeletePaper: vi.fn(),
  adminGetPapers: vi.fn(),
  adminOfflinePaper: vi.fn(),
  adminPublishPaper: vi.fn(),
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const paper = (overrides: Partial<AdminPaperDto>): AdminPaperDto =>
  ({
    id: 'p1',
    subjectId: 's1',
    title: '模拟卷',
    type: 'MOCK',
    year: 2026,
    durationMin: 120,
    sections: [],
    totalScore: 100,
    objectiveScore: 100,
    multiScoringRule: 'ALL_OR_NOTHING',
    status: 'DRAFT',
    isFree: true,
    attemptCount: 0,
    questionCount: 0,
    ownerUserId: null,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
    ...overrides,
  }) as AdminPaperDto;

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/papers', component: PapersPage },
      { path: '/content/papers/:id', component: { template: '<div />' } },
    ],
  });
  await router.push('/content/papers');
  const wrapper = mount(PapersPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

function rowButtons(wrapper: Awaited<ReturnType<typeof mountPage>>, index: number) {
  const row = wrapper.findAll('.el-table__body tr.el-table__row')[index];
  return row.findAll('button').map(button => button.text());
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  vi.mocked(fetchAllExams).mockResolvedValue([{ id: 'e1', name: '国考' } as never]);
  vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 's1', examId: 'e1', name: '行测' } as never]);
  vi.mocked(adminGetPapers).mockResolvedValue({
    list: [paper({ id: 'draft' }), paper({ id: 'published', status: 'PUBLISHED' })],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
});

describe('试卷列表页', () => {
  it.each(['ADMIN', 'REVIEWER'] as const)('%s 可以发布草稿、下架已发布试卷', async role => {
    useUserInfoStore().setUserInfo({ role });
    const wrapper = await mountPage();

    expect(rowButtons(wrapper, 0)).toContain('发布');
    expect(rowButtons(wrapper, 1)).toContain('下架');
  });

  it('编辑看不到发布与下架', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const wrapper = await mountPage();

    [0, 1].forEach(index => {
      expect(rowButtons(wrapper, index)).not.toContain('发布');
      expect(rowButtons(wrapper, index)).not.toContain('下架');
    });
  });
});
