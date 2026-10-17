import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatDateTimeFull,
  formatDateRange,
  formatNameList,
  formatFileSize,
  formatRelativeTime,
} from '@/utils/datetime';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('应该正确格式化完整日期时间', () => {
      const result = formatDate('2024-01-15 13:45:30', 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe('2024-01-15 13:45:30');
    });

    it('空值应返回 -', () => {
      expect(formatDate(null, 'YYYY-MM-DD')).toBe('-');
      expect(formatDate(undefined, 'YYYY-MM-DD')).toBe('-');
      expect(formatDate('', 'YYYY-MM-DD')).toBe('-');
    });

    it('无效日期应返回 -', () => {
      expect(formatDate('invalid-date', 'YYYY-MM-DD')).toBe('-');
    });
  });

  describe('formatDateShort', () => {
    it('应该格式化为 YYYY-MM-DD', () => {
      expect(formatDateShort('2025-01-15T10:30:00')).toBe('2025-01-15');
    });

    it('空值应返回 -', () => {
      expect(formatDateShort()).toBe('-');
      expect(formatDateShort('')).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('应该格式化为 YYYY-MM-DD HH:mm', () => {
      expect(formatDateTime('2025-01-15T10:30:00')).toBe('2025-01-15 10:30');
    });

    it('空值应返回 -', () => {
      expect(formatDateTime()).toBe('-');
    });
  });

  describe('formatDateTimeFull', () => {
    it('应该格式化为 YYYY-MM-DD HH:mm:ss', () => {
      expect(formatDateTimeFull('2025-01-15T10:30:45')).toBe('2025-01-15 10:30:45');
    });

    it('空值应返回 -', () => {
      expect(formatDateTimeFull()).toBe('-');
    });
  });

  describe('formatDateRange', () => {
    it('应该格式化日期范围（short）', () => {
      expect(formatDateRange('2025-01-15', '2025-01-20')).toBe('2025-01-15 ~ 2025-01-20');
    });

    it('应该格式化日期范围（datetime）', () => {
      expect(formatDateRange('2025-01-15T10:00:00', '2025-01-20T18:00:00', 'datetime')).toBe(
        '2025-01-15 10:00 ~ 2025-01-20 18:00',
      );
    });

    it('缺少参数应返回 -', () => {
      expect(formatDateRange()).toBe('-');
      expect(formatDateRange('2025-01-15')).toBe('-');
    });
  });

  describe('formatNameList', () => {
    it('应该格式化名字列表', () => {
      expect(formatNameList([{ name: '张三' }, { name: '李四' }])).toBe('张三、李四');
    });

    it('应该支持自定义分隔符', () => {
      expect(formatNameList([{ name: '张三' }, { name: '李四' }], ', ')).toBe('张三, 李四');
    });

    it('空列表应返回 -', () => {
      expect(formatNameList([])).toBe('-');
      expect(formatNameList()).toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    // 相对时间的语言取决于 dayjs 的当前 locale，而这条依赖链上只有 @/plugins/dayjs，
    // 没有 App.vue 的语言 watcher——等同于关闭国际化特性后的形态。
    it('未经 App.vue 也应输出中文相对时间', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = formatRelativeTime(twoHoursAgo);
      expect(result).toContain('小时');
      expect(result.endsWith('前')).toBe(true);
    });

    it('空值或无效值应返回 -', () => {
      expect(formatRelativeTime()).toBe('-');
      expect(formatRelativeTime('invalid-date')).toBe('-');
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化字节', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('应该格式化 KB', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
    });

    it('应该格式化 MB', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });

    it('0 字节应返回 0 B', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('缺失或非法值应返回 -', () => {
      expect(formatFileSize()).toBe('-');
      expect(formatFileSize(-1)).toBe('-');
      expect(formatFileSize(NaN)).toBe('-');
    });
  });
});
