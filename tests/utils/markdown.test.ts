import { describe, it, expect } from 'vitest';
import {
  fileReference,
  insertFileReference,
  markdownSummary,
  parseFileReference,
  renderMarkdown,
} from '@/utils/markdown';

const FILE_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('parseFileReference', () => {
  it('识别 file:{fileId} 并统一为小写', () => {
    expect(parseFileReference(`file:${FILE_ID.toUpperCase()}`)).toBe(FILE_ID);
    expect(fileReference(FILE_ID)).toBe(`file:${FILE_ID}`);
  });

  it('非文件引用返回 null', () => {
    expect(parseFileReference('https://example.com/a.png')).toBeNull();
    expect(parseFileReference('file:not-a-uuid')).toBeNull();
    expect(parseFileReference(undefined)).toBeNull();
  });
});

describe('insertFileReference', () => {
  it('在光标处插入图片引用并返回插入后的光标位置', () => {
    const result = insertFileReference('甲乙', { start: 1, end: 1 }, FILE_ID);

    expect(result.text).toBe(`甲![图片](file:${FILE_ID})乙`);
    expect(result.cursor).toBe(1 + `![图片](file:${FILE_ID})`.length);
  });

  it('选中文字作为图片说明并替换选区', () => {
    const result = insertFileReference('看图表一说明', { start: 1, end: 4 }, FILE_ID);

    expect(result.text).toBe(`看![图表一](file:${FILE_ID})说明`);
  });

  it('选区越界时收敛到文本范围内', () => {
    const result = insertFileReference('ab', { start: 10, end: 20 }, FILE_ID);

    expect(result.text).toBe(`ab![图片](file:${FILE_ID})`);
  });

  it('选中文字中的方括号与换行不进入图片说明', () => {
    const result = insertFileReference('[a]\nb', { start: 0, end: 5 }, FILE_ID);

    expect(result.text).toBe(`![a  b](file:${FILE_ID})`);
  });
});

describe('renderMarkdown', () => {
  it('渲染行内公式与块级公式', () => {
    const html = renderMarkdown('分数 $\\frac{a}{b}$ 如下\n\n$$\nx^2\n$$');

    expect(html).toContain('class="katex"');
    expect(html).toContain('md-math-block');
    expect(html).toContain('katex-display');
  });

  it('金额等两侧带空格的 $ 不当作公式', () => {
    const html = renderMarkdown('价格 $ 5 与 $ 6');

    expect(html).not.toContain('katex');
    expect(html).toContain('$ 5 与 $ 6');
  });

  it('file 引用的图片按解析函数替换为地址', () => {
    const html = renderMarkdown(`![图](file:${FILE_ID})`, id => (id === FILE_ID ? 'https://cdn/x.png' : undefined));

    expect(html).toContain('src="https://cdn/x.png"');
    expect(html).toContain('loading="lazy"');
  });

  it('无法解析的 file 引用显示占位文字', () => {
    const html = renderMarkdown(`![图](file:${FILE_ID})`);

    expect(html).toContain('md-file-missing');
    expect(html).not.toContain('<img');
  });

  it('普通图片地址原样保留', () => {
    expect(renderMarkdown('![](https://cdn/a.png)')).toContain('src="https://cdn/a.png"');
  });

  it('转义 HTML，不放行 javascript 链接', () => {
    const html = renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1))');

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
  });

  it('不放行 javascript: 与 data:image/svg+xml 图片', () => {
    const html = renderMarkdown('![a](javascript:alert(1)) ![b](data:image/svg+xml;base64,PHN2Zz4=)');

    expect(html).not.toContain('<img');
    expect(html).not.toContain('src="javascript:');
    expect(html).not.toContain('src="data:image/svg');
  });

  it('imagesAsLinks 把外链图片渲染为链接文本，不生成 img', () => {
    const html = renderMarkdown('![示意](https://cdn/a.png) ![](https://cdn/b.png)', undefined, {
      imagesAsLinks: true,
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('<a class="md-image-link" href="https://cdn/a.png"');
    expect(html).toContain('[图片 示意]');
    expect(html).toContain('[图片]</a>');
  });

  it('imagesAsLinks 下仍转义 HTML、不放行 javascript 链接与图片', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script> [x](javascript:alert(1)) ![a](javascript:alert(1)) ![b](https://x/"onerror=alert(1))',
      undefined,
      { imagesAsLinks: true },
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toMatch(/"\s*onerror=/);
  });

  it('KaTeX 不渲染 \\href 链接', () => {
    const html = renderMarkdown('$\\href{javascript:alert(1)}{点我}$');

    expect(html).not.toMatch(/<a[^>]*href=/);
  });

  it('首行 $$...$$ 后还有内容时不作为块级公式', () => {
    const html = renderMarkdown('$$x$$ 之后的文字');

    expect(html).not.toContain('md-math-block');
    expect(html).toContain('之后的文字');
    expect(html).toContain('katex-display');
  });

  it('单行块级公式与未闭合的块级公式', () => {
    expect(renderMarkdown('$$x^2$$')).toContain('md-math-block');
    const unclosed = renderMarkdown('$$\nx^2\n\n后文');
    expect(unclosed).not.toContain('md-math-block');
    expect(unclosed).toContain('后文');
  });

  it('列表中的块级公式需能闭合才中断列表', () => {
    const html = renderMarkdown('- 项目\n$$\n未闭合');

    expect(html).not.toContain('md-math-block');
    expect(html).toContain('<li>');
  });

  it('换行渲染为 <br>，空内容返回空串', () => {
    expect(renderMarkdown('a\nb')).toContain('<br>');
    expect(renderMarkdown(null)).toBe('');
  });
});

describe('markdownSummary', () => {
  it('图片记为 [图片]、合并空白并截断', () => {
    expect(markdownSummary(`如图 ![](file:${FILE_ID})\n\n**加粗**`)).toBe('如图 [图片] 加粗');
    expect(markdownSummary('一二三四五', 3)).toBe('一二三…');
    expect(markdownSummary(null)).toBe('');
  });
});
