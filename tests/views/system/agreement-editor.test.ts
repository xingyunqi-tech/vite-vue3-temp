import { mount } from '@vue/test-utils';
import { ElMessage } from 'element-plus';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import AgreementEditor from '@/views/system/agreement/components/AgreementEditor.vue';

vi.mock('@wangeditor-next/editor/dist/css/style.css', () => ({}));

vi.mock('@wangeditor-next/editor-for-vue', () => ({
  Editor: defineComponent({
    name: 'EditorStub',
    props: { modelValue: String, defaultConfig: Object, mode: String },
    emits: ['update:modelValue', 'onCreated', 'customAlert'],
    setup: () => () => h('div', { class: 'editor-stub' }),
  }),
  Toolbar: defineComponent({
    name: 'ToolbarStub',
    props: { editor: Object, defaultConfig: Object, mode: String },
    setup: () => () => h('div', { class: 'toolbar-stub' }),
  }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(ElMessage, 'warning').mockImplementation(() => ({ close: () => {} }) as never);
});

function mountEditor() {
  return mount(AgreementEditor, { props: { modelValue: '<p>条款</p>' } });
}

describe('AgreementEditor', () => {
  it('工具栏排除图片、视频与颜色菜单', () => {
    const wrapper = mountEditor();

    const { excludeKeys } = wrapper.findComponent({ name: 'ToolbarStub' }).props('defaultConfig') as {
      excludeKeys: string[];
    };
    expect(excludeKeys).toEqual(
      expect.arrayContaining(['group-image', 'uploadImage', 'group-video', 'uploadVideo', 'color', 'bgColor']),
    );
  });

  it('编辑器配置不含 customAlert，图片上传直接拒绝', () => {
    const wrapper = mountEditor();

    const config = wrapper.findComponent({ name: 'EditorStub' }).props('defaultConfig') as {
      customAlert?: unknown;
      MENU_CONF: { uploadImage: { customUpload: () => void } };
    };
    expect(config.customAlert).toBeUndefined();

    const insert = vi.fn();
    (config.MENU_CONF.uploadImage.customUpload as (file: File, insertFn: unknown) => void)(
      new File(['x'], 'a.png'),
      insert,
    );
    expect(ElMessage.warning).toHaveBeenCalledWith('协议正文不支持图片');
    expect(insert).not.toHaveBeenCalled();
  });

  it('编辑器提示经 ElMessage 展示', () => {
    const error = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }) as never);
    const wrapper = mountEditor();

    wrapper.findComponent({ name: 'EditorStub' }).vm.$emit('customAlert', '上传失败', 'error');

    expect(error).toHaveBeenCalledWith('上传失败');
  });
});
