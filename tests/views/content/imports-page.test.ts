import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { AxiosError, type AxiosResponse } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminCreateImport,
  adminGetImports,
  adminDownloadImportErrors,
  adminGetImportErrors,
  adminPrecheckImport,
  uploadContentFile,
  type ImportJob,
  type ImportPrecheckResultDto,
} from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import { confirmAction } from '@/utils/actions';
import ImportErrorTable from '@/views/content/imports/components/ImportErrorTable.vue';
import ImportUploadCard from '@/views/content/imports/components/ImportUploadCard.vue';
import ImportsPage from '@/views/content/imports/index.vue';

vi.mock('@/api', () => ({
  adminCreateImport: vi.fn(),
  adminGetImports: vi.fn(),
  adminDownloadImportErrors: vi.fn(async () => new Blob(['x'])),
  adminGetImportErrors: vi.fn(),
  adminPrecheckImport: vi.fn(),
  uploadContentFile: vi.fn(),
  requestErrorMessage: vi.fn((error: AxiosError<{ message: string }>) => error.response?.data?.message ?? '请求失败'),
}));

vi.mock('@/utils/actions', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/actions')>()),
  confirmAction: vi.fn(async () => true),
}));

const job = (overrides: Partial<ImportJob>): ImportJob => ({
  id: 'j1',
  fileId: 'f1',
  status: 'DONE',
  publishOnImport: false,
  total: 4,
  succeeded: 2,
  failed: 1,
  skipped: 1,
  errorReportFileId: 'r1',
  failureReason: null,
  createdBy: 1,
  startedAt: null,
  finishedAt: '2026-10-17T01:00:00.000Z',
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  ...overrides,
});

const precheckResult = (overrides: Partial<ImportPrecheckResultDto> = {}): ImportPrecheckResultDto => ({
  wouldCreate: { knowledgePoints: 3, materials: 1, questions: 12, papers: 2 },
  wouldUpdate: { knowledgePoints: 0, materials: 0, questions: 4, papers: 0 },
  wouldSkip: { knowledgePoints: 5, materials: 0, questions: 1, papers: 0 },
  errors: [
    { sheet: 'questions', row: 3, field: 'answer', reason: 'invalidAnswer', message: '答案格式错误' },
    { sheet: 'papers', row: 2, field: 'title', reason: 'required', message: '试卷名称必填', detail: '第 2 行' },
  ],
  truncated: false,
  ...overrides,
});

const httpError = (status: number, message: string) =>
  new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { code: status, message, data: null },
  } as AxiosResponse);

const findButton = (wrapper: VueWrapper, text: string) =>
  wrapper.findAll('button').find(button => button.text().includes(text));

const selectFile = async (wrapper: VueWrapper, file = new File(['x'], 'pkg.zip')) => {
  wrapper.findComponent(ImportUploadCard).vm.$emit('update:file', file);
  await flushPromises();
  return file;
};

const runPrecheck = async (wrapper: VueWrapper) => {
  await findButton(wrapper, '预检')!.trigger('click');
  await flushPromises();
};

const resultSection = (wrapper: VueWrapper) => wrapper.find('.import-page__result');

const errorRows = (wrapper: VueWrapper) =>
  wrapper.findComponent(ImportErrorTable).findAll('.el-table__body tr.el-table__row');

