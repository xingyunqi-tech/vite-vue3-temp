import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminGetExams, adminGetSubjects } from '@/api/generated/admin/admin';
import { uploadFile } from '@/api/generated/files/files';
import { collectPages, fetchAllExams, fetchAllSubjects, uploadContentFile } from '@/api/modules/content';

vi.mock('@/api/generated/admin/admin', () => ({
  adminGetExams: vi.fn(),
  adminGetSubjects: vi.fn(),
}));

vi.mock('@/api/generated/files/files', () => ({
  uploadFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('内容管理 API 扩展', () => {
  it('按页拉取直到最后一页', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ list: [page], totalPages: 3 }));

    expect(await collectPages(fetchPage)).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('空结果只请求一次', async () => {
    const fetchPage = vi.fn(async () => ({ list: [], totalPages: 0 }));

    expect(await collectPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('拉取全部考试与指定考试的科目', async () => {
    vi.mocked(adminGetExams).mockResolvedValue({
      list: [{ id: 'e1' }],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    } as never);
    vi.mocked(adminGetSubjects).mockResolvedValue({ list: [], total: 0, page: 1, limit: 100, totalPages: 0 } as never);

    expect(await fetchAllExams()).toEqual([{ id: 'e1' }]);
    await fetchAllSubjects('e1');
    await fetchAllSubjects();

    expect(adminGetExams).toHaveBeenCalledWith({ page: 1, limit: 100 }, { disableDedup: true });
    expect(adminGetSubjects).toHaveBeenNthCalledWith(1, { page: 1, limit: 100, examId: 'e1' }, { disableDedup: true });
    expect(adminGetSubjects).toHaveBeenNthCalledWith(2, { page: 1, limit: 100 }, { disableDedup: true });
  });

  it('按用途上传文件并返回文件信息', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ file: { id: 'f1', path: '/a.png' } });
    const file = new File(['x'], 'a.png');

    expect(await uploadContentFile(file, 'image')).toEqual({ id: 'f1', path: '/a.png' });
    expect(uploadFile).toHaveBeenCalledWith({ file }, { purpose: 'image' });
  });
});
