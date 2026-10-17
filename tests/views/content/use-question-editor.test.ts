import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  adminCreateQuestion,
  adminDeleteQuestion,
  adminGetQuestion,
  adminSubmitQuestion,
  adminUpdateQuestion,
  type AdminQuestionDto,
} from '@/api';
import {
  QuestionValidationError,
  useFileUrls,
  useQuestionDraft,
  useQuestionEditor,
} from '@/views/content/question-edit/useQuestionEditor';

vi.mock('@/api', () => ({
  adminCreateQuestion: vi.fn(),
  adminDeleteQuestion: vi.fn(async () => undefined),
  adminGetQuestion: vi.fn(),
  adminSubmitQuestion: vi.fn(async () => ({})),
  adminUpdateQuestion: vi.fn(),
}));

const FILE_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

const question = (overrides: Partial<AdminQuestionDto> = {}): AdminQuestionDto => ({
  id: 'q1',
  subjectId: 's1',
  parentId: null,
  type: 'JUDGE',
  currentVersion: 1,
  stem: `题干 ![](file:${FILE_ID})`,
  options: null,
  answer: { value: true },
  analysis: '解析',
  difficulty: 3,
  knowledgePointIds: ['k1'],
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
  audioUrl: null,
  fileUrls: {},
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useQuestionEditor', () => {
  it('加载题目后无改动时不提交', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    const editor = useQuestionEditor();
    await editor.load('q1');

    const result = await editor.save();

    expect(result.kind).toBe('unchanged');
    expect(adminUpdateQuestion).not.toHaveBeenCalled();
    expect(editor.answerLocked.value).toBe(true);
  });

  it('加载时登记题目与小题的文件地址和音频地址，键为小写', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(
      question({
        type: 'MATERIAL',
        audioFileId: 'AUDIO-1',
        audioUrl: 'https://cdn/a.mp3',
        fileUrls: { [FILE_ID.toUpperCase()]: 'https://cdn/a.png' },
        children: [question({ id: 'c1', fileUrls: { f2: 'https://cdn/b.png' } })],
      }),
    );
    const editor = useQuestionEditor();
    await editor.load('q1');

    expect(editor.fileUrls).toEqual({
      [FILE_ID]: 'https://cdn/a.png',
      'audio-1': 'https://cdn/a.mp3',
      f2: 'https://cdn/b.png',
    });
  });

  it('修改含图片的题干后保存的仍是 file 引用原文', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ fileUrls: { [FILE_ID]: 'https://cdn/a.png' } }));
    vi.mocked(adminUpdateQuestion).mockResolvedValue(question());
    const editor = useQuestionEditor();
    await editor.load('q1');
    editor.form.value.stem = `新题干 ![](file:${FILE_ID})`;

    await editor.save();

    expect(adminUpdateQuestion).toHaveBeenCalledWith('q1', { stem: `新题干 ![](file:${FILE_ID})` });
  });

  it('新建时切换科目清空已选知识点，编辑时不清空', async () => {
    const editor = useQuestionEditor();
    editor.startCreate('SINGLE', 's1');
    editor.form.value.knowledgePointIds = ['k1'];
    editor.subjectId.value = 's2';
    await nextTick();
    expect(editor.form.value.knowledgePointIds).toEqual([]);

    vi.mocked(adminGetQuestion).mockResolvedValue(question({ knowledgePointIds: ['k1'] }));
    await editor.load('q1');
    await nextTick();
    expect(editor.form.value.knowledgePointIds).toEqual(['k1']);
  });

  it('跟踪未保存的修改', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    const editor = useQuestionEditor();
    await editor.load('q1');
    expect(editor.hasUnsavedChanges.value).toBe(false);

    editor.form.value.analysis = '改';
    expect(editor.hasUnsavedChanges.value).toBe(true);
  });

  it('编辑只提交改动字段', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question());
    vi.mocked(adminUpdateQuestion).mockResolvedValue(question({ analysis: '新解析' }));
    const editor = useQuestionEditor();
    await editor.load('q1');
    editor.form.value.analysis = '新解析';

    const result = await editor.save();

    expect(result.kind).toBe('updated');
    expect(adminUpdateQuestion).toHaveBeenCalledWith('q1', { analysis: '新解析' });
    expect(adminGetQuestion).toHaveBeenCalledTimes(2);
  });

  it('新建时带上科目并提交完整内容', async () => {
    vi.mocked(adminCreateQuestion).mockResolvedValue(question({ id: 'new', status: 'DRAFT', currentVersion: 0 }));
    const editor = useQuestionEditor();
    editor.startCreate('JUDGE', 's9');
    editor.form.value.stem = '地球是圆的';
    editor.form.value.judge = true;

    const result = await editor.save();

    expect(result).toMatchObject({ kind: 'created', question: { id: 'new' } });
    expect(adminCreateQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: 's9', type: 'JUDGE', stem: '地球是圆的', answer: { value: true } }),
    );
  });

  it('校验失败时抛出全部错误且不发请求', async () => {
    const editor = useQuestionEditor();
    editor.startCreate('SINGLE', 's1');

    const error = await editor.save().catch(e => e);

    expect(error).toBeInstanceOf(QuestionValidationError);
    expect((error as QuestionValidationError).errors).toContain('题干不能为空');
    expect(adminCreateQuestion).not.toHaveBeenCalled();
  });

  it('未选科目时拒绝保存', async () => {
    const editor = useQuestionEditor();
    editor.startCreate('SINGLE');

    await expect(editor.save()).rejects.toMatchObject({ errors: ['请选择科目'] });
  });

  it('知识点树加载后只允许叶子', async () => {
    const editor = useQuestionEditor();
    editor.startCreate('JUDGE', 's1');
    editor.form.value.stem = '题干';
    editor.form.value.judge = false;
    editor.form.value.knowledgePointIds = ['branch'];
    editor.setKnowledgeTree([
      {
        id: 'branch',
        isLeaf: false,
        children: [{ id: 'leaf', isLeaf: true, children: [] }],
      } as never,
    ]);

    expect(editor.validate()).toEqual(['只能关联叶子知识点']);
  });

  it('有未保存修改时先保存再提交审核', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ status: 'DRAFT', currentVersion: 0 }));
    vi.mocked(adminUpdateQuestion).mockResolvedValue(question());
    const editor = useQuestionEditor();
    await editor.load('q1');
    editor.form.value.stem = '改过的题干';

    await editor.submitForReview();

    expect(adminUpdateQuestion).toHaveBeenCalledWith('q1', { stem: '改过的题干' });
    expect(adminSubmitQuestion).toHaveBeenCalledWith('q1');
  });

  it('删除小题后重新加载材料', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ type: 'MATERIAL' }));
    const editor = useQuestionEditor();
    await editor.load('q1');

    await editor.removeChild(question({ id: 'c1' }));

    expect(adminDeleteQuestion).toHaveBeenCalledWith('c1');
    expect(adminGetQuestion).toHaveBeenLastCalledWith('q1', { disableDedup: true });
  });

  it('审核中的题目不可编辑', async () => {
    vi.mocked(adminGetQuestion).mockResolvedValue(question({ status: 'REVIEWING' }));
    const editor = useQuestionEditor();
    await editor.load('q1');

    expect(editor.editable.value).toBe(false);
  });
});

describe('useQuestionDraft', () => {
  it('小题新建时带上所属材料', async () => {
    vi.mocked(adminCreateQuestion).mockResolvedValue(question());
    const draft = useQuestionDraft({ isSubQuestion: true });
    draft.reset(null, 'JUDGE');
    draft.form.value.stem = '小题';
    draft.form.value.judge = true;

    await draft.save({ subjectId: 's1', parentId: 'm1' });

    expect(adminCreateQuestion).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 's1', parentId: 'm1' }));
  });
});

describe('useFileUrls', () => {
  it('登记上传文件的地址，键为小写 ID', () => {
    const { fileUrls, register } = useFileUrls();
    register({ id: 'ABC', path: 'https://cdn/x.png' });

    expect(fileUrls).toEqual({ abc: 'https://cdn/x.png' });
  });
});
