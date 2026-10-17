/**
 * 远程配置读写，配置值统一存为 `{ value: <配置值> }`
 */

import { isAxiosError } from 'axios';
import { getConfigAsAdmin, upsertConfig } from '../generated/config/config';
import type { Config } from '../generated/model';

const NOT_FOUND = 404;

/** 读取配置（管理员），未写入且无默认值时返回 null */
export async function fetchRemoteConfig(key: string): Promise<Config | null> {
  try {
    return await getConfigAsAdmin(encodeURIComponent(key), { isIgnoreToast: true });
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === NOT_FOUND) return null;
    throw error;
  }
}

export function saveRemoteConfig(key: string, value: unknown): Promise<Config> {
  return upsertConfig(encodeURIComponent(key), { value: { value } });
}

export function readRemoteConfigValue(config: Config | null | undefined): unknown {
  if (!config?.value || !Object.prototype.hasOwnProperty.call(config.value, 'value')) return undefined;
  return config.value.value;
}
