import type {
  CatalogPaperType,
  ContentStatus,
  ExamCategory,
  ImportJobStatus,
  MultiScoringRule,
  PaperType,
  QuestionSource,
  QuestionStatus,
  QuestionType,
} from '@/api';

export type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';

export interface StatusMeta {
  label: string;
  tag: TagType;
}

export const CONTENT_STATUS_META: Record<ContentStatus, StatusMeta> = {
  DRAFT: { label: '草稿', tag: 'info' },
  PUBLISHED: { label: '已发布', tag: 'success' },
  OFFLINE: { label: '已下架', tag: 'warning' },
};

export const QUESTION_STATUS_META: Record<QuestionStatus, StatusMeta> = {
  DRAFT: { label: '草稿', tag: 'info' },
  REVIEWING: { label: '待审核', tag: 'primary' },
  PUBLISHED: { label: '已发布', tag: 'success' },
  OFFLINE: { label: '已下架', tag: 'warning' },
};

export const IMPORT_STATUS_META: Record<ImportJobStatus, StatusMeta> = {
  PENDING: { label: '排队中', tag: 'info' },
  RUNNING: { label: '执行中', tag: 'primary' },
  DONE: { label: '已完成', tag: 'success' },
  FAILED: { label: '失败', tag: 'danger' },
};

export const EXAM_CATEGORY_LABEL: Record<ExamCategory, string> = {
  CIVIL_SERVICE: '公务员',
  PUBLIC_INSTITUTION: '事业单位',
  TEACHER: '教师',
  COLLEGE_ENGLISH: '大学英语',
  POSTGRADUATE: '考研',
  COMPUTER: '计算机',
  OTHER: '其他',
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  JUDGE: '判断',
  FILL: '填空',
  SHORT_ANSWER: '简答',
  ESSAY: '作文/申论',
  MATERIAL: '材料题',
};

export const QUESTION_SOURCE_LABEL: Record<QuestionSource, string> = {
  ORIGINAL: '原创',
  PUBLIC: '公开真题',
  AI_GENERATED: 'AI 生成',
};

export const PAPER_TYPE_LABEL: Record<PaperType, string> = {
  REAL: '真题',
  MOCK: '模拟卷',
  SPECIAL: '专项卷',
  GENERATED: '按规则生成',
};

export const CATALOG_PAPER_TYPES: CatalogPaperType[] = ['REAL', 'MOCK', 'SPECIAL'];

export const MULTI_SCORING_RULE_LABEL: Record<MultiScoringRule, string> = {
  ALL_OR_NOTHING: '全对才得分',
  PARTIAL: '少选得部分分',
};

export const OBJECTIVE_TYPES: ReadonlySet<QuestionType> = new Set(['SINGLE', 'MULTIPLE', 'JUDGE', 'FILL']);

export function toOptions<K extends string>(labels: Record<K, string>): { label: string; value: K }[] {
  return (Object.keys(labels) as K[]).map(value => ({ label: labels[value], value }));
}

export function toStatusOptions<K extends string>(meta: Record<K, StatusMeta>): { label: string; value: K }[] {
  return (Object.keys(meta) as K[]).map(value => ({ label: meta[value].label, value }));
}

export function statusMeta<K extends string>(meta: Record<K, StatusMeta>, status: K): StatusMeta {
  return meta[status] ?? { label: status, tag: 'info' };
}

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZES = [10, 20, 50, 100];
