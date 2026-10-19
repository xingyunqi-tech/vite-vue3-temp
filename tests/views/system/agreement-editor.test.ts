import { EditorContent, type Editor } from '@tiptap/vue-3';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { ElMessage, ElMessageBox } from 'element-plus';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { sanitizeAgreementHtml } from '@/views/system/agreement/agreement-html';
import AgreementEditor from '@/views/system/agreement/components/AgreementEditor.vue';

const emptyRect = (): DOMRect => ({
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
});

const emptyRectList = (): DOMRectList => Object.assign([], { item: () => null }) as unknown as DOMRectList;

/** jsdom 未实现布局相关 API，ProseMirror 计算选区坐标与滚动时会用到 */
beforeAll(() => {
  Range.prototype.getBoundingClientRect = emptyRect;
  Range.prototype.getClientRects = emptyRectList;
  Element.prototype.getClientRects = emptyRectList;
  document.elementFromPoint = () => null;
});

let wrapper: VueWrapper | undefined;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => ({ close: () => {} }) as never);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
});

async function mountEditor(modelValue = '<p>条款正文</p>') {
  wrapper = mount(AgreementEditor, {
    props: {
      modelValue,
      'onUpdate:modelValue': (value: string) => wrapper?.setProps({ modelValue: value }),
    },
    attachTo: document.body,
  });
  await nextTick();
  const editor = wrapper.findComponent(EditorContent).props('editor') as Editor;
  if (!editor.isInitialized) await new Promise(resolve => editor.once('create', resolve));
  await flushPromises();
  return { wrapper, editor };
}

const lastEmitted = (target: VueWrapper): string | undefined => {
  const events = target.emitted('update:modelValue') as string[][] | undefined;
  return events?.at(-1)?.[0];
};

const button = (target: VueWrapper, label: string) => target.find(`button[aria-label="${label}"]`);

async function clickDropdownItem(target: VueWrapper, trigger: string, label: string) {
  await button(target, trigger).trigger('click');
  await flushPromises();
  const item = Array.from(document.body.querySelectorAll<HTMLElement>('.el-dropdown-menu__item')).find(
    element => element.textContent?.trim() === label,
  );
  expect(item, `下拉项 ${label}`).toBeDefined();
  item!.click();
  await flushPromises();
}

const pasteEvent = (data: Partial<DataTransfer>) => {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: { files: [], getData: () => '', types: [], ...data },
  });
  return event;
};

