import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminBatchPublishQuestions,
  adminGetQuestions,
  adminPublishQuestion,
  adminGetQuestion,
  adminRejectQuestion,
  type AdminQuestionDto,
} from '@/api';
import { EMPTY_TEXT } from '@/constants';
import { useUserInfoStore } from '@/store/modules/user-info';
import ReviewPage from '@/views/content/review/index.vue';

vi.mock('@/api', () => ({
  adminBatchPublishQuestions: vi.fn(async () => ({ count: 3 })),
  adminGetQuestion: vi.fn(async (id: string) => question(id)),
  adminGetQuestions: vi.fn(),
  adminPublishQuestion: vi.fn(async () => ({})),
  adminRejectQuestion: vi.fn(async () => ({})),
  fetchAllExams: vi.fn(async () => []),
  fetchAllSubjects: vi.fn(async () => []),
}));

const question = (id: string, type: AdminQuestionDto['type'] = 'SINGLE', overrides: Partial<AdminQuestionDto> = {}) =>
  ({
    id,
    type,
    subjectId: 's1',
    stem: `题目${id}`,
    material: null,
    status: 'REVIEWING',
    currentVersion: 0,
    options: null,
    answer: null,
    creator: null,
    submitter: null,
    submittedAt: null,
    ...overrides,
  }) as AdminQuestionDto;

const SELF_ID = 7;

