<!--
  用户下拉菜单内容：主题 / 语言 / 设置 / 退出登录
  由 HeaderAvatar 的两种触发方式（展开态"更多"按钮、收起态头像）共用

  主题与语言两行都是「点击即切换」，右侧常驻显示当前值：
  不用「每种语言各占一行 + 当前项 disabled」的写法——置灰项看着像坏掉的菜单，
  两种语言时也白占一行。
-->
<template>
  <el-dropdown-menu>
    <el-dropdown-item v-if="headerVisible.themeSwitch" command="theme">
      <span class="menu-row">
        <el-icon class="menu-row__icon"><component :is="currentTheme === 'dark' ? Sunny : Moon" /></el-icon>
        <span class="menu-row__label">主题</span>
        <span class="menu-row__value">{{ themeLabel }}</span>
      </span>
    </el-dropdown-item>

    <el-dropdown-item v-if="headerVisible.localeSwitch" :command="`lang:${nextLocale}`">
      <span class="menu-row">
        <SvgIcon class="menu-row__icon" name="common-language" :size="16" />
        <span class="menu-row__label">语言</span>
        <span class="menu-row__value">{{ localeLabel }}</span>
      </span>
    </el-dropdown-item>

    <el-dropdown-item v-if="canAccessSetting" command="setting" :divided="hasSwitcherItems">
      <span class="menu-row">
        <el-icon class="menu-row__icon"><Setting /></el-icon>
        <span class="menu-row__label">系统设置</span>
      </span>
    </el-dropdown-item>

    <el-dropdown-item command="logout" :divided="hasUpperItems">
      <span class="menu-row">
        <el-icon class="menu-row__icon"><SwitchButton /></el-icon>
        <span class="menu-row__label">退出登录</span>
      </span>
    </el-dropdown-item>
  </el-dropdown-menu>
</template>

<script setup lang="ts">
import { Moon, Setting, Sunny, SwitchButton } from '@element-plus/icons-vue';
import { computed, toRefs } from 'vue';
import { useLayout } from '../../useLayoutContext';
import { LOCALE_TYPE } from '@/constants';
import { useGlobalStore, useUserInfoStore } from '@/store';

const globalStore = useGlobalStore();
const userStore = useUserInfoStore();
const { headerVisible } = useLayout();
const { currentTheme } = toRefs(globalStore);

const themeLabel = computed(() => (currentTheme.value === 'dark' ? '深色' : '浅色'));

/**
 * 「系统设置」是否可见
 *
 * 判定口径与 /setting 路由的 meta.roles（ADMIN）保持一致——菜单项能看见就一定点得进去。
 */
const canAccessSetting = computed(() => headerVisible.setting && userStore.isAdmin);

const { currentLocale } = toRefs(globalStore);

/** 语言展示名（key 与 LOCALE_TYPE 取值一致） */
const LOCALE_LABELS: Record<string, string> = {
  [LOCALE_TYPE.ZH_CN]: '中文',
  [LOCALE_TYPE.EN_US]: 'English',
};

const localeLabel = computed(() => LOCALE_LABELS[currentLocale.value] ?? currentLocale.value);

/** 点击后切到的下一种语言：按 LOCALE_TYPE 声明顺序循环，将来加第三种语言无需改这里 */
const nextLocale = computed(() => {
  const list = Object.values(LOCALE_TYPE);
  const current = list.indexOf(currentLocale.value as LOCALE_TYPE);
  return list[(current + 1) % list.length];
});

// 主题 / 语言这一组是否存在（决定"系统设置"上方是否需要分隔线）
const hasSwitcherItems = computed(() => headerVisible.localeSwitch || headerVisible.themeSwitch);

// 退出登录上方是否存在其它菜单项（用于决定是否显示分隔线）
const hasUpperItems = computed(() => hasSwitcherItems.value || canAccessSetting.value);
</script>

<style scoped lang="scss">
// 三段式行：图标固定列 + 标题占满 + 右侧当前值，保证多行之间图标与文字严格对齐
.menu-row {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 168px;
  gap: 10px;
}

// Element Plus 有一条 `.el-dropdown-menu__item i { margin-right: 5px }`：
// 它只命中 el-icon 渲染出的 <i>，命不中 SvgIcon 渲染出的 <svg>，
// 两种图标混排时标题会逐行错开 5px（图标本身是齐的，错的是后面的文字）。这里统一清零。
.menu-row__icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin: 0;
  font-size: 16px;
}

// 颜色一律继承 .el-dropdown-menu__item，不在行内写死：
// 写死 color 会把 EP 的 hover 变色压掉，而 SvgIcon 自带 inline `color: currentColor`
// 会绕过写死值继续跟随 hover —— 结果就是「只有语言那一行的图标会变色」。
// 继承同时也让明暗主题走 element-plus 自己的 dark css-vars。
.menu-row__label {
  flex: 1;
  font-size: 14px;
  line-height: 22px;
}

// 当前值：用 opacity 弱化而非写死颜色，这样 hover 和明暗主题都能跟随
.menu-row__value {
  flex-shrink: 0;
  margin-left: 12px;
  opacity: 0.65;
  font-size: 13px;
  line-height: 22px;
}
</style>
