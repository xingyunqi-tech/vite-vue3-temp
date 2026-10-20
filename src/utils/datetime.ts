/**
 * 日期处理相关工具函数
 * 基于 dayjs（已全局配置）提供日期格式化功能
 */

import type { ConfigType } from 'dayjs';
// 从 @/plugins/dayjs 引入而非裸 dayjs：formatRelativeTime 用的 fromNow 来自 relativeTime 插件，
// 裸引用能通过类型检查，但运行期是否可用取决于插件模块有没有先被加载过。
import { EMPTY_TEXT } from '@/constants';
import dayjs from '@/plugins/dayjs';

/**
 * 格式化日期为指定格式的字符串
 * @param date - 要格式化的日期（支持 Date、string、number、dayjs 等）
 * @param fmt - dayjs 格式化模板，如 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串，输入无效时返回空值占位
 */
export function formatDate(date: ConfigType, fmt: string): string {
  if (!date) return EMPTY_TEXT;
  const d = dayjs(date);
  if (!d.isValid()) return EMPTY_TEXT;
  return d.format(fmt);
}

/**
 * 格式化日期字符串为 YYYY-MM-DD 格式
 * @param dateString - 日期字符串
 * @returns 格式化后的日期字符串，如果输入为空则返回空值占位
 * @example
 * formatDateShort('2025-01-15T10:30:00') // '2025-01-15'
 */
export function formatDateShort(dateString?: string): string {
  if (!dateString) return EMPTY_TEXT;
  const d = dayjs(dateString);
  if (!d.isValid()) return EMPTY_TEXT;
  return d.format('YYYY-MM-DD');
}

/**
 * 格式化日期字符串为 YYYY-MM-DD HH:mm 格式
 * @param dateString - 日期字符串
 * @returns 格式化后的日期时间字符串，如果输入为空则返回空值占位
 * @example
 * formatDateTime('2025-01-15T10:30:00') // '2025-01-15 10:30'
 */
export function formatDateTime(dateString?: string): string {
  if (!dateString) return EMPTY_TEXT;
  const d = dayjs(dateString);
  if (!d.isValid()) return EMPTY_TEXT;
  return d.format('YYYY-MM-DD HH:mm');
}

/**
 * 格式化日期字符串为 YYYY-MM-DD HH:mm:ss 格式
 * @param dateString - 日期字符串
 * @returns 格式化后的日期时间字符串，如果输入为空则返回空值占位
 * @example
 * formatDateTimeFull('2025-01-15T10:30:45') // '2025-01-15 10:30:45'
 */
export function formatDateTimeFull(dateString?: string): string {
  if (!dateString) return EMPTY_TEXT;
  const d = dayjs(dateString);
  if (!d.isValid()) return EMPTY_TEXT;
  return d.format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 格式化日期字符串为相对时间
 * @param dateString - 日期字符串
 * @returns 相对时间字符串，如 '2小时前'、'3天前'
 * @example
 * formatRelativeTime('2025-01-15T10:00:00') // '2小时前'
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return EMPTY_TEXT;
  const d = dayjs(dateString);
  if (!d.isValid()) return EMPTY_TEXT;
  return d.fromNow();
}

/**
 * 格式化日期范围
 * @param startTime - 开始时间
 * @param endTime - 结束时间
 * @param format - 格式化模式，'short' 使用 YYYY-MM-DD，'datetime' 使用 YYYY-MM-DD HH:mm
 * @returns 格式化后的日期范围字符串
 * @example
 * formatDateRange('2025-01-15', '2025-01-20') // '2025-01-15 ~ 2025-01-20'
 */
export function formatDateRange(startTime?: string, endTime?: string, format: 'short' | 'datetime' = 'short'): string {
  if (!startTime || !endTime) return EMPTY_TEXT;
  const formatter = format === 'datetime' ? formatDateTime : formatDateShort;
  return `${formatter(startTime)} ~ ${formatter(endTime)}`;
}

/**
 * 格式化人员列表
 * @param list - 包含 name 属性的对象数组
 * @param separator - 分隔符，默认为 '、'
 * @returns 格式化后的名字字符串
 * @example
 * formatNameList([{ name: '张三' }, { name: '李四' }]) // '张三、李四'
 */
export function formatNameList(list?: { name?: string }[], separator = '、'): string {
  if (!list || list.length === 0) return EMPTY_TEXT;
  return list
    .map(item => item.name)
    .filter(Boolean)
    .join(separator);
}

/**
 * 格式化文件大小
 *
 * 0 是合法大小（空文件），按 '0 B' 输出；只有缺失或非法值才返回空值占位，与本文件其余 formatter 口径一致。
 * 输出格式与 plugins/site-config 的 formatBytes 对齐——那边不复用本函数，是为了不把 dayjs 带进配置内核。
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串，输入无效时返回空值占位
 * @example
 * formatFileSize(0) // '0 B'
 * formatFileSize(1024) // '1.0 KB'
 * formatFileSize(1048576) // '1.0 MB'
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) return EMPTY_TEXT;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
