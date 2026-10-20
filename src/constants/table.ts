/** 列表页通用：分页、状态标签与下拉选项 */

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZES = [10, 20, 50, 100];

/** 空值占位 */
export const EMPTY_TEXT = '—';

export type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger';

export interface StatusMeta {
  label: string;
  tag: TagType;
}

export function toOptions<K extends string>(labels: Record<K, string>): { label: string; value: K }[] {
  return (Object.keys(labels) as K[]).map(value => ({ label: labels[value], value }));
}

export function toStatusOptions<K extends string>(meta: Record<K, StatusMeta>): { label: string; value: K }[] {
  return (Object.keys(meta) as K[]).map(value => ({ label: meta[value].label, value }));
}

const hasKey = <K extends string>(record: Record<K, unknown>, key: string): key is K => Object.hasOwn(record, key);

export function statusMeta<K extends string>(meta: Record<K, StatusMeta>, status: string): StatusMeta {
  return hasKey(meta, status) ? meta[status] : { label: status, tag: 'info' };
}