beforeEach(() => {
  setActivePinia(createPinia());
  useUserInfoStore().setUserInfo({ role: 'ADMIN' });
  vi.clearAllMocks();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  vi.mocked(adminGetImports).mockResolvedValue({
    list: [
      job({}),
      job({ id: 'j2', status: 'FAILED', failed: 2, errorReportFileId: null, failureReason: 'importInterrupted' }),
    ],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  vi.mocked(uploadContentFile).mockResolvedValue({ id: 'f1', path: '/f1' });
  vi.mocked(adminPrecheckImport).mockResolvedValue(precheckResult());
  vi.mocked(adminCreateImport).mockResolvedValue(job({ id: 'j3', status: 'PENDING' }));
  vi.mocked(adminGetImportErrors).mockResolvedValue({
    list: precheckResult().errors,
    total: 30,
    page: 1,
    limit: 20,
    totalPages: 2,
  });
});

describe('批量导入页', () => {
  it('提供导入模板下载链接与选项列说明，未选文件时不能预检', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    expect(wrapper.find('a[href$="templates/content-import-template.zip"]').exists()).toBe(true);
    expect(wrapper.find('.import-card').text()).toContain('选项可写 optionA–optionZ');
    expect(wrapper.find('.import-card').text()).toContain('单列 options 每行一个');
    expect(findButton(wrapper, '预检')!.attributes('disabled')).toBeDefined();
    expect(findButton(wrapper, '开始导入')).toBeUndefined();
  });

  it('只有管理员能勾选导入即发布', async () => {
    const admin = mount(ImportsPage);
    await flushPromises();
    expect(admin.find('.import-card .el-switch').exists()).toBe(true);
    expect(admin.find('.import-card').text()).toContain('勾选导入即发布');

    for (const role of ['REVIEWER', 'EDITOR'] as const) {
      useUserInfoStore().setUserInfo({ role });
      const wrapper = mount(ImportsPage);
      await flushPromises();
      expect(wrapper.find('.import-card .el-switch').exists()).toBe(false);
      expect(wrapper.find('.import-card').text()).not.toContain('导入即发布');
      expect(wrapper.find('.import-card').text()).toContain(
        '题目以草稿导入，需审核后发布；引用新题的试卷只能在题目发布后导入',
      );
    }
  });

  it('预检时上传一次导入包并以文件 ID 预检，展示计数与错误表格', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();
    const file = await selectFile(wrapper);

    await runPrecheck(wrapper);

    expect(uploadContentFile).toHaveBeenCalledTimes(1);
    expect(uploadContentFile).toHaveBeenCalledWith(file, 'import');
    expect(adminPrecheckImport).toHaveBeenCalledWith(
      { fileId: 'f1', publishOnImport: false },
      { disableDedup: true, isIgnoreToast: true },
    );
    const section = resultSection(wrapper);
    expect(section.text()).toContain('预检结果仅供参考，以实际导入为准');
    expect(section.text()).toContain('有错误的单元不会写入，其余照常导入');
    expect(section.text()).not.toContain('仅显示前 500 条错误');
    const countRows = section.find('.precheck-result__counts').findAll('.el-table__body tr.el-table__row');
    expect(countRows.map(row => row.findAll('td').map(cell => cell.text()))).toEqual([
      ['新增', '3', '1', '12', '2'],
      ['更新', '0', '0', '4', '0'],
      ['跳过', '5', '0', '1', '0'],
    ]);
    const rows = errorRows(wrapper);
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('题目（questions）');
    expect(rows[0].text()).toContain('answer');
    expect(rows[0].text()).toContain('答案格式错误');
    expect(rows[1].text()).toContain('第 2 行');
    expect(findButton(wrapper, '确认导入')!.text()).toBe('确认导入（2 处错误）');
  });

  it('预检错误表格可按工作表筛选', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    wrapper.findComponent(ImportErrorTable).vm.$emit('update:sheet', 'papers');
    await flushPromises();

    const rows = errorRows(wrapper);
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('试卷名称必填');
  });

  it('错误超过上限时提示仅显示前 500 条', async () => {
    vi.mocked(adminPrecheckImport).mockResolvedValue(precheckResult({ truncated: true }));
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    expect(resultSection(wrapper).text()).toContain('仅显示前 500 条错误，完整错误请导入后下载报告');
    expect(findButton(wrapper, '确认导入')!.text()).toBe('确认导入（500+ 处错误）');
  });

  it('确认导入复用预检时的文件 ID，二次确认提示错误数量，成功后回到第一步', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    await findButton(wrapper, '确认导入')!.trigger('click');
    await flushPromises();

    expect(confirmAction).toHaveBeenCalledWith(expect.stringContaining('预检发现 2 处错误'), '确认导入');
    expect(uploadContentFile).toHaveBeenCalledTimes(1);
    expect(adminCreateImport).toHaveBeenCalledWith({ fileId: 'f1', publishOnImport: false });
    expect(resultSection(wrapper).exists()).toBe(false);
    expect(wrapper.findComponent(ImportUploadCard).props('file')).toBeNull();
  });

  it('创建导入任务期间不能更换文件', async () => {
    let finish!: () => void;
    vi.mocked(adminCreateImport).mockImplementationOnce(
      () => new Promise(resolve => (finish = () => resolve(job({ status: 'PENDING' })))),
    );
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    await findButton(wrapper, '确认导入')!.trigger('click');
    await flushPromises();
    expect(wrapper.findComponent({ name: 'ElUpload' }).props('disabled')).toBe(true);

    finish();
    await flushPromises();
    expect(wrapper.findComponent({ name: 'ElUpload' }).props('disabled')).toBe(false);
  });

  it('没有错误时直接确认导入，取消二次确认时不创建任务', async () => {
    vi.mocked(adminPrecheckImport).mockResolvedValue(precheckResult({ errors: [] }));
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    expect(findButton(wrapper, '确认导入')!.text()).toBe('确认导入');
    await findButton(wrapper, '确认导入')!.trigger('click');
    await flushPromises();
    expect(confirmAction).not.toHaveBeenCalled();
    expect(adminCreateImport).toHaveBeenCalledTimes(1);

    vi.mocked(adminPrecheckImport).mockResolvedValue(precheckResult());
    vi.mocked(confirmAction).mockResolvedValueOnce(false);
    await selectFile(wrapper);
    await runPrecheck(wrapper);
    await findButton(wrapper, '确认导入')!.trigger('click');
    await flushPromises();
    expect(adminCreateImport).toHaveBeenCalledTimes(1);
  });

  it('预检后更改导入即发布需要重新预检才能确认导入', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    wrapper.findComponent(ImportUploadCard).vm.$emit('update:publishOnImport', true);
    await flushPromises();

    expect(resultSection(wrapper).text()).toContain('预检结果已失效，请重新预检');
    expect(findButton(wrapper, '确认导入')!.attributes('disabled')).toBeDefined();

    await findButton(wrapper, '重新预检')!.trigger('click');
    await flushPromises();

    expect(uploadContentFile).toHaveBeenCalledTimes(1);
    expect(adminPrecheckImport).toHaveBeenLastCalledWith(
      { fileId: 'f1', publishOnImport: true },
      { disableDedup: true, isIgnoreToast: true },
    );
    expect(resultSection(wrapper).text()).not.toContain('预检结果已失效');
    await findButton(wrapper, '确认导入')!.trigger('click');
    await flushPromises();
    expect(adminCreateImport).toHaveBeenCalledWith({ fileId: 'f1', publishOnImport: true });
  });

  it('内容过多时展示后端文案并可直接导入', async () => {
    vi.mocked(adminPrecheckImport).mockRejectedValue(httpError(413, '内容过多，请直接导入后查看错误报告'));
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    expect(resultSection(wrapper).text()).toContain('内容过多，请直接导入后查看错误报告');
    await findButton(wrapper, '直接导入')!.trigger('click');
    await flushPromises();

    expect(uploadContentFile).toHaveBeenCalledTimes(1);
    expect(adminCreateImport).toHaveBeenCalledWith({ fileId: 'f1', publishOnImport: false });
  });

  it('导入包无法解析时展示错误并停留在第一步', async () => {
    vi.mocked(adminPrecheckImport).mockRejectedValue(httpError(422, '导入包缺少 content.xlsx'));
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);

    expect(resultSection(wrapper).exists()).toBe(false);
    expect(wrapper.find('.import-page__alert').text()).toContain('文件无法解析：导入包缺少 content.xlsx');
    expect(wrapper.find('.el-step__title.is-process').text()).toBe('上传文件');
  });

  it('更换文件或重置时清空预检状态，重新预检时上传新文件', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();
    await selectFile(wrapper);
    await runPrecheck(wrapper);
    expect(resultSection(wrapper).exists()).toBe(true);

    vi.mocked(uploadContentFile).mockResolvedValue({ id: 'f2', path: '/f2' });
    const next = await selectFile(wrapper, new File(['y'], 'next.xlsx'));
    expect(resultSection(wrapper).exists()).toBe(false);

    await runPrecheck(wrapper);
    expect(uploadContentFile).toHaveBeenLastCalledWith(next, 'import');
    expect(adminPrecheckImport).toHaveBeenLastCalledWith(
      { fileId: 'f2', publishOnImport: false },
      { disableDedup: true, isIgnoreToast: true },
    );

    await findButton(wrapper, '重置')!.trigger('click');
    await flushPromises();
    expect(resultSection(wrapper).exists()).toBe(false);
    expect(wrapper.findComponent(ImportUploadCard).props('file')).toBeNull();
  });

  it('展示任务状态、统计与失败原因', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    const [done, failed] = wrapper.findAll('.data-table > .el-table__inner-wrapper .el-table__body tr.el-table__row');
    expect(done.text()).toContain('已完成');
    expect(done.find('.el-progress').attributes('aria-valuenow')).toBe('100');
    expect(failed.text()).toContain('失败');
    expect(failed.text()).toContain('importInterrupted');
    expect(failed.text()).not.toContain('下载错误报告');
    expect(failed.text()).not.toContain('查看错误');
  });

  it('下载错误报告', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    await findButton(wrapper, '下载错误报告')!.trigger('click');
    await flushPromises();

    expect(adminDownloadImportErrors).toHaveBeenCalledWith('j1', { disableDedup: true });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('查看错误时分页展示错误明细，可按工作表筛选', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    await findButton(wrapper, '查看错误')!.trigger('click');
    await flushPromises();

    expect(adminGetImportErrors).toHaveBeenCalledWith('j1', { page: 1, limit: 20 }, { disableDedup: true });
    const table = wrapper.findComponent(ImportErrorTable);
    expect(table.findAll('.el-table__body tr.el-table__row')).toHaveLength(2);

    table.vm.$emit('update:sheet', 'questions');
    await flushPromises();
    expect(adminGetImportErrors).toHaveBeenLastCalledWith(
      'j1',
      { page: 1, limit: 20, sheet: 'questions' },
      { disableDedup: true },
    );

    await wrapper.find('.import-errors-drawer__pagination .btn-next').trigger('click');
    await flushPromises();
    expect(adminGetImportErrors).toHaveBeenLastCalledWith(
      'j1',
      { page: 2, limit: 20, sheet: 'questions' },
      { disableDedup: true },
    );
  });
});
