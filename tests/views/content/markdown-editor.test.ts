import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadContentFile } from '@/api';
import MarkdownEditor from '@/views/content/shared/components/MarkdownEditor.vue';

vi.mock('@/api', () => ({
  uploadContentFile: vi.fn(),
}));

const FILE_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadContentFile).mockResolvedValue({ id: FILE_ID, path: 'https://cdn/a.png' });
});

async function chooseFile(wrapper: ReturnType<typeof mount>, file: File) {
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
  await input.trigger('change');
  await flushPromises();
}

describe('Markdown 编辑器', () => {
  it('上传图片后在光标处插入 file 引用', async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: '前后' }, attachTo: document.body });
    const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
    textarea.setSelectionRange(1, 1);
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    await chooseFile(wrapper, file);

    expect(uploadContentFile).toHaveBeenCalledWith(file, 'content-image');
    expect(wrapper.emitted('uploaded')?.[0]).toEqual([{ id: FILE_ID, path: 'https://cdn/a.png' }]);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([`前![图片](file:${FILE_ID})后`]);
    wrapper.unmount();
  });

  it('上传失败时不修改内容', async () => {
    vi.mocked(uploadContentFile).mockRejectedValueOnce(new Error('fail'));
    const wrapper = mount(MarkdownEditor, { props: { modelValue: 'x' } });

    await chooseFile(wrapper, new File(['x'], 'a.png'));

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('勾选预览后按已上传文件渲染图片', async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: `![](file:${FILE_ID})`, fileUrls: { [FILE_ID]: 'https://cdn/a.png' } },
    });

    await wrapper.find('.el-checkbox input').setValue(true);

    expect(wrapper.find('.markdown-editor__preview img').attributes('src')).toBe('https://cdn/a.png');
  });
});
