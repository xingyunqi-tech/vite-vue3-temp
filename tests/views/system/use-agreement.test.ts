import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchRemoteConfig, saveRemoteConfig } from '@/api';
import { AGREEMENT_DOCUMENTS } from '@/constants/agreement';
import { AgreementVersionSaveError, useAgreement } from '@/views/system/agreement/useAgreement';

vi.mock('@/api', async () => {
  const { readRemoteConfigValue } = await import('@/api/modules/remote-config');
  return { fetchRemoteConfig: vi.fn(), saveRemoteConfig: vi.fn(), readRemoteConfigValue };
});

const userAgreement = AGREEMENT_DOCUMENTS[0];

const stored = (key: string, value: unknown, at = '2026-10-01T00:00:00.000Z') => ({
  key,
  value: { value },
  isPublic: true,
  createdAt: at,
  updatedAt: at,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAgreement', () => {
  it('读取正文、更新时间与对应版本号', async () => {
    vi.mocked(fetchRemoteConfig).mockImplementation(async key =>
      key === 'agreement.userAgreement' ? stored(key, '<p>条款</p>') : stored(key, '1.2'),
    );
    const { content, version, updatedAt, configured, load } = useAgreement(userAgreement);

    await load();

    expect(fetchRemoteConfig).toHaveBeenCalledWith('agreement.userAgreement');
    expect(fetchRemoteConfig).toHaveBeenCalledWith('consent.userAgreementVersion');
    expect(content.value).toBe('<p>条款</p>');
    expect(version.value).toBe('1.2');
    expect(updatedAt.value).toBe('2026-10-01T00:00:00.000Z');
    expect(configured.value).toBe(true);
  });

  it('未配置（404）时正文为空且标记为未配置', async () => {
    vi.mocked(fetchRemoteConfig).mockResolvedValue(null);
    const { content, version, updatedAt, configured, loadFailed, load } = useAgreement(userAgreement);

    await load();

    expect(content.value).toBe('');
    expect(version.value).toBeUndefined();
    expect(updatedAt.value).toBeNull();
    expect(configured.value).toBe(false);
    expect(loadFailed.value).toBe(false);
  });

  it('读取出错时标记读取失败', async () => {
    vi.mocked(fetchRemoteConfig).mockRejectedValue(new Error('boom'));
    const { loadFailed, loading, load } = useAgreement(userAgreement);

    await load();

    expect(loadFailed.value).toBe(true);
    expect(loading.value).toBe(false);
  });

  it('保存时提交净化后的正文，不改版本号', async () => {
    vi.mocked(saveRemoteConfig).mockImplementation(async (key, value) =>
      stored(key, value, '2026-10-18T00:00:00.000Z'),
    );
    const { content, configured, updatedAt, save } = useAgreement(userAgreement);

    const saved = await save('<p onclick="x()">条款</p><script>alert(1)</script><img src="a.png">');

    expect(saveRemoteConfig).toHaveBeenCalledTimes(1);
    expect(saveRemoteConfig).toHaveBeenCalledWith('agreement.userAgreement', '<p>条款</p>');
    expect(saved).toBe('<p>条款</p>');
    expect(content.value).toBe('<p>条款</p>');
    expect(configured.value).toBe(true);
    expect(updatedAt.value).toBe('2026-10-18T00:00:00.000Z');
  });

  it('保存并升级版本时先写正文再写版本号', async () => {
    vi.mocked(saveRemoteConfig).mockImplementation(async (key, value) => stored(key, value));
    const { version, save } = useAgreement(AGREEMENT_DOCUMENTS[2]);

    await save('<p>AI 声明</p>', ' 2.1 ');

    expect(vi.mocked(saveRemoteConfig).mock.calls).toEqual([
      ['agreement.aiService', '<p>AI 声明</p>'],
      ['consent.aiServiceVersion', '2.1'],
    ]);
    expect(version.value).toBe('2.1');
  });

  it('正文为空时不提交', async () => {
    const { save } = useAgreement(userAgreement);

    await expect(save('<p><br></p>')).rejects.toThrow('请输入协议正文');
    expect(saveRemoteConfig).not.toHaveBeenCalled();
  });

  it('正文保存失败时不写版本号并抛出', async () => {
    vi.mocked(saveRemoteConfig).mockRejectedValueOnce(new Error('denied'));
    const { saving, save } = useAgreement(userAgreement);

    await expect(save('<p>条款</p>', '1.1')).rejects.toThrow('denied');
    expect(saveRemoteConfig).toHaveBeenCalledTimes(1);
    expect(saving.value).toBe(false);
  });

  it('正文超过 250KB 时不提交', async () => {
    const { save } = useAgreement(userAgreement);

    await expect(save(`<p>${'a'.repeat(250 * 1024)}</p>`)).rejects.toThrow('协议正文超过 250KB');
    expect(saveRemoteConfig).not.toHaveBeenCalled();
  });

  it('正文写入成功但版本号写入失败时抛出可识别错误，正文状态已更新', async () => {
    vi.mocked(saveRemoteConfig)
      .mockImplementationOnce(async (key, value) => stored(key, value, '2026-10-18T00:00:00.000Z'))
      .mockRejectedValueOnce(new Error('denied'));
    const { content, version, configured, updatedAt, saving, save } = useAgreement(userAgreement);
    version.value = '1.0';

    const error = await save('<p>新条款</p>', '1.1').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AgreementVersionSaveError);
    expect((error as AgreementVersionSaveError).content).toBe('<p>新条款</p>');
    expect((error as AgreementVersionSaveError).cause).toEqual(new Error('denied'));
    expect(content.value).toBe('<p>新条款</p>');
    expect(configured.value).toBe(true);
    expect(updatedAt.value).toBe('2026-10-18T00:00:00.000Z');
    expect(version.value).toBe('1.0');
    expect(saving.value).toBe(false);
  });
});
