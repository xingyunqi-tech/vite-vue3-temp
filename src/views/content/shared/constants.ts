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
import type { StatusMeta } from '@/constants';

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

/** 后台任务（导入、勘误）共用的状态 */
export const TASK_STATUS_META: Record<'PENDING' | 'RUNNING' | 'DONE' | 'FAILED', StatusMeta> = {
  PENDING: { label: '排队中', tag: 'info' },
  RUNNING: { label: '执行中', tag: 'primary' },
  DONE: { label: '已完成', tag: 'success' },
  FAILED: { label: '失败', tag: 'danger' },
};

export const IMPORT_STATUS_META: Record<ImportJobStatus, StatusMeta> = TASK_STATUS_META;

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

/** 试卷与组卷规则共用的限值 */
export const PAPER_SHARED_LIMITS = {
  sectionTitleLength: 50,
  questions: 500,
  minScore: 0.01,
  maxScore: 999.99,
  maxTotalScore: 9999.99,
  maxDurationMin: 600,
} as const;

export const DEFAULT_DURATION_MIN = 120;

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;

/** 考试、科目、知识点排序值上限 */
export const MAX_SORT = 100000;
