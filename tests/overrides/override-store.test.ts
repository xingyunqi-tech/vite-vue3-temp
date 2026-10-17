import { createPinia, defineStore, setActivePinia } from 'pinia';
import { describe, it, expect } from 'vitest';
import { computed, createApp, ref } from 'vue';
import { storeManager } from '@/plugins/override/override-store';

const useCounterStore = defineStore('override-store-counter', () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  const inc = () => {
    count.value++;
  };
  return { count, double, inc };
});

describe('Store 覆盖', () => {
  it('覆盖函数读到实时状态，并调用覆盖前的原实现', () => {
    const seen: Array<[number, number]> = [];
    storeManager.register({
      overrides: {
        'override-store-counter': store => ({
          inc() {
            seen.push([store.count, store.double]);
            store.inc();
          },
        }),
      },
    });

    const pinia = createPinia();
    pinia.use(storeManager.createPlugin());
    createApp({}).use(pinia);
    setActivePinia(pinia);

    const store = useCounterStore();
    store.inc();
    store.inc();
    store.inc();

    expect(store.count).toBe(3);
    expect(seen).toEqual([
      [0, 0],
      [1, 2],
      [2, 4],
    ]);
  });
});
