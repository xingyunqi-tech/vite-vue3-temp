import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { describe, it, expect, vi } from 'vitest';
import { downloadApi, polymasApi } from '@/api/core/request';

vi.mock('@/utils/error-handler', () => ({
  redirectToLoginOnce: vi.fn(),
  toFriendlyMessage: (msg: string) => msg,
}));
vi.unmock('@zhs/agent-course-kit/services/base-request');
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }));

const respond =
  (data: unknown): AxiosAdapter =>
  async config => ({ data, status: 200, statusText: '', headers: {}, config: config as InternalAxiosRequestConfig });

describe('下载实例', () => {
  it('返回 JSON 业务错误时 reject', async () => {
    const body = new Blob([JSON.stringify({ code: 500, message: '无权限导出' })], { type: 'application/json' });

    await expect(downloadApi.get('/export', { adapter: respond(body) })).rejects.toThrow('无权限导出');
  });

  it('下载 JSON 文件时正常返回 Blob', async () => {
    const body = new Blob([JSON.stringify({ name: 'config' })], { type: 'application/json' });

    const res = await downloadApi.get('/export', { adapter: respond(body) });
    expect(res.data).toBeInstanceOf(Blob);
  });
});

describe('默认实例', () => {
  it('blob 请求返回 JSON 业务错误时 reject', async () => {
    const body = new Blob([JSON.stringify({ code: 500, message: '无权限导出' })], { type: 'application/json' });

    await expect(polymasApi.get('/export', { responseType: 'blob', adapter: respond(body) })).rejects.toThrow(
      '无权限导出',
    );
  });
});
