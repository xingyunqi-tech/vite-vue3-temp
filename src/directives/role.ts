import { effectScope, nextTick, watchEffect, type Directive } from 'vue';
import { useUserInfoStore } from '@/store/modules/user-info';

/** 指令取值：单个角色或角色数组；空值表示不限制 */
type RoleValue = string | string[] | undefined | null;

interface RoleState {
  /** 隐藏前一刻的行内 display，恢复显示时还原成它 */
  display: string;
  /** 当前是否由本指令隐藏 */
  hidden: boolean;
  /** 停止响应式监听 */
  stop: () => void;
  /** 最近一次的指令取值，供 updated 钩子比对 */
  value: RoleValue;
}

const states = new WeakMap<HTMLElement, RoleState>();

function isAllowed(value: RoleValue, role: string): boolean {
  if (!value) return true;
  const required = Array.isArray(value) ? value : [value];
  return role !== '' && required.includes(role);
}

/**
 * 用行内 display 控制显隐，节点始终留在 DOM 原位
 *
 * 不把元素摘出 DOM：Vue 仍会拿这个已脱离的节点当插入锚点，同一个 v-for 里的兄弟被移动时
 * `insertBefore(node, 脱离的 el)` 直接抛 NotFoundError。留在原位则锚点恒有效。
 *
 * 口径与 Vue 自带的 v-show 一致：恢复时还原元素自带的行内值而非清空，
 * 避免抹掉元素本来就写在 style 上的 display。允许显示时只撤销本指令写下的 none。
 */
function toggle(el: HTMLElement, state: RoleState, allowed: boolean): void {
  if (!allowed) {
    if (el.style.display !== 'none') state.display = el.style.display;
    el.style.display = 'none';
    state.hidden = true;
  } else if (state.hidden) {
    el.style.display = state.display;
    state.hidden = false;
  }
}

/**
 * 角色权限指令
 *
 * 角色不匹配时隐藏元素（写 `display: none`），匹配时还原。
 * 跟随 `userStore.info.role` 响应式更新，不需要重新挂载组件。
 *
 * 隐藏是视觉层的：无权限元素的标签与文案仍在 DOM 中，不能用它挡住敏感内容，
 * 也不能替代后端鉴权。需要连内容都不下发时用 `usePermission()` 配合 `v-if`。
 *
 * 角色值为大写，推荐引用 ROLES 常量（`import { ROLES } from '@/constants'`），避免手写字符串大小写错误。
 *
 * 需要按「资源 + 操作」做更细粒度判断（canCreate / canEdit 等）时同样用 `usePermission()`。
 *
 * @example <div v-role="ROLES.ADMIN">删除</div>
 * @example <div v-role="[ROLES.ADMIN, ROLES.REVIEWER]">发布</div>
 */
export const role: Directive<HTMLElement, RoleValue> = {
  mounted(el, binding) {
    const userStore = useUserInfoStore();
    const scope = effectScope();
    const state: RoleState = {
      display: '',
      hidden: false,
      stop: () => scope.stop(),
      value: binding.value,
    };
    states.set(el, state);

    scope.run(() => {
      // flush: 'sync' —— 指令直接操作 DOM，交给调度器批处理会让显隐晚一帧，
      // 期间无权限的节点仍然可见可点
      watchEffect(() => toggle(el, state, isAllowed(state.value, userStore.info.role)), { flush: 'sync' });
    });
  },

  updated(el, binding) {
    const state = states.get(el);
    if (!state) return;

    // state.value 是普通字段，改它不会触发上面的 watchEffect，这里手动同步一次
    state.value = binding.value;
    const allowed = isAllowed(state.value, useUserInfoStore().info.role);
    if (allowed && !state.hidden) return;

    // 需要隐藏时每次更新都重写 none：v-show 与动态 style 会改写 display，排在后面的 v-show 由 nextTick 补判
    const apply = () => {
      if (states.get(el) === state) toggle(el, state, isAllowed(state.value, useUserInfoStore().info.role));
    };
    apply();
    void nextTick(apply);
  },

  unmounted(el) {
    const state = states.get(el);
    if (!state) return;

    state.stop();
    // 还原行内 display：元素可能被 KeepAlive / Transition 缓存后复用，不能留下 none
    if (state.hidden) el.style.display = state.display;
    states.delete(el);
  },
};
