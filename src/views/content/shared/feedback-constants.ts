import type { StatusMeta } from './constants';
import type {
  AdminGetQuestionReportsStatus,
  AdminGetQuestionReportsType,
  ErrataStatus,
  QuestionReportReason,
} from '@/api';

export type ReportStatus = AdminGetQuestionReportsStatus;
export type ReportType = AdminGetQuestionReportsType;

export const REPORT_STATUS_META: Record<ReportStatus, StatusMeta> = {
  pending: { label: '待处理', tag: 'warning' },
  processing: { label: '处理中', tag: 'primary' },
  resolved: { label: '已解决', tag: 'success' },
  closed: { label: '已关闭', tag: 'info' },
};

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  question_error: '题目纠错',
  ai_content: 'AI 内容举报',
};

export const REPORT_REASON_LABEL: Record<QuestionReportReason, string> = {
  answer_wrong: '答案错误',
  analysis_wrong: '解析错误',
  stem_typo: '题干错别字',
  other: '其他',
};

export const ERRATA_STATUS_META: Record<ErrataStatus, StatusMeta> = {
  PENDING: { label: '排队中', tag: 'info' },
  RUNNING: { label: '执行中', tag: 'primary' },
  DONE: { label: '已完成', tag: 'success' },
  FAILED: { label: '失败', tag: 'danger' },
};

export const REPORT_PAGE_SIZES = [10, 20, 50];
export const REPORT_REPLY_MAX = 1000;
export const LINKABLE_LIST_LIMIT = 50;

export const reportTypeLabel = (type: string) => REPORT_TYPE_LABEL[type as ReportType] ?? type;
