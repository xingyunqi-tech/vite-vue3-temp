import { ref } from 'vue';
import { checkAgreementContent, sanitizeAgreementHtml } from './agreement-html';
import { fetchRemoteConfig, readRemoteConfigValue, saveRemoteConfig } from '@/api';
import type { Config } from '@/api';
import type { AgreementDocument } from '@/constants/agreement';

const readString = (config: Config | null): string | undefined => {
  const value = readRemoteConfigValue(config);
  return typeof value === 'string' ? value : undefined;
};

/** 正文已写入、版本号写入失败 */
export class AgreementVersionSaveError extends Error {
  constructor(
    readonly content: string,
    cause: unknown,
  ) {
    super('版本号写入失败', { cause });
    this.name = 'AgreementVersionSaveError';
  }
}

export function useAgreement(agreement: AgreementDocument) {
  const content = ref('');
  const version = ref<string>();
  const updatedAt = ref<string | null>(null);
  const configured = ref(false);
  const loading = ref(false);
  const loadFailed = ref(false);
  const saving = ref(false);

  const load = async () => {
    loading.value = true;
    loadFailed.value = false;
    try {
      const [contentConfig, versionConfig] = await Promise.all([
        fetchRemoteConfig(agreement.contentKey),
        fetchRemoteConfig(agreement.versionKey),
      ]);
      const html = readString(contentConfig);
      content.value = html ?? '';
      configured.value = html !== undefined;
      updatedAt.value = contentConfig?.updatedAt ?? null;
      version.value = readString(versionConfig);
    } catch {
      loadFailed.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 净化后写入正文，传入 nextVersion 时随后写入版本号；返回写入的正文，版本号写入失败时抛出 AgreementVersionSaveError */
  const save = async (html: string, nextVersion?: string): Promise<string> => {
    const sanitized = sanitizeAgreementHtml(html);
    const invalid = checkAgreementContent(sanitized);
    if (invalid) throw new Error(invalid);
    saving.value = true;
    try {
      const saved = await saveRemoteConfig(agreement.contentKey, sanitized);
      content.value = readString(saved) ?? sanitized;
      configured.value = true;
      updatedAt.value = saved.updatedAt;
      if (nextVersion !== undefined) {
        try {
          const savedVersion = await saveRemoteConfig(agreement.versionKey, nextVersion.trim());
          version.value = readString(savedVersion);
        } catch (error) {
          throw new AgreementVersionSaveError(content.value, error);
        }
      }
      return content.value;
    } finally {
      saving.value = false;
    }
  };

  return { content, version, updatedAt, configured, loading, loadFailed, saving, load, save };
}
