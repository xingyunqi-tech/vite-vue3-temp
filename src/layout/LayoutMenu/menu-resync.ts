import type { InjectionKey } from 'vue';

/** 点击菜单项（index 为其路径）落定后按当前路由同步 el-menu 高亮，由 MenuItem 提供、MenuNode 调用 */
export const MenuResyncKey: InjectionKey<(index: string) => void> = Symbol('MenuResync');
