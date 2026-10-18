import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { page, QUESTION_ID, report } from './feedback-fixtures';
import { adminGetQuestionReports } from '@/api';
import ReportsPage from '@/views/content/report-list/index.vue';

vi.mock('@/api', () => ({
  adminGetQuestionReports: vi.fn(),
}));

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/feedback/reports', component: ReportsPage },
      { path: '/feedback/reports/:id', component: { template: '<div />' } },
    ],
  });
  await router.push(path);
  const wrapper = mount(ReportsPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(adminGetQuestionReports).mockResolvedValue(
    page([
      report(),
      report({
        id: 8,
        type: 'ai_content',
        reason: null,
        questionId: null,
        question: null,
        messageId: 'msg-1',
        messageSnapshot: {
          content: '答案是 **A**',
          reasoning: null,
          status: 'DONE',
          createdAt: '2026-10-17T00:00:00.000Z',
        },
        status: 'resolved',
        errataId: null,
      }),
    ]),
  );
});

describe('纠错与举报列表', () => {
  it('展示类型、原因、题目与状态，AI 内容举报显示消息 ID', async () => {
    const { wrapper } = await mountAt('/feedback/reports');

    expect(adminGetQuestionReports).toHaveBeenCalledWith({ page: 1, limit: 20 }, { disableDedup: true });
    const [questionRow, aiRow] = wrapper.findAll('.el-table__body tr.el-table__row');
    expect(questionRow.text()).toContain('题目纠错');
    expect(questionRow.text()).toContain('答案错误');
    expect(questionRow.text()).toContain('下列说法正确的是');
    expect(questionRow.text()).toContain('待处理');
    expect(aiRow.text()).toContain('AI 内容举报');
    expect(aiRow.text()).toContain('AI 消息 msg-1');
    expect(aiRow.text()).toContain('答案是 A');
    expect(questionRow.text()).not.toContain('答案是 A');
    expect(aiRow.text()).toContain('已解决');
  });

  it('从地址带入题目筛选', async () => {
    await mountAt(`/feedback/reports?questionId=${QUESTION_ID}`);

    expect(adminGetQuestionReports).toHaveBeenCalledWith(
      { page: 1, limit: 20, questionId: QUESTION_ID },
      { disableDedup: true },
    );
  });

  it('题目 ID 格式不正确时不查询', async () => {
    const { wrapper } = await mountAt('/feedback/reports');
    await wrapper.find('input[placeholder="题目 ID"]').setValue('abc');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(ElMessage.warning).toHaveBeenCalledWith('题目 ID 格式不正确');
    expect(adminGetQuestionReports).toHaveBeenCalledTimes(1);
  });

  it('点击处理进入详情', async () => {
    const { wrapper, router } = await mountAt('/feedback/reports');

    await wrapper
      .findAll('button')
      .find(button => button.text() === '处理')!
      .trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/feedback/reports/7');
  });
});
