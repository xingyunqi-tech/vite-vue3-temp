import { reactive } from 'vue';
import { runAction } from '@/utils/actions';

/** 行内写操作：同一行执行中时忽略重复触发，不同行互不影响 */
export function useRowAction() {
  const actingIds = reactive(new Set<string | number>());
  const isActing = (id: string | number) => actingIds.has(id);
  const run = async (id: string | number, task: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    if (actingIds.has(id)) return false;
    actingIds.add(id);
    try {
      return await runAction(task, successMessage);
    } finally {
      actingIds.delete(id);
    }
  };
  return { isActing, run };
}
