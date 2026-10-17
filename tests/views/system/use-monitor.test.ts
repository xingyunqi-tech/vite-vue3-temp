import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acknowledgeMonitorAlert, getMonitorAlerts, getMonitorQueues, type AdminAlert } from '@/api';
import { useAlertList, useQueueStats } from '@/views/system/monitor/useMonitor';

vi.mock('@/api', () => ({
  getMonitorQueues: vi.fn(),
  getMonitorAlerts: vi.fn(),
  acknowledgeMonitorAlert: vi.fn(async () => ({})),
}));

const alert = (id: number): AdminAlert => ({
  id,
  type: 'auto-submit',
  level: 'WARN',
  message: `告警 ${id}`,
  payload: null,
  dedupKey: `k-${id}`,
  acknowledgedAt: null,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
});

const page = (list: AdminAlert[], total = list.length) => ({ list, total, page: 1, limit: 20, totalPages: 1 });

const flushMicrotasks = () => new Promise(resolve => setTimeout(resolve));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useQueueStats', () => {
  it('加载队列状态，不复用在途请求', async () => {
    const overview = {
      enabled: true,
      queues: [
        { name: 'q', available: false, waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0, prioritized: 0 },
      ],
    };
    vi.mocked(getMonitorQueues).mockResolvedValueOnce(overview);
    const { overview: state, load } = useQueueStats();

    await load();

    expect(getMonitorQueues).toHaveBeenCalledWith({ disableDedup: true });
    expect(state.value).toEqual(overview);
  });
});

describe('useAlertList', () => {
  it('按筛选条件与分页加载', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValueOnce(page([alert(1)], 41));
    const { list, total, load } = useAlertList();

    await load();

    expect(getMonitorAlerts).toHaveBeenCalledWith({ page: 1, limit: 20, acknowledged: false }, { disableDedup: true });
    expect(list.value).toHaveLength(1);
    expect(total.value).toBe(41);
  });

  it('查询回到第一页，重置恢复默认筛选', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValue(page([]));
    const { filters, page: current, search, reset } = useAlertList();
    current.value = 3;
    filters.level = 'CRITICAL';

    await search();
    expect(vi.mocked(getMonitorAlerts).mock.lastCall?.[0]).toEqual({
      page: 1,
      limit: 20,
      acknowledged: false,
      level: 'CRITICAL',
    });

    filters.status = 'all';
    current.value = 2;
    await reset();
    expect(filters).toEqual({ status: 'unacknowledged', level: '', type: '' });
    expect(vi.mocked(getMonitorAlerts).mock.lastCall?.[0]).toEqual({ page: 1, limit: 20, acknowledged: false });
  });

  it('确认告警后刷新当前页', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValue(page([alert(2)]));
    const { acknowledge } = useAlertList();

    await acknowledge(1);

    expect(acknowledgeMonitorAlert).toHaveBeenCalledWith(1);
    expect(getMonitorAlerts).toHaveBeenCalledTimes(1);
  });

  it('确认后当前页变空时回退一页', async () => {
    vi.mocked(getMonitorAlerts)
      .mockResolvedValueOnce(page([], 20))
      .mockResolvedValueOnce(page([alert(1)], 20));
    const { page: current, list, acknowledge } = useAlertList();
    current.value = 2;

    await acknowledge(9);

    expect(current.value).toBe(1);
    expect(list.value).toHaveLength(1);
    expect(getMonitorAlerts).toHaveBeenCalledTimes(2);
  });

  it('翻页沿用上次查询时的筛选条件', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValue(page([], 100));
    const { filters, search, changePage } = useAlertList();
    filters.level = 'CRITICAL';
    await search();

    filters.level = 'INFO';
    filters.status = 'all';
    changePage(2);
    await flushMicrotasks();

    expect(vi.mocked(getMonitorAlerts).mock.lastCall?.[0]).toEqual({
      page: 2,
      limit: 20,
      acknowledged: false,
      level: 'CRITICAL',
    });
  });

  it('改页大小回到第一页，与同一轮的翻页只请求一次', async () => {
    vi.mocked(getMonitorAlerts).mockResolvedValue(page([], 100));
    const { page: current, changeSize, changePage } = useAlertList();
    current.value = 3;

    changeSize(50);
    changePage(2);
    await flushMicrotasks();

    expect(getMonitorAlerts).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getMonitorAlerts).mock.lastCall?.[0]).toMatchObject({ page: 2, limit: 50 });
  });

  it('页码未变化时不请求', async () => {
    const { changePage } = useAlertList();

    changePage(1);
    await flushMicrotasks();

    expect(getMonitorAlerts).not.toHaveBeenCalled();
  });

  it('丢弃过期请求的响应', async () => {
    let resolveFirst: (value: ReturnType<typeof page>) => void = () => {};
    vi.mocked(getMonitorAlerts)
      .mockImplementationOnce(() => new Promise(resolve => (resolveFirst = resolve)))
      .mockResolvedValueOnce(page([alert(2)]));
    const { list, loading, load } = useAlertList();

    const first = load();
    await load();
    resolveFirst(page([alert(1)]));
    await first;

    expect(list.value.map(item => item.id)).toEqual([2]);
    expect(loading.value).toBe(false);
  });
});
