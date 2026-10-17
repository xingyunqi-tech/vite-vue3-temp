import { computed, ref } from 'vue';
import { createPaperBasicForm, diffPaperBasic, toPaperBasicForm, type PaperBasicForm } from './paper-basic';
import {
  computePaperScores,
  fromAdminPaper,
  fromQuestion,
  materialIds,
  moveItem,
  removeSection,
  toSetQuestionsDto,
  validatePaperItems,
  type PaperItem,
} from './paper-items';
import {
  adminCopyPaper,
  adminDeletePaper,
  adminGetPaper,
  adminGetQuestion,
  adminOfflinePaper,
  adminPublishPaper,
  adminSetPaperQuestions,
  adminUpdatePaper,
} from '@/api';
import type { AdminPaperDto, AdminQuestionDto, PaperSection, QuestionType } from '@/api';

export class PaperValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('；'));
  }
}

async function loadMaterialStems(paper: AdminPaperDto): Promise<Record<string, string>> {
  const ids = materialIds(paper);
  const results = await Promise.allSettled(ids.map(id => adminGetQuestion(id, { isIgnoreToast: true })));
  return Object.fromEntries(
    results.flatMap((result, index) => (result.status === 'fulfilled' ? [[ids[index], result.value.stem]] : [])),
  );
}

export function usePaperEditor() {
  const paper = ref<AdminPaperDto | null>(null);
  const basic = ref<PaperBasicForm>(createPaperBasicForm());
  const sections = ref<PaperSection[]>([]);
  const items = ref<PaperItem[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const questionsDirty = ref(false);

  const frozen = computed(() => paper.value?.status !== 'DRAFT');
  const summary = computed(() => computePaperScores(items.value));
  const basicPatch = computed(() => (paper.value ? diffPaperBasic(paper.value, basic.value) : {}));
  const dirty = computed(() => questionsDirty.value || Object.keys(basicPatch.value).length > 0);

  const apply = async (result: AdminPaperDto) => {
    const stems = await loadMaterialStems(result);
    paper.value = result;
    basic.value = toPaperBasicForm(result);
    sections.value = result.sections.map(section => ({ ...section }));
    items.value = fromAdminPaper(result, stems);
    questionsDirty.value = false;
  };

  const load = async (id: string) => {
    loading.value = true;
    try {
      await apply(await adminGetPaper(id, { disableDedup: true }));
    } finally {
      loading.value = false;
    }
  };

  const markDirty = () => {
    questionsDirty.value = true;
  };

  const addSection = (questionType: QuestionType = 'SINGLE') => {
    sections.value.push({ title: '', questionType });
    markDirty();
  };

  const deleteSection = (index: number) => {
    const next = removeSection(sections.value, items.value, index);
    sections.value = next.sections;
    items.value = next.items;
    markDirty();
  };

  /** 已在试卷中的题目跳过 */
  const addQuestions = (sectionIndex: number, questions: AdminQuestionDto[], score: number) => {
    const existing = new Set(items.value.map(item => item.questionId));
    const added = questions.filter(question => !existing.has(question.id));
    items.value.push(...added.map(question => fromQuestion(question, sectionIndex, score)));
    if (added.length) markDirty();
    return added.length;
  };

  const removeItem = (item: PaperItem) => {
    items.value = items.value.filter(candidate => candidate !== item);
    markDirty();
  };

  const move = (item: PaperItem, delta: -1 | 1) => {
    items.value = moveItem(items.value, item, delta);
    markDirty();
  };

  const validate = () => validatePaperItems(sections.value, items.value);

  /** 保存基本信息；草稿再整体保存分区、题目、顺序与分值 */
  const save = async () => {
    const current = paper.value;
    if (!current) return;
    if (!basic.value.title.trim()) throw new PaperValidationError(['请输入标题']);
    if (!frozen.value) {
      const errors = validate();
      if (errors.length) throw new PaperValidationError(errors);
    }
    saving.value = true;
    try {
      if (Object.keys(basicPatch.value).length) await adminUpdatePaper(current.id, basicPatch.value);
      if (!frozen.value && questionsDirty.value) {
        await adminSetPaperQuestions(current.id, toSetQuestionsDto(sections.value, items.value));
      }
      await load(current.id);
    } finally {
      saving.value = false;
    }
  };

  const publish = async () => {
    if (!paper.value) return;
    if (dirty.value) await save();
    await apply(await adminPublishPaper(paper.value.id));
  };

  const offline = async () => {
    if (!paper.value) return;
    await apply(await adminOfflinePaper(paper.value.id));
  };

  const copy = async (): Promise<AdminPaperDto | null> => (paper.value ? adminCopyPaper(paper.value.id) : null);

  const remove = async () => {
    if (paper.value) await adminDeletePaper(paper.value.id);
  };

  return {
    paper,
    basic,
    sections,
    items,
    loading,
    saving,
    frozen,
    summary,
    dirty,
    load,
    markDirty,
    addSection,
    deleteSection,
    addQuestions,
    removeItem,
    move,
    validate,
    save,
    publish,
    offline,
    copy,
    remove,
  };
}
