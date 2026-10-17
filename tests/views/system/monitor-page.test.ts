import { flushPromises, mount } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acknowledgeMonitorAlert, getMonitorAlerts, getMonitorQueues, type AdminAlert } from '@/api';
import MonitorPage from '@/views/system/monitor/index.vue';

vi.mock('@/api', () => ({
  getMonitorQueues: vi.fn(),
  getMonitorAlerts: vi.fn(),
  acknowledgeMonitorAlert: vi.fn(async () => ({})),
}));

const alert = (overrides: Partial<AdminAlert> = {}): AdminAlert => ({
  id: 1,
  type: 'auto-submit',
  level: 'CRITICAL',
  message: '自动交卷失败',
  payload: { sessionId: 9 },
  dedupKey: 'auto-submit:9',
  acknowledgedAt: null,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  ...overrides,
});

const queue = (name: string, available: boolean) => ({
  name,
  available,
  waiting: 12,
  active: 1,
  delayed: 0,
  failed: 3,
  completed: 100,
  prioritized: 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }) as never);
  vi.mocked(getMonitorQueues).mockResolvedValue({
    enabled: true,
    queues: [queue('stats', true), queue('notification', false)],
  });
  vi.mocked(getMonitorAlerts).mockResolvedValue({ list: [alert()], total: 1, page: 1, limit: 20, totalPages: 1 });
});

function tableRows(wrapper: ReturnType<typeof mount>, tableIndex: number) {
  return wrapper.findAll('.el-table')[tableIndex].findAll('.el-table__body tr.el-table__row');
}

describe('监控告警页', () => {
  it('展示队列状态，统计失败的队列不展示计数', async () => {
    const wrapper = mount(MonitorPage);
    await flushPromises();

    const [ok, unavailable] = tableRows(wrapper, 0);
    expect(ok.text()).toContain('正常');
    expect(ok.text()).toContain('12');
    expect(unavailable.text()).toContain('统计失败');
    expect(unavailable.text()).not.toContain('12');
  });

  it('Redis 未启用时提示队列不可用', async () => {
    vi.mocked(getMonitorQueues).mockResolvedValueOnce({ enabled: false, queues: [] });
    const wrapper = mount(MonitorPage);
    await flushPromises();

    expect(wrapper.text()).toContain('Redis 未启用，队列不可用');
  });

  it('默认查询未确认告警并展示级别与内容', async () => {
    const wrapper = mount(MonitorPage);
    await flushPromises();

    expect(getMonitorAlerts).toHaveBeenCalledWith({ page: 1, limit: 20, acknowledged: false }, { disableDedup: true });
    const [row] = tableRows(wrapper, 1);
    expect(row.text()).toContain('严重');
    expect(row.text()).toContain('自动交卷失败');
  });

  it('确认告警后调用确认接口并刷新列表', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValueOnce('confirm' as never);
    const wrapper = mount(MonitorPage);
    await flushPromises();
    vi.mocked(getMonitorAlerts).mockResolvedValueOnce({ list: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    const button = tableRows(wrapper, 1)[0]
      .findAll('button')
      .find(item => item.text() === '确认');
    await button!.trigger('click');
    await flushPromises();

    expect(acknowledgeMonitorAlert).toHaveBeenCalledWith(1);
    expect(getMonitorAlerts).toHaveBeenCalledTimes(2);
    expect(ElMessage.success).toHaveBeenCalledWith('已确认');
  });

  it('取消确认时不调用确认接口', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel');
    const wrapper = mount(MonitorPage);
    await flushPromises();

    const button = tableRows(wrapper, 1)[0]
      .findAll('button')
      .find(item => item.text() === '确认');
    await button!.trigger('click');
    await flushPromises();

    expect(acknowledgeMonitorAlert).not.toHaveBeenCalled();
  });

  it('已确认的告警不显示确认按钮', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValueOnce({
      list: [alert({ acknowledgedAt: '2026-10-17T01:00:00.000Z' })],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const wrapper = mount(MonitorPage);
    await flushPromises();

    const [row] = tableRows(wrapper, 1);
    expect(row.findAll('button').some(item => item.text() === '确认')).toBe(false);
    expect(row.text()).toContain('已确认');
  });
});
