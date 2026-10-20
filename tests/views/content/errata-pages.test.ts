import { flushPromises, mount } from '@vue/test-utils';
import { AxiosError, type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { errata, page, QUESTION_ID, question, report } from './feedback-fixtures';
import {
  adminCreateErrata,
  adminGetErrata,
  adminGetErrataList,
  adminGetQuestion,
  adminGetQuestionReports,
  adminRetryErrata,
} from '@/api';
import ErrataListPage from '@/views/content/errata/index.vue';
import ErrataCreatePage from '@/views/content/errata-create/index.vue';
import ErrataDetailPage from '@/views/content/errata-detail/index.vue';

vi.mock('@/api', async () => ({
  ...(await vi.importActual<typeof import('@/api/core/error')>('@/api/core/error')),
  adminCreateErrata: vi.fn(),
  adminGetErrata: vi.fn(),
  adminGetErrataList: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionReports: vi.fn(),
  adminRetryErrata: vi.fn(),
  uploadContentFile: vi.fn(),
}));

const stub = { template: '<div />' };

async function mountAt(path: string, page: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/feedback/errata', component: stub },
      { path: '/feedback/errata/create', component: stub },
      { path: '/feedback/errata/:id', component: stub },
      { path: '/feedback/reports/:id', component: stub },
      { path: '/content/questions/:id', component: stub },
    ],
  });
  await router.push(path);
  const wrapper = mount(page, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const buttonTexts = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').map(button => button.text());

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
  vi.mocked(adminGetQuestion).mockResolvedValue(question());
  vi.mocked(adminGetQuestionReports).mockResolvedValue(page([report({ id: 7 })]));
});

describe('勘误表单页', () => {
  it('提交后跳转到勘误进度页', async () => {
    vi.mocked(adminCreateErrata).mockResolvedValue(errata({ id: 'e9' }));
    const { wrapper, router } = await mountAt(
      `/feedback/errata/create?questionId=${QUESTION_ID}&reportIds=7`,
      ErrataCreatePage,
    );

    await wrapper
      .findAll('.el-radio')
      .find(radio => radio.text() === 'B')!
      .find('input')
      .setValue(true);
    await flushPromises();
    await clickButton(wrapper, '提交勘误');

    expect(adminCreateErrata).toHaveBeenCalledWith(
      QUESTION_ID,
      { answer: { keys: ['B'] }, reportIds: [7] },
      { isIgnoreToast: true },
    );
    expect(router.currentRoute.value.fullPath).toBe('/feedback/errata/e9');
  });

  it('提示只显示最近 50 条纠错单，地址带入但不在列表中的纠错单按编号显示', async () => {
    const { wrapper } = await mountAt(
      `/feedback/errata/create?questionId=${QUESTION_ID}&reportIds=7,99`,
      ErrataCreatePage,
    );

    expect(wrapper.text()).toContain('仅显示该题最近 50 条待处理或处理中的纠错单');
    const tags = wrapper.find('.errata-create__reports').text();
    expect(tags).toContain('#7 答案错误（待处理）');
    expect(tags).toContain('纠错单 #99');
  });

  it('题目加载失败时显示错误并可重新加载', async () => {
    vi.mocked(adminGetQuestion).mockRejectedValueOnce(new Error('题目不存在'));
    const { wrapper } = await mountAt(`/feedback/errata/create?questionId=${QUESTION_ID}`, ErrataCreatePage);

    expect(wrapper.text()).toContain('题目不存在');
    await clickButton(wrapper, '重新加载');

    expect(adminGetQuestion).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('当前版本');
  });

  it('未修改时提示没有变化', async () => {
    const { wrapper } = await mountAt(`/feedback/errata/create?questionId=${QUESTION_ID}`, ErrataCreatePage);

    await clickButton(wrapper, '提交勘误');

    expect(adminCreateErrata).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('答案与解析没有变化');
  });

  it('填空题不能增删空', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(
      question({ type: 'FILL', options: null, answer: { blanks: [['北京'], ['1949']] } }),
    );
    const { wrapper } = await mountAt(`/feedback/errata/create?questionId=${QUESTION_ID}`, ErrataCreatePage);

    expect(buttonTexts(wrapper)).toContain('添加候选答案');
    expect(buttonTexts(wrapper)).not.toContain('添加空');
    expect(buttonTexts(wrapper)).not.toContain('删除此空');
  });

  it('材料不能勘误', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ type: 'MATERIAL', options: null, answer: null }));
    const { wrapper } = await mountAt(`/feedback/errata/create?questionId=${QUESTION_ID}`, ErrataCreatePage);

    expect(wrapper.text()).toContain('材料不能勘误，请对小题勘误');
    const submit = wrapper.findAll('button').find(button => button.text() === '提交勘误')!;
    expect(submit.attributes('disabled')).toBeDefined();
  });

  it('该题已有进行中的勘误时提示并可查看该题勘误任务', async () => {
    vi.mocked(adminCreateErrata).mockRejectedValue(
      new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        data: { code: 409, message: '该题已有进行中的勘误', data: { errorKey: 'errataInProgress' } },
      } as AxiosResponse),
    );
    vi.mocked(adminGetErrataList).mockResolvedValue(page([]));
    const { wrapper, router } = await mountAt(`/feedback/errata/create?questionId=${QUESTION_ID}`, ErrataCreatePage);
    await wrapper.findAll('textarea').at(-2)!.setValue('新解析');

    await clickButton(wrapper, '提交勘误');

    expect(wrapper.find('.errata-create__form .el-alert--error').text()).toContain('该题已有进行中的勘误');
    await clickButton(wrapper, '查看该题勘误任务');
    expect(router.currentRoute.value.fullPath).toBe(`/feedback/errata?questionId=${QUESTION_ID}`);
  });
});

