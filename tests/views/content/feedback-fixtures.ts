import type { AdminQuestionDto, AdminQuestionReportDetailDto, AdminQuestionReportDto, Errata } from '@/api';

export const QUESTION_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

export const question = (overrides: Partial<AdminQuestionDto> = {}): AdminQuestionDto =>
  ({
    id: QUESTION_ID,
    subjectId: 's1',
    parentId: null,
    type: 'SINGLE',
    currentVersion: 2,
    stem: '下列说法正确的是',
    options: [
      { key: 'A', content: '甲' },
      { key: 'B', content: '乙' },
      { key: 'C', content: '丙' },
    ],
    answer: { keys: ['A'] },
    analysis: '原解析',
    difficulty: 3,
    knowledgePointIds: [],
    material: null,
    audioFileId: null,
    audioUrl: null,
    fileUrls: {},
    source: 'ORIGINAL',
    sourceNote: null,
    status: 'PUBLISHED',
    isFree: true,
    sort: 0,
    contentHash: 'h',
    statAnswered: 0,
    statCorrect: 0,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
    ...overrides,
  }) as AdminQuestionDto;

export const errata = (overrides: Partial<Errata> = {}): Errata => ({
  id: 'e1',
  questionId: QUESTION_ID,
  fromVersion: 2,
  toVersion: 3,
  answerChanged: true,
  status: 'RUNNING',
  affectedUsers: 10,
  processedUsers: 4,
  reply: '感谢反馈',
  failureReason: null,
  createdBy: 1,
  startedAt: '2026-10-17T00:00:00.000Z',
  finishedAt: null,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  ...overrides,
});

export const report = (overrides: Partial<AdminQuestionReportDto> = {}): AdminQuestionReportDto => ({
  id: 7,
  userId: 3,
  type: 'question_error',
  content: '答案应为 B',
  images: null,
  contact: null,
  status: 'pending',
  reply: null,
  questionId: QUESTION_ID,
  questionVersion: 2,
  reason: 'answer_wrong',
  errataId: null,
  messageId: null,
  createdAt: '2026-10-17T00:00:00.000Z',
  question: { id: QUESTION_ID, parentId: null, type: 'SINGLE', stem: '下列说法正确的是' },
  ...overrides,
});

export const reportDetail = (overrides: Partial<AdminQuestionReportDetailDto> = {}): AdminQuestionReportDetailDto =>
  ({ ...report(), errata: null, ...overrides }) as AdminQuestionReportDetailDto;

export const page = <T>(list: T[]) => ({ list, total: list.length, page: 1, limit: 20, totalPages: 1 });
