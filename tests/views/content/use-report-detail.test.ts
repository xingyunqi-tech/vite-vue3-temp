import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errata, page, QUESTION_ID, question, reportDetail } from './feedback-fixtures';
import { adminGetErrataList, adminGetQuestion, adminGetQuestionReport, adminUpdateQuestionReport } from '@/api';
import { ReportValidationError, toReportPatch, useReportDetail } from '@/views/content/report-detail/useReportDetail';

vi.mock('@/api', () => ({
  adminGetErrataList: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionReport: vi.fn(),
  adminUpdateQuestionReport: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminGetQuestionReport).mockResolvedValue(reportDetail());
  vi.mocked(adminGetQuestion).mockResolvedValue(question());
  vi.mocked(adminGetErrataList).mockResolvedValue(page([errata({ status: 'DONE' })]));
});

describe('纠错单处理表单', () => {
  it('只提交改动的状态与回复，回复去首尾空白', () => {
    expect(toReportPatch({ status: 'pending', reply: null }, { status: 'pending', reply: '' })).toEqual({});
    expect(toReportPatch({ status: 'pending', reply: null }, { status: 'closed', reply: ' 答案无误 ' })).toEqual({
      status: 'closed',
      reply: '答案无误',
    });
    expect(toReportPatch({ status: 'closed', reply: '答案无误' }, { status: 'closed', reply: '答案无误 ' })).toEqual(
      {},
    );
  });

  it('回复不能清空或超过 1000 字', () => {
    expect(() => toReportPatch({ status: 'closed', reply: '答案无误' }, { status: 'closed', reply: ' ' })).toThrow(
      ReportValidationError,
    );
    expect(() =>
      toReportPatch({ status: 'pending', reply: null }, { status: 'pending', reply: '字'.repeat(1001) }),
    ).toThrow('回复不能超过 1000 字');
  });
});

describe('useReportDetail', () => {
  it('加载纠错单、题目与该题的勘误任务', async () => {
    const detail = useReportDetail();

    await detail.load(7);

    expect(adminGetQuestionReport).toHaveBeenCalledWith(7, { disableDedup: true });
    expect(adminGetQuestion).toHaveBeenCalledWith(QUESTION_ID, { disableDedup: true });
    expect(adminGetErrataList).toHaveBeenCalledWith({ questionId: QUESTION_ID, limit: 100 }, { disableDedup: true });
    expect(detail.errataOptions.value).toHaveLength(1);
    expect(detail.form).toEqual({ status: 'pending', reply: '' });
  });

  it('AI 内容举报不加载题目与勘误', async () => {
    vi.mocked(adminGetQuestionReport).mockResolvedValue(
      reportDetail({ type: 'ai_content', questionId: null, question: null, reason: null, messageId: 'm1' }),
    );
    const detail = useReportDetail();

    await detail.load(8);

    expect(adminGetQuestion).not.toHaveBeenCalled();
    expect(adminGetErrataList).not.toHaveBeenCalled();
    expect(detail.report.value?.messageId).toBe('m1');
  });

  it('保存状态与回复后用返回的纠错单刷新表单', async () => {
    vi.mocked(adminUpdateQuestionReport).mockResolvedValue(reportDetail({ status: 'closed', reply: '答案无误' }));
    const detail = useReportDetail();
    await detail.load(7);
    detail.form.status = 'closed';
    detail.form.reply = '答案无误';

    expect(await detail.save()).toBe(true);
    expect(adminUpdateQuestionReport).toHaveBeenCalledWith(7, { status: 'closed', reply: '答案无误' });
    expect(detail.report.value?.status).toBe('closed');
    expect(await detail.save()).toBe(false);
    expect(adminUpdateQuestionReport).toHaveBeenCalledTimes(1);
  });

  it('关联与取消关联勘误', async () => {
    vi.mocked(adminUpdateQuestionReport)
      .mockResolvedValueOnce(reportDetail({ status: 'resolved', errataId: 'e1', errata: errata({ status: 'DONE' }) }))
      .mockResolvedValueOnce(reportDetail({ status: 'resolved' }));
    const detail = useReportDetail();
    await detail.load(7);

    await detail.linkErrata('e1');
    expect(detail.report.value?.errata?.id).toBe('e1');
    expect(detail.form.status).toBe('resolved');

    await detail.linkErrata(null);
    expect(adminUpdateQuestionReport).toHaveBeenLastCalledWith(7, { errataId: null });
    expect(detail.report.value?.errata).toBeNull();
  });
});