describe('AgreementEditor 内容同步', () => {
  it('以 modelValue 作为初始内容，未改动时不回写', async () => {
    const { wrapper, editor } = await mountEditor('<h2>第一条</h2><p>条款正文</p>');

    expect(editor.getHTML()).toBe('<h2>第一条</h2><p>条款正文</p>');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('初始内容中不支持的节点被丢弃并回写规范化后的正文', async () => {
    const { wrapper } = await mountEditor(
      '<p>正文<img src="x.png"><span style="color: red">红字</span><mark>高亮</mark></p><pre><code>code</code></pre>',
    );

    expect(lastEmitted(wrapper)).toBe('<p>正文红字高亮</p><p>code</p>');
  });

  it('输入后经 update:modelValue 回写 HTML，清空时回写空串', async () => {
    const { wrapper, editor } = await mountEditor();

    editor.commands.insertContentAt(editor.state.doc.content.size - 1, '补充');
    expect(lastEmitted(wrapper)).toBe('<p>条款正文补充</p>');

    editor.commands.clearContent(true);
    expect(lastEmitted(wrapper)).toBe('');
  });

  it('外部值变化时同步内容，不触发回写且不进撤销栈', async () => {
    const { wrapper, editor } = await mountEditor('<p>旧版本</p>');
    editor.commands.insertContentAt(1, '修改');
    const emittedCount = wrapper.emitted('update:modelValue')!.length;

    await wrapper.setProps({ modelValue: '<p>新版本</p>' });

    expect(editor.getHTML()).toBe('<p>新版本</p>');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(emittedCount);
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>新版本</p>');
  });

  it('只含 <br> 的段落载入为空段落', async () => {
    const { wrapper, editor } = await mountEditor('<p>a</p><p><br></p><p style="text-align: center;"><br></p>');

    expect(editor.getHTML()).toBe('<p>a</p><p></p><p style="text-align: center;"></p>');
    expect(editor.state.doc.child(1).childCount).toBe(0);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await wrapper.setProps({ modelValue: '<p>b</p><p><br></p>' });
    expect(editor.getHTML()).toBe('<p>b</p><p></p>');
  });

  it('外部值与当前内容净化后一致时保留选区与撤销栈', async () => {
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    editor.commands.insertContentAt(3, '一');
    editor.commands.insertContentAt(1, '<p>a</p><p></p>');
    const { doc, selection } = editor.state;

    await wrapper.setProps({ modelValue: sanitizeAgreementHtml(editor.getHTML()) });

    expect(editor.state.doc).toBe(doc);
    expect(editor.state.selection.eq(selection)).toBe(true);
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>条款一</p>');
  });

  it('外部值与当前内容一致时不重置内容', async () => {
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    const doc = editor.state.doc;

    await wrapper.setProps({ modelValue: '<p>条款</p>' });

    expect(editor.state.doc).toBe(doc);
  });

  it('卸载时销毁编辑器', async () => {
    const { wrapper, editor } = await mountEditor();

    wrapper.unmount();

    expect(editor.isDestroyed).toBe(true);
  });
});

describe('AgreementEditor 工具栏', () => {
  it('加粗、斜体、下划线、删除线作用于选区并显示激活态', async () => {
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    editor.commands.selectAll();

    for (const label of ['加粗', '斜体', '下划线', '删除线']) {
      await button(wrapper, label).trigger('click');
    }
    await nextTick();

    expect(lastEmitted(wrapper)).toBe('<p><strong><em><s><u>条款</u></s></em></strong></p>');
    expect(button(wrapper, '加粗').classes()).toContain('is-active');
    expect(button(wrapper, '加粗').attributes('aria-pressed')).toBe('true');
    expect(button(wrapper, '居中').classes()).not.toContain('is-active');
  });

  it('标题下拉切换标题级别与正文', async () => {
    const { wrapper } = await mountEditor('<p>第一条</p>');

    await clickDropdownItem(wrapper, '段落格式', '标题 2');
    expect(lastEmitted(wrapper)).toBe('<h2>第一条</h2>');
    expect(button(wrapper, '段落格式').text()).toBe('标题 2');

    await clickDropdownItem(wrapper, '段落格式', '正文');
    expect(lastEmitted(wrapper)).toBe('<p>第一条</p>');
  });

  it('有序、无序列表与引用、分割线', async () => {
    const { wrapper, editor } = await mountEditor('<p>一</p>');

    await button(wrapper, '有序列表').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<ol><li><p>一</p></li></ol>');

    await button(wrapper, '无序列表').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<ul><li><p>一</p></li></ul>');

    editor.commands.setContent('<p>引文</p>');
    await button(wrapper, '引用').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<blockquote><p>引文</p></blockquote>');

    editor.commands.setContent('<p>上</p>');
    editor.commands.focus('end');
    await button(wrapper, '分割线').trigger('click');
    expect(lastEmitted(wrapper)).toContain('<p>上</p><hr>');
  });

  it('对齐输出 text-align 样式', async () => {
    const { wrapper } = await mountEditor('<p>居中段落</p>');

    await button(wrapper, '居中').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<p style="text-align: center;">居中段落</p>');
    expect(button(wrapper, '居中').classes()).toContain('is-active');

    await button(wrapper, '右对齐').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<p style="text-align: right;">居中段落</p>');
  });

  it('撤销与重做', async () => {
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    expect(button(wrapper, '撤销').attributes('disabled')).toBeDefined();

    editor.commands.selectAll();
    await button(wrapper, '加粗').trigger('click');
    expect(button(wrapper, '撤销').attributes('disabled')).toBeUndefined();

    await button(wrapper, '撤销').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<p>条款</p>');

    await button(wrapper, '重做').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<p><strong>条款</strong></p>');
  });

  it('清除格式去掉标记、标题与对齐', async () => {
    const { wrapper, editor } = await mountEditor('<h2 style="text-align: center"><strong>标题</strong></h2>');
    editor.commands.selectAll();

    await button(wrapper, '清除格式').trigger('click');

    expect(lastEmitted(wrapper)).toBe('<p>标题</p>');
  });
});

describe('AgreementEditor 链接', () => {
  it('为选区设置合法链接，取消链接后恢复纯文本', async () => {
    const prompt = vi
      .spyOn(ElMessageBox, 'prompt')
      .mockResolvedValue({ value: ' https://example.com/terms ', action: 'confirm' } as never);
    const { wrapper, editor } = await mountEditor('<p>隐私政策</p>');
    editor.commands.selectAll();

    await button(wrapper, '链接').trigger('click');
    await flushPromises();

    expect(prompt).toHaveBeenCalledWith(expect.any(String), '插入链接', expect.objectContaining({ inputValue: '' }));
    expect(lastEmitted(wrapper)).toBe('<p><a href="https://example.com/terms">隐私政策</a></p>');
    expect(button(wrapper, '链接').classes()).toContain('is-active');

    await button(wrapper, '取消链接').trigger('click');
    expect(lastEmitted(wrapper)).toBe('<p>隐私政策</p>');
  });

  it('无选区时插入以网址为文本的链接', async () => {
    vi.spyOn(ElMessageBox, 'prompt').mockResolvedValue({
      value: 'mailto:help@example.com',
      action: 'confirm',
    } as never);
    const { wrapper, editor } = await mountEditor('<p>联系：</p>');
    editor.commands.focus('end');

    await button(wrapper, '链接').trigger('click');
    await flushPromises();

    expect(lastEmitted(wrapper)).toBe('<p>联系：<a href="mailto:help@example.com">mailto:help@example.com</a></p>');
  });

  it('输入框校验只放行 http、https 与 mailto', async () => {
    let validator: ((value: string) => unknown) | undefined;
    vi.spyOn(ElMessageBox, 'prompt').mockImplementation((async (
      _message: string,
      _title: string,
      options: { inputValidator: (value: string) => unknown },
    ) => {
      validator = options.inputValidator;
      throw 'cancel';
    }) as never);
    const { wrapper } = await mountEditor();

    await button(wrapper, '链接').trigger('click');
    await flushPromises();

    expect(validator?.('https://example.com')).toBe(true);
    expect(validator?.('http://example.com/a?b=1')).toBe(true);
    expect(validator?.('mailto:a@example.com')).toBe(true);
    for (const value of ['javascript:alert(1)', 'ftp://example.com', 'example.com', 'https://', '']) {
      expect(validator?.(value)).toBe('请输入以 http://、https:// 或 mailto: 开头的链接');
    }
  });

  it('非法链接不写入并提示', async () => {
    vi.spyOn(ElMessageBox, 'prompt').mockResolvedValue({ value: 'javascript:alert(1)', action: 'confirm' } as never);
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    editor.commands.selectAll();

    await button(wrapper, '链接').trigger('click');
    await flushPromises();

    expect(ElMessage.warning).toHaveBeenCalledWith('请输入以 http://、https:// 或 mailto: 开头的链接');
    expect(editor.getHTML()).toBe('<p>条款</p>');
  });

  it('不在链接内时取消链接不可用', async () => {
    const { wrapper } = await mountEditor('<p>条款</p>');

    expect(button(wrapper, '取消链接').attributes('disabled')).toBeDefined();
  });

  it('选中文字粘贴非 http/https/mailto 地址不生成链接', async () => {
    const { editor } = await mountEditor('<p>条款</p>');
    editor.commands.selectAll();

    editor.view.pasteText('ftp://example.com', pasteEvent({}));

    expect(editor.getHTML()).toBe('<p>ftp://example.com</p>');
  });

  it('选中文字粘贴 https 地址生成链接', async () => {
    const { editor } = await mountEditor('<p>条款</p>');
    editor.commands.selectAll();

    editor.view.pasteText('https://example.com', pasteEvent({}));

    expect(editor.getHTML()).toBe('<p><a href="https://example.com">条款</a></p>');
  });

  it('非法链接经命令写入时被拒绝', async () => {
    const { editor } = await mountEditor('<p>条款</p>');
    editor.commands.selectAll();

    expect(editor.commands.setLink({ href: 'javascript:alert(1)' })).toBe(false);
    expect(editor.getHTML()).toBe('<p>条款</p>');
  });
});

describe('AgreementEditor 表格', () => {
  const tableShape = (editor: Editor) =>
    Array.from(editor.view.dom.querySelectorAll('tr')).map(row =>
      Array.from(row.children).map(cell => cell.tagName.toLowerCase()),
    );

  it('插入 3×3 表格，首行为表头，编辑区包裹可横向滚动的容器', async () => {
    const { wrapper, editor } = await mountEditor('<p>前文</p>');
    editor.commands.focus('end');

    await clickDropdownItem(wrapper, '表格', '插入表格（3×3）');

    expect(tableShape(editor)).toEqual([
      ['th', 'th', 'th'],
      ['td', 'td', 'td'],
      ['td', 'td', 'td'],
    ]);
    expect(editor.view.dom.querySelector('.tableWrapper > table')).not.toBeNull();
    expect(lastEmitted(wrapper)).toContain('<tr><th><p></p></th><th><p></p></th><th><p></p></th></tr>');
    expect(button(wrapper, '表格').classes()).toContain('is-active');
  });

  it('增删行列与删除表格', async () => {
    const { wrapper, editor } = await mountEditor('<p>前文</p>');
    editor.commands.focus('end');
    await clickDropdownItem(wrapper, '表格', '插入表格（3×3）');

    await clickDropdownItem(wrapper, '表格', '在下方插入行');
    expect(tableShape(editor)).toHaveLength(4);

    await clickDropdownItem(wrapper, '表格', '在右侧插入列');
    expect(tableShape(editor)[0]).toHaveLength(4);

    await clickDropdownItem(wrapper, '表格', '删除当前列');
    expect(tableShape(editor)[0]).toHaveLength(3);

    await clickDropdownItem(wrapper, '表格', '删除当前行');
    expect(tableShape(editor)).toHaveLength(3);

    await clickDropdownItem(wrapper, '表格', '删除表格');
    expect(editor.view.dom.querySelector('table')).toBeNull();
    expect(lastEmitted(wrapper)).not.toContain('<table');
  });

  it('光标在表格内时插入表格不可用', async () => {
    const { wrapper, editor } = await mountEditor('<p>前文</p>');
    editor.commands.focus('end');
    await clickDropdownItem(wrapper, '表格', '插入表格（3×3）');

    await button(wrapper, '表格').trigger('click');
    await flushPromises();

    const insert = Array.from(document.body.querySelectorAll('.agreement-editor__table-option')).find(
      item => item.textContent?.trim() === '插入表格（3×3）',
    );
    expect(insert?.classList.contains('is-disabled')).toBe(true);
  });

  it('不在表格内时行列操作不可用', async () => {
    const { wrapper } = await mountEditor('<p>前文</p>');

    await button(wrapper, '表格').trigger('click');
    await flushPromises();

    const disabled = Array.from(document.body.querySelectorAll('.agreement-editor__table-option'))
      .filter(item => item.classList.contains('is-disabled'))
      .map(item => item.textContent?.trim());
    expect(disabled).toEqual(['在下方插入行', '删除当前行', '在右侧插入列', '删除当前列', '删除表格']);
  });
});

describe('AgreementEditor 粘贴', () => {
  it('粘贴 HTML 时丢弃图片、脚本、颜色与不支持的格式，并提示不支持图片', async () => {
    const { wrapper, editor } = await mountEditor('<p></p>');

    editor.view.pasteHTML(
      '<p>首段</p><p style="color: red; background-color: yellow; text-align: center">红色<img src="https://a.com/x.png"><script>alert(1)</script><span style="color: blue; font-family: serif">蓝色</span><mark>高亮</mark><code>代码</code></p><h6>六级标题</h6><pre><code>块</code></pre><p><a href="javascript:alert(1)">伪链接</a></p>',
      pasteEvent({}),
    );

    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文不支持图片');
    expect(lastEmitted(wrapper)).toBe(
      '<p>首段</p><p style="text-align: center;">红色蓝色高亮代码</p><p>六级标题</p><p>块</p><p>伪链接</p>',
    );
  });

  it('粘贴不含图片的 HTML 不提示', async () => {
    const { editor } = await mountEditor('<p></p>');

    editor.view.pasteHTML('<p><strong>加粗</strong></p>', pasteEvent({}));

    expect(editor.getHTML()).toBe('<p><strong>加粗</strong></p>');
    expect(ElMessage.warning).not.toHaveBeenCalled();
  });

  it('剪贴板含图片文件与纯文本但无 HTML 时阻止粘贴并提示', async () => {
    const { editor } = await mountEditor('<p>条款</p>');
    const event = pasteEvent({
      files: [new File(['x'], 'shot.png', { type: 'image/png' })] as unknown as FileList,
      getData: (type: string) => (type === 'text/plain' ? 'shot.png' : ''),
    });

    editor.view.dom.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文不支持图片');
    expect(editor.getHTML()).toBe('<p>条款</p>');
  });

  it('剪贴板含图片文件与 HTML 时粘贴 HTML 文本', async () => {
    const { editor } = await mountEditor('<p></p>');
    const event = pasteEvent({
      files: [new File(['x'], 'shot.png', { type: 'image/png' })] as unknown as FileList,
      getData: (type: string) => (type === 'text/html' ? '<p>说明<img src="x.png"></p>' : ''),
    });

    editor.view.dom.dispatchEvent(event);

    expect(editor.getHTML()).toBe('<p>说明</p>');
    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文不支持图片');
  });

  it('只粘贴图片文件时提示且不改动正文', async () => {
    const { wrapper, editor } = await mountEditor('<p>条款</p>');
    const event = pasteEvent({ files: [new File(['x'], 'shot.png', { type: 'image/png' })] as unknown as FileList });

    editor.view.dom.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文不支持图片');
    expect(editor.getHTML()).toBe('<p>条款</p>');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
