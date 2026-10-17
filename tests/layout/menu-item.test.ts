import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { computed, defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, useRoute } from 'vue-router';
import type { MenuItem as MenuItemType } from '@/constants';
import MenuItem from '@/layout/LayoutMenu/MenuItem.vue';

vi.mock('element-plus', async importOriginal => ({
  ...(await importOriginal<typeof import('element-plus')>()),
  ElMessage: { info: vi.fn() },
}));

const Page = defineComponent({ render: () => h('div') });

const menus: MenuItemType[] = [
  { path: '/home', title: '首页' },
  { path: '/blocked', title: '被拦截' },
  { path: '/soon', title: '敬请期待', disabled: true },
  { path: '/other', title: '其他' },
  { path: '/linked', title: '关联' },
];

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Page },
      { path: '/blocked', component: Page, beforeEnter: () => false },
      { path: '/soon', component: Page },
      { path: '/other', component: Page },
      { path: '/linked', component: Page, meta: { activeMenu: '/other' } },
    ],
  });
  await router.push('/home');
  const Host = defineComponent({
    setup() {
      const route = useRoute();
      const activeMenu = computed(() => (route.meta.activeMenu as string) || route.path);
      return () => h(MenuItem, { menus, isCollapse: false, activeMenu: activeMenu.value });
    },
  });
  const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: document.body });
  return { router, wrapper };
}

async function settle() {
  await flushPromises();
  await vi.runAllTimersAsync();
  await flushPromises();
}

const activeTitle = (wrapper: ReturnType<typeof mount>) => wrapper.find('.el-menu-item.is-active').text();

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('菜单高亮', () => {
  it.each([
    ['导航被守卫取消', '被拦截'],
    ['点击禁用项', '敬请期待'],
  ])('%s 后高亮回到当前路由', async (_, title) => {
    vi.useFakeTimers();
    const { wrapper } = await setup();

    await wrapper
      .findAll('.el-menu-item')
      .find(item => item.text() === title)!
      .trigger('click');
    await settle();

    expect(activeTitle(wrapper)).toBe('首页');
  });

  it('导航成功后高亮切到目标项', async () => {
    vi.useFakeTimers();
    const { router, wrapper } = await setup();

    await wrapper
      .findAll('.el-menu-item')
      .find(item => item.text() === '其他')!
      .trigger('click');
    await settle();

    expect(router.currentRoute.value.path).toBe('/other');
    expect(activeTitle(wrapper)).toBe('其他');
  });

  it('目标页通过 meta.activeMenu 指向其他菜单时，高亮直接切过去不闪空', async () => {
    vi.useFakeTimers();
    const { wrapper } = await setup();

    await wrapper
      .findAll('.el-menu-item')
      .find(item => item.text() === '关联')!
      .trigger('click');
    await flushPromises();

    for (let tick = 0; tick < 3; tick++) {
      await vi.advanceTimersToNextTimerAsync();
      await flushPromises();
      expect(activeTitle(wrapper)).toBe('其他');
    }
  });
});
