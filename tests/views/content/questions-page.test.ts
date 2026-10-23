import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  adminBatchDeleteQuestions,
  adminBatchOfflineQuestions,
  adminBatchRejectQuestions,
  adminBatchSubmitQuestions,
  adminBatchUpdateQuestions,
  adminDeleteQuestion,
  adminGetQuestions,
  adminSubmitQuestion,
  fetchAllExams,
  fetchAllSubjects,
  type AdminQuestionDto,
} from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import BatchUpdateDialog from '@/views/content/questions/components/BatchUpdateDialog.vue';
import QuestionsPage from '@/views/content/questions/index.vue';
import BatchResultDialog from '@/views/content/shared/components/BatchResultDialog.vue';
import KnowledgePointSelect from '@/views/content/shared/components/KnowledgePointSelect.vue';

const allSucceeded = { succeeded: 1, failed: [] };

vi.mock('@/api', () => ({
  KnowledgePointUpdateMode: { append: 'append', replace: 'replace' },
  adminBatchDeleteQuestions: vi.fn(),
  adminBatchOfflineQuestions: vi.fn(),
  adminBatchRejectQuestions: vi.fn(),
  adminBatchSubmitQuestions: vi.fn(),
  adminBatchUpdateQuestions: vi.fn(),
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
  setActivePinia(createPinia());
  useUserInfoStore().setUserInfo({ role: 'ADMIN' });
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

  it('编辑看不到下架、重新发布与勘误', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    vi.mocked(adminGetQuestions).mockResolvedValue({
      list: [
        question({ id: 'single', status: 'PUBLISHED', currentVersion: 1 }),
        question({ id: 'offline', status: 'OFFLINE', currentVersion: 1 }),
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const { wrapper } = await mountPage();

    expect(rowButtons(wrapper, 0)).toEqual(['预览', '编辑', '版本']);
    expect(rowButtons(wrapper, 1)).toEqual(['预览', '编辑', '版本']);
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

describe('题目列表批量操作', () => {
  type Wrapper = Awaited<ReturnType<typeof mountPage>>['wrapper'];

  const batchRows = [
    question({ id: 'draft', stem: '草稿题干' }),
    question({ id: 'published', status: 'PUBLISHED', currentVersion: 2, stem: '已发布题干' }),
    question({ id: 'other', subjectId: 's2', stem: '其他科目题干' }),
  ];

  beforeEach(() => {
    vi.mocked(adminGetQuestions).mockResolvedValue({ list: batchRows, total: 3, page: 1, limit: 20, totalPages: 1 });
    for (const api of [
      adminBatchSubmitQuestions,
      adminBatchRejectQuestions,
      adminBatchOfflineQuestions,
      adminBatchDeleteQuestions,
      adminBatchUpdateQuestions,
    ]) {
      vi.mocked(api).mockResolvedValue(allSucceeded);
    }
  });

  const select = async (wrapper: Wrapper, ...indexes: number[]) => {
    const rows = wrapper.findAll('.el-table__body tr.el-table__row');
    for (const index of indexes) {
      await rows[index].find('.el-checkbox input').setValue(true);
    }
    await flushPromises();
  };

  const batchBar = (wrapper: Wrapper) => wrapper.find('.question-list__batch');
  const batchButtons = (wrapper: Wrapper) =>
    batchBar(wrapper)
      .findAll('.question-list__batch-actions button')
      .map(button => button.text());

  const click = async (wrapper: Wrapper, text: string, scope = '') => {
    const root = scope ? wrapper.find(scope) : wrapper;
    await root
      .findAll('button')
      .find(button => button.text() === text)!
      .trigger('click');
    await flushPromises();
  };

  const updateDialog = (wrapper: Wrapper) => wrapper.findComponent(BatchUpdateDialog);

  const selectOption = async (wrapper: Wrapper, label: string, value: unknown) => {
    const item = updateDialog(wrapper)
      .findAllComponents({ name: 'ElFormItem' })
      .find(formItem => formItem.find('.el-form-item__label').text() === label)!;
    item.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', value);
    await flushPromises();
  };

  const chooseKnowledgePoints = async (wrapper: Wrapper, ids: string[]) => {
    updateDialog(wrapper).findComponent(KnowledgePointSelect).vm.$emit('update:modelValue', ids);
    await flushPromises();
  };

  const confirmUpdateButton = (wrapper: Wrapper) =>
    updateDialog(wrapper)
      .findAll('button')
      .find(button => button.text() === '确定')!;

  it('勾选后显示已选数量与操作，清空后隐藏', async () => {
    const { wrapper } = await mountPage();
    expect(batchBar(wrapper).exists()).toBe(false);

    await select(wrapper, 0, 1);

    expect(batchBar(wrapper).text()).toContain('已选 2 项');
    expect(batchButtons(wrapper)).toEqual(['批量提交审核', '批量驳回', '批量下架', '批量删除', '批量修改']);

    await click(wrapper, '清空', '.question-list__batch');
    expect(batchBar(wrapper).exists()).toBe(false);
    expect(wrapper.findAll('.el-table__body .el-checkbox.is-checked')).toHaveLength(0);
  });

  it('审核员可见全部批量操作', async () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const { wrapper } = await mountPage();

    await select(wrapper, 0);

    expect(batchButtons(wrapper)).toEqual(['批量提交审核', '批量驳回', '批量下架', '批量删除', '批量修改']);
  });

  it('编辑看不到批量驳回与批量下架', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const { wrapper } = await mountPage();

    await select(wrapper, 0);

    expect(batchButtons(wrapper)).toEqual(['批量提交审核', '批量删除', '批量修改']);
  });

  it('批量提交审核传入勾选的 id，全部成功时提示并清空勾选后刷新', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 2);
    vi.mocked(adminBatchSubmitQuestions).mockResolvedValue({ succeeded: 2, failed: [] });

    await click(wrapper, '批量提交审核');

    expect(adminBatchSubmitQuestions).toHaveBeenCalledWith({ ids: ['draft', 'other'] });
    expect(ElMessage.success).toHaveBeenCalledWith('已处理 2 道');
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
    expect(batchBar(wrapper).exists()).toBe(false);
  });

  it('批量驳回传入去除首尾空白的原因', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 1);

    await click(wrapper, '批量驳回');
    expect(wrapper.find('.reject-dialog__desc').text()).toContain('驳回选中的 1 道题目');
    await wrapper.find('textarea').setValue('  答案有误  ');
    await click(wrapper, '驳回');

    expect(adminBatchRejectQuestions).toHaveBeenCalledWith({ ids: ['published'], reason: '答案有误' });
  });

  it('确认后批量下架', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
    const { wrapper } = await mountPage();
    await select(wrapper, 1);

    await click(wrapper, '批量下架');

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('下架选中的 1 道题目'), '批量下架', expect.anything());
    expect(adminBatchOfflineQuestions).toHaveBeenCalledWith({ ids: ['published'] });
  });

  it('批量删除确认框写明题数与已发布题不删除，取消则不请求', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel');
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 1);

    await click(wrapper, '批量删除');

    expect(confirm).toHaveBeenCalledWith(
      '删除选中的 2 道题目？已发布过的题目不会被删除',
      '批量删除',
      expect.anything(),
    );
    expect(adminBatchDeleteQuestions).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce('confirm' as never);
    await click(wrapper, '批量删除');
    expect(adminBatchDeleteQuestions).toHaveBeenCalledWith({ ids: ['draft', 'published'] });
  });

  it('部分失败时弹出结果窗口列出题干与原因，关闭后刷新并清空勾选', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 1);
    vi.mocked(adminBatchSubmitQuestions).mockResolvedValue({
      succeeded: 1,
      failed: [{ id: 'published', error: 'questionStatusInvalid', message: '题目状态不允许此操作' }],
    });

    await click(wrapper, '批量提交审核');

    expect(ElMessage.success).not.toHaveBeenCalled();
    const summary = wrapper.find('.batch-result__summary');
    expect(summary.text()).toBe('成功 1 项，失败 1 项');
    const resultRows = wrapper.findAll('.batch-result__link');
    expect(resultRows.map(row => row.text())).toEqual(['已发布题干']);
    expect(wrapper.text()).toContain('题目状态不允许此操作');
    expect(adminGetQuestions).toHaveBeenCalledTimes(1);

    await wrapper
      .findComponent(BatchResultDialog)
      .findAll('button')
      .find(button => button.text() === '关闭')!
      .trigger('click');
    await flushPromises();

    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
    expect(batchBar(wrapper).exists()).toBe(false);
  });

  it('点击结果窗口中的题干进入编辑页', async () => {
    const { wrapper, router } = await mountPage();
    await select(wrapper, 0);
    vi.mocked(adminBatchSubmitQuestions).mockResolvedValue({
      succeeded: 0,
      failed: [{ id: 'draft', error: 'notFound', message: '题目不存在' }],
    });
    await click(wrapper, '批量提交审核');

    await wrapper.find('.batch-result__link').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/content/questions/draft');
  });

  it('批量修改只提交填写了的字段与知识点模式', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0);

    await click(wrapper, '批量修改');
    expect(confirmUpdateButton(wrapper).attributes('disabled')).toBeDefined();

    await chooseKnowledgePoints(wrapper, ['kp1', 'kp2']);
    await updateDialog(wrapper)
      .findAll('.el-radio input')
      .find(input => input.element.closest('.el-radio')!.textContent!.includes('覆盖'))!
      .setValue(true);
    await selectOption(wrapper, '难度', 4);
    await selectOption(wrapper, '免费', false);
    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();

    expect(adminBatchUpdateQuestions).toHaveBeenCalledWith({
      ids: ['draft'],
      knowledgePointIds: ['kp1', 'kp2'],
      mode: 'replace',
      difficulty: 4,
      isFree: false,
    });
  });

  it('批量修改至少填写一项才能提交', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0);
    await click(wrapper, '批量修改');

    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();
    expect(adminBatchUpdateQuestions).not.toHaveBeenCalled();

    await selectOption(wrapper, '来源', 'ORIGINAL');
    expect(confirmUpdateButton(wrapper).attributes('disabled')).toBeUndefined();
    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();
    expect(adminBatchUpdateQuestions).toHaveBeenCalledWith({ ids: ['draft'], source: 'ORIGINAL' });
  });

  it('勾选的题目跨科目时禁用知识点并提示', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 2);

    await click(wrapper, '批量修改');

    expect(updateDialog(wrapper).text()).toContain('勾选的题目属于多个科目，不能批量设置知识点');
    expect(updateDialog(wrapper).findComponent(KnowledgePointSelect).props('disabled')).toBe(true);
  });

  it('同一科目时知识点按该科目加载', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 1);

    await click(wrapper, '批量修改');

    const knowledge = updateDialog(wrapper).findComponent(KnowledgePointSelect);
    expect(knowledge.props('subjectId')).toBe('s1');
    expect(knowledge.props('disabled')).toBe(false);
  });

  it('修改含已发布题目的知识点时先确认生成新版本，取消则不请求', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel');
    const { wrapper } = await mountPage();
    await select(wrapper, 0, 1);
    await click(wrapper, '批量修改');
    await chooseKnowledgePoints(wrapper, ['kp1']);

    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();

    expect(confirm).toHaveBeenCalledWith('将为 1 道已发布题目生成新版本', '批量修改', expect.anything());
    expect(adminBatchUpdateQuestions).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce('confirm' as never);
    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();
    expect(adminBatchUpdateQuestions).toHaveBeenCalledWith({
      ids: ['draft', 'published'],
      knowledgePointIds: ['kp1'],
      mode: 'append',
    });
  });

  it('不改知识点时修改已发布题目不需要确认', async () => {
    const confirm = vi.spyOn(ElMessageBox, 'confirm');
    const { wrapper } = await mountPage();
    await select(wrapper, 1);
    await click(wrapper, '批量修改');
    await selectOption(wrapper, '难度', 2);

    await confirmUpdateButton(wrapper).trigger('click');
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(adminBatchUpdateQuestions).toHaveBeenCalledWith({ ids: ['published'], difficulty: 2 });
  });

  it('翻页后清空勾选', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0);

    wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('update:current-page', 2);
    await flushPromises();

    expect(batchBar(wrapper).exists()).toBe(false);
  });

  it('重新查询后清空勾选', async () => {
    const { wrapper } = await mountPage();
    await select(wrapper, 0);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(batchBar(wrapper).exists()).toBe(false);
    expect(wrapper.findAll('.el-table__body .el-checkbox.is-checked')).toHaveLength(0);
  });
});
