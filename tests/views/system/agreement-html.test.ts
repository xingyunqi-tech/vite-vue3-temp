import { describe, it, expect } from 'vitest';
import {
  AGREEMENT_MAX_BYTES,
  checkAgreementContent,
  filterStyle,
  isAllowedLinkUrl,
  isBlankHtml,
  renderAgreementPreview,
  sanitizeAgreementHtml,
  toEditorHtml,
  suggestNextVersion,
  validateNextVersion,
} from '@/views/system/agreement/agreement-html';

describe('suggestNextVersion', () => {
  it.each([
    ['1.0', '1.1'],
    ['1.9', '1.10'],
    ['2', '3'],
    ['v2.3', 'v2.4'],
    ['2026.01', '2026.02'],
    ['1.0-beta', '1.1-beta'],
    ['draft', 'draft.1'],
  ])('%s 建议升级为 %s', (current, next) => {
    expect(suggestNextVersion(current)).toBe(next);
  });

  it('超出安全整数的数字段按大整数递增', () => {
    expect(suggestNextVersion('9007199254740993')).toBe('9007199254740994');
    expect(suggestNextVersion('1.99999999999999999999')).toBe('1.100000000000000000000');
  });

  it('未设置版本时建议 1.0', () => {
    expect(suggestNextVersion(undefined)).toBe('1.0');
    expect(suggestNextVersion('  ')).toBe('1.0');
  });
});

describe('validateNextVersion', () => {
  it('拒绝空值、与当前相同或过长的版本号', () => {
    expect(validateNextVersion(' ', '1.0')).toBe('请输入新版本号');
    expect(validateNextVersion(' 1.0 ', '1.0')).toBe('新版本号须与当前版本不同');
    expect(validateNextVersion('1'.repeat(51), '1.0')).toBe('版本号不超过 50 个字符');
  });

  it('接受与当前不同的版本号', () => {
    expect(validateNextVersion('1.1', '1.0')).toBe(true);
    expect(validateNextVersion('1.0', undefined)).toBe(true);
  });
});

describe('sanitizeAgreementHtml', () => {
  it('去掉脚本、事件属性与 javascript 链接', () => {
    const html = sanitizeAgreementHtml(
      '<p onclick="alert(1)">条款</p><script>alert(1)</script><a href="javascript:alert(1)">链接</a>',
    );
    expect(html).not.toContain('script');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<p>条款</p>');
  });

  it('去掉图片、音视频与内嵌框架', () => {
    const html = sanitizeAgreementHtml(
      '<p>正文<img src="https://a.com/x.png"></p><video src="v.mp4"></video><iframe src="https://a.com"></iframe>',
    );
    expect(html).toBe('<p>正文</p>');
  });

  it('保留标题、列表、链接与表格', () => {
    const source =
      '<h1>标题</h1><ul><li>一</li></ul><a href="https://example.com">链接</a><table><tbody><tr><td>格</td></tr></tbody></table>';
    expect(sanitizeAgreementHtml(source)).toBe(source);
  });
});

describe('Tiptap 输出', () => {
  it('表格去掉 colgroup 与宽度样式，保留表头与单元格段落', () => {
    const html = sanitizeAgreementHtml(
      '<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="width: 120px;"></colgroup><tbody><tr><th><p>项目</p></th><th colspan="2"><p>说明</p></th></tr><tr><td><p>一</p></td><td style="text-align: center;"><p>二</p></td></tr></tbody></table>',
    );
    expect(html).toBe(
      '<table><tbody><tr><th><p>项目</p></th><th colspan="2"><p>说明</p></th></tr><tr><td><p>一</p></td><td style="text-align: center"><p>二</p></td></tr></tbody></table>',
    );
  });

  it('保留段落与标题的对齐样式及下划线、删除线', () => {
    const source =
      '<h2 style="text-align: center;">标题</h2><p style="text-align: right;"><u>下划线</u><s>删除线</s><br>换行</p><hr><blockquote><p>引用</p></blockquote>';
    expect(sanitizeAgreementHtml(source)).toBe(
      '<h2 style="text-align: center">标题</h2><p style="text-align: right"><u>下划线</u><s>删除线</s><br>换行</p><hr><blockquote><p>引用</p></blockquote>',
    );
  });
});

