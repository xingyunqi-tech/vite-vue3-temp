import type { FormRules } from 'element-plus';
import { DEFAULT_DURATION_MIN } from '../shared/constants';
import type { AdminPaperDto, CatalogPaperType, MultiScoringRule, UpdatePaperDto } from '@/api';

export interface PaperBasicForm {
  title: string;
  type: CatalogPaperType;
  year: number | null;
  durationMin: number;
  multiScoringRule: MultiScoringRule;
  isFree: boolean;
}

export const createPaperBasicForm = (): PaperBasicForm => ({
  title: '',
  type: 'MOCK',
  year: null,
  durationMin: DEFAULT_DURATION_MIN,
  multiScoringRule: 'ALL_OR_NOTHING',
  isFree: true,
});

export const paperBasicRules: FormRules = {
  title: [{ required: true, whitespace: true, message: '请输入标题', trigger: 'blur' }],
  durationMin: [{ required: true, message: '请输入时长', trigger: 'blur' }],
};

export function toPaperBasicForm(paper: AdminPaperDto): PaperBasicForm {
  return {
    title: paper.title,
    type: paper.type === 'GENERATED' ? 'MOCK' : paper.type,
    year: paper.year,
    durationMin: paper.durationMin,
    multiScoringRule: paper.multiScoringRule,
    isFree: paper.isFree,
  };
}

/** 只提交改动的字段；非草稿试卷不能改类型与多选判分规则 */
export function diffPaperBasic(paper: AdminPaperDto, form: PaperBasicForm): UpdatePaperDto {
  const patch: UpdatePaperDto = {};
  const title = form.title.trim();
  if (title !== paper.title) patch.title = title;
  if (form.year !== paper.year) patch.year = form.year;
  if (form.durationMin !== paper.durationMin) patch.durationMin = form.durationMin;
  if (form.isFree !== paper.isFree) patch.isFree = form.isFree;
  if (paper.status === 'DRAFT') {
    if (form.type !== paper.type) patch.type = form.type;
    if (form.multiScoringRule !== paper.multiScoringRule) patch.multiScoringRule = form.multiScoringRule;
  }
  return patch;
}
