import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchRemoteConfig, saveRemoteConfig } from '@/api';
import type { RemoteConfigDefinition } from '@/constants/remote-config';
import { useRemoteConfig } from '@/views/system/config/useRemoteConfig';

vi.mock('@/api', async () => {
  const { readRemoteConfigValue } = await import('@/api/modules/remote-config');
  return { fetchRemoteConfig: vi.fn(), saveRemoteConfig: vi.fn(), readRemoteConfigValue };
});

const definitions: RemoteConfigDefinition[] = [
  { key: 'wrongBook.masterThreshold', type: 'number', defaultValue: 3, isPublic: true, description: '' },
  { key: 'ai.model', type: 'string', isPublic: false, description: '' },
  { key: 'ai.enabled', type: 'boolean', defaultValue: true, isPublic: true, description: '' },
];

const stored = (key: string, value: unknown, at: string | null = '2026-10-01T00:00:00.000Z') => ({
  key,
  value: { value },
  isPublic: true,
  createdAt: at,
  updatedAt: at,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRemoteConfig', () => {
  it('加载各配置项：已写入、默认值、未设置、读取失败', async () => {
    vi.mocked(fetchRemoteConfig).mockImplementation(async key => {
      if (key === 'wrongBook.masterThreshold') return stored(key, 4);
      if (key === 'ai.model') return null;
      throw new Error('boom');
    });
    const { rows, load, loading } = useRemoteConfig(definitions);

    const pending = load();
    expect(loading.value).toBe(true);
    await pending;

    expect(loading.value).toBe(false);
    expect(rows.value.map(({ key, value, stored, loadFailed }) => ({ key, value, stored, loadFailed }))).toEqual([
      { key: 'wrongBook.masterThreshold', value: 4, stored: true, loadFailed: false },
      { key: 'ai.model', value: undefined, stored: false, loadFailed: false },
      { key: 'ai.enabled', value: undefined, stored: false, loadFailed: true },
    ]);
  });

  it('未写入的登记项展示后端返回的默认值', async () => {
    vi.mocked(fetchRemoteConfig).mockResolvedValue(stored('wrongBook.masterThreshold', 3, null));
    const { rows, load } = useRemoteConfig(definitions.slice(0, 1));

    await load();

    expect(rows.value[0]).toMatchObject({ value: 3, stored: false, updatedAt: null });
  });

  it('保存后以接口返回更新该行', async () => {
    vi.mocked(fetchRemoteConfig).mockResolvedValue(null);
    vi.mocked(saveRemoteConfig).mockResolvedValueOnce(stored('wrongBook.masterThreshold', 5));
    const { rows, load, save } = useRemoteConfig(definitions);
    await load();

    await save('wrongBook.masterThreshold', 5);

    expect(saveRemoteConfig).toHaveBeenCalledWith('wrongBook.masterThreshold', 5);
    expect(rows.value[0]).toMatchObject({ value: 5, stored: true, updatedAt: '2026-10-01T00:00:00.000Z' });
  });

  it('保存失败时保持原值并抛出', async () => {
    vi.mocked(fetchRemoteConfig).mockResolvedValue(stored('wrongBook.masterThreshold', 4));
    vi.mocked(saveRemoteConfig).mockRejectedValueOnce(new Error('denied'));
    const { rows, load, save } = useRemoteConfig(definitions.slice(0, 1));
    await load();

    await expect(save('wrongBook.masterThreshold', 9)).rejects.toThrow('denied');
    expect(rows.value[0].value).toBe(4);
  });
});
