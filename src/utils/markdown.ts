import katex from 'katex';
import MarkdownIt, { type RendererRule as RenderRule, type StateBlock, type StateInline } from 'markdown-it';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FILE_REFERENCE = new RegExp(`^file:(${UUID})$`, 'i');

export type FileUrlResolver = (fileId: string) => string | undefined;

export interface RenderOptions {
  /** 图片渲染为链接文本，不自动加载 */
  imagesAsLinks?: boolean;
}

interface RenderEnv extends RenderOptions {
  resolveFile?: FileUrlResolver;
}

export function fileReference(fileId: string): string {
  return `file:${fileId}`;
}

/** `file:{fileId}` 返回 fileId，其余返回 null */
export function parseFileReference(src: string | null | undefined): string | null {
  const match = src ? FILE_REFERENCE.exec(src.trim()) : null;
  return match ? match[1].toLowerCase() : null;
}

export interface TextSelection {
  start: number;
  end: number;
}

/** 在选区处插入 `![说明](file:{fileId})`，选中的文字作为图片说明，返回新文本与插入后的光标位置 */
export function insertFileReference(
  text: string,
  selection: TextSelection,
  fileId: string,
  alt = '图片',
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const caption =
    text
      .slice(start, end)
      .replace(/[[\]\n]/g, ' ')
      .trim() || alt;
  const snippet = `![${caption}](${fileReference(fileId)})`;
  const next = text.slice(0, start) + snippet + text.slice(end);
  return { text: next, cursor: start + snippet.length };
}

function renderMath(content: string, displayMode: boolean): string {
  return katex.renderToString(content, {
    displayMode,
    throwOnError: false,
    output: 'html',
    maxSize: 10,
    maxExpand: 100,
    strict: 'ignore',
  });
}

function findClosing(src: string, from: number, delimiter: string): number {
  let index = src.indexOf(delimiter, from);
  while (index > 0 && src[index - 1] === '\\') index = src.indexOf(delimiter, index + 1);
  return index;
}

function mathInline(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src[pos] !== '$') return false;
  const display = src[pos + 1] === '$';
  const delimiter = display ? '$$' : '$';
  const contentStart = pos + delimiter.length;
  const close = findClosing(src, contentStart, delimiter);
  if (close < 0 || close === contentStart) return false;
  const content = src.slice(contentStart, close);
  if (!display && (/^\s/.test(content) || /\s$/.test(content))) return false;
  if (!silent) {
    const token = state.push(display ? 'math_inline_display' : 'math_inline', 'math', 0);
    token.content = content;
  }
  state.pos = close + delimiter.length;
  return true;
}

function findMathBlock(state: StateBlock, startLine: number, endLine: number): { end: number; content: string } | null {
  const lineText = (line: number) => state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  const first = lineText(startLine).trimEnd();
  if (!first.startsWith('$$')) return null;

  const rest = first.slice(2);
  const sameLineClose = rest.indexOf('$$');
  if (sameLineClose >= 0) {
    return sameLineClose === rest.length - 2 ? { end: startLine, content: rest.slice(0, sameLineClose) } : null;
  }

  const lines = [rest];
  for (let line = startLine + 1; line < endLine; line += 1) {
    const text = lineText(line).trimEnd();
    if (text.endsWith('$$')) {
      lines.push(text.slice(0, -2));
      return { end: line, content: lines.join('\n') };
    }
    lines.push(text);
  }
  return null;
}

function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const block = findMathBlock(state, startLine, endLine);
  if (!block) return false;
  if (silent) return true;

  state.line = block.end + 1;
  const token = state.push('math_display', 'math', 0);
  token.block = true;
  token.content = block.content.trim();
  token.map = [startLine, state.line];
  return true;
}

function resolveSource(src: string, env: RenderEnv): { url: string | null; fileId: string | null } {
  const fileId = parseFileReference(src);
  if (!fileId) return { url: src, fileId: null };
  return { url: env.resolveFile?.(fileId) ?? null, fileId };
}

export function createMarkdownRenderer(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, breaks: true });
  const validateLink = md.validateLink.bind(md);
  md.validateLink = url => parseFileReference(url) !== null || validateLink(url);

  md.inline.ruler.before('escape', 'math_inline', mathInline);
  md.block.ruler.before('fence', 'math_block', mathBlock, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  md.renderer.rules.math_inline = (tokens, index) => renderMath(tokens[index].content, false);
  md.renderer.rules.math_inline_display = (tokens, index) => renderMath(tokens[index].content, true);
  md.renderer.rules.math_display = (tokens, index) =>
    `<div class="md-math-block">${renderMath(tokens[index].content, true)}</div>`;

  const image: RenderRule = (tokens, index, options, env: RenderEnv, self) => {
    const token = tokens[index];
    const { url, fileId } = resolveSource(token.attrGet('src') ?? '', env);
    if (url === null) return `<span class="md-file-missing">[图片 ${md.utils.escapeHtml(fileId ?? '')}]</span>`;
    if (env.imagesAsLinks) {
      const alt = self.renderInlineAsText(token.children ?? [], options, env);
      const label = md.utils.escapeHtml(alt ? `[图片 ${alt}]` : '[图片]');
      const href = md.utils.escapeHtml(url);
      return `<a class="md-image-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    token.attrSet('src', url);
    token.attrSet('loading', 'lazy');
    return self.renderToken(tokens, index, options);
  };
  md.renderer.rules.image = image;

  const linkOpen: RenderRule = (tokens, index, options, env: RenderEnv, self) => {
    const token = tokens[index];
    const { url } = resolveSource(token.attrGet('href') ?? '', env);
    token.attrSet('href', url ?? '#');
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
    return self.renderToken(tokens, index, options);
  };
  md.renderer.rules.link_open = linkOpen;

  return md;
}

let renderer: MarkdownIt | null = null;

/** 渲染题目内容：Markdown + `$...$` / `$$...$$` 公式，`file:{fileId}` 图片经 resolveFile 换成地址 */
export function renderMarkdown(
  text: string | null | undefined,
  resolveFile?: FileUrlResolver,
  options: RenderOptions = {},
): string {
  if (!text) return '';
  renderer ??= createMarkdownRenderer();
  return renderer.render(text, { ...options, resolveFile } satisfies RenderEnv);
}

/** 列表摘要：图片记为「[图片]」，公式保留原文，合并空白并截断 */
export function markdownSummary(text: string | null | undefined, maxLength = 80): string {
  const plain = (text ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[图片]')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}
