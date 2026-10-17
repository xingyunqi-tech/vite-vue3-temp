import { usePagedList } from '../shared/usePagedList';
import { toPaperRuleDto, type PaperRuleForm } from './paper-rule-form';
import { adminCreatePaperRule, adminDeletePaperRule, adminGetPaperRules, adminUpdatePaperRule } from '@/api';
import type { AdminGetPaperRulesParams, ContentStatus, PaperRule } from '@/api';

export interface PaperRuleFilters {
  subjectId: string;
  status: ContentStatus | '';
  keyword: string;
}

export const createPaperRuleFilters = (): PaperRuleFilters => ({ subjectId: '', status: '', keyword: '' });

export function toPaperRuleQuery(filters: PaperRuleFilters, page: number, limit: number): AdminGetPaperRulesParams {
  const query: AdminGetPaperRulesParams = { page, limit };
  const keyword = filters.keyword.trim();
  if (keyword) query.keyword = keyword;
  if (filters.subjectId) query.subjectId = filters.subjectId;
  if (filters.status) query.status = filters.status;
  return query;
}

export function usePaperRules() {
  const list = usePagedList<PaperRuleFilters, PaperRule>({
    createFilters: createPaperRuleFilters,
    fetchPage: (filters, page, limit) =>
      adminGetPaperRules(toPaperRuleQuery(filters, page, limit), { disableDedup: true }),
  });

  const save = async (id: string | null, form: PaperRuleForm): Promise<PaperRule> => {
    const { subjectId, ...dto } = toPaperRuleDto(form);
    const saved = id ? await adminUpdatePaperRule(id, dto) : await adminCreatePaperRule({ subjectId, ...dto });
    await list.load();
    return saved;
  };

  const setStatus = async (rule: PaperRule, status: ContentStatus) => {
    await adminUpdatePaperRule(rule.id, { status });
    await list.load();
  };

  const remove = async (rule: PaperRule) => {
    await adminDeletePaperRule(rule.id);
    await list.refresh();
  };

  return { ...list, save, setStatus, remove };
}