beforeEach(() => {
  setActivePinia(createPinia());
  useUserInfoStore().setUserInfo({ id: SELF_ID, role: 'REVIEWER' });
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

type PageWrapper = Awaited<ReturnType<typeof mountPage>>;

const rows = (wrapper: PageWrapper) => wrapper.findAll('.el-table__body tr.el-table__row');

const rowButton = (wrapper: PageWrapper, index: number, text: string) =>
  rows(wrapper)
    [index].findAll('button')
    .find(button => button.text() === text)!;

const rejectDialog = (wrapper: PageWrapper) =>
  wrapper.findAll('.el-dialog').find(dialog => dialog.text().includes('驳回原因'))!;

async function fillAndConfirmReject(wrapper: PageWrapper, reason: string) {
  const dialog = rejectDialog(wrapper);
  await dialog.find('textarea').setValue(reason);
  await dialog
    .findAll('button')
    .find(button => button.text() === '驳回')!
    .trigger('click');
  await flushPromises();
}

const selfSubmitted = (id: string) =>
  question(id, 'SINGLE', { submitter: { id: SELF_ID, name: '我' }, submittedAt: '2026-10-18T08:00:00' });

const mockList = (list: AdminQuestionDto[]) =>
  vi.mocked(adminGetQuestions).mockResolvedValue({ list, total: list.length, page: 1, limit: 20, totalPages: 1 });

const previewDialog = (wrapper: PageWrapper) =>
  wrapper.findAll('.el-dialog').find(dialog => dialog.text().includes('题目预览'))!;

const isRejectDialogOpen = (wrapper: PageWrapper) =>
  wrapper.findComponent({ name: 'RejectReasonDialog' }).findComponent({ name: 'ElDialog' }).props('modelValue');

const isPreviewOpen = (wrapper: PageWrapper) =>
  wrapper.findComponent({ name: 'QuestionPreviewDialog' }).props('modelValue') as boolean;

async function rejectFromPreview(wrapper: PageWrapper, reason: string) {
  await rowButton(wrapper, 0, '预览').trigger('click');
  await flushPromises();
  await previewDialog(wrapper)
    .findAll('button')
    .find(button => button.text() === '驳回')!
    .trigger('click');
  await flushPromises();
  await fillAndConfirmReject(wrapper, reason);
}

const selfReviewTooltips = (wrapper: PageWrapper) =>
  wrapper.findAllComponents({ name: 'ElTooltip' }).filter(tip => tip.props('content') === '不能审核自己创建或提交的题');

const tooltipOf = (wrapper: PageWrapper, button: ReturnType<typeof rowButton>) =>
  selfReviewTooltips(wrapper).find(tip => tip.findAll('button').some(item => item.element === button.element))!;

const isSelectable = (wrapper: PageWrapper, index: number) =>
  !rows(wrapper)[index].find('.el-checkbox').classes('is-disabled');

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

  it('列出提交人与提交时间，缺失时显示占位', async () => {
    mockList([
      question('q1', 'SINGLE', { submitter: { id: 3, name: '张编辑' }, submittedAt: '2026-10-18T08:05:06' }),
      question('q2'),
    ]);
    const wrapper = await mountPage();

    const headers = wrapper.findAll('.el-table__header th').map(th => th.text());
    expect(headers).toContain('提交人');
    expect(headers).toContain('提交时间');
    expect(rows(wrapper)[0].text()).toContain('张编辑');
    expect(rows(wrapper)[0].text()).toContain('2026-10-18 08:05:06');
    expect(rows(wrapper)[1].text()).toContain(EMPTY_TEXT);
  });

  it('发布单题后刷新列表', async () => {
    const wrapper = await mountPage();

    await rowButton(wrapper, 0, '发布').trigger('click');
    await flushPromises();

    expect(adminPublishQuestion).toHaveBeenCalledWith('q1');
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
  });

  it('驳回先填写原因，确认后带原因提交并刷新列表', async () => {
    const wrapper = await mountPage();

    await rowButton(wrapper, 1, '驳回').trigger('click');
    await flushPromises();
    expect(rejectDialog(wrapper).text()).toContain('驳回为草稿，材料及其全部小题一起处理');
    expect(adminRejectQuestion).not.toHaveBeenCalled();

    await fillAndConfirmReject(wrapper, '  材料有错别字  ');

    expect(adminRejectQuestion).toHaveBeenCalledWith('m1', { reason: '材料有错别字' });
    expect(ElMessage.success).toHaveBeenCalledWith('已驳回');
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
  });

  it('驳回原因为空时弹窗保持打开、提示必填且不发请求', async () => {
    const wrapper = await mountPage();

    await rowButton(wrapper, 0, '驳回').trigger('click');
    await flushPromises();
    await fillAndConfirmReject(wrapper, '   ');

    expect(adminRejectQuestion).not.toHaveBeenCalled();
    expect(isRejectDialogOpen(wrapper)).toBe(true);
    expect(
      (rejectDialog(wrapper).findComponent({ name: 'ElFormItem' }).vm as unknown as { validateMessage: string })
        .validateMessage,
    ).toBe('请填写驳回原因');
  });

  it('取消驳回弹窗不发请求', async () => {
    const wrapper = await mountPage();

    await rowButton(wrapper, 0, '驳回').trigger('click');
    await flushPromises();
    await rejectDialog(wrapper)
      .findAll('button')
      .find(button => button.text() === '取消')!
      .trigger('click');
    await flushPromises();

    expect(adminRejectQuestion).not.toHaveBeenCalled();
    expect(adminGetQuestions).toHaveBeenCalledTimes(1);
  });

  it('预览弹窗内驳回填写原因后提交、关闭预览并刷新列表', async () => {
    const wrapper = await mountPage();

    await rejectFromPreview(wrapper, '答案有误');

    expect(adminRejectQuestion).toHaveBeenCalledWith('q1', { reason: '答案有误' });
    expect(isRejectDialogOpen(wrapper)).toBe(false);
    expect(isPreviewOpen(wrapper)).toBe(false);
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
  });

  it('驳回请求失败时驳回弹窗与预览保持打开且不刷新列表', async () => {
    vi.mocked(adminRejectQuestion).mockRejectedValueOnce(new Error('network'));
    const wrapper = await mountPage();

    await rejectFromPreview(wrapper, '答案有误');

    expect(adminRejectQuestion).toHaveBeenCalledTimes(1);
    expect(isRejectDialogOpen(wrapper)).toBe(true);
    expect(isPreviewOpen(wrapper)).toBe(true);
    expect(ElMessage.success).not.toHaveBeenCalled();
    expect(adminGetQuestions).toHaveBeenCalledTimes(1);
  });

  it('驳回成功但刷新列表失败时仍关闭弹窗并提示已驳回', async () => {
    const wrapper = await mountPage();
    vi.mocked(adminGetQuestions).mockRejectedValueOnce(new Error('network'));

    await rejectFromPreview(wrapper, '答案有误');

    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
    expect(ElMessage.success).toHaveBeenCalledWith('已驳回');
    expect(isRejectDialogOpen(wrapper)).toBe(false);
    expect(isPreviewOpen(wrapper)).toBe(false);
  });

  it('发布成功但刷新列表失败时仍提示已发布并关闭预览', async () => {
    const wrapper = await mountPage();
    vi.mocked(adminGetQuestions).mockRejectedValueOnce(new Error('network'));

    await rowButton(wrapper, 0, '预览').trigger('click');
    await flushPromises();
    await previewDialog(wrapper)
      .findAll('button')
      .find(button => button.text() === '发布')!
      .trigger('click');
    await flushPromises();

    expect(adminPublishQuestion).toHaveBeenCalledWith('q1');
    expect(adminGetQuestions).toHaveBeenCalledTimes(2);
    expect(ElMessage.success).toHaveBeenCalledWith('已发布');
    expect(isPreviewOpen(wrapper)).toBe(false);
  });

  it('自己提交的题不能发布、驳回或勾选', async () => {
    mockList([selfSubmitted('q1'), question('q2', 'SINGLE', { submitter: { id: 8, name: '别人' } })]);
    const wrapper = await mountPage();

    expect(rowButton(wrapper, 0, '发布').attributes('disabled')).toBeDefined();
    expect(rowButton(wrapper, 0, '驳回').attributes('disabled')).toBeDefined();
    expect(rowButton(wrapper, 0, '预览').attributes('disabled')).toBeUndefined();
    expect(isSelectable(wrapper, 0)).toBe(false);
    expect(tooltipOf(wrapper, rowButton(wrapper, 0, '发布')).props('disabled')).toBe(false);
    expect(tooltipOf(wrapper, rowButton(wrapper, 0, '驳回')).props('disabled')).toBe(false);
    expect(tooltipOf(wrapper, rowButton(wrapper, 1, '发布')).props('disabled')).toBe(true);

    expect(rowButton(wrapper, 1, '发布').attributes('disabled')).toBeUndefined();
    expect(rowButton(wrapper, 1, '驳回').attributes('disabled')).toBeUndefined();
    expect(isSelectable(wrapper, 1)).toBe(true);
  });

  it('自己创建、他人提交的题不能发布、驳回或勾选', async () => {
    mockList([question('q1', 'SINGLE', { creator: { id: SELF_ID, name: '我' }, submitter: { id: 8, name: '别人' } })]);
    const wrapper = await mountPage();

    expect(rowButton(wrapper, 0, '发布').attributes('disabled')).toBeDefined();
    expect(rowButton(wrapper, 0, '驳回').attributes('disabled')).toBeDefined();
    expect(isSelectable(wrapper, 0)).toBe(false);
  });

  it('预览自己提交的题时发布与驳回禁用', async () => {
    mockList([selfSubmitted('q1')]);
    vi.mocked(adminGetQuestion).mockResolvedValueOnce(selfSubmitted('q1'));
    const wrapper = await mountPage();

    await rowButton(wrapper, 0, '预览').trigger('click');
    await flushPromises();
    const preview = wrapper.findAll('.el-dialog').find(dialog => dialog.text().includes('题目预览'))!;
    const footerButton = (text: string) => preview.findAll('button').find(button => button.text() === text)!;

    expect(footerButton('发布').attributes('disabled')).toBeDefined();
    expect(footerButton('驳回').attributes('disabled')).toBeDefined();
  });

  it('全选时跳过自己提交的题', async () => {
    mockList([selfSubmitted('q1'), question('q2')]);
    const wrapper = await mountPage();

    (
      wrapper.findComponent({ name: 'ElTable' }).vm as unknown as { toggleAllSelection: () => void }
    ).toggleAllSelection();
    await new Promise(resolve => setTimeout(resolve, 20));
    await flushPromises();

    expect(
      wrapper
        .findAll('button')
        .find(button => button.text().startsWith('批量发布'))!
        .text(),
    ).toBe('批量发布（1）');
  });

  it('管理员可审核自己提交的题', async () => {
    useUserInfoStore().setUserInfo({ role: 'ADMIN' });
    mockList([selfSubmitted('q1')]);
    const wrapper = await mountPage();

    expect(rowButton(wrapper, 0, '发布').attributes('disabled')).toBeUndefined();
    expect(rowButton(wrapper, 0, '驳回').attributes('disabled')).toBeUndefined();
    expect(isSelectable(wrapper, 0)).toBe(true);
    expect(tooltipOf(wrapper, rowButton(wrapper, 0, '发布')).props('disabled')).toBe(true);
  });

  it('当前用户 id 未就绪时不判定为自己提交', async () => {
    useUserInfoStore().setUserInfo({ id: undefined, role: 'REVIEWER' });
    mockList([question('q1', 'SINGLE', { submitter: { id: SELF_ID, name: '我' } })]);
    const wrapper = await mountPage();

    expect(rowButton(wrapper, 0, '发布').attributes('disabled')).toBeUndefined();
    expect(rowButton(wrapper, 0, '驳回').attributes('disabled')).toBeUndefined();
    expect(isSelectable(wrapper, 0)).toBe(true);
    expect(tooltipOf(wrapper, rowButton(wrapper, 0, '发布')).props('disabled')).toBe(true);
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
