import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  adminCreateQuestion,
  adminGetQuestion,
  adminGetSubjectKnowledgePoints,
  adminUpdateQuestion,
  fetchAllExams,
  fetchAllSubjects,
  type AdminQuestionDto,
} from '@/api';
import QuestionEditPage from '@/views/content/question-edit/index.vue';
import { invalidateKnowledgeTree } from '@/views/content/shared/knowledge-tree-cache';

vi.mock('@/api', () => ({
  adminCreateQuestion: vi.fn(),
  adminDeleteQuestion: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionVersions: vi.fn(async () => []),
  adminGetSubjectKnowledgePoints: vi.fn(async () => []),
  adminSubmitQuestion: vi.fn(),
  adminUpdateQuestion: vi.fn(),
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
  uploadContentFile: vi.fn(),
}));

const question = (overrides: Partial<AdminQuestionDto> = {}): AdminQuestionDto =>
  ({
    id: 'q1',
    subjectId: 's1',
    parentId: null,
    type: 'JUDGE',
    currentVersion: 1,
    stem: '原题干',
    options: null,
    answer: { value: true },
    analysis: null,
    difficulty: 3,
    knowledgePointIds: [],
    material: null,
    audioFileId: null,
    source: 'ORIGINAL',
    sourceNote: null,
    status: 'PUBLISHED',
    isFree: true,
    sort: 0,
    contentHash: 'h',
    statAnswered: 0,
    statCorrect: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }) as AdminQuestionDto;

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/questions', component: { template: '<div />' } },
      { path: '/content/questions/create', component: QuestionEditPage },
      { path: '/content/questions/:id', component: QuestionEditPage },
    ],
  });
  await router.push(path);
  const wrapper = mount(QuestionEditPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const clickButton = async (wrapper: ReturnType<typeof mount>, text: string) => {
  await wrapper
    .findAll('button')
    .find(button => button.text() === text)!
    .trigger('click');
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  invalidateKnowledgeTree();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessage, 'info').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(fetchAllExams).mockResolvedValue([{ id: 'e1', name: '国考' } as never]);
  vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 's1', examId: 'e1', name: '行测' } as never]);
});

describe('题目编辑页', () => {
  it('新建时校验失败展示全部错误', async () => {
    const { wrapper } = await mountAt('/content/questions/create?type=JUDGE&subjectId=s1');

    await clickButton(wrapper, '保存');

    expect(adminCreateQuestion).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('题干不能为空');
    expect(wrapper.text()).toContain('请选择判断题答案');
  });

  it('新建成功后跳转到编辑地址', async () => {
    vi.mocked(adminCreateQuestion).mockResolvedValue(question({ id: 'new', status: 'DRAFT', currentVersion: 0 }));
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ id: 'new', status: 'DRAFT', currentVersion: 0 }));
    const { wrapper, router } = await mountAt('/content/questions/create?type=JUDGE&subjectId=s1');

    await wrapper.find('textarea').setValue('地球是圆的');
    await wrapper
      .findAll('.el-radio')
      .find(radio => radio.text() === '对')!
      .find('input')
      .setValue(true);
    await flushPromises();
    await clickButton(wrapper, '保存');

    expect(adminCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: 's1', type: 'JUDGE', stem: '地球是圆的', answer: { value: true } }),
    );
    expect(router.currentRoute.value.fullPath).toBe('/content/questions/new');
    expect(adminGetSubjectKnowledgePoints).toHaveBeenCalledWith('s1', { disableDedup: true });
  });

  it('已发布题目提示将生成新版本、答案锁定，只提交改动的字段', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    vi.mocked(adminUpdateQuestion).mockResolvedValue(question({ stem: '新题干' }));
    const { wrapper } = await mountAt('/content/questions/q1');

    expect(wrapper.text()).toContain('保存将生成新版本');
    expect(wrapper.findAll('.el-radio').every(radio => radio.classes('is-disabled'))).toBe(true);

    await wrapper.find('textarea').setValue('新题干');
    await clickButton(wrapper, '保存');

    expect(adminUpdateQuestion).toHaveBeenCalledWith('q1', { stem: '新题干' });
  });

  it('审核中的题目不可保存', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ status: 'REVIEWING' }));
    const { wrapper } = await mountAt('/content/questions/q1');

    expect(wrapper.text()).toContain('题目审核中，不能编辑');
    const save = wrapper.findAll('button').find(button => button.text() === '保存')!;
    expect(save.attributes('disabled')).toBeDefined();
  });

  it('材料题展示小题列表，草稿材料可新增小题', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(
      question({
        type: 'MATERIAL',
        status: 'DRAFT',
        currentVersion: 0,
        stem: '根据以下材料回答问题。',
        answer: null,
        material: '材料正文',
        children: [question({ id: 'c1', parentId: 'q1', stem: '小题一', status: 'DRAFT', currentVersion: 0 })],
      }),
    );
    const { wrapper } = await mountAt('/content/questions/q1');

    expect(wrapper.text()).toContain('小题（1）');
    expect(wrapper.find('.material-children').text()).toContain('小题一');
    const add = wrapper.findAll('button').find(button => button.text() === '新增小题')!;
    expect(add.attributes('disabled')).toBeUndefined();
    expect(wrapper.find('.question-edit__preview').text()).toContain('材料正文');
  });

  it('非法的题型参数被忽略，按单选新建', async () => {
    const { wrapper } = await mountAt('/content/questions/create?type=HACK&subjectId=s1');

    expect(wrapper.find('.question-edit__preview').text()).toContain('单选');
  });

  it('有未保存修改时离开需确认，取消则留在当前页', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    const confirm = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/content/questions', component: { template: '<div />' } },
        { path: '/content/questions/:id', component: QuestionEditPage },
      ],
    });
    await router.push('/content/questions/q1');
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('textarea').setValue('改过');
    await router.push('/content/questions');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe('/content/questions/q1');

    confirm.mockResolvedValueOnce('confirm' as never);
    await router.push('/content/questions');
    expect(router.currentRoute.value.fullPath).toBe('/content/questions');
  });

  it('没有修改时直接离开', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    const confirm = vi.spyOn(ElMessageBox, 'confirm');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/content/questions', component: { template: '<div />' } },
        { path: '/content/questions/:id', component: QuestionEditPage },
      ],
    });
    await router.push('/content/questions/q1');
    mount({ template: '<router-view />' }, { global: { plugins: [router] } });
    await flushPromises();

    await router.push('/content/questions');

    expect(confirm).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe('/content/questions');
  });

  it('新建保存后跳转到编辑地址不弹离开确认', async () => {
    vi.mocked(adminCreateQuestion).mockResolvedValue(question({ id: 'new', status: 'DRAFT', currentVersion: 0 }));
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ id: 'new', status: 'DRAFT', currentVersion: 0 }));
    const confirm = vi.spyOn(ElMessageBox, 'confirm');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/content/questions/create', component: QuestionEditPage },
        { path: '/content/questions/:id', component: QuestionEditPage },
      ],
    });
    await router.push('/content/questions/create?type=JUDGE&subjectId=s1');
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.find('textarea').setValue('地球是圆的');
    await wrapper
      .findAll('.el-radio')
      .find(radio => radio.text() === '对')!
      .find('input')
      .setValue(true);
    await clickButton(wrapper, '保存');

    expect(confirm).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe('/content/questions/new');
  });
});
