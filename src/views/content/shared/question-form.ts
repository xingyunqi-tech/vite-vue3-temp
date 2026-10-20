import { DIFFICULTY_MAX, DIFFICULTY_MIN } from './constants';
import type {
  AdminQuestionDto,
  CreateQuestionDto,
  QuestionOptionDto,
  QuestionSource,
  QuestionType,
  UpdateQuestionDto,
} from '@/api';

export const ANSWER_LIMITS = {
  blanks: 20,
  candidatesPerBlank: 10,
  candidateLength: 500,
  points: 20,
  pointLength: 500,
  referenceLength: 20000,
} as const;

export const CONTENT_LIMITS = {
  stem: 20000,
  analysis: 20000,
  material: 50000,
  optionContent: 5000,
  options: 26,
  minChoiceOptions: 2,
  sourceNote: 100,
  knowledgePoints: 10,
} as const;

export const DEFAULT_MATERIAL_STEM = '根据以下材料回答问题。';
export const DEFAULT_DIFFICULTY = 3;

const CHOICE_TYPES: ReadonlySet<QuestionType> = new Set(['SINGLE', 'MULTIPLE']);
const QUESTION_TYPES: readonly QuestionType[] = [
  'SINGLE',
  'MULTIPLE',
  'JUDGE',
  'FILL',
  'SHORT_ANSWER',
  'ESSAY',
  'MATERIAL',
];

export const isQuestionType = (value: unknown): value is QuestionType => QUESTION_TYPES.includes(value as QuestionType);

/** 小题不能是材料题；编辑已有题目时不能在材料与非材料题型间切换 */
export function selectableQuestionTypes(
  options: { isSubQuestion?: boolean; editingType?: QuestionType | null } = {},
): QuestionType[] {
  const { isSubQuestion, editingType } = options;
  if (editingType === 'MATERIAL') return ['MATERIAL'];
  if (isSubQuestion || editingType) return QUESTION_TYPES.filter(type => type !== 'MATERIAL');
  return [...QUESTION_TYPES];
}

export const isChoiceType = (type: QuestionType) => CHOICE_TYPES.has(type);

export interface QuestionForm {
  type: QuestionType;
  stem: string;
  options: QuestionOptionDto[];
  choiceKeys: string[];
  judge: boolean | null;
  blanks: string[][];
  reference: string;
  points: string[];
  rubricId: string;
  analysis: string;
  difficulty: number;
  knowledgePointIds: string[];
  material: string;
  audioFileId: string | null;
  source: QuestionSource;
  sourceNote: string;
  isFree: boolean;
}

export type QuestionPayload = Required<
  Pick<
    CreateQuestionDto,
    | 'type'
    | 'stem'
    | 'options'
    | 'answer'
    | 'analysis'
    | 'difficulty'
    | 'knowledgePointIds'
    | 'material'
    | 'audioFileId'
    | 'source'
    | 'sourceNote'
    | 'isFree'
  >
>;

export const optionKey = (index: number) => String.fromCharCode(65 + index);

const defaultOptions = (): QuestionOptionDto[] => ['A', 'B', 'C', 'D'].map(key => ({ key, content: '' }));

export function createQuestionForm(type: QuestionType = 'SINGLE'): QuestionForm {
  return {
    type,
    stem: type === 'MATERIAL' ? DEFAULT_MATERIAL_STEM : '',
    options: defaultOptions(),
    choiceKeys: [],
    judge: null,
    blanks: [['']],
    reference: '',
    points: [],
    rubricId: '',
    analysis: '',
    difficulty: DEFAULT_DIFFICULTY,
    knowledgePointIds: [],
    material: '',
    audioFileId: null,
    source: 'ORIGINAL',
    sourceNote: '',
    isFree: true,
  };
}

/** 选项按顺序重新编号为 A、B、C…，已选答案随选项迁移 */
export function relabelOptions(form: QuestionForm, options: QuestionOptionDto[]): void {
  const mapping = new Map(options.map((option, index) => [option.key, optionKey(index)]));
  form.options = options.map((option, index) => ({ key: optionKey(index), content: option.content }));
  form.choiceKeys = form.choiceKeys.flatMap(key => (mapping.has(key) ? [mapping.get(key)!] : [])).sort();
}

export function addOption(form: QuestionForm): void {
  if (form.options.length >= CONTENT_LIMITS.options) return;
  relabelOptions(form, form.options);
  form.options.push({ key: optionKey(form.options.length), content: '' });
}

export function removeOption(form: QuestionForm, index: number): void {
  relabelOptions(
    form,
    form.options.filter((_, i) => i !== index),
  );
}

type AnswerRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnswerRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as AnswerRecord) : {};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function toQuestionForm(question: AdminQuestionDto): QuestionForm {
  const form = createQuestionForm(question.type);
  const answer = asRecord(question.answer);
  const options = (question.options ?? []).map(option => ({
    key: String(option.key ?? ''),
    content: String(option.content ?? ''),
  }));
  Object.assign(form, {
    stem: question.stem,
    options: isChoiceType(question.type) ? options : defaultOptions(),
    analysis: question.analysis ?? '',
    difficulty: question.difficulty,
    knowledgePointIds: [...question.knowledgePointIds],
    material: question.material ?? '',
    audioFileId: question.audioFileId,
    source: question.source,
    sourceNote: question.sourceNote ?? '',
    isFree: question.isFree,
  });
  if (isChoiceType(question.type)) form.choiceKeys = asStrings(answer.keys).sort();
  if (question.type === 'JUDGE') form.judge = typeof answer.value === 'boolean' ? answer.value : null;
  if (question.type === 'FILL') {
    const blanks = Array.isArray(answer.blanks) ? answer.blanks.map(asStrings) : [];
    form.blanks = blanks.length ? blanks : [['']];
  }
  if (question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') {
    form.reference = typeof answer.reference === 'string' ? answer.reference : '';
    form.rubricId = typeof answer.rubricId === 'string' ? answer.rubricId : '';
  }
  if (question.type === 'SHORT_ANSWER') form.points = asStrings(answer.points);
  return form;
}

const trimList = (items: string[]) => items.map(item => item.trim()).filter(Boolean);

export function toAnswer(form: QuestionForm): AnswerRecord | null {
  const rubric = form.rubricId ? { rubricId: form.rubricId } : {};
  switch (form.type) {
    case 'SINGLE':
    case 'MULTIPLE':
      return { keys: [...form.choiceKeys].sort() };
    case 'JUDGE':
      return { value: form.judge };
    case 'FILL':
      return { blanks: form.blanks.map(trimList) };
    case 'SHORT_ANSWER':
      return { reference: form.reference.trim(), points: trimList(form.points), ...rubric };
    case 'ESSAY':
      return { ...(form.reference.trim() ? { reference: form.reference.trim() } : {}), ...rubric };
    default:
      return null;
  }
}

const orNull = (value: string) => (value.trim() ? value : null);

export function toQuestionPayload(form: QuestionForm): QuestionPayload {
  const isMaterial = form.type === 'MATERIAL';
  return {
    type: form.type,
    stem: form.stem,
    options: isChoiceType(form.type) ? form.options.map(({ key, content }) => ({ key, content })) : null,
    answer: toAnswer(form),
    analysis: orNull(form.analysis),
    difficulty: form.difficulty,
    knowledgePointIds: isMaterial ? [] : [...form.knowledgePointIds],
    material: isMaterial ? orNull(form.material) : null,
    audioFileId: isMaterial ? form.audioFileId : null,
    source: form.source,
    sourceNote: orNull(form.sourceNote)?.trim() ?? null,
    isFree: form.isFree,
  };
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}

/** 只提交与原值不同的字段 */
export function diffQuestionPayload(original: QuestionPayload, next: QuestionPayload): UpdateQuestionDto {
  const patch: Record<string, unknown> = {};
  (Object.keys(next) as (keyof QuestionPayload)[]).forEach(key => {
    const changed =
      key === 'knowledgePointIds'
        ? canonical([...original[key]].sort()) !== canonical([...next[key]].sort())
        : canonical(original[key]) !== canonical(next[key]);
    if (changed) patch[key] = next[key];
  });
  return patch as UpdateQuestionDto;
}

/** 发布过的题目只能修改文字，不能改答案、题型、选项 key 与空数 */
export const isAnswerLocked = (question: Pick<AdminQuestionDto, 'currentVersion'> | null | undefined) =>
  (question?.currentVersion ?? 0) > 0;

export interface ValidateOptions {
  isSubQuestion?: boolean;
  leafIds?: ReadonlySet<string>;
}

function validateAnswer(form: QuestionForm, errors: string[]): void {
  const optionKeys = new Set(form.options.map(option => option.key));
  switch (form.type) {
    case 'SINGLE':
      if (form.choiceKeys.length !== 1) errors.push('单选题须选择 1 个正确选项');
      break;
    case 'MULTIPLE':
      if (form.choiceKeys.length === 0) errors.push('多选题至少选择 1 个正确选项');
      break;
    case 'JUDGE':
      if (form.judge === null) errors.push('请选择判断题答案');
      break;
    case 'FILL': {
      const blanks = form.blanks.map(trimList);
      if (blanks.length === 0 || blanks.length > ANSWER_LIMITS.blanks) {
        errors.push(`填空题须有 1-${ANSWER_LIMITS.blanks} 个空`);
      }
      blanks.forEach((candidates, index) => {
        if (candidates.length === 0 || candidates.length > ANSWER_LIMITS.candidatesPerBlank) {
          errors.push(`第 ${index + 1} 空须有 1-${ANSWER_LIMITS.candidatesPerBlank} 个候选答案`);
        }
        if (candidates.some(candidate => candidate.length > ANSWER_LIMITS.candidateLength)) {
          errors.push(`第 ${index + 1} 空的候选答案不能超过 ${ANSWER_LIMITS.candidateLength} 字`);
        }
      });
      break;
    }
    case 'SHORT_ANSWER': {
      const reference = form.reference.trim();
      if (!reference) errors.push('简答题须填写参考答案');
      if (reference.length > ANSWER_LIMITS.referenceLength) {
        errors.push(`参考答案不能超过 ${ANSWER_LIMITS.referenceLength} 字`);
      }
      const points = trimList(form.points);
      if (points.length > ANSWER_LIMITS.points) errors.push(`要点不能超过 ${ANSWER_LIMITS.points} 条`);
      if (points.some(point => point.length > ANSWER_LIMITS.pointLength)) {
        errors.push(`每条要点不能超过 ${ANSWER_LIMITS.pointLength} 字`);
      }
      break;
    }
    case 'ESSAY':
      if (form.reference.trim().length > ANSWER_LIMITS.referenceLength) {
        errors.push(`参考答案不能超过 ${ANSWER_LIMITS.referenceLength} 字`);
      }
      break;
    default:
      break;
  }
  if (isChoiceType(form.type) && form.choiceKeys.some(key => !optionKeys.has(key))) {
    errors.push('答案须为已有选项');
  }
}

