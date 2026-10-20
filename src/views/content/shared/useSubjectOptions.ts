import { computed, ref } from 'vue';
import { fetchAllExams, fetchAllSubjects } from '@/api';
import type { Exam, Subject } from '@/api';

export interface SubjectOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: SubjectOption[];
}

export function useSubjectOptions() {
  const exams = ref<Exam[]>([]);
  const subjects = ref<Subject[]>([]);
  const loading = ref(false);

  const load = async () => {
    loading.value = true;
    try {
      [exams.value, subjects.value] = await Promise.all([fetchAllExams(), fetchAllSubjects()]);
    } finally {
      loading.value = false;
    }
  };

  /** 没有科目的考试置灰，避免被当作叶子选中 */
  const options = computed<SubjectOption[]>(() =>
    exams.value.map(exam => {
      const children = subjects.value
        .filter(subject => subject.examId === exam.id)
        .map(subject => ({ value: subject.id, label: subject.name }));
      return children.length
        ? { value: exam.id, label: exam.name, children }
        : { value: exam.id, label: `${exam.name}（暂无科目）`, disabled: true };
    }),
  );

  /** 「考试 / 科目」名称 */
  const subjectLabel = (subjectId: string | null | undefined) => {
    const subject = subjects.value.find(item => item.id === subjectId);
    if (!subject) return '';
    const exam = exams.value.find(item => item.id === subject.examId);
    return exam ? `${exam.name} / ${subject.name}` : subject.name;
  };

  return { exams, subjects, options, loading, load, subjectLabel };
}
