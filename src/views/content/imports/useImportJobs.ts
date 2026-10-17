import { getCurrentScope, onScopeDispose, watch } from 'vue';
import { saveBlob } from '../shared/actions';
import { usePagedList } from '../shared/usePagedList';
import { adminCreateImport, adminDownloadImportErrors, adminGetImports, uploadContentFile } from '@/api';
import type { ImportJob, ImportJobStatus } from '@/api';

export const IMPORT_POLL_INTERVAL = 3000;
export const IMPORT_ACCEPT = '.zip,.xlsx,.json';
export const IMPORT_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/content-import-template.zip`;

export interface ImportFilters {
  status: ImportJobStatus | '';
}

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

/** 导入任务列表；有排队或执行中的任务时定时刷新 */
export function useImportJobs() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let polling = false;
  let stopped = false;

  const list = usePagedList<ImportFilters, ImportJob>({
    createFilters: () => ({ status: '' }),
    fetchPage: (filters, page, limit) =>
      adminGetImports(
        { page, limit, ...(filters.status ? { status: filters.status } : {}) },
        { disableDedup: true, isIgnoreToast: polling },
      ),
  });

  const stopPolling = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedulePolling = () => {
    stopPolling();
    if (stopped || !list.list.value.some(isJobActive)) return;
    timer = setTimeout(async () => {
      timer = null;
      polling = true;
      try {
        await list.load();
      } catch {
        schedulePolling();
      } finally {
        polling = false;
      }
    }, IMPORT_POLL_INTERVAL);
  };

  watch(list.list, schedulePolling);

  const create = async (file: File, publishOnImport: boolean): Promise<ImportJob> => {
    const uploaded = await uploadContentFile(file, 'import');
    const job = await adminCreateImport({ fileId: uploaded.id, publishOnImport });
    list.filters.status = '';
    await list.search();
    return job;
  };

  const downloadErrors = async (job: ImportJob) => {
    const blob = await adminDownloadImportErrors(job.id, { disableDedup: true });
    saveBlob(blob, `import-errors-${job.id}.xlsx`);
  };

  const dispose = () => {
    stopped = true;
    stopPolling();
  };

  if (getCurrentScope()) onScopeDispose(dispose);

  return { ...list, create, downloadErrors, dispose };
}
