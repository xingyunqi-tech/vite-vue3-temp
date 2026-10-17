import type { CreatePaperRuleDto, MultiScoringRule, PaperRule, PaperRuleItemDto, QuestionType } from '@/api';

export const RULE_LIMITS = {
  nameLength: 100,
  maxDurationMin: 600,
  items: 20,
  sectionTitleLength: 50,
  knowledgePoints: 50,
  countPerItem: 200,
  minScore: 0.01,
  maxScore: 999.99,
  totalQuestions: 500,
  maxTotalScore: 9999.99,
} as const;

export interface RuleItemForm {
  sectionTitle: string;
  questionType: QuestionType;
  knowledgePointIds: string[];
  limitDifficulty: boolean;
  difficultyRange: [number, number];
  count: number;
  scorePerQuestion: number;
}

export interface PaperRuleForm {
  subjectId: string;
  name: string;
  durationMin: number;
  multiScoringRule: MultiScoringRule;
  items: RuleItemForm[];
}

export const createRuleItem = (): RuleItemForm => ({
  sectionTitle: '',
  questionType: 'SINGLE',
  knowledgePointIds: [],
  limitDifficulty: false,
  difficultyRange: [1, 5],
  count: 10,
  scorePerQuestion: 1,
});

export const createPaperRuleForm = (subjectId = ''): PaperRuleForm => ({
  subjectId,
  name: '',
  durationMin: 120,
  multiScoringRule: 'ALL_OR_NOTHING',
  items: [createRuleItem()],
});

export function toPaperRuleForm(rule: PaperRule): PaperRuleForm {
  return {
    subjectId: rule.subjectId,
    name: rule.name,
    durationMin: rule.durationMin,
    multiScoringRule: rule.multiScoringRule,
    items: rule.items.map(item => ({
      sectionTitle: item.sectionTitle,
      questionType: item.questionType,
      knowledgePointIds: [...(item.knowledgePointIds ?? [])],
      limitDifficulty: !!item.difficultyRange,
      difficultyRange: item.difficultyRange ? [item.difficultyRange[0], item.difficultyRange[1]] : [1, 5],
      count: item.count,
      scorePerQuestion: item.scorePerQuestion,
    })),
  };
}

export function toRuleItemDto(item: RuleItemForm): PaperRuleItemDto {
  return {
    sectionTitle: item.sectionTitle.trim(),
    questionType: item.questionType,
    ...(item.knowledgePointIds.length ? { knowledgePointIds: [...item.knowledgePointIds] } : {}),
    ...(item.limitDifficulty ? { difficultyRange: [...item.difficultyRange] } : {}),
    count: item.count,
    scorePerQuestion: item.scorePerQuestion,
  };
}

export function toPaperRuleDto(form: PaperRuleForm): CreatePaperRuleDto {
  return {
    subjectId: form.subjectId,
    name: form.name.trim(),
    durationMin: form.durationMin,
    multiScoringRule: form.multiScoringRule,
    items: form.items.map(toRuleItemDto),
  };
}

/** 题量充足时的预计总分；材料按小题计，实际可能超出 */
export function estimateRuleScore(items: RuleItemForm[]): number {
  return items.reduce((sum, item) => sum + Math.round(item.count * item.scorePerQuestion * 100), 0) / 100;
}

const hasTwoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export function validatePaperRuleForm(form: PaperRuleForm): string[] {
  const errors: string[] = [];
  if (!form.subjectId) errors.push('请选择科目');
  const name = form.name.trim();
  if (!name || name.length > RULE_LIMITS.nameLength) errors.push(`名称须为 1-${RULE_LIMITS.nameLength} 字`);
  if (!Number.isInteger(form.durationMin) || form.durationMin < 1 || form.durationMin > RULE_LIMITS.maxDurationMin) {
    errors.push(`时长须为 1-${RULE_LIMITS.maxDurationMin} 分钟`);
  }
  if (form.items.length === 0 || form.items.length > RULE_LIMITS.items) {
    errors.push(`抽题项须有 1-${RULE_LIMITS.items} 个`);
  }
  form.items.forEach((item, index) => {
    const label = `第 ${index + 1} 项`;
    const title = item.sectionTitle.trim();
    if (!title || title.length > RULE_LIMITS.sectionTitleLength) {
      errors.push(`${label}分区标题须为 1-${RULE_LIMITS.sectionTitleLength} 字`);
    }
    if (item.knowledgePointIds.length > RULE_LIMITS.knowledgePoints) {
      errors.push(`${label}知识点不能超过 ${RULE_LIMITS.knowledgePoints} 个`);
    }
    const [min, max] = item.difficultyRange;
    if (item.limitDifficulty && !(min >= 1 && max <= 5 && min <= max)) {
      errors.push(`${label}难度范围须在 1-5 之间且下限不大于上限`);
    }
    if (!Number.isInteger(item.count) || item.count < 1 || item.count > RULE_LIMITS.countPerItem) {
      errors.push(`${label}题数须为 1-${RULE_LIMITS.countPerItem}`);
    }
    const score = item.scorePerQuestion;
    if (!(score >= RULE_LIMITS.minScore && score <= RULE_LIMITS.maxScore && hasTwoDecimals(score))) {
      errors.push(`${label}每题分值须在 ${RULE_LIMITS.minScore}-${RULE_LIMITS.maxScore} 之间，最多两位小数`);
    }
  });
  const sectionTypes = new Map<string, QuestionType>();
  if (
    form.items.some(item => {
      const title = item.sectionTitle.trim();
      const type = sectionTypes.get(title) ?? item.questionType;
      sectionTypes.set(title, type);
      return type !== item.questionType;
    })
  ) {
    errors.push('同名分区的题型须一致');
  }
  if (form.items.reduce((sum, item) => sum + item.count, 0) > RULE_LIMITS.totalQuestions) {
    errors.push(`总题数不能超过 ${RULE_LIMITS.totalQuestions}`);
  }
  if (estimateRuleScore(form.items) > RULE_LIMITS.maxTotalScore) {
    errors.push(`总分不能超过 ${RULE_LIMITS.maxTotalScore}`);
  }
  return errors;
}
