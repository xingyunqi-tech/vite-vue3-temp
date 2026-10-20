import { ref } from 'vue';
import {
  adminCreateExam,
  adminCreateSubject,
  adminDeleteExam,
  adminDeleteSubject,
  adminGetExams,
  adminOfflineExam,
  adminOfflineSubject,
  adminPublishExam,
  adminPublishSubject,
  adminUpdateExam,
  adminUpdateSubject,
  fetchAllSubjects,
} from '@/api';
import type {
  AdminGetExamsParams,
  ContentStatus,
  CreateExamDto,
  CreateSubjectDto,
  Exam,
  ExamCategory,
  Subject,
  UpdateExamDto,
  UpdateSubjectDto,
} from '@/api';
import { usePagedList } from '@/composables/usePagedList';

export interface ExamFilters {
  keyword: string;
  category: ExamCategory | '';
  status: ContentStatus | '';
}

export const createExamFilters = (): ExamFilters => ({ keyword: '', category: '', status: '' });

export function toExamQuery(filters: ExamFilters, page: number, limit: number): AdminGetExamsParams {
  const query: AdminGetExamsParams = { page, limit };
  const keyword = filters.keyword.trim();
  if (keyword) query.keyword = keyword;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  return query;
}

export const canPublish = (status: ContentStatus) => status !== 'PUBLISHED';
export const canOffline = (status: ContentStatus) => status === 'PUBLISHED';
export const canDelete = (status: ContentStatus) => status === 'DRAFT';

export function useExamList() {
  const list = usePagedList<ExamFilters, Exam>({
    createFilters: createExamFilters,
    fetchPage: (filters, page, limit) => adminGetExams(toExamQuery(filters, page, limit), { disableDedup: true }),
  });

  const save = async (id: string | null, dto: CreateExamDto | UpdateExamDto) => {
    if (id) await adminUpdateExam(id, dto);
    else await adminCreateExam(dto as CreateExamDto);
    await list.load();
  };

  const publish = async (exam: Exam) => {
    await adminPublishExam(exam.id);
    await list.load();
  };

  const offline = async (exam: Exam) => {
    await adminOfflineExam(exam.id);
    await list.load();
  };

  const remove = async (exam: Exam) => {
    await adminDeleteExam(exam.id);
    await list.refresh();
  };

  return { ...list, save, publish, offline, remove };
}

export function useSubjectList() {
  const subjects = ref<Subject[]>([]);
  const loading = ref(false);
  let examId = '';
  let requestSeq = 0;

  const load = async (id: string = examId) => {
    examId = id;
    const seq = ++requestSeq;
    if (!id) {
      subjects.value = [];
      return;
    }
    loading.value = true;
    try {
      const result = await fetchAllSubjects(id);
      if (seq === requestSeq) subjects.value = [...result].sort((a, b) => a.sort - b.sort);
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  const save = async (id: string | null, dto: Omit<CreateSubjectDto, 'examId'> | UpdateSubjectDto) => {
    if (id) await adminUpdateSubject(id, dto);
    else await adminCreateSubject({ ...(dto as Omit<CreateSubjectDto, 'examId'>), examId });
    await load();
  };

  const publish = async (subject: Subject) => {
    await adminPublishSubject(subject.id);
    await load();
  };

  const offline = async (subject: Subject) => {
    await adminOfflineSubject(subject.id);
    await load();
  };

  const remove = async (subject: Subject) => {
    await adminDeleteSubject(subject.id);
    await load();
  };

  return { subjects, loading, load, save, publish, offline, remove };
}
