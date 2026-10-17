import { OBJECTIVE_TYPES } from '../shared/constants';
import type {
  AdminPaperDto,
  AdminPaperQuestionDto,
  AdminQuestionDto,
  PaperSection,
  QuestionType,
  SetPaperQuestionsDto,
} from '@/api';

export const PAPER_LIMITS = {
  sections: 50,
  sectionTitleLength: 50,
  questions: 500,
  minScore: 0.01,
  maxScore: 999.99,
  maxTotalScore: 9999.99,
} as const;

export const DEFAULT_SCORE = 1;

export interface PaperItemChild {
  questionId: string;
  type: QuestionType;
  stem: string;
  score: number;
}

/** 试卷中的一项：独立题，或材料（按小题记分） */
export interface PaperItem {
  questionId: string;
  type: QuestionType;
  stem: string;
  sectionIndex: number;
  score: number;
  children: PaperItemChild[];
}

const toCents = (score: number) => Math.round(score * 100);

export const isMaterialItem = (item: PaperItem) => item.type === 'MATERIAL';

export function itemScore(item: PaperItem): number {
  if (!isMaterialItem(item)) return item.score;
  return item.children.reduce((sum, child) => sum + toCents(child.score), 0) / 100;
}

/** 可作答题数：材料按小题计 */
export function itemQuestionCount(item: PaperItem): number {
  return isMaterialItem(item) ? item.children.length : 1;
}

export function computePaperScores(items: PaperItem[]): {
  totalScore: number;
  objectiveScore: number;
  questionCount: number;
} {
  let total = 0;
  let objective = 0;
  let count = 0;
  const add = (type: QuestionType, score: number) => {
    const cents = toCents(score);
    total += cents;
    if (OBJECTIVE_TYPES.has(type)) objective += cents;
    count += 1;
  };
  items.forEach(item => {
    if (isMaterialItem(item)) item.children.forEach(child => add(child.type, child.score));
    else add(item.type, item.score);
  });
  return { totalScore: total / 100, objectiveScore: objective / 100, questionCount: count };
}

export function setMaterialScore(item: PaperItem, score: number): void {
  item.score = score;
  item.children.forEach(child => {
    child.score = score;
  });
}

export function fromQuestion(question: AdminQuestionDto, sectionIndex: number, score = DEFAULT_SCORE): PaperItem {
  return {
    questionId: question.id,
    type: question.type,
    stem: question.stem,
    sectionIndex,
    score,
    children: (question.children ?? []).map(child => ({
      questionId: child.id,
      type: child.type,
      stem: child.stem,
      score,
    })),
  };
}

/** 试卷题目行按材料聚合为编辑项；materialStems 提供材料题干 */
export function fromAdminPaper(paper: AdminPaperDto, materialStems: Record<string, string> = {}): PaperItem[] {
  const rows = [...paper.questions].sort((a, b) => a.sort - b.sort);
  const items: PaperItem[] = [];
  rows.forEach((row: AdminPaperQuestionDto) => {
    const child: PaperItemChild = { questionId: row.questionId, type: row.type, stem: row.stem, score: row.score };
    const last = items[items.length - 1];
    if (row.parentId && last?.questionId === row.parentId && last.sectionIndex === row.sectionIndex) {
      last.children.push(child);
      return;
    }
    if (row.parentId) {
      items.push({
        questionId: row.parentId,
        type: 'MATERIAL',
        stem: materialStems[row.parentId] ?? '',
        sectionIndex: row.sectionIndex,
        score: row.score,
        children: [child],
      });
      return;
    }
    items.push({ ...child, sectionIndex: row.sectionIndex, children: [] });
  });
  return items;
}

export function materialIds(paper: AdminPaperDto): string[] {
  return [...new Set(paper.questions.flatMap(row => (row.parentId ? [row.parentId] : [])))];
}

export function sortBySection(items: PaperItem[]): PaperItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.sectionIndex - b.item.sectionIndex || a.index - b.index)
    .map(({ item }) => item);
}

export function toSetQuestionsDto(sections: PaperSection[], items: PaperItem[]): SetPaperQuestionsDto {
  return {
    sections: sections.map(({ title, questionType }) => ({ title: title.trim(), questionType })),
    questions: sortBySection(items).map(item =>
      isMaterialItem(item)
        ? {
            questionId: item.questionId,
            sectionIndex: item.sectionIndex,
            score: item.children[0]?.score ?? item.score,
            childScores: item.children.map(child => child.score),
          }
        : { questionId: item.questionId, sectionIndex: item.sectionIndex, score: item.score },
    ),
  };
}

/** 同一分区内上移或下移 */
export function moveItem(items: PaperItem[], item: PaperItem, delta: -1 | 1): PaperItem[] {
  const siblings = items.filter(candidate => candidate.sectionIndex === item.sectionIndex);
  const position = siblings.indexOf(item);
  const target = siblings[position + delta];
  if (position < 0 || !target) return items;
  const next = [...items];
  const from = next.indexOf(item);
  const to = next.indexOf(target);
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** 删除分区连同其中的题目，后续分区下标前移 */
export function removeSection(
  sections: PaperSection[],
  items: PaperItem[],
  index: number,
): { sections: PaperSection[]; items: PaperItem[] } {
  return {
    sections: sections.filter((_, i) => i !== index),
    items: items
      .filter(item => item.sectionIndex !== index)
      .map(item => (item.sectionIndex > index ? { ...item, sectionIndex: item.sectionIndex - 1 } : item)),
  };
}

const isValidScore = (score: number) =>
  Number.isFinite(score) &&
  score >= PAPER_LIMITS.minScore &&
  score <= PAPER_LIMITS.maxScore &&
  Math.abs(toCents(score) - score * 100) < 1e-6;

export function validatePaperItems(sections: PaperSection[], items: PaperItem[]): string[] {
  const errors: string[] = [];
  if (sections.length === 0 || sections.length > PAPER_LIMITS.sections) {
    errors.push(`分区须有 1-${PAPER_LIMITS.sections} 个`);
  }
  sections.forEach((section, index) => {
    const title = section.title.trim();
    if (!title || title.length > PAPER_LIMITS.sectionTitleLength) {
      errors.push(`第 ${index + 1} 个分区标题须为 1-${PAPER_LIMITS.sectionTitleLength} 字`);
    }
  });
  if (items.some(item => item.sectionIndex < 0 || item.sectionIndex >= sections.length)) {
    errors.push('存在未归属分区的题目');
  }
  const ids = items.map(item => item.questionId);
  if (new Set(ids).size !== ids.length) errors.push('同一题目不能重复加入');
  const { totalScore, questionCount } = computePaperScores(items);
  if (questionCount > PAPER_LIMITS.questions) errors.push(`题目不能超过 ${PAPER_LIMITS.questions} 道`);
  const scores = items.flatMap(item => (isMaterialItem(item) ? item.children.map(child => child.score) : [item.score]));
  if (scores.some(score => !isValidScore(score))) {
    errors.push(`每题分值须在 ${PAPER_LIMITS.minScore}-${PAPER_LIMITS.maxScore} 之间，最多两位小数`);
  }
  if (items.some(item => isMaterialItem(item) && item.children.length === 0)) errors.push('材料题没有小题');
  if (totalScore > PAPER_LIMITS.maxTotalScore) errors.push(`总分不能超过 ${PAPER_LIMITS.maxTotalScore}`);
  return errors;
}
