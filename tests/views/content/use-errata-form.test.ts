import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errata, page, QUESTION_ID, question, report } from './feedback-fixtures';
import { adminCreateErrata, adminGetQuestion, adminGetQuestionReports } from '@/api';
import { useErrataForm } from '@/views/content/errata-create/useErrataForm';

vi.mock('@/api', async () => ({
  ...(await vi.importActual<typeof import('@/api/core/error')>('@/api/core/error')),
  adminCreateErrata: vi.fn(),
  adminGetQuestion: vi.fn(),
  adminGetQuestionReports: vi.fn(),
}));

const conflict = () =>
  new AxiosError('Request failed with status code 409', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    data: { code: 409, message: '该题已有进行中的勘误', data: { errorKey: 'errataInProgress' } },
  } as AxiosResponse);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminGetQuestion).mockResolvedValue(question());
  vi.mocked(adminGetQuestionReports).mockResolvedValue(
    page([
      report({ id: 7 }),
      report({ id: 8, errataId: 'e0' }),
      report({ id: 9, errataId: 'e0' }),
      report({ id: 10, status: 'processing' }),
      report({ id: 11, status: 'closed' }),
      report({ id: 12, status: 'resolved' }),
    ]),
  );
});

describe('useErrataForm', () => {
  it('加载题目当前版本，列出未关联勘误的待处理、处理中纠错单与已选纠错单', async () => {
    const form = useErrataForm();

    await form.load(QUESTION_ID, [9]);

    expect(adminGetQuestion).toHaveBeenCalledWith(QUESTION_ID, { disableDedup: true });
    expect(adminGetQuestionReports).toHaveBeenCalledWith(
      { questionId: QUESTION_ID, type: 'question_error', limit: 50 },
      { disableDedup: true },
    );
    expect(form.reports.value.map(item => item.id)).toEqual([7, 9, 10]);
    expect(form.draft.value?.reportIds).toEqual([9]);
    expect(form.allowed.value).toBe(true);
  });

  it('题目加载失败时给出错误状态', async () => {
    vi.mocked(adminGetQuestion).mockRejectedValueOnce(new Error('题目不存在'));
    const form = useErrataForm();

    await form.load(QUESTION_ID);

    expect(form.loadError.value).toBe('题目不存在');
    expect(form.question.value).toBeNull();
    expect(form.loading.value).toBe(false);
  });

  it('丢弃过期的加载结果', async () => {
    let resolveFirst!: (value: ReturnType<typeof question>) => void;
    vi.mocked(adminGetQuestion)
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce(question({ id: 'q2' }));
    const form = useErrataForm();

    const first = form.load(QUESTION_ID);
    await form.load('q2');
    resolveFirst(question());
    await first;

    expect(form.question.value?.id).toBe('q2');
    expect(form.loading.value).toBe(false);
  });

  it('材料与未发布过的题目不能勘误', async () => {
    const form = useErrataForm();
    vi.mocked(adminGetQuestion).mockResolvedValueOnce(question({ type: 'MATERIAL' }));
    await form.load(QUESTION_ID);
    expect(form.allowed.value).toBe(false);

    vi.mocked(adminGetQuestion).mockResolvedValueOnce(question({ currentVersion: 0 }));
    await form.load(QUESTION_ID);
    expect(form.allowed.value).toBe(false);
  });

  it('校验失败时不提交', async () => {
    const form = useErrataForm();
    await form.load(QUESTION_ID);

    expect(await form.submit()).toBeNull();
    expect(form.errors.value).toEqual(['答案与解析没有变化']);
    expect(adminCreateErrata).not.toHaveBeenCalled();
  });

  it('提交新答案、回复与纠错单', async () => {
    vi.mocked(adminCreateErrata).mockResolvedValue(errata({ id: 'e9' }));
    const form = useErrataForm();
    await form.load(QUESTION_ID, [7]);
    form.draft.value!.form.choiceKeys = ['B'];
    form.draft.value!.reply = '已更正为 B';

    const created = await form.submit();

    expect(created?.id).toBe('e9');
    expect(form.changes.value).toEqual({ answer: true, analysis: false });
    expect(adminCreateErrata).toHaveBeenCalledWith(
      QUESTION_ID,
      {
        answer: { keys: ['B'] },
        reply: '已更正为 B',
        reportIds: [7],
      },
      { isIgnoreToast: true },
    );
  });

  it('该题已有进行中的勘误时给出提示', async () => {
    vi.mocked(adminCreateErrata).mockRejectedValue(conflict());
    const form = useErrataForm();
    await form.load(QUESTION_ID);
    form.draft.value!.form.analysis = '新解析';

    expect(await form.submit()).toBeNull();
    expect(form.submitError.value).toEqual({ message: '该题已有进行中的勘误', inProgress: true });
    expect(form.submitting.value).toBe(false);
  });
});