function validateOptions(form: QuestionForm, errors: string[]): void {
  if (form.options.length < CONTENT_LIMITS.minChoiceOptions || form.options.length > CONTENT_LIMITS.options) {
    errors.push(`选择题须有 ${CONTENT_LIMITS.minChoiceOptions}-${CONTENT_LIMITS.options} 个选项`);
  }
  if (new Set(form.options.map(option => option.key)).size !== form.options.length) {
    errors.push('选项字母不能重复');
  }
  if (form.options.some(option => !option.content.trim())) errors.push('选项内容不能为空');
  if (form.options.some(option => option.content.length > CONTENT_LIMITS.optionContent)) {
    errors.push(`选项内容不能超过 ${CONTENT_LIMITS.optionContent} 字`);
  }
}

/** 与后端校验规则一致，返回全部错误文案 */
export function validateQuestionForm(form: QuestionForm, options: ValidateOptions = {}): string[] {
  const errors: string[] = [];
  if (!form.stem.trim()) errors.push('题干不能为空');
  if (form.stem.length > CONTENT_LIMITS.stem) errors.push(`题干不能超过 ${CONTENT_LIMITS.stem} 字`);
  if (form.analysis.length > CONTENT_LIMITS.analysis) errors.push(`解析不能超过 ${CONTENT_LIMITS.analysis} 字`);
  if (form.sourceNote.trim().length > CONTENT_LIMITS.sourceNote) {
    errors.push(`来源说明不能超过 ${CONTENT_LIMITS.sourceNote} 字`);
  }
  if (!Number.isInteger(form.difficulty) || form.difficulty < DIFFICULTY_MIN || form.difficulty > DIFFICULTY_MAX) {
    errors.push(`难度须为 ${DIFFICULTY_MIN}-${DIFFICULTY_MAX}`);
  }

  if (form.type === 'MATERIAL') {
    if (options.isSubQuestion) errors.push('小题不能是材料题');
    if (!form.material.trim() && !form.audioFileId) errors.push('材料内容与音频至少填写一项');
    if (form.material.length > CONTENT_LIMITS.material) errors.push(`材料不能超过 ${CONTENT_LIMITS.material} 字`);
    return errors;
  }

  if (form.knowledgePointIds.length > CONTENT_LIMITS.knowledgePoints) {
    errors.push(`知识点不能超过 ${CONTENT_LIMITS.knowledgePoints} 个`);
  }
  if (options.leafIds && form.knowledgePointIds.some(id => !options.leafIds!.has(id))) {
    errors.push('只能关联叶子知识点');
  }
  if (isChoiceType(form.type)) validateOptions(form, errors);
  validateAnswer(form, errors);
  return errors;
}

/** 答案的简短文字表示，用于预览与版本对比 */
export function formatAnswer(type: QuestionType, answer: unknown): string {
  const record = asRecord(answer);
  switch (type) {
    case 'SINGLE':
    case 'MULTIPLE':
      return asStrings(record.keys).join('、');
    case 'JUDGE':
      return typeof record.value === 'boolean' ? (record.value ? '对' : '错') : '';
    case 'FILL':
      return Array.isArray(record.blanks)
        ? record.blanks.map((candidates, index) => `第${index + 1}空：${asStrings(candidates).join(' / ')}`).join('；')
        : '';
    default:
      return typeof record.reference === 'string' ? record.reference : '';
  }
}

export function answerPoints(answer: unknown): string[] {
  return asStrings(asRecord(answer).points);
}

/** 合并文件地址表，键统一为小写文件 ID */
export function mergeFileUrls(...sources: (Record<string, string> | null | undefined)[]): Record<string, string> {
  const merged: Record<string, string> = {};
  sources.forEach(source =>
    Object.entries(source ?? {}).forEach(([id, url]) => {
      merged[id.toLowerCase()] = url;
    }),
  );
  return merged;
}
