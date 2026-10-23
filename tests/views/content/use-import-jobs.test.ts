import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import {
  adminCreateImport,
  adminGetImports,
  adminDownloadImportErrors,
  adminGetImportErrors,
  type ImportJob,
} from '@/api';
import {
  IMPORT_POLL_INTERVAL,
  hasErrorReport,
  isImportFile,
  jobProgress,
  useImportErrors,
  useImportJobs,
} from '@/views/content/imports/useImportJobs';

vi.mock('@/api', () => ({
  adminCreateImport: vi.fn(),
  adminGetImports: vi.fn(),
  adminDownloadImportErrors: vi.fn(async () => new Blob(['x'])),
  adminGetImportErrors: vi.fn(async () => ({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 })),
}));

const job = (overrides: Partial<ImportJob> = {}): ImportJob => ({
  id: 'j1',
  fileId: 'f1',
  status: 'DONE',
  publishOnImport: false,
  total: 10,
  succeeded: 8,
  failed: 1,
  skipped: 1,
  errorReportFileId: null,
  failureReason: null,
  createdBy: 1,
  startedAt: null,
  finishedAt: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const page = (list: ImportJob[]) => ({ list, total: list.length, page: 1, limit: 20, totalPages: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('导入任务工具', () => {
  it('进度为已处理单元占比，完成时为 100', () => {
    expect(jobProgress(job({ status: 'RUNNING', succeeded: 3, failed: 1, skipped: 1 }))).toBe(50);
    expect(jobProgress(job({ status: 'PENDING', total: 0, succeeded: 0, failed: 0, skipped: 0 }))).toBe(0);
    expect(jobProgress(job({ status: 'DONE', total: 0 }))).toBe(100);
  });

  it('生成了错误报告的任务可查看错误明细', () => {
    expect(hasErrorReport(job({ failed: 2, errorReportFileId: 'r1' }))).toBe(true);
    expect(hasErrorReport(job({ status: 'RUNNING', failed: 2, errorReportFileId: null }))).toBe(false);
  });

  it('只接受 zip、xlsx、json', () => {
    expect(isImportFile('a.ZIP')).toBe(true);
    expect(isImportFile('a.json')).toBe(true);
    expect(isImportFile('a.csv')).toBe(false);
  });
});

describe('useImportJobs', () => {
  it('有执行中的任务时定时刷新，全部结束后停止', async () => {
    vi.mocked(adminGetImports)
      .mockResolvedValueOnce(page([job({ status: 'RUNNING' })]))
      .mockResolvedValueOnce(page([job({ status: 'DONE' })]));
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;

    await jobs.load();
    await nextTick();
    await vi.advanceTimersByTimeAsync(IMPORT_POLL_INTERVAL);
    await nextTick();
    await vi.advanceTimersByTimeAsync(IMPORT_POLL_INTERVAL * 3);

    expect(adminGetImports).toHaveBeenCalledTimes(2);
    expect(vi.mocked(adminGetImports).mock.calls[1][1]).toEqual({ disableDedup: true, isIgnoreToast: true });
    expect(jobs.list.value[0].status).toBe('DONE');
    scope.stop();
  });

  it('轮询刷新不显示加载状态', async () => {
    vi.mocked(adminGetImports).mockResolvedValueOnce(page([job({ status: 'RUNNING' })]));
    let resolvePoll!: (value: ReturnType<typeof page>) => void;
    vi.mocked(adminGetImports).mockReturnValueOnce(
      new Promise(resolve => {
        resolvePoll = resolve;
      }),
    );
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;

    await jobs.load();
    await nextTick();
    await vi.advanceTimersByTimeAsync(IMPORT_POLL_INTERVAL);

    expect(adminGetImports).toHaveBeenCalledTimes(2);
    expect(jobs.loading.value).toBe(false);
    resolvePoll(page([job({ status: 'DONE' })]));
    scope.stop();
  });

  it('作用域销毁后停止轮询', async () => {
    vi.mocked(adminGetImports).mockResolvedValue(page([job({ status: 'PENDING' })]));
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;

    await jobs.load();
    await nextTick();
    scope.stop();
    await vi.advanceTimersByTimeAsync(IMPORT_POLL_INTERVAL * 3);

    expect(adminGetImports).toHaveBeenCalledTimes(1);
  });

  it('按状态筛选', async () => {
    vi.mocked(adminGetImports).mockResolvedValue(page([]));
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;
    jobs.filters.status = 'FAILED';

    await jobs.search();

    expect(adminGetImports).toHaveBeenCalledWith(
      { page: 1, limit: 20, status: 'FAILED' },
      { disableDedup: true, isIgnoreToast: false },
    );
    scope.stop();
  });

  it('以已上传的文件 ID 创建任务，清空状态筛选回到第一页并开始轮询', async () => {
    vi.mocked(adminGetImports).mockResolvedValue(page([job({ id: 'j2', status: 'PENDING' })]));
    vi.mocked(adminCreateImport).mockResolvedValue(job({ id: 'j2', status: 'PENDING' }));
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;
    jobs.page.value = 3;
    jobs.filters.status = 'DONE';
    const created = await jobs.create('f1', true);

    expect(adminCreateImport).toHaveBeenCalledWith({ fileId: 'f1', publishOnImport: true });
    expect(created.id).toBe('j2');
    expect(jobs.page.value).toBe(1);
    expect(jobs.filters.status).toBe('');
    expect(adminGetImports).toHaveBeenLastCalledWith(
      { page: 1, limit: 20 },
      { disableDedup: true, isIgnoreToast: false },
    );
    await nextTick();
    await vi.advanceTimersByTimeAsync(IMPORT_POLL_INTERVAL);
    expect(adminGetImports).toHaveBeenCalledTimes(2);
    scope.stop();
  });

  it('下载错误报告保存为 xlsx', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const scope = effectScope();
    const jobs = scope.run(() => useImportJobs())!;

    await jobs.downloadErrors(job({ id: 'j9', errorReportFileId: 'r1' }));

    expect(adminDownloadImportErrors).toHaveBeenCalledWith('j9', { disableDedup: true });
    expect(click).toHaveBeenCalled();
    scope.stop();
  });
});

describe('useImportErrors', () => {
  it('按任务分页查询错误明细，按工作表筛选后回到第一页', async () => {
    const scope = effectScope();
    const errors = scope.run(() => useImportErrors(() => 'j3'))!;

    await errors.search();
    expect(adminGetImportErrors).toHaveBeenLastCalledWith('j3', { page: 1, limit: 20 }, { disableDedup: true });

    errors.changePage(2);
    await vi.waitFor(() => expect(adminGetImportErrors).toHaveBeenCalledTimes(2));
    expect(adminGetImportErrors).toHaveBeenLastCalledWith('j3', { page: 2, limit: 20 }, { disableDedup: true });

    errors.filters.sheet = 'questions';
    await errors.search();
    expect(adminGetImportErrors).toHaveBeenLastCalledWith(
      'j3',
      { page: 1, limit: 20, sheet: 'questions' },
      { disableDedup: true },
    );
    scope.stop();
  });
});
