/**
 * StatisticsCard 组件测试
 * @description 测试统计卡片组件的各种功能和交互
 */

import { describe, it, expect } from 'vitest';
import { User } from '@element-plus/icons-vue';
import StatisticsCard from '@/components/StatisticsCard/index.vue';
import { createWrapper, expectElementsToExist, expectPropsToMatch } from '../utils/test-helpers';

describe('StatisticsCard', () => {
  // 基础渲染测试
  describe('基础渲染', () => {
    it('应该正确渲染基本结构', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '1,234',
          label: '总用户数',
          trend: '+12.5%',
          trendType: 'up',
        },
      });

      // 验证主要元素存在
      expectElementsToExist(wrapper, [
        '.stat-card',
        '.stat-icon',
        '.stat-content',
        '.stat-value',
        '.stat-label',
        '.stat-trend',
      ]);

      // 验证文本内容
      expect(wrapper.find('.stat-value').text()).toBe('1,234');
      expect(wrapper.find('.stat-label').text()).toBe('总用户数');
      expect(wrapper.find('.stat-trend').text()).toBe('+12.5%');
    });

    it('应该正确应用Props', () => {
      const props = {
        icon: User,
        value: 5678,
        label: '月活用户',
        trend: '-3.2%',
        trendType: 'down' as const,
        iconColor: '#ff6b6b',
        iconBg: '#ffe0e0',
      };

      const wrapper = createWrapper(StatisticsCard, { props });
      expectPropsToMatch(wrapper, props);
    });
  });

  // 趋势显示测试
  describe('趋势显示', () => {
    it('应该正确显示上升趋势', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '100',
          label: '测试',
          trend: '+10%',
          trendType: 'up',
        },
      });

      const trendElement = wrapper.find('.stat-trend');
      expect(trendElement.classes()).toContain('up');
      // 由于Element Plus图标被存根，检查el-icon的存在即可
      expect(wrapper.find('.stat-trend el-icon-stub').exists()).toBe(true);
    });

    it('应该正确显示下降趋势', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '100',
          label: '测试',
          trend: '-5%',
          trendType: 'down',
        },
      });

      const trendElement = wrapper.find('.stat-trend');
      expect(trendElement.classes()).toContain('down');
      // 由于Element Plus图标被存根，检查el-icon的存在即可
      expect(wrapper.find('.stat-trend el-icon-stub').exists()).toBe(true);
    });
  });

  // 自定义样式测试
  describe('自定义样式', () => {
    it('应该应用自定义图标颜色', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '100',
          label: '测试',
          trend: '+10%',
          trendType: 'up',
          iconColor: '#custom-color',
        },
      });

      // 验证自定义颜色是否应用到组件中
      const iconContainer = wrapper.find('.stat-icon');
      expect(iconContainer.exists()).toBe(true);

      // 检查组件VM是否正确设置了iconColor prop
      expect(wrapper.props().iconColor).toBe('#custom-color');
    });

    it('应该使用默认CSS变量', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '100',
          label: '测试',
          trend: '+10%',
          trendType: 'up',
        },
      });

      // 验证默认CSS变量是否应用
      const iconElement = wrapper.find('.stat-icon');
      expect(iconElement.attributes('style')).toContain('var(--colorPrimary)');
      expect(iconElement.attributes('style')).toContain('var(--colorPrimaryBg)');
    });
  });

  // 数据类型测试
  describe('数据类型支持', () => {
    it('应该支持字符串类型的value', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '1,234,567',
          label: '测试',
          trend: '+10%',
          trendType: 'up',
        },
      });

      expect(wrapper.find('.stat-value').text()).toBe('1,234,567');
    });

    it('应该支持数字类型的value', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: 1234567,
          label: '测试',
          trend: '+10%',
          trendType: 'up',
        },
      });

      expect(wrapper.find('.stat-value').text()).toBe('1234567');
    });
  });

  // 边界情况测试
  describe('边界情况', () => {
    it('应该处理空字符串', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '',
          label: '',
          trend: '',
          trendType: 'up',
        },
      });

      expect(wrapper.find('.stat-value').text()).toBe('');
      expect(wrapper.find('.stat-label').text()).toBe('');
      expect(wrapper.find('.stat-trend').text()).toBe('');
    });

    it('应该处理零值', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: 0,
          label: '零值测试',
          trend: '0%',
          trendType: 'up',
        },
      });

      expect(wrapper.find('.stat-value').text()).toBe('0');
    });
  });

  // 可访问性测试
  describe('可访问性', () => {
    it('应该具有正确的语义结构', () => {
      const wrapper = createWrapper(StatisticsCard, {
        props: {
          icon: User,
          value: '100',
          label: '用户数量',
          trend: '+10%',
          trendType: 'up',
        },
      });

      // 验证结构的语义性
      expect(wrapper.find('.stat-card').exists()).toBe(true);
      expect(wrapper.find('.stat-content').exists()).toBe(true);
    });
  });
});
