/**
 * 站点配置颜色字段的解析与比较
 *
 * 支持 #rgb / #rgba / #rrggbb / #rrggbbaa，以及 rgb() / rgba() 的逗号与空格两种写法（alpha 可为小数或百分比）。
 */

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_RE = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*(.+?)\s*\)$/i;

function parseHex(value: string): RGBA | null {
  const match = HEX_RE.exec(value);
  if (!match) return null;
  let hex = match[1];
  if (hex.length <= 4) hex = [...hex].map(ch => ch + ch).join('');
  const channel = (index: number) => parseInt(hex.slice(index, index + 2), 16);
  return { r: channel(0), g: channel(2), b: channel(4), a: hex.length === 8 ? channel(6) / 255 : 1 };
}

const CHANNEL_RE = /^\d+(\.\d+)?$/;
const ALPHA_RE = /^(\d+(\.\d+)?|\.\d+)%?$/;

function parseChannel(token: string): number | null {
  if (!CHANNEL_RE.test(token)) return null;
  const n = Number(token);
  return n <= 255 ? n : null;
}

function parseAlpha(token: string): number | null {
  if (!ALPHA_RE.test(token)) return null;
  const percent = token.endsWith('%');
  const n = Number(percent ? token.slice(0, -1) : token);
  const alpha = percent ? n / 100 : n;
  return alpha <= 1 ? alpha : null;
}

function parseRgb(value: string): RGBA | null {
  const match = RGB_RE.exec(value);
  if (!match) return null;
  const body = match[1];
  let channels: string[];
  let alphaToken: string | undefined;
  if (body.includes(',')) {
    const parts = body.split(',');
    if (parts.length > 4) return null;
    channels = parts.slice(0, 3);
    alphaToken = parts[3];
  } else {
    const [color, alpha, ...rest] = body.split('/');
    if (rest.length > 0) return null;
    channels = color.trim().split(/\s+/);
    alphaToken = alpha;
  }
  if (channels.length !== 3) return null;
  const [r, g, b] = channels.map(token => parseChannel(token.trim()));
  const a = alphaToken === undefined ? 1 : parseAlpha(alphaToken.trim());
  if (r === null || g === null || b === null || a === null) return null;
  return { r, g, b, a };
}

function parseColor(value: string): RGBA | null {
  const trimmed = value.trim();
  return parseHex(trimmed) ?? parseRgb(trimmed);
}

/** 颜色值是否可识别 */
export function isValidColor(value: string): boolean {
  return parseColor(value) !== null;
}

/** 两个颜色是否等值（按解析结果比较，任一侧解析不了时退回字符串比较） */
export function isSameColor(a: string, b: string): boolean {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return a === b;
  return x.r === y.r && x.g === y.g && x.b === y.b && Math.abs(x.a - y.a) < 1 / 255;
}

/** 颜色是否带透明度（解析不了时按「不带」处理，交给 isValidColor 报错） */
export function hasAlpha(value: string): boolean {
  const color = parseColor(value);
  return color !== null && color.a < 1;
}
