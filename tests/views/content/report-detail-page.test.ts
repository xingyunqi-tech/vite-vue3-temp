import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { errata, page, QUESTION_ID, question, reportDetail } from './feedback-fixtures';
import { adminGetErrataList, adminGetQuestion, adminGetQuestionReport, adminUpdateQuestionReport } from '@/api';
import ReportDetailPage from '@/views/content/report-detail/index.vue';

vi.mock('@/api', () => ({
  adminGetErrataList: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionReport: vi.fn(),
  adminUpdateQuestionReport: vi.fn(),
}));

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/feedback/reports/:id', component: ReportDetailPage },
      { path: '/feedback/errata/create', component: { template: '<div />' } },
      { path: '/feedback/errata/:id', component: { template: '<div />' } },
    ],
  });
  await router.push('/feedback/reports/7');
  const wrapper = mount(ReportDetailPage, { global: { plugins: [router] } });
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
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(adminGetQuestionReport).mockResolvedValue(reportDetail());
  vi.mocked(adminGetQuestion).mockResolvedValue(question());
  vi.mocked(adminGetErrataList).mockResolvedValue(page([]));
});

describe('纠错单详情', () => {
  it('展示用户原因与说明、题目预览，可发起勘误并带上纠错单', async () => {
    const { wrapper, router } = await mountPage();

    expect(wrapper.text()).toContain('答案错误');
    expect(wrapper.text()).toContain('答案应为 B');
    expect(wrapper.text()).toContain('提交时 v2');
    expect(wrapper.find('.question-preview').exists()).toBe(true);

    await clickButton(wrapper, '发起勘误');

    expect(router.currentRoute.value.path).toBe('/feedback/errata/create');
    expect(router.currentRoute.value.query).toEqual({ questionId: QUESTION_ID, reportIds: '7' });
  });

  it('加载失败时显示错误并可重新加载', async () => {
    vi.mocked(adminGetQuestionReport).mockRejectedValueOnce(new Error('not found'));
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('纠错单加载失败');

    await clickButton(wrapper, '重新加载');

    expect(wrapper.text()).not.toContain('纠错单加载失败');
    expect(wrapper.text()).toContain('答案应为 B');
  });

  it('AI 内容举报显示消息 ID，不显示题目与勘误', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({ type: 'ai_content', reason: null, questionId: null, question: null, messageId: 'msg-1' }),
    );
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('AI 消息 ID');
    expect(wrapper.text()).toContain('msg-1');
    expect(wrapper.text()).not.toContain('关联勘误');
    expect(wrapper.text()).not.toContain('发起勘误');
  });

  it('AI 内容举报展示消息快照、关联题目与版本，不提供勘误操作', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({
        type: 'ai_content',
        reason: null,
        content: '回答有误导',
        messageId: 'msg-1',
        messageSnapshot: {
          content: '答案是 **A**，因为 $x^2$',
          reasoning: '先看选项',
          status: 'BLOCKED',
          createdAt: '2026-10-17T00:00:00.000Z',
        },
      }),
    );
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('被举报的 AI 回答');
    expect(wrapper.text()).toContain('已拦截');
    expect(wrapper.text()).toContain('深度思考');
    expect(wrapper.find('.report-detail__answer strong').text()).toBe('A');
    expect(wrapper.find('.report-detail__answer .katex').exists()).toBe(true);
    expect(wrapper.text()).toContain('回答有误导');
    expect(wrapper.text()).toContain('提交时 v2');
    expect(wrapper.find('.question-preview').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('关联勘误');
    expect(wrapper.text()).not.toContain('发起勘误');
    expect(adminGetErrataList).not.toHaveBeenCalled();
  });

  it('AI 内容举报缺少消息快照时给出提示', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({ type: 'ai_content', reason: null, messageId: 'msg-1', messageSnapshot: null }),
    );
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('未保存消息内容');
  });

  it('保存状态与回复', async () => {
    vi.mocked(adminUpdateQuestionReport).mockResolvedValue(reportDetail({ status: 'closed', reply: '答案无误' }));
    const { wrapper } = await mountPage();

    await wrapper.find('textarea').setValue('答案无误');
    await clickButton(wrapper, '保存');

    expect(adminUpdateQuestionReport).toHaveBeenCalledWith(7, { reply: '答案无误' });
    expect(ElMessage.success).toHaveBeenCalledWith('已保存');
  });

  it('提交人已注销时显示已注销用户，图片只渲染 http(s) 地址', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({
        userId: null,
        images: ['https://cdn.test/a.png', 'javascript:alert(1)', 'http://cdn.test/b.png'],
      }),
    );
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('已注销用户');
    expect(wrapper.findAll('.report-detail__image')).toHaveLength(2);
  });

  it('选择该题的勘误任务后关联', async () => {
    vi.mocked(adminGetErrataList).mockResolvedValue(page([errata({ status: 'DONE', processedUsers: 10 })]));
    vi.mocked(adminUpdateQuestionReport).mockResolvedValue(
      reportDetail({ status: 'resolved', errataId: 'e1', errata: errata({ status: 'DONE', processedUsers: 10 }) }),
    );
    const { wrapper } = await mountPage();
    const link = () => wrapper.findAll('button').find(button => button.text() === '关联')!;
    expect(link().attributes('disabled')).toBeDefined();

    await wrapper.find('.report-detail__link .el-select__wrapper').trigger('click');
    await flushPromises();
    const option = [...document.body.querySelectorAll<HTMLElement>('.el-select-dropdown__item')].find(item =>
      item.textContent?.includes('v2 → v3'),
    );
    option!.click();
    await flushPromises();
    await link().trigger('click');
    await flushPromises();

    expect(adminUpdateQuestionReport).toHaveBeenCalledWith(7, { errataId: 'e1' });
    expect(ElMessage.success).toHaveBeenCalledWith('已关联勘误');
    expect(wrapper.text()).toContain('已解决');
    expect(wrapper.text()).toContain('10 / 10 人');
  });

  it('展示关联勘误的进度，可取消关联', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({ status: 'processing', errataId: 'e1', errata: errata({ processedUsers: 5 }) }),
    );
    vi.mocked(adminUpdateQuestionReport).mockResolvedValue(reportDetail({ status: 'processing' }));
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never);
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('执行中');
    expect(wrapper.text()).toContain('v2 → v3');
    expect(wrapper.text()).toContain('5 / 10 人');

    await clickButton(wrapper, '取消关联');

    expect(adminUpdateQuestionReport).toHaveBeenCalledWith(7, { errataId: null });
    expect(ElMessage.success).toHaveBeenCalledWith('已取消关联');
  });
});