describe('空段落', () => {
  it('净化后空段落补 <br>', () => {
    expect(sanitizeAgreementHtml('<p>a</p><p></p>')).toBe('<p>a</p><p><br></p>');
    expect(sanitizeAgreementHtml('<p style="text-align: center;"></p>')).toBe('<p style="text-align: center"><br></p>');
  });

  it('预览中空段落保留 <br>', () => {
    expect(renderAgreementPreview('<p>a</p><p></p>')).toBe('<p>a</p><p><br></p>');
  });

  it('载入编辑器前只含 <br> 的段落还原为空段落', () => {
    expect(toEditorHtml('<p>a</p><p><br></p><p style="text-align: center"><br/></p><p>b<br></p>')).toBe(
      '<p>a</p><p></p><p style="text-align: center"></p><p>b<br></p>',
    );
  });
});

describe('链接净化', () => {
  it('a 只保留 href', () => {
    expect(
      sanitizeAgreementHtml(
        '<a href="https://example.com" class="x" rel="nofollow" title="t" target="_blank" style="font-weight: bold">链接</a>',
      ),
    ).toBe('<a href="https://example.com">链接</a>');
  });

  it('不允许的 href 被移除，保留文字', () => {
    expect(
      sanitizeAgreementHtml('<a href="ftp://example.com">一</a><a href="//example.com">二</a><a href="tel:110">三</a>'),
    ).toBe('<a>一</a><a>二</a><a>三</a>');
  });

  it('预览中只为合法链接追加新窗口属性', () => {
    expect(renderAgreementPreview('<a href="mailto:a@example.com">邮件</a><a href="data:text/html,x">坏</a>')).toBe(
      '<a href="mailto:a@example.com" target="_blank" rel="noopener noreferrer">邮件</a><a>坏</a>',
    );
  });
});

describe('isAllowedLinkUrl', () => {
  it.each(['https://example.com', 'http://example.com/a?b=1#c', 'HTTPS://EXAMPLE.COM', 'mailto:help@example.com'])(
    '%s 允许',
    url => {
      expect(isAllowedLinkUrl(url)).toBe(true);
    },
  );

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'ftp://example.com',
    'example.com',
    'https://',
    'mailto:',
    '',
    ' https://example.com',
    '\njavascript:alert(1)',
    '//example.com',
    'https://a b',
  ])('%s 不允许', url => {
    expect(isAllowedLinkUrl(url)).toBe(false);
  });
});

describe('style 净化', () => {
  it('只保留排版类声明', () => {
    expect(
      filterStyle(
        'text-align: center; position: fixed; z-index: 999; color: red; background-color: #fff; font-size: 16px; line-height: 1.5',
      ),
    ).toBe('text-align: center; font-size: 16px; line-height: 1.5');
  });

  it('丢弃含 url 或特殊字符的取值', () => {
    expect(filterStyle('font-size: expression(alert(1)); text-indent: url(x); font-weight: bold')).toBe(
      'font-weight: bold',
    );
  });

  it('净化后的标签只带允许的 style，无可用声明时去掉 style', () => {
    expect(
      sanitizeAgreementHtml(
        '<p style="text-align: center; position: absolute; color: red">居中</p><span style="background-color: yellow; z-index: 9">高亮</span>',
      ),
    ).toBe('<p style="text-align: center">居中</p><span>高亮</span>');
  });
});

describe('renderAgreementPreview', () => {
  it('净化后链接在新窗口打开', () => {
    expect(renderAgreementPreview('<a href="https://example.com" onclick="x()">链接</a><script>1</script>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">链接</a>',
    );
  });
});

describe('checkAgreementContent', () => {
  it('空正文与超过 250KB 的正文不通过', () => {
    expect(checkAgreementContent('<p><br></p>')).toBe('请输入协议正文');
    expect(checkAgreementContent(`<p>${'条'.repeat(AGREEMENT_MAX_BYTES / 3)}</p>`)).toBe(
      '协议正文超过 250KB，请精简后再保存',
    );
  });

  it('按 UTF-8 字节数计算体积', () => {
    expect(checkAgreementContent(`<p>${'a'.repeat(AGREEMENT_MAX_BYTES - 7)}</p>`)).toBeNull();
    expect(checkAgreementContent(`<p>${'a'.repeat(AGREEMENT_MAX_BYTES - 6)}</p>`)).toBe(
      '协议正文超过 250KB，请精简后再保存',
    );
  });
});

describe('isBlankHtml', () => {
  it('只有空段落或被净化掉的内容时视为空', () => {
    expect(isBlankHtml('')).toBe(true);
    expect(isBlankHtml('<p><br></p>')).toBe(true);
    expect(isBlankHtml('<p>&nbsp; </p><img src="x.png">')).toBe(true);
  });

  it('有文字或表格时不为空', () => {
    expect(isBlankHtml('<p>条款</p>')).toBe(false);
    expect(isBlankHtml('<table><tbody><tr><td></td></tr></tbody></table>')).toBe(false);
  });
});
