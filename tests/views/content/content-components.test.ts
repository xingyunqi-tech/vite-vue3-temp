import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  adminGetDailyQuestionSets,
  adminGetSubjectKnowledgePoints,
  adminPreviewPaperRule,
  type KnowledgePointTreeNodeDto,
  type PaperRule,
} from '@/api';
import DailyPage from '@/views/content/daily/index.vue';
import PaperRuleDialog from '@/views/content/paper-rules/components/PaperRuleDialog.vue';
import PaperRulePreviewDialog from '@/views/content/paper-rules/components/PaperRulePreviewDialog.vue';
import KnowledgePointSelect from '@/views/content/shared/components/KnowledgePointSelect.vue';
import { invalidateKnowledgeTree } from '@/views/content/shared/knowledge-tree-cache';

vi.mock('@/api', () => ({
  adminGetDailyQuestionSets: vi.fn(),
  adminGetSubjectKnowledgePoints: vi.fn(),
  adminPreviewPaperRule: vi.fn(),
  adminRegenerateDailyQuestionSet: vi.fn(),
  fetchAllExams: vi.fn(async () => []),
  fetchAllSubjects: vi.fn(async () => []),
}));

const tree = (id: string): KnowledgePointTreeNodeDto[] => [
  {
    id,
    subjectId: 's',
    parentId: null,
    name: id,
    level: 1,
    sort: 0,
    path: `/${id}/`,
    isLeaf: true,
    questionCount: 0,
    createdAt: '',
    updatedAt: '',
    children: [],
  },
];

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  invalidateKnowledgeTree();
});

describe('KnowledgePointSelect', () => {
  it('同一科目的多个选择器共享一次请求', async () => {
    vi.mocked(adminGetSubjectKnowledgePoints).mockResolvedValue(tree('k1'));

    const first = mount(KnowledgePointSelect, { props: { subjectId: 's1', modelValue: [] } });
    const second = mount(KnowledgePointSelect, { props: { subjectId: 's1', modelValue: [] } });
    await flushPromises();

    expect(adminGetSubjectKnowledgePoints).toHaveBeenCalledTimes(1);
    expect(first.emitted('loaded')?.[0]).toEqual([tree('k1')]);
    expect(second.emitted('loaded')?.[0]).toEqual([tree('k1')]);
  });

  it('快速切换科目时丢弃过期的结果', async () => {
    const slow = deferred<KnowledgePointTreeNodeDto[]>();
    vi.mocked(adminGetSubjectKnowledgePoints).mockImplementation(id =>
      id === 's1' ? slow.promise : Promise.resolve(tree('k2')),
    );
    const wrapper = mount(KnowledgePointSelect, { props: { subjectId: 's1', modelValue: [] } });

    await wrapper.setProps({ subjectId: 's2' });
    await flushPromises();
    slow.resolve(tree('k1'));
    await flushPromises();

    expect(wrapper.emitted('loaded')).toEqual([[tree('k2')]]);
  });

  it('请求失败时不缓存，下次重新请求', async () => {
    vi.mocked(adminGetSubjectKnowledgePoints).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(tree('k1'));

    mount(KnowledgePointSelect, { props: { subjectId: 's1', modelValue: [] } });
    await flushPromises();
    mount(KnowledgePointSelect, { props: { subjectId: 's1', modelValue: [] } });
    await flushPromises();

    expect(adminGetSubjectKnowledgePoints).toHaveBeenCalledTimes(2);
  });
});

describe('PaperRuleDialog', () => {
  it('新建规则时切换科目清空各项已选知识点', async () => {
    vi.mocked(adminGetSubjectKnowledgePoints).mockResolvedValue([]);
    const wrapper = mount(PaperRuleDialog, {
      props: { modelValue: true, rule: null, subjectOptions: [], defaultSubjectId: 's1' },
    });
    await flushPromises();
    const select = wrapper.findComponent(KnowledgePointSelect);
    select.vm.$emit('update:modelValue', ['k1']);
    await flushPromises();
    expect(wrapper.findComponent(KnowledgePointSelect).props('modelValue')).toEqual(['k1']);

    wrapper.findComponent({ name: 'SubjectCascader' }).vm.$emit('update:modelValue', 's2');
    await flushPromises();

    expect(wrapper.findComponent(KnowledgePointSelect).props('modelValue')).toEqual([]);
  });
});

describe('PaperRulePreviewDialog', () => {
  it('重新生成时先清空旧结果', async () => {
    const rule = { id: 'r1', name: '规则', items: [] } as unknown as PaperRule;
    const second = deferred<never>();
    vi.mocked(adminPreviewPaperRule)
      .mockResolvedValueOnce({
        sections: [],
        questions: [],
        questionCount: 3,
        totalScore: 3,
        objectiveScore: 3,
        insufficient: [],
      })
      .mockReturnValueOnce(second.promise);
    const wrapper = mount(PaperRulePreviewDialog, { props: { modelValue: false, rule }, attachTo: document.body });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    expect(document.body.textContent).toContain('共 3 题');

    [...document.body.querySelectorAll('button')].find(button => button.textContent?.includes('重新生成'))!.click();
    await flushPromises();

    expect(document.body.textContent).not.toContain('共 3 题');
    wrapper.unmount();
  });
});

describe('每日一练页', () => {
  it('展开题组直接显示返回的题目摘要，过去的日期不可重新生成', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T04:00:00.000Z'));
    vi.mocked(adminGetDailyQuestionSets).mockResolvedValue([
      {
        id: 'd1',
        subjectId: 's1',
        date: '2026-10-17',
        questionIds: ['q1'],
        createdAt: '',
        updatedAt: '',
        questions: [{ id: 'q1', parentId: 'm1', type: 'SINGLE', stem: '今日题目', fileUrls: {} }],
      },
      {
        id: 'd0',
        subjectId: 's1',
        date: '2026-10-16',
        questionIds: [],
        createdAt: '',
        updatedAt: '',
        questions: [],
      },
    ]);
    const wrapper = mount(DailyPage);
    await flushPromises();
    wrapper.findComponent({ name: 'SubjectCascader' }).vm.$emit('update:modelValue', 's1');
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const rows = wrapper.findAll('.el-table__body tr.el-table__row');
    expect(rows[0].text()).toContain('重新生成');
    expect(rows[1].text()).toContain('已过期');
    await rows[0].find('.el-table__expand-icon').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('今日题目');
    expect(wrapper.text()).toContain('材料小题');
    vi.useRealTimers();
  });
});
