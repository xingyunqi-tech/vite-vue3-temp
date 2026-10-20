import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminGetPaperRules, fetchAllExams, fetchAllSubjects, type PaperRule } from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import PaperRulesPage from '@/views/content/paper-rules/index.vue';

vi.mock('@/api', () => ({
  adminCreatePaperRule: vi.fn(),
  adminDeletePaperRule: vi.fn(),
  adminGetPaperRules: vi.fn(),
  adminGetSubjectKnowledgePoints: vi.fn(async () => []),
  adminPreviewPaperRule: vi.fn(),
  adminUpdatePaperRule: vi.fn(),
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const rule = (overrides: Partial<PaperRule>): PaperRule =>
  ({
    id: 'r1',
    subjectId: 's1',
    name: '行测规则',
    durationMin: 120,
    multiScoringRule: 'ALL_OR_NOTHING',
    items: [],
    status: 'DRAFT',
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
    ...overrides,
  }) as PaperRule;

async function mountPage() {
  const wrapper = mount(PaperRulesPage);
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
  vi.mocked(adminGetPaperRules).mockResolvedValue({
    list: [rule({ id: 'draft' }), rule({ id: 'published', status: 'PUBLISHED' })],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
});

describe('组卷规则页', () => {
  it('审核员可以编辑任意规则、发布与下架，只能删除草稿', async () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const wrapper = await mountPage();

    expect(rowButtons(wrapper, 0)).toEqual(['试生成', '编辑', '发布', '删除']);
    expect(rowButtons(wrapper, 1)).toEqual(['试生成', '编辑', '下架']);
  });

  it('编辑只能编辑与删除草稿规则，看不到发布与下架', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const wrapper = await mountPage();

    expect(rowButtons(wrapper, 0)).toEqual(['试生成', '编辑', '删除']);
    expect(rowButtons(wrapper, 1)).toEqual(['试生成']);
  });
});
