import { describe, it, expect } from 'vitest';
import { hasAlpha, isSameColor, isValidColor } from '@/plugins/site-config/color';

describe('isValidColor', () => {
  it.each([
    '#fff',
    '#ffff',
    '#1546f2',
    '#1546f280',
    'rgb(21 70 242)',
    'rgb(21, 70, 242)',
    'rgba(0,0,0,0.15)',
    'rgb(0 0 0 / 15%)',
    'rgba(0, 0, 0, .5)',
    '#1546F2',
  ])('接受 %s', value => {
    expect(isValidColor(value)).toBe(true);
  });

  it.each([
    '',
    'red',
    '#12',
    '#12345',
    'rgb(256 0 0)',
    'rgb(0 0)',
    'rgba(0,0,0,2)',
    'rgb(0, 0, 0, 0.5, 1)',
    'hsl(0 0% 0%)',
    'rgb(,,)',
    'rgba(0,0,0,)',
    'rgb(1 2 3 /)',
    'rgb(0x10 0 0)',
    'rgb(1e2 0 0)',
    'rgb(+5,0,0)',
  ])('拒绝 %s', value => {
    expect(isValidColor(value)).toBe(false);
  });
});

describe('isSameColor', () => {
  it('不同写法的同一颜色判为等值', () => {
    expect(isSameColor('rgb(21 70 242)', '#1546f2')).toBe(true);
    expect(isSameColor('rgba(0,0,0,0.5)', 'rgb(0 0 0 / 50%)')).toBe(true);
    expect(isSameColor('#fff', '#ffffff')).toBe(true);
  });

  it('颜色或透明度不同判为不等', () => {
    expect(isSameColor('#1546f2', '#1546f3')).toBe(false);
    expect(isSameColor('rgba(0,0,0,0.5)', 'rgba(0,0,0,0.4)')).toBe(false);
  });

  it('解析不了时退回字符串比较', () => {
    expect(isSameColor('oops', 'oops')).toBe(true);
    expect(isSameColor('oops', '#fff')).toBe(false);
  });
});

describe('hasAlpha', () => {
  it('透明度小于 1 时为真', () => {
    expect(hasAlpha('rgba(0,0,0,0.15)')).toBe(true);
    expect(hasAlpha('#00000080')).toBe(true);
  });

  it('不透明或解析不了时为假', () => {
    expect(hasAlpha('rgb(0 0 0)')).toBe(false);
    expect(hasAlpha('rgba(0,0,0,1)')).toBe(false);
    expect(hasAlpha('oops')).toBe(false);
  });
});
