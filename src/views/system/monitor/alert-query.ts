import type { AdminAlertLevel, GetMonitorAlertsParams } from '@/api';
import type { StatusMeta } from '@/constants';

export type AckStatus = 'all' | 'unacknowledged' | 'acknowledged';

export interface AlertFilters {
  status: AckStatus;
  level: AdminAlertLevel | '';
  type: string;
}

export const ACK_STATUS_OPTIONS: { label: string; value: AckStatus }[] = [
  { label: '未确认', value: 'unacknowledged' },
  { label: '已确认', value: 'acknowledged' },
  { label: '全部', value: 'all' },
];

export const ALERT_LEVEL_META: Record<AdminAlertLevel, StatusMeta> = {
  INFO: { label: '提示', tag: 'info' },
  WARN: { label: '警告', tag: 'warning' },
  CRITICAL: { label: '严重', tag: 'danger' },
};

export const createAlertFilters = (): AlertFilters => ({ status: 'unacknowledged', level: '', type: '' });

/** 筛选条件转为告警列表查询参数，空条件不传 */
export function toAlertQuery(filters: AlertFilters, page: number, limit: number): GetMonitorAlertsParams {
  const query: GetMonitorAlertsParams = { page, limit };
  if (filters.status !== 'all') query.acknowledged = filters.status === 'acknowledged';
  if (filters.level) query.level = filters.level;
  const type = filters.type.trim();
  if (type) query.type = type;
  return query;
}
