/**
 * 日期处理相关工具函数
 * 提供日期格式化和字符串转日期等功能
 */

/**
 * 格式化日期为指定格式的字符串
 * @param date - 要格式化的日期对象
 * @param fmt - 格式化模板字符串，如'yyyy-MM-dd hh:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, fmt: string): string {
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, `${date.getFullYear()}`.substr(4 - RegExp.$1.length));
  }
  const o: { [key: string]: number } = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
  };
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      const str: string = `${o[k]}`;
      fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? str : padLeftZero(str));
    }
  }
  return fmt;
}

/**
 * 左侧补零工具函数
 * @param str - 要补零的字符串
 * @returns 补零后的字符串
 * @private
 */
function padLeftZero(str: string): string {
  return `00${str}`.substr(str.length);
}
