import {
  adminCopyPaper,
  adminCreatePaper,
  adminDeletePaper,
  adminGetPapers,
  adminOfflinePaper,
  adminPublishPaper,
} from '@/api';
import type { AdminGetPapersParams, AdminPaperDto, ContentStatus, CreatePaperDto, Paper, PaperType } from '@/api';
import { usePagedList } from '@/composables/usePagedList';

export interface PaperFilters {
  subjectId: string;
  type: PaperType | '';
  status: ContentStatus | '';
  keyword: string;
}

export const createPaperFilters = (): PaperFilters => ({ subjectId: '', type: '', status: '', keyword: '' });

export function toPaperQuery(filters: PaperFilters, page: number, limit: number): AdminGetPapersParams {
  const query: AdminGetPapersParams = { page, limit };
  const keyword = filters.keyword.trim();
  if (keyword) query.keyword = keyword;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  return query;
}

export function usePaperList() {
  const list = usePagedList<PaperFilters, Paper>({
    createFilters: createPaperFilters,
    fetchPage: (filters, page, limit) => adminGetPapers(toPaperQuery(filters, page, limit), { disableDedup: true }),
  });

  const create = (dto: CreatePaperDto): Promise<AdminPaperDto> => adminCreatePaper(dto);

  const publish = async (paper: Paper) => {
    await adminPublishPaper(paper.id);
    await list.load();
  };

  const offline = async (paper: Paper) => {
    await adminOfflinePaper(paper.id);
    await list.load();
  };

  const copy = (paper: Paper): Promise<AdminPaperDto> => adminCopyPaper(paper.id);

  const remove = async (paper: Paper) => {
    await adminDeletePaper(paper.id);
    await list.refresh();
  };

  return { ...list, create, publish, offline, copy, remove };
}
