import { AxiosError, type AxiosResponse } from 'axios';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfigAsAdmin, upsertConfig } from '@/api/generated/config/config';
import { fetchRemoteConfig, readRemoteConfigValue, saveRemoteConfig } from '@/api/modules/remote-config';

vi.mock('@/api/generated/config/config', () => ({
  getConfigAsAdmin: vi.fn(),
  upsertConfig: vi.fn(),
}));

const httpError = (status: number) =>
  new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, null, { status } as AxiosResponse);

const config = (value: Record<string, unknown>) => ({
  key: 'wrongBook.masterThreshold',
  value,
  isPublic: true,
  createdAt: null,
  updatedAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchRemoteConfig', () => {
  it('以管理员接口静默读取', async () => {
    vi.mocked(getConfigAsAdmin).mockResolvedValueOnce(config({ value: 3 }));

    await expect(fetchRemoteConfig('wrongBook.masterThreshold')).resolves.toMatchObject({ value: { value: 3 } });
    expect(getConfigAsAdmin).toHaveBeenCalledWith('wrongBook.masterThreshold', { isIgnoreToast: true });
  });

  it('404 时返回 null', async () => {
    vi.mocked(getConfigAsAdmin).mockRejectedValueOnce(httpError(404));
    await expect(fetchRemoteConfig('ai.model')).resolves.toBeNull();
  });

  it('其他错误原样抛出', async () => {
    vi.mocked(getConfigAsAdmin).mockRejectedValueOnce(httpError(500));
    await expect(fetchRemoteConfig('ai.model')).rejects.toThrow('failed');
  });
});

describe('saveRemoteConfig', () => {
  it('配置值包在 value 字段里写入', async () => {
    vi.mocked(upsertConfig).mockResolvedValueOnce(config({ value: 5 }));

    await saveRemoteConfig('wrongBook.masterThreshold', 5);

    expect(upsertConfig).toHaveBeenCalledWith('wrongBook.masterThreshold', { value: { value: 5 } });
  });
});

describe('readRemoteConfigValue', () => {
  it('取出 value.value，没有时为 undefined', () => {
    expect(readRemoteConfigValue(config({ value: false }))).toBe(false);
    expect(readRemoteConfigValue(config({ other: 1 }))).toBeUndefined();
    expect(readRemoteConfigValue(null)).toBeUndefined();
  });
});
