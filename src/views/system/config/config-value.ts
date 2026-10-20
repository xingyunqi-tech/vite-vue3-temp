import { EMPTY_TEXT } from '@/constants';
import type { RemoteConfigDefinition, RemoteConfigType } from '@/constants/remote-config';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export type ParseResult = { ok: true; value: unknown } | { ok: false; message: string };

export function formatConfigValue(type: RemoteConfigType, value: unknown): string {
  if (value === undefined || value === null) return EMPTY_TEXT;
  if (type === 'boolean') return value ? '开启' : '关闭';
  if (type === 'json') return JSON.stringify(value);
  return String(value);
}

/** 配置值转为编辑控件的初始草稿：json 为格式化文本，其余为原值或类型默认值 */
export function toDraft(definition: RemoteConfigDefinition, value: unknown): unknown {
  const current = value ?? definition.defaultValue;
  switch (definition.type) {
    case 'boolean':
      return typeof current === 'boolean' ? current : false;
    case 'number':
      return typeof current === 'number' ? current : undefined;
    case 'string':
      return typeof current === 'string' ? current : '';
    case 'json':
      return current === undefined ? '{}' : JSON.stringify(current, null, 2);
  }
}

export function parseDraft(type: RemoteConfigType, draft: unknown): ParseResult {
  switch (type) {
    case 'boolean':
      return typeof draft === 'boolean' ? { ok: true, value: draft } : { ok: false, message: '请选择开关状态' };
    case 'number':
      return typeof draft === 'number' && Number.isFinite(draft)
        ? { ok: true, value: draft }
        : { ok: false, message: '请输入数字' };
    case 'string': {
      const text = typeof draft === 'string' ? draft.trim() : '';
      return text ? { ok: true, value: text } : { ok: false, message: '请输入内容' };
    }
    case 'json': {
      if (typeof draft !== 'string' || !draft.trim()) return { ok: false, message: '请输入 JSON' };
      let value: unknown;
      try {
        value = JSON.parse(draft);
      } catch {
        return { ok: false, message: 'JSON 格式不正确' };
      }
      return isPlainObject(value) ? { ok: true, value } : { ok: false, message: 'JSON 须为对象' };
    }
  }
}
