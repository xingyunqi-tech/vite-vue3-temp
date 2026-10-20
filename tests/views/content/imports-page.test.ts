import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminGetImports, adminDownloadImportErrors, type ImportJob } from '@/api';
import { useUserInfoStore } from '@/store/modules/user-info';
import ImportsPage from '@/views/content/imports/index.vue';

vi.mock('@/api', () => ({
  adminCreateImport: vi.fn(),
  adminGetImports: vi.fn(),
  adminDownloadImportErrors: vi.fn(async () => new Blob(['x'])),
  uploadContentFile: vi.fn(),
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

beforeEach(() => {
  setActivePinia(createPinia());
  useUserInfoStore().setUserInfo({ role: 'ADMIN' });
  vi.clearAllMocks();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  vi.mocked(adminGetImports).mockResolvedValue({
    list: [job({}), job({ id: 'j2', status: 'FAILED', errorReportFileId: null, failureReason: 'importInterrupted' })],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
});

describe('批量导入页', () => {
  it('提供导入模板下载链接，未选文件时不能开始导入', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    expect(wrapper.find('a[href$="templates/content-import-template.zip"]').exists()).toBe(true);
    const start = wrapper.findAll('button').find(button => button.text() === '开始导入')!;
    expect(start.attributes('disabled')).toBeDefined();
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

  it('展示任务状态、统计与失败原因', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    const [done, failed] = wrapper.findAll('.el-table__body tr.el-table__row');
    expect(done.text()).toContain('已完成');
    expect(done.find('.el-progress').attributes('aria-valuenow')).toBe('100');
    expect(failed.text()).toContain('失败');
    expect(failed.text()).toContain('importInterrupted');
    expect(failed.text()).not.toContain('下载错误报告');
  });

  it('下载错误报告', async () => {
    const wrapper = mount(ImportsPage);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find(button => button.text() === '下载错误报告')!
      .trigger('click');
    await flushPromises();

    expect(adminDownloadImportErrors).toHaveBeenCalledWith('j1', { disableDedup: true });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
