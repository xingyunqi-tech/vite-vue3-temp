import { ref } from 'vue';
import { fetchRemoteConfig, readRemoteConfigValue, saveRemoteConfig } from '@/api';
import type { Config } from '@/api';
import { REMOTE_CONFIG_DEFINITIONS, type RemoteConfigDefinition } from '@/constants/remote-config';

export interface RemoteConfigRow extends RemoteConfigDefinition {
  /** 生效值：已写入的值，未写入时为后端返回的默认值 */
  value: unknown;
  /** 是否已写入过（未写入时后端返回默认值且时间为 null） */
  stored: boolean;
  updatedAt: string | null;
  loadFailed: boolean;
}

function toRow(definition: RemoteConfigDefinition, config: Config | null): RemoteConfigRow {
  return {
    ...definition,
    value: readRemoteConfigValue(config),
    stored: !!config?.createdAt,
    updatedAt: config?.updatedAt ?? null,
    loadFailed: false,
  };
}

export function useRemoteConfig(definitions: readonly RemoteConfigDefinition[] = REMOTE_CONFIG_DEFINITIONS) {
  const rows = ref<RemoteConfigRow[]>(definitions.map(definition => toRow(definition, null)));
  const loading = ref(false);

  const load = async () => {
    loading.value = true;
    try {
      const results = await Promise.allSettled(definitions.map(definition => fetchRemoteConfig(definition.key)));
      rows.value = definitions.map((definition, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') return toRow(definition, result.value);
        return { ...toRow(definition, null), loadFailed: true };
      });
    } finally {
      loading.value = false;
    }
  };

  const save = async (key: string, value: unknown) => {
    const config = await saveRemoteConfig(key, value);
    const index = rows.value.findIndex(row => row.key === key);
    if (index === -1) return;
    rows.value[index] = toRow(rows.value[index], config);
  };

  return { rows, loading, load, save };
}
