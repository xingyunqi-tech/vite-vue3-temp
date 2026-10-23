import { watch } from 'vue';
import { adminCreateImport, adminDownloadImportErrors, adminGetImportErrors, adminGetImports } from '@/api';
import type { ImportJob, ImportJobStatus, ImportRowErrorDto, ImportRowErrorDtoSheet } from '@/api';
import { usePagedList } from '@/composables/usePagedList';
import { usePolling } from '@/composables/usePolling';
import { saveBlob } from '@/utils/actions';

export const IMPORT_POLL_INTERVAL = 3000;
export const IMPORT_ACCEPT = '.zip,.xlsx,.json';
export const IMPORT_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/content-import-template.zip`;

export interface ImportFilters {
  status: ImportJobStatus | '';
}

export type ImportSheetFilter = ImportRowErrorDtoSheet | '';

export interface ImportErrorFilters {
  sheet: ImportSheetFilter;
}

export const IMPORT_SHEET_LABEL: Record<ImportRowErrorDtoSheet, string> = {
  knowledge_points: '知识点',
  materials: '材料',
  questions: '题目',
  papers: '试卷',
  paper_questions: '试卷题目',
};

export const sheetText = (sheet: ImportRowErrorDtoSheet) => `${IMPORT_SHEET_LABEL[sheet] ?? sheet}（${sheet}）`;

export const isJobActive = (job: ImportJob) => job.status === 'PENDING' || job.status === 'RUNNING';

export function jobProgress(job: ImportJob): number {
  if (job.status === 'DONE') return 100;
  if (job.total <= 0) return 0;
  const processed = job.succeeded + job.failed + job.skipped;
  return Math.min(100, Math.floor((processed / job.total) * 100));
}

export const hasErrorReport = (job: ImportJob) => !!job.errorReportFileId;

export function isImportFile(fileName: string): boolean {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return IMPORT_ACCEPT.split(',').includes(extension);
}

/** 导入任务列表；有排队或执行中的任务时定时静默刷新 */
export function useImportJobs() {
  const list = usePagedList<ImportFilters, ImportJob>({
    createFilters: () => ({ status: '' }),
    fetchPage: (filters, page, limit, { silent }) =>
      adminGetImports(
        { page, limit, ...(filters.status ? { status: filters.status } : {}) },
        { disableDedup: true, isIgnoreToast: silent },
      ),
  });

  const polling = usePolling({
    interval: IMPORT_POLL_INTERVAL,
    active: () => list.list.value.some(isJobActive),
    run: () => list.load({ silent: true }),
  });

  watch(list.list, () => {
    if (!polling.polling()) polling.schedule();
  });

  const create = async (fileId: string, publishOnImport: boolean): Promise<ImportJob> => {
    const job = await adminCreateImport({ fileId, publishOnImport });
    list.filters.status = '';
    await list.search();
    return job;
  };

  const downloadErrors = async (job: ImportJob) => {
    const blob = await adminDownloadImportErrors(job.id, { disableDedup: true });
    saveBlob(blob, `import-errors-${job.id}.xlsx`);
  };

  return { ...list, create, downloadErrors, dispose: polling.dispose };
}

/** 导入任务的错误行明细，按工作表筛选 */
export function useImportErrors(jobId: () => string) {
  return usePagedList<ImportErrorFilters, ImportRowErrorDto>({
    createFilters: () => ({ sheet: '' }),
    fetchPage: (filters, page, limit) =>
      adminGetImportErrors(
        jobId(),
        { page, limit, ...(filters.sheet ? { sheet: filters.sheet } : {}) },
        { disableDedup: true },
      ),
  });
}
