import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminGetExams,
  adminGetSubjectKnowledgePoints,
  adminMigrateKnowledgePointQuestions,
  adminOfflineExam,
  fetchAllSubjects,
  type Exam,
  type KnowledgePointTreeNodeDto,
} from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import ExamsPage from '@/views/content/exams/index.vue';

vi.mock('@/api', () => ({
  adminCreateExam: vi.fn(),
  adminCreateKnowledgePoint: vi.fn(),
  adminCreateSubject: vi.fn(),
  adminDeleteExam: vi.fn(),
  adminDeleteKnowledgePoint: vi.fn(),
  adminDeleteSubject: vi.fn(),
  adminGetExams: vi.fn(),
  adminGetSubjectKnowledgePoints: vi.fn(),
  adminMigrateKnowledgePointQuestions: vi.fn(),
  adminMoveKnowledgePoint: vi.fn(),
  adminOfflineExam: vi.fn(async () => ({})),
  adminOfflineSubject: vi.fn(),
  adminPublishExam: vi.fn(),
  adminPublishSubject: vi.fn(),
  adminUpdateExam: vi.fn(),
  adminUpdateKnowledgePoint: vi.fn(),
  adminUpdateSubject: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

const exam = (id: string, status: Exam['status']): Exam => ({
  id,
  name: `考试${id}`,
  category: 'CIVIL_SERVICE',
  icon: null,
  description: null,
  sort: 0,
  status,
  createdAt: '',
  updatedAt: '',
});

const kp = (id: string, children: KnowledgePointTreeNodeDto[] = [], questionCount = 0): KnowledgePointTreeNodeDto => ({
  id,
  subjectId: 's1',
  parentId: null,
  name: `知识点${id}`,
  level: 1,
  sort: 0,
  path: `/${id}/`,
  isLeaf: children.length === 0,
  questionCount,
  createdAt: '',
  updatedAt: '',
  children,
});

beforeEach(() => {
  setActivePinia(createPinia());
  useUserInfoStore().setUserInfo({ role: 'ADMIN' });
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
  vi.mocked(adminGetExams).mockResolvedValue({
    list: [exam('e1', 'DRAFT'), exam('e2', 'PUBLISHED')],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  vi.mocked(fetchAllSubjects).mockResolvedValue([
    { id: 's1', examId: 'e2', name: '行测', sort: 0, status: 'PUBLISHED', hasSubjective: false } as never,
  ]);
  vi.mocked(adminGetSubjectKnowledgePoints).mockResolvedValue([kp('a', [kp('a1', [], 7)]), kp('b')]);
});

const examRows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.el-table')[0].findAll('.el-table__body tr.el-table__row');

describe('考试与科目页', () => {
  it('按状态展示考试操作：草稿可删除，已发布可下架', async () => {
    const wrapper = mount(ExamsPage);
    await flushPromises();

    const [draft, published] = examRows(wrapper);
    expect(draft.findAll('button').map(button => button.text())).toEqual(['编辑', '发布', '删除']);
    expect(published.findAll('button').map(button => button.text())).toEqual(['编辑', '下架']);
  });

  it('编辑看不到考试的发布与下架', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const wrapper = mount(ExamsPage);
    await flushPromises();

    const [draft, published] = examRows(wrapper);
    expect(draft.findAll('button').map(button => button.text())).toEqual(['编辑', '删除']);
    expect(published.findAll('button').map(button => button.text())).toEqual(['编辑']);
  });

  it('科目的发布与下架只对可审核的角色显示', async () => {
    const subjectButtons = async () => {
      const wrapper = mount(ExamsPage);
      await flushPromises();
      await examRows(wrapper)[1].trigger('click');
      await flushPromises();
      const row = wrapper.findAll('.el-table')[1].find('.el-table__body tr.el-table__row');
      return row.findAll('button').map(button => button.text());
    };

    expect(await subjectButtons()).toContain('下架');

    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const editorButtons = await subjectButtons();
    expect(editorButtons).toContain('知识点');
    expect(editorButtons).not.toContain('下架');
    expect(editorButtons).not.toContain('发布');
  });

  it('下架考试需确认，完成后刷新', async () => {
    const wrapper = mount(ExamsPage);
    await flushPromises();

    await examRows(wrapper)[1]
      .findAll('button')
      .find(button => button.text() === '下架')!
      .trigger('click');
    await flushPromises();

    expect(adminOfflineExam).toHaveBeenCalledWith('e2');
    expect(adminGetExams).toHaveBeenCalledTimes(2);
  });

  it('点击考试后列出其科目，并可打开知识点树查看题目数', async () => {
    const wrapper = mount(ExamsPage, { attachTo: document.body });
    await flushPromises();

    await examRows(wrapper)[1].trigger('click');
    await flushPromises();
    expect(fetchAllSubjects).toHaveBeenCalledWith('e2');
    const subjectRow = wrapper.findAll('.el-table')[1].find('.el-table__body tr.el-table__row');
    expect(subjectRow.text()).toContain('行测');

    await subjectRow
      .findAll('button')
      .find(button => button.text() === '知识点')!
      .trigger('click');
    await flushPromises();

    expect(adminGetSubjectKnowledgePoints).toHaveBeenCalledWith('s1', { disableDedup: true });
    const drawer = document.body.querySelector('.el-drawer')!;
    expect(drawer.textContent).toContain('知识点a1');
    expect(drawer.textContent).toContain('（7）');
    const childButton = (name: string) =>
      [...drawer.querySelectorAll('.kp-node')]
        .find(node => node.querySelector('.kp-node__name')?.textContent === name)!
        .querySelector('button') as HTMLButtonElement;
    expect(childButton('知识点a1').disabled).toBe(true);
    expect(childButton('知识点b').disabled).toBe(false);
    wrapper.unmount();
  });

  it('叶子知识点可把题目迁移到其他叶子', async () => {
    vi.mocked(adminMigrateKnowledgePointQuestions).mockResolvedValue({ migrated: 7 } as never);
    const wrapper = mount(ExamsPage, { attachTo: document.body });
    await flushPromises();
    await examRows(wrapper)[1].trigger('click');
    await flushPromises();
    await wrapper
      .findAll('.el-table')[1]
      .find('.el-table__body tr.el-table__row')
      .findAll('button')
      .find(button => button.text() === '知识点')!
      .trigger('click');
    await flushPromises();

    const leafNode = [...document.body.querySelectorAll('.kp-node')].find(node =>
      node.textContent?.includes('知识点a1'),
    )!;
    [...leafNode.querySelectorAll('button')].find(button => button.textContent?.includes('迁移题目'))!.click();
    await flushPromises();

    const pick = wrapper.findComponent({ name: 'KnowledgePointPickDialog' });
    expect(pick.props('options')).toEqual([expect.objectContaining({ value: 'b', disabled: false })]);
    pick.vm.$emit('submit', 'b');
    await flushPromises();

    expect(adminMigrateKnowledgePointQuestions).toHaveBeenCalledWith('a1', { targetId: 'b' });
    expect(ElMessage.success).toHaveBeenCalledWith('已迁移 7 道题目');
    wrapper.unmount();
  });
});
