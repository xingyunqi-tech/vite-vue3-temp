import { describe, it, expect, vi } from 'vitest';
import { fetchAllExams, fetchAllSubjects, type Exam, type Subject } from '@/api';
import { useSubjectOptions } from '@/views/content/shared/useSubjectOptions';

vi.mock('@/api', () => ({
  fetchAllExams: vi.fn(),
  fetchAllSubjects: vi.fn(),
}));

describe('useSubjectOptions', () => {
  it('没有科目的考试置灰且不带子节点', async () => {
    vi.mocked(fetchAllExams).mockResolvedValue([
      { id: 'e1', name: '考试一' },
      { id: 'e2', name: '考试二' },
    ] as Exam[]);
    vi.mocked(fetchAllSubjects).mockResolvedValue([{ id: 's1', examId: 'e1', name: '科目一' }] as Subject[]);
    const { options, load } = useSubjectOptions();

    await load();

    expect(options.value).toEqual([
      { value: 'e1', label: '考试一', children: [{ value: 's1', label: '科目一' }] },
      { value: 'e2', label: '考试二（暂无科目）', disabled: true },
    ]);
  });
});
