import type { ReportStatus, ReportType } from '../shared/feedback-constants';
import { adminGetQuestionReports } from '@/api';
import type { AdminGetQuestionReportsParams, AdminQuestionReportDto } from '@/api';
import { usePagedList } from '@/composables/usePagedList';

export interface ReportFilters {
  type: ReportType | '';
  status: ReportStatus | '';
  questionId: string;
}

export const createReportFilters = (): ReportFilters => ({ type: '', status: '', questionId: '' });

export function toReportQuery(filters: ReportFilters, page: number, limit: number): AdminGetQuestionReportsParams {
  const query: AdminGetQuestionReportsParams = { page, limit };
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  const questionId = filters.questionId.trim();
  if (questionId) query.questionId = questionId;
  return query;
}

export function useReportList() {
  return usePagedList<ReportFilters, AdminQuestionReportDto>({
    createFilters: createReportFilters,
    fetchPage: (filters, page, limit) =>
      adminGetQuestionReports(toReportQuery(filters, page, limit), { disableDedup: true }),
  });
}
