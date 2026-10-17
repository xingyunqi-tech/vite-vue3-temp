import { nextTick } from 'vue';
import { useGlobalStore } from '@/store';

/**
 * 主题切换的圆形扩散动效（View Transition API）
 *
 * 本文件只把圆心 / 半径 / 方向写到 <html> 上，动画本体是 styles/index.scss 的
 * `theme-change` 关键帧。浏览器不支持、或用户开启「减弱动态效果」时退化为瞬时切换。
 *
 * @example
 * ```typescript
 * const { toggleThemeWithTransition } = useThemeTransition();
 * toggleThemeWithTransition(userBarRef.value);
 * ```
 */

interface TransitionOrigin {
  /** 视口坐标系下的圆心横坐标 */
  x: number;
  /** 视口坐标系下的圆心纵坐标 */
  y: number;
}

/** 连点主题时的代际标记：只有最新一次过渡才清理 <html> 上的变量，否则会擦掉后一次刚写入的参数 */
let latestTransitionId = 0;

/**
 * 取扩散圆心 = 触发入口的中心。
 *
 * 不用鼠标落点：点的是下拉菜单里那一行，菜单在切换的同一帧就关掉了，
 * 从正在消失的元素往外扩散显得没有来处。
 */
const resolveOrigin = (trigger?: Element | null): TransitionOrigin => {
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

export function useThemeTransition() {
  const globalStore = useGlobalStore();

  /**
   * 带扩散动效地切换明暗主题。
   *
   * 不返回 Promise：函数返回时主题已切好，但动画和收尾还要再跑 400ms，
   * 返回一个立刻 settle 的 promise 只会误导调用方。
   *
   * @param trigger 触发切换的入口元素，用它的中心当扩散圆心；不传则从视口中心扩散
   */
  const toggleThemeWithTransition = (trigger?: Element | null): void => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof document.startViewTransition !== 'function') {
      globalStore.toggleTheme();
      return;
    }

    const root = document.documentElement;
    const { innerWidth, innerHeight } = window;

    // 圆心要在 startViewTransition 之前算：进入过渡后布局已被快照接管，再读 rect 就不准了
    const { x, y } = resolveOrigin(trigger);

    // 圆心到视口四角的最远距离，保证圆最终能盖满整屏
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    // 换算成百分比交给 clip-path，比绝对 px 抗盒子尺寸变化。
    // 注意 circle() 的百分比半径基准不是宽或高，而是 √(w² + h²) / √2。
    const referenceRadius = Math.hypot(innerWidth, innerHeight) / Math.SQRT2;

    const transitionId = ++latestTransitionId;

    // 方向要在切换之前判定：当前是暗色，说明这一次要去亮色
    root.dataset.themeTransition = globalStore.currentTheme === 'dark' ? 'to-light' : 'to-dark';
    root.style.setProperty('--theme-transition-x', `${(100 * x) / innerWidth}%`);
    root.style.setProperty('--theme-transition-y', `${(100 * y) / innerHeight}%`);
    root.style.setProperty('--theme-transition-radius', `${(100 * endRadius) / referenceRadius}%`);

    // 必须等 html[data-theme] 真正落到 DOM：App.vue 里写属性的 watchEffect 是 pre flush，
    // 少这个 await，浏览器拍到的「新视图」快照还是旧主题
    const transition = document.startViewTransition(async () => {
      globalStore.toggleTheme();
      await nextTick();
    });

    const cleanup = () => {
      if (transitionId !== latestTransitionId) return;

      delete root.dataset.themeTransition;
      root.style.removeProperty('--theme-transition-x');
      root.style.removeProperty('--theme-transition-y');
      root.style.removeProperty('--theme-transition-radius');
    };

    // 成功和失败都要收尾，又不能留下未处理的 rejection，所以用两个回调而不是 .finally()
    transition.finished.then(cleanup, cleanup);
  };

  return { toggleThemeWithTransition };
}
