import { describe, it, expect } from 'vitest';
import { toFriendlyMessage } from '@/utils/error-handler';

describe('toFriendlyMessage', () => {
  it('按状态码译成提示文案', () => {
    for (const raw of ['Request failed with status code 500', 'Request failed with status code 404']) {
      const text = toFriendlyMessage(raw);
      expect(text).not.toBe('');
      expect(text).not.toContain('status code');
    }
  });

  it('表里没有的状态码给出带码兜底', () => {
    expect(toFriendlyMessage('Request failed with status code 418')).toBe('请求失败 (418)');
  });

  it('识别超时与网络失败', () => {
    for (const raw of ['timeout of 120000ms exceeded', 'Network Error']) {
      const text = toFriendlyMessage(raw);
      expect(text).not.toBe('');
      expect(text).not.toContain(raw);
    }
  });

  it('认不出的原样返回', () => {
    // 业务错误走后端 message，本身就是给用户看的中文，不能被兜底文案覆盖
    expect(toFriendlyMessage('该课程已结束，无法提交')).toBe('该课程已结束，无法提交');
  });

  it('空串原样返回，调用方据此不弹提示', () => {
    expect(toFriendlyMessage('')).toBe('');
  });
});