describe('勘误进度页', () => {
  it('展示状态与受影响用户进度', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'DONE', processedUsers: 10 }));
    vi.mocked(adminGetQuestionReports).mockResolvedValue(page([report({ id: 7, errataId: 'e1', status: 'resolved' })]));
    const { wrapper } = await mountAt('/feedback/errata/e1', ErrataDetailPage);

    expect(wrapper.text()).toContain('已完成');
    expect(wrapper.text()).toContain('v2 → v3');
    expect(wrapper.text()).toContain('10 / 10 人');
    expect(wrapper.find('.el-progress').attributes('aria-valuenow')).toBe('100');
    expect(wrapper.text()).toContain('关联纠错单（1）');
    expect(buttonTexts(wrapper)).not.toContain('重试');
  });

  it('加载失败时显示错误并可重新加载', async () => {
    vi.mocked(adminGetErrata)
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce(errata({ status: 'DONE', processedUsers: 10 }));
    const { wrapper } = await mountAt('/feedback/errata/e1', ErrataDetailPage);

    expect(wrapper.text()).toContain('勘误任务加载失败');
    expect(buttonTexts(wrapper)).not.toContain('刷新');

    await clickButton(wrapper, '重新加载');

    expect(wrapper.text()).not.toContain('勘误任务加载失败');
    expect(wrapper.text()).toContain('10 / 10 人');
  });

  it('失败的任务可以重试', async () => {
    vi.mocked(adminGetErrata).mockResolvedValue(errata({ status: 'FAILED', failureReason: 'boom' }));
    vi.mocked(adminRetryErrata).mockResolvedValue(errata({ status: 'DONE', processedUsers: 10 }));
    const { wrapper } = await mountAt('/feedback/errata/e1', ErrataDetailPage);

    expect(wrapper.text()).toContain('任务失败：boom');
    await clickButton(wrapper, '重试');

    expect(adminRetryErrata).toHaveBeenCalledWith('e1');
    expect(ElMessage.success).toHaveBeenCalledWith('已从中断处继续执行');
    expect(buttonTexts(wrapper)).not.toContain('重试');
  });
});

describe('勘误列表页', () => {
  it('展示进度，失败任务可重试', async () => {
    vi.mocked(adminGetErrataList).mockResolvedValue(
      page([
        errata({ status: 'DONE', processedUsers: 10 }),
        errata({ id: 'e2', status: 'FAILED', failureReason: 'boom' }),
      ]),
    );
    vi.mocked(adminRetryErrata).mockResolvedValue(errata({ id: 'e2', status: 'PENDING' }));
    const { wrapper } = await mountAt(`/feedback/errata?questionId=${QUESTION_ID}`, ErrataListPage);

    expect(adminGetErrataList).toHaveBeenCalledWith(
      { page: 1, limit: 20, questionId: QUESTION_ID },
      { disableDedup: true, isIgnoreToast: false },
    );
    const [done, failed] = wrapper.findAll('.el-table__body tr.el-table__row');
    expect(done.find('.el-progress').attributes('aria-valuenow')).toBe('100');
    expect(done.text()).not.toContain('重试');
    expect(failed.text()).toContain('boom');

    await failed
      .findAll('button')
      .find(button => button.text() === '重试')!
      .trigger('click');
    await flushPromises();

    expect(adminRetryErrata).toHaveBeenCalledWith('e2');
  });
});
