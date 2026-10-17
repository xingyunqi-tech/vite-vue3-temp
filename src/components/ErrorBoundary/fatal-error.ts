/**
 * 判断 Vue 交给 onErrorCaptured 的错误来源是否「会导致组件树渲染失败」
 *
 * Vue 只在 dev 下把来源写成可读文案（'render function'），生产下换成
 * `https://vuejs.org/error-reference/#runtime-<code>`，code 是 ErrorCodes 枚举值
 * 或生命周期钩子简写。只认文案的话，生产环境一个都命不中，错误边界形同虚设。
 */

/** dev 文案的关键词 */
const FATAL_DEV_HINTS = ['render', 'setup', 'hook', 'scheduler', 'async component', 'directive'];

/** 离场钩子（beforeUnmount / unmounted / deactivated）的文案关键词，不算致命 */
const LEAVE_DEV_HINTS = ['unmount', 'deactivated'];

/**
 * 生产 code 集合，与上面的文案判定逐项对齐（口径见 Vue 的 ErrorTypeStrings）
 *
 * 数字是 ErrorCodes：0 setup function / 1 render function / 7 vnode hook / 8 directive hook /
 * 9 transition hook / 13 async component loader / 14 scheduler flush；
 * 字母是生命周期钩子简写，文案均以 hook 结尾（rtc / rtg 命中的是 render），不含离场钩子 bum / um / da。
 */
const FATAL_ERROR_CODES = new Set([
  '0',
  '1',
  '7',
  '8',
  '9',
  '13',
  '14',
  'sp',
  'bc',
  'c',
  'bm',
  'm',
  'bu',
  'a',
  'ec',
  'rtc',
  'rtg',
]);

const RUNTIME_CODE_RE = /error-reference\/#runtime-(.+)$/;

export function isFatalRenderError(errorInfo: string): boolean {
  const code = RUNTIME_CODE_RE.exec(errorInfo ?? '')?.[1];
  if (code !== undefined) return FATAL_ERROR_CODES.has(code);

  const info = (errorInfo || '').toLowerCase();
  if (LEAVE_DEV_HINTS.some(hint => info.includes(hint))) return false;
  return FATAL_DEV_HINTS.some(hint => info.includes(hint));
}
