/**
 * 内容管理：分页拉全量与文件上传
 */

import { adminGetExams, adminGetSubjects } from '../generated/admin/admin';
import { uploadFile } from '../generated/files/files';
import type { Exam, FileType, Subject, UploadFilePurpose } from '../generated/model';

/** 管理端列表接口单页上限 */
export const ADMIN_PAGE_LIMIT = 100;

interface PageResult<T> {
  list: T[];
  totalPages: number;
}

export async function collectPages<T>(fetchPage: (page: number) => Promise<PageResult<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage(page);
    items.push(...(result?.list ?? []));
    if (!result || page >= result.totalPages) return items;
  }
}

export function fetchAllExams(): Promise<Exam[]> {
  return collectPages(page => adminGetExams({ page, limit: ADMIN_PAGE_LIMIT }, { disableDedup: true }));
}

export function fetchAllSubjects(examId?: string): Promise<Subject[]> {
  return collectPages(page =>
    adminGetSubjects({ page, limit: ADMIN_PAGE_LIMIT, ...(examId ? { examId } : {}) }, { disableDedup: true }),
  );
}

export async function uploadContentFile(file: File, purpose: UploadFilePurpose): Promise<FileType> {
  const result = await uploadFile({ file }, { purpose });
  return result.file;
}
