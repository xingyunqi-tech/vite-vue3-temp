import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminBatchPublishQuestions,
  adminGetQuestions,
  adminPublishQuestion,
  adminRejectQuestion,
  type AdminQuestionDto,
} from '@/api';
import ReviewPage from '@/views/content/review/index.vue';

vi.mock('@/api', () => ({
  adminBatchPublishQuestions: vi.fn(async () => ({ count: 3 })),
  adminGetQuestion: vi.fn(),
  adminGetQuestions: vi.fn(),
  adminPublishQuestion: vi.fn(async () => ({})),
  adminRejectQuestion: vi.fn(async () => ({})),
  fetchAllExams: vi.fn(async () => []),
  fetchAllSubjects: vi.fn(async () => []),
}));

const question = (id: string, type: AdminQuestionDto['type'] = 'SINGLE') =>
  ({
    id,
    type,
    subjectId: 's1',
    stem: `题目${id}`,
    material: null,
    status: 'REVIEWING',
    currentVersion: 0,
  }) as AdminQuestionDto;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
  vi.mocked(adminGetQuestions).mockResolvedValue({
    list: [question('q1'), question('m1', 'MATERIAL')],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
});

async function mountPage() {
  const wrapper = mount(ReviewPage);
  await flushPromises();
  return wrapper;
}

const rowButton = (wrapper: Awaited<ReturnType<typeof mountPage>>, index: number, text: string) =>
  wrapper
    .findAll('.el-table__body tr.el-table__row')
    [index].findAll('button')
    .find(button => button.text() === text)!;

describe('审核发布页', () => {
  it('只列出待审核的独立题与材料', async () => {
    const wrapper = await mountPage();

    expect(adminGetQuestions).toHaveBeenCalledWith(
      { page: 1, limit: 20, status: 'REVIEWING', topLevel: true },
      { disableDedup: true },
    );
    expect(wrapper.findAll('.el-table__body tr.el-table__row')).toHaveLength(2);
    expect(wrapper.text()).toContain('新题');
  });

  it('发布与驳回单题后刷新列表', async () => {
    const wrapper = await mountPage();

    await rowButton(wrapper, 0, '发布').trigger('click');
    await flushPromises();
    await rowButton(wrapper, 1, '驳回').trigger('click');
    await flushPromises();

    expect(adminPublishQuestion).toHaveBeenCalledWith('q1');
    expect(adminRejectQuestion).toHaveBeenCalledWith('m1');
    expect(ElMessageBox.confirm).toHaveBeenLastCalledWith(
      '驳回为草稿，材料及其全部小题一起处理？',
      '驳回题目',
      expect.anything(),
    );
    expect(adminGetQuestions).toHaveBeenCalledTimes(3);
  });

  it('勾选后批量发布', async () => {
    const wrapper = await mountPage();
    const batchButton = () => wrapper.findAll('button').find(button => button.text().startsWith('批量发布'))!;
    expect(batchButton().attributes('disabled')).toBeDefined();

    (
      wrapper.findComponent({ name: 'ElTable' }).vm as unknown as { toggleAllSelection: () => void }
    ).toggleAllSelection();
    await new Promise(resolve => setTimeout(resolve, 20));
    await flushPromises();
    expect(batchButton().text()).toBe('批量发布（2）');

    await batchButton().trigger('click');
    await flushPromises();

    expect(adminBatchPublishQuestions).toHaveBeenCalledWith({ ids: ['q1', 'm1'] });
    expect(ElMessage.success).toHaveBeenCalledWith('已发布 3 道题目');
  });
});
