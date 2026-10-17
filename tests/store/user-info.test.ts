import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUserInfoStore } from '@/store/modules/user-info';

const setUserCookie = (data: object) => {
  document.cookie = `CASLOGC=${encodeURIComponent(JSON.stringify(data))}; path=/`;
};

describe('换账号检测', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  afterEach(() => {
    document.cookie = 'CASLOGC=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('Cookie 里的用户与本页加载的用户不同时判定为换了账号', async () => {
    const store = useUserInfoStore();
    setUserCookie({ userId: 1 });
    await store.getInfoAction();
    expect(store.isAccountSwitched()).toBe(false);

    setUserCookie({ userId: 2 });
    expect(store.isAccountSwitched()).toBe(true);
  });

  it('本页尚未解析用户或 Cookie 已清空时不判定', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ userNid: '1' });
    setUserCookie({ userId: 2 });
    expect(store.isAccountSwitched()).toBe(false);

    await store.getInfoAction();
    document.cookie = 'CASLOGC=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    expect(store.isAccountSwitched()).toBe(false);
  });
});
