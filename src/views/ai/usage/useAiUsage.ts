import { computed, ref } from 'vue';
import { defaultUsageRange, groupUsage, sumUsage, type UsageRange } from './usage-stats';
import { adminGetAiUsage } from '@/api';
import type { AiUsageDto } from '@/api';

export function useAiUsage() {
  const range = ref<UsageRange>(defaultUsageRange());
  const usage = ref<AiUsageDto | null>(null);
  /** 当前结果对应的查询区间，供按日补齐使用 */
  const loadedRange = ref<UsageRange | null>(null);
  const loading = ref(false);
  const error = ref(false);
  let requestSeq = 0;

  const items = computed(() => usage.value?.items ?? []);
  const total = computed(() => sumUsage(usage.value ? [usage.value.total] : []));
  const byDate = computed(() => groupUsage(items.value, 'date', loadedRange.value ?? undefined));
  const byModel = computed(() => groupUsage(items.value, 'model'));
  const byKind = computed(() => groupUsage(items.value, 'kind'));

  const load = async () => {
    const seq = ++requestSeq;
    const [from, to] = range.value;
    loading.value = true;
    try {
      const result = await adminGetAiUsage({ from, to }, { disableDedup: true });
      if (seq !== requestSeq) return;
      usage.value = result ?? null;
      loadedRange.value = [from, to];
      error.value = false;
    } catch (reason) {
      if (seq !== requestSeq) return;
      usage.value = null;
      loadedRange.value = null;
      error.value = true;
      throw reason;
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  return { range, usage, items, total, byDate, byModel, byKind, loading, error, load };
}
