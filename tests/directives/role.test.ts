import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextTick, ref } from 'vue';
import { role } from '@/directives/role';
import { useUserInfoStore } from '@/store/modules/user-info';

// 挂进真实文档：jsdom 只对已连接的元素重算 getComputedStyle，脱离文档的元素会把首次结果缓存死，
// isVisible() 读到的永远是挂载那一刻的值
const mounted: { unmount: () => void }[] = [];

/** 把指令挂在一个有兄弟节点的元素上，顺便验证隐藏不改变它在 DOM 中的位置 */
function mountWithRole(value: unknown, style = '') {
  const wrapper = mount(
    {
      props: { value: { type: null, required: false } },
      template: `
        <div class="wrap">
          <span class="before">前</span>
          <button v-role="value" style="${style}">操作</button>
          <span class="after">后</span>
        </div>
      `,
    },
    { props: { value }, attachTo: document.body, global: { directives: { role } } },
  );
  mounted.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount());
});

describe('v-role 指令', () => {
  it('角色匹配时元素可见', () => {
    useUserInfoStore().setUserInfo({ role: 'ADMIN' });
    expect(mountWithRole('ADMIN').find('button').isVisible()).toBe(true);
  });

  it('角色不匹配时元素隐藏', () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    expect(mountWithRole('ADMIN').find('button').isVisible()).toBe(false);
  });

  it('数组取值命中任一角色即可', () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    expect(mountWithRole(['ADMIN', 'EDITOR']).find('button').isVisible()).toBe(true);
  });

  it('没有角色时一律拒绝', () => {
    useUserInfoStore().setUserInfo({ role: '' });
    expect(mountWithRole('ADMIN').find('button').isVisible()).toBe(false);
  });

  it('指令取值为空表示不限制', () => {
    useUserInfoStore().setUserInfo({ role: '' });
    expect(mountWithRole(undefined).find('button').isVisible()).toBe(true);
  });

  it('隐藏期间元素仍留在兄弟节点之间', () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const wrapper = mountWithRole('ADMIN');

    const tags = Array.from(wrapper.element.children as HTMLCollection).map(
      node => node.className || node.tagName.toLowerCase(),
    );
    expect(tags).toEqual(['before', 'button', 'after']);
  });

  it('角色变化后元素恢复显示', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'REVIEWER' });
    const wrapper = mountWithRole('ADMIN');
    expect(wrapper.find('button').isVisible()).toBe(false);

    store.setUserInfo({ role: 'ADMIN' });
    await nextTick();

    expect(wrapper.find('button').isVisible()).toBe(true);
  });

  it('角色被收回时元素重新隐藏', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'ADMIN' });
    const wrapper = mountWithRole('ADMIN');
    expect(wrapper.find('button').isVisible()).toBe(true);

    store.setUserInfo({ role: 'REVIEWER' });
    await nextTick();

    expect(wrapper.find('button').isVisible()).toBe(false);
  });

  it('指令取值变化时重新判定', async () => {
    useUserInfoStore().setUserInfo({ role: 'EDITOR' });
    const wrapper = mountWithRole('ADMIN');
    expect(wrapper.find('button').isVisible()).toBe(false);

    await wrapper.setProps({ value: 'EDITOR' });

    expect(wrapper.find('button').isVisible()).toBe(true);
  });

  it('恢复显示时还原元素自带的行内 display', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'REVIEWER' });
    const wrapper = mountWithRole('ADMIN', 'display: inline-flex');

    store.setUserInfo({ role: 'ADMIN' });
    await nextTick();

    expect(wrapper.find('button').element.style.display).toBe('inline-flex');
  });

  it.each([
    ['v-show 在前', `<button v-show="show" v-role="'ADMIN'">操作</button>`],
    ['v-show 在后', `<button v-role="'ADMIN'" v-show="show">操作</button>`],
  ])('角色不匹配时 v-show 切换不会让元素显示（%s）', async (_, template) => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const show = ref(false);
    const wrapper = mount(
      { setup: () => ({ show }), template },
      { attachTo: document.body, global: { directives: { role } } },
    );
    mounted.push(wrapper);

    show.value = true;
    await flushPromises();

    expect(wrapper.find('button').isVisible()).toBe(false);
  });

  it('角色匹配时 v-show 仍能隐藏元素', async () => {
    useUserInfoStore().setUserInfo({ role: 'ADMIN' });
    const show = ref(false);
    const wrapper = mount(
      { setup: () => ({ show }), template: `<button v-show="show" v-role="'ADMIN'">操作</button>` },
      { attachTo: document.body, global: { directives: { role } } },
    );
    mounted.push(wrapper);
    expect(wrapper.find('button').isVisible()).toBe(false);

    show.value = true;
    await nextTick();
    expect(wrapper.find('button').isVisible()).toBe(true);
  });

  it('角色不匹配时动态 style 变化不会让元素显示', async () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const sty = ref('color: red');
    const wrapper = mount(
      { setup: () => ({ sty }), template: `<button :style="sty" v-role="'ADMIN'">操作</button>` },
      { attachTo: document.body, global: { directives: { role } } },
    );
    mounted.push(wrapper);

    sty.value = 'color: blue';
    await nextTick();

    expect(wrapper.find('button').isVisible()).toBe(false);
  });

  it('恢复显示时还原隐藏前一刻的行内 display', async () => {
    const store = useUserInfoStore();
    store.setUserInfo({ role: 'ADMIN' });
    const display = ref('flex');
    const wrapper = mount(
      { setup: () => ({ display }), template: `<button :style="{ display }" v-role="'ADMIN'">操作</button>` },
      { attachTo: document.body, global: { directives: { role } } },
    );
    mounted.push(wrapper);

    display.value = 'grid';
    await nextTick();
    store.setUserInfo({ role: 'REVIEWER' });
    store.setUserInfo({ role: 'ADMIN' });

    expect(wrapper.find('button').element.style.display).toBe('grid');
  });

  it('v-for 列表重排时元素随之移动', async () => {
    useUserInfoStore().setUserInfo({ role: 'REVIEWER' });
    const list = ref([1, 2, 3]);
    const wrapper = mount(
      {
        setup: () => ({ list }),
        template: `<ul><li v-for="n in list" :key="n" v-role="'ADMIN'">{{ n }}</li></ul>`,
      },
      { attachTo: document.body, global: { directives: { role } } },
    );
    mounted.push(wrapper);

    list.value = [3, 1, 2];
    await nextTick();

    expect(wrapper.findAll('li').map(item => item.text())).toEqual(['3', '1', '2']);
  });
});
