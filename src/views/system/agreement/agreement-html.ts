import DOMPurify from 'dompurify';

export const INITIAL_VERSION = '1.0';

const VERSION_MAX_LENGTH = 50;

const FORBIDDEN_TAGS = [
  'img',
  'picture',
  'video',
  'audio',
  'source',
  'track',
  'iframe',
  'embed',
  'object',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'style',
  'link',
  'meta',
  'colgroup',
  'col',
];

const ALLOWED_STYLE_PROPERTIES = new Set([
  'text-align',
  'text-indent',
  'font-weight',
  'font-style',
  'text-decoration',
  'font-size',
  'line-height',
]);

const SAFE_STYLE_VALUE = /^[\w\s.,%-]+$/;

export const AGREEMENT_MAX_BYTES = 250 * 1024;

const LINK_URL = /^(?:https?:\/\/[^\s/?#]+\S*|mailto:[^\s@]+@[^\s@]+)$/i;

/** 正文链接只允许 http、https 与 mailto */
export function isAllowedLinkUrl(url: string): boolean {
  return LINK_URL.test(url);
}

/** style 只保留排版类声明，其余声明丢弃 */
export function filterStyle(style: string): string {
  return style
    .split(';')
    .map(declaration => {
      const index = declaration.indexOf(':');
      if (index === -1) return null;
      const property = declaration.slice(0, index).trim().toLowerCase();
      const value = declaration.slice(index + 1).trim();
      if (!ALLOWED_STYLE_PROPERTIES.has(property) || !SAFE_STYLE_VALUE.test(value)) return null;
      return `${property}: ${value}`;
    })
    .filter((declaration): declaration is string => declaration !== null)
    .join('; ');
}

const purifier = DOMPurify();

purifier.addHook('uponSanitizeAttribute', (node, data) => {
  if (node.nodeName === 'A' && data.attrName !== 'href') {
    data.keepAttr = false;
    return;
  }
  if (data.attrName === 'href' && !isAllowedLinkUrl(data.attrValue)) {
    data.keepAttr = false;
    return;
  }
  if (data.attrName !== 'style') return;
  const style = filterStyle(data.attrValue);
  if (style) {
    data.attrValue = style;
  } else {
    data.keepAttr = false;
  }
});

/** 空段落补 <br>，小程序与预览中保留空行高度 */
purifier.addHook('afterSanitizeElements', node => {
  if (node.nodeName === 'P' && !node.hasChildNodes()) node.appendChild(node.ownerDocument!.createElement('br'));
});

/** 协议正文只保留文本类标签与排版样式，去掉脚本、事件属性与图片音视频等嵌入内容 */
export function sanitizeAgreementHtml(html: string): string {
  return purifier.sanitize(html, { FORBID_TAGS: FORBIDDEN_TAGS, FORBID_ATTR: ['srcset'] });
}

const BREAK_ONLY_PARAGRAPH = /<p(\s[^>]*)?>\s*<br\s*\/?>\s*<\/p>/gi;

/** 编辑器载入用：只含 <br> 的段落还原为空段落 */
export function toEditorHtml(html: string): string {
  return html.replace(BREAK_ONLY_PARAGRAPH, '<p$1></p>');
}

/** 预览用：净化后链接在新窗口打开 */
export function renderAgreementPreview(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = sanitizeAgreementHtml(html);
  container.querySelectorAll('a[href]').forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
  return container.innerHTML;
}

export function isBlankHtml(html: string): boolean {
  const container = document.createElement('div');
  container.innerHTML = sanitizeAgreementHtml(html);
  return !container.textContent?.trim() && !container.querySelector('table, hr');
}

/** 校验净化后的正文，通过返回 null，否则返回提示文案 */
export function checkAgreementContent(sanitizedHtml: string): string | null {
  if (isBlankHtml(sanitizedHtml)) return '请输入协议正文';
  if (new Blob([sanitizedHtml]).size > AGREEMENT_MAX_BYTES) return '协议正文超过 250KB，请精简后再保存';
  return null;
}

/** 末尾数字段加一：1.0 → 1.1、1.9 → 1.10、v2 → v3；无数字时追加 .1，无版本时为 1.0 */
export function suggestNextVersion(current: string | null | undefined): string {
  const text = current?.trim();
  if (!text) return INITIAL_VERSION;
  const match = /(\d+)(\D*)$/.exec(text);
  if (!match) return `${text}.1`;
  const [, digits, suffix] = match;
  const next = (BigInt(digits) + 1n).toString().padStart(digits.length, '0');
  return `${text.slice(0, match.index)}${next}${suffix}`;
}

/** 校验新版本号，通过返回 true，否则返回提示文案 */
export function validateNextVersion(input: string, current: string | null | undefined): true | string {
  const text = input.trim();
  if (!text) return '请输入新版本号';
  if (text.length > VERSION_MAX_LENGTH) return `版本号不超过 ${VERSION_MAX_LENGTH} 个字符`;
  if (text === current?.trim()) return '新版本号须与当前版本不同';
  return true;
}
