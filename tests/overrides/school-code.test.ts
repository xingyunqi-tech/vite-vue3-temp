import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * 租户识别的同步部分：定向包锁定、Cookie 直读、解析缓存
 *
 * Cookie 来源打桩到 @/utils/auth 的 getUserInfoCookieRaw；PINNED_SCHOOL_CODE 在模块求值期
 * 读环境变量，故每例都先 stubEnv 再动态 import。
 */
vi.mock('@/utils/auth', () => ({ getUserInfoCookieRaw: vi.fn() }));

const cookie = (data: Record<string, unknown>) => encodeURIComponent(JSON.stringify(data));

/** 按需加载：环境变量与 Cookie 打桩都要先于模块求值 */
const loadRegistry = async (raw: string | null) => {
  const { getUserInfoCookieRaw } = await import('@/utils/auth');
  vi.mocked(getUserInfoCookieRaw).mockReturnValue(raw);
  return import('@/overrides/registry');
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getSchoolCode', () => {
  it('定向包锁定的学校代码优先于 Cookie', async () => {
    vi.stubEnv('VITE_BUILD_SCHOOL_CODE', 'demo-tenant');
    const { getSchoolCode } = await loadRegistry(cookie({ schoolNid: '9999', userId: 1 }));

    expect(getSchoolCode()).toBe('demo-tenant');
  });

  it('未登录访客在定向包里同样识别为该学校', async () => {
    // 免登录白名单声明在学校配置里，访客识别不出学校就永远进不去那个公开页
    vi.stubEnv('VITE_BUILD_SCHOOL_CODE', 'demo-tenant');
    const { getSchoolCode } = await loadRegistry(null);

    expect(getSchoolCode()).toBe('demo-tenant');
  });

  it('通用包里 Cookie 带身份但不在名单中时返回 null', async () => {
    const { getSchoolCode } = await loadRegistry(cookie({ schoolNid: '9999', userId: 1 }));

    expect(getSchoolCode()).toBeNull();
  });

  it('Cookie 里没有任何身份信息时返回 null', async () => {
    const { getSchoolCode } = await loadRegistry(null);

    expect(getSchoolCode()).toBeNull();
  });
});

describe('Cookie 字段读取', () => {
  it('schoolNid 缺失时回落 schoolId，数字转成字符串', async () => {
    const { getSchoolNid } = await loadRegistry(cookie({ schoolId: 1097 }));

    expect(getSchoolNid()).toBe('1097');
  });

  it('userId 转成字符串', async () => {
    const { getUserId } = await loadRegistry(cookie({ userId: 1875017542 }));

    expect(getUserId()).toBe('1875017542');
  });

  it('Cookie 不是合法 JSON 时按空对象处理', async () => {
    const { getSchoolNid, getUserId } = await loadRegistry('%7Bnot-json');

    expect(getSchoolNid()).toBe('');
    expect(getUserId()).toBe('');
  });
});

describe('解析缓存', () => {
  it('Cookie 变了就重新解析，不会把上一个账号的学校带下去', async () => {
    const { getUserInfoCookieRaw } = await import('@/utils/auth');
    const { getSchoolNid } = await loadRegistry(cookie({ schoolNid: '1097' }));

    expect(getSchoolNid()).toBe('1097');
    vi.mocked(getUserInfoCookieRaw).mockReturnValue(cookie({ schoolNid: '1111' }));

    expect(getSchoolNid()).toBe('1111');
  });
});
