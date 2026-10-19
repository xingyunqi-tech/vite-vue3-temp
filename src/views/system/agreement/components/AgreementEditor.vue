<template>
  <div class="agreement-editor">
    <div class="agreement-editor__toolbar" role="toolbar" aria-label="正文格式">
      <el-dropdown trigger="click" :disabled="!editor" @command="setBlock">
        <el-button text size="small" class="agreement-editor__dropdown" aria-label="段落格式">
          {{ blockLabel }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="option in BLOCK_OPTIONS"
              :key="option.value"
              :command="option.value"
              :class="['agreement-editor__block-option', { 'is-active': option.label === blockLabel }]"
            >
              {{ option.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <template v-for="group in ACTION_GROUPS" :key="group[0].key">
        <el-divider direction="vertical" />
        <el-tooltip v-for="action in group" :key="action.key" :content="action.label" placement="top" :show-after="300">
          <el-button
            text
            size="small"
            class="agreement-editor__action"
            :class="{ 'is-active': isActionActive(action) }"
            :aria-label="action.label"
            :aria-pressed="action.active ? isActionActive(action) : undefined"
            :disabled="!canRun(action)"
            @click="runAction(action)"
          >
            <el-icon><component :is="action.icon" /></el-icon>
          </el-button>
        </el-tooltip>
      </template>

      <el-divider direction="vertical" />
      <el-dropdown trigger="click" :disabled="!editor" @command="runTableCommand">
        <el-button
          text
          size="small"
          class="agreement-editor__dropdown"
          :class="{ 'is-active': inTable }"
          aria-label="表格"
        >
          <el-icon><Grid /></el-icon>
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in TABLE_COMMANDS"
              :key="item.value"
              :command="item.value"
              :divided="item.divided"
              :disabled="!canRunTableCommand(item.value)"
              class="agreement-editor__table-option"
            >
              {{ item.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <EditorContent :editor="editor" class="agreement-editor__body" />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Brush, Grid, Link as LinkIcon, RefreshLeft, RefreshRight } from '@element-plus/icons-vue';
import type { ChainedCommands, Editor } from '@tiptap/core';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, h, ref, watch, type Component, type FunctionalComponent } from 'vue';
import { isAllowedLinkUrl, sanitizeAgreementHtml, toEditorHtml } from '../agreement-html';

interface Props {
  modelValue: string;
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = withDefaults(defineProps<Props>(), { placeholder: '请输入协议正文' });
const emit = defineEmits<Emits>();

const IMAGE_UNSUPPORTED = '协议正文不支持图片';
const LINK_INVALID = '请输入以 http://、https:// 或 mailto: 开头的链接';

type BlockValue = 'paragraph' | 1 | 2 | 3 | 4;

const BLOCK_OPTIONS: readonly { value: BlockValue; label: string }[] = [
  { value: 'paragraph', label: '正文' },
  { value: 1, label: '标题 1' },
  { value: 2, label: '标题 2' },
  { value: 3, label: '标题 3' },
  { value: 4, label: '标题 4' },
];

type TableCommand = 'insertTable' | 'addRowAfter' | 'deleteRow' | 'addColumnAfter' | 'deleteColumn' | 'deleteTable';

const TABLE_COMMANDS: readonly { value: TableCommand; label: string; divided?: boolean }[] = [
  { value: 'insertTable', label: '插入表格（3×3）' },
  { value: 'addRowAfter', label: '在下方插入行', divided: true },
  { value: 'deleteRow', label: '删除当前行' },
  { value: 'addColumnAfter', label: '在右侧插入列' },
  { value: 'deleteColumn', label: '删除当前列' },
  { value: 'deleteTable', label: '删除表格', divided: true },
];

const glyph =
  (text: string, modifier: string): FunctionalComponent =>
  () =>
    h('span', { class: ['agreement-editor__glyph', modifier] }, text);

const strokeIcon =
  (d: string): FunctionalComponent =>
  () =>
    h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      [h('path', { d })],
    );

interface ToolbarAction {
  key: string;
  label: string;
  icon: Component;
  command?: (chain: ChainedCommands) => ChainedCommands;
  onClick?: () => void;
  active?: (editor: Editor) => boolean;
  enabled?: (editor: Editor) => boolean;
}

const ACTION_GROUPS: readonly (readonly ToolbarAction[])[] = [
  [
    {
      key: 'bold',
      label: '加粗',
      icon: glyph('B', 'is-bold'),
      command: chain => chain.toggleBold(),
      active: editor => editor.isActive('bold'),
    },
    {
      key: 'italic',
      label: '斜体',
      icon: glyph('I', 'is-italic'),
      command: chain => chain.toggleItalic(),
      active: editor => editor.isActive('italic'),
    },
    {
      key: 'underline',
      label: '下划线',
      icon: glyph('U', 'is-underline'),
      command: chain => chain.toggleUnderline(),
      active: editor => editor.isActive('underline'),
    },
    {
      key: 'strike',
      label: '删除线',
      icon: glyph('S', 'is-strike'),
      command: chain => chain.toggleStrike(),
      active: editor => editor.isActive('strike'),
    },
  ],
  [
    {
      key: 'orderedList',
      label: '有序列表',
      icon: strokeIcon('M10 6h10M10 12h10M10 18h10M4 4h1v5M4 9h2M4 15a1 1 0 0 1 2 0c0 1.5-2 2-2 4h2'),
      command: chain => chain.toggleOrderedList(),
      active: editor => editor.isActive('orderedList'),
    },
    {
      key: 'bulletList',
      label: '无序列表',
      icon: strokeIcon('M10 6h10M10 12h10M10 18h10M5 6h.01M5 12h.01M5 18h.01'),
      command: chain => chain.toggleBulletList(),
      active: editor => editor.isActive('bulletList'),
    },
    {
      key: 'blockquote',
      label: '引用',
      icon: strokeIcon('M5 5v14M9 7h10M9 12h10M9 17h6'),
      command: chain => chain.toggleBlockquote(),
      active: editor => editor.isActive('blockquote'),
    },
    {
      key: 'horizontalRule',
      label: '分割线',
      icon: strokeIcon('M4 12h16'),
      command: chain => chain.setHorizontalRule(),
    },
  ],
  [
    {
      key: 'alignLeft',
      label: '左对齐',
      icon: strokeIcon('M4 6h16M4 10h10M4 14h16M4 18h10'),
      command: chain => chain.setTextAlign('left'),
      active: editor => editor.isActive({ textAlign: 'left' }),
    },
    {
      key: 'alignCenter',
      label: '居中',
      icon: strokeIcon('M4 6h16M7 10h10M4 14h16M7 18h10'),
      command: chain => chain.setTextAlign('center'),
      active: editor => editor.isActive({ textAlign: 'center' }),
    },
    {
      key: 'alignRight',
      label: '右对齐',
      icon: strokeIcon('M4 6h16M10 10h10M4 14h16M10 18h10'),
      command: chain => chain.setTextAlign('right'),
      active: editor => editor.isActive({ textAlign: 'right' }),
    },
  ],
  [
    {
      key: 'link',
      label: '链接',
      icon: LinkIcon,
      onClick: () => void promptLink(),
      active: editor => editor.isActive('link'),
    },
    {
      key: 'unlink',
      label: '取消链接',
      icon: strokeIcon('M9 15l6-6M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1M4 4l16 16'),
      command: chain => chain.extendMarkRange('link').unsetLink(),
      enabled: editor => editor.isActive('link'),
    },
  ],
  [
    {
      key: 'undo',
      label: '撤销',
      icon: RefreshLeft,
      command: chain => chain.undo(),
      enabled: editor => editor.can().undo(),
    },
    {
      key: 'redo',
      label: '重做',
      icon: RefreshRight,
      command: chain => chain.redo(),
      enabled: editor => editor.can().redo(),
    },
    {
      key: 'clearFormat',
      label: '清除格式',
      icon: Brush,
      command: chain => chain.unsetAllMarks().clearNodes().unsetTextAlign(),
    },
  ],
];

const readHtml = (instance: Editor): string => (instance.isEmpty ? '' : instance.getHTML());

const isSameContent = (a: string, b: string): boolean => sanitizeAgreementHtml(a) === sanitizeAgreementHtml(b);

const hasImageFile = (data: DataTransfer | null): boolean =>
  Array.from(data?.files ?? []).some(file => file.type.startsWith('image/'));

/** 每次事务后递增，驱动工具栏状态重新计算 */
const stateVersion = ref(0);

const editor = useEditor({
  content: toEditorHtml(props.modelValue),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      code: false,
      codeBlock: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: false,
        HTMLAttributes: { target: null, rel: null, class: null },
        isAllowedUri: url => isAllowedLinkUrl(url),
        shouldAutoLink: url => isAllowedLinkUrl(url),
      },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right'] }),
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: { class: 'agreement-editor__content', 'aria-label': '协议正文' },
    transformPastedHTML: html => {
      if (/<img\b/i.test(html)) ElMessage.warning(IMAGE_UNSUPPORTED);
      return html;
    },
    handleDOMEvents: {
      paste: (_view, event) => {
        const data = event.clipboardData;
        if (!hasImageFile(data) || data?.getData('text/html')) return false;
        event.preventDefault();
        ElMessage.warning(IMAGE_UNSUPPORTED);
        return true;
      },
    },
    handleDrop: (_view, event) => {
      if (!hasImageFile(event.dataTransfer)) return false;
      event.preventDefault();
      ElMessage.warning(IMAGE_UNSUPPORTED);
      return true;
    },
  },
  onCreate: ({ editor: instance }) => {
    const html = readHtml(instance);
    if (!isSameContent(html, props.modelValue)) emit('update:modelValue', html);
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', readHtml(instance));
  },
  onTransaction: () => {
    stateVersion.value += 1;
  },
});

/** 外部写入的内容不进撤销栈 */
watch(
  () => props.modelValue,
  value => {
    const instance = editor.value;
    if (!instance || isSameContent(value, readHtml(instance))) return;
    instance.chain().setMeta('addToHistory', false).setContent(toEditorHtml(value), { emitUpdate: false }).run();
    const html = readHtml(instance);
    if (!isSameContent(html, value)) emit('update:modelValue', html);
  },
);

const blockLabel = computed(() => {
  void stateVersion.value;
  const instance = editor.value;
  const heading = BLOCK_OPTIONS.find(
    option => option.value !== 'paragraph' && instance?.isActive('heading', { level: option.value }),
  );
  return (heading ?? BLOCK_OPTIONS[0]).label;
});

const inTable = computed(() => {
  void stateVersion.value;
  return editor.value?.isActive('table') ?? false;
});

const isActionActive = (action: ToolbarAction): boolean => {
  void stateVersion.value;
  return !!editor.value && !!action.active?.(editor.value);
};

const canRun = (action: ToolbarAction): boolean => {
  void stateVersion.value;
  const instance = editor.value;
  if (!instance) return false;
  return action.enabled?.(instance) ?? true;
};

const runAction = (action: ToolbarAction) => {
  const instance = editor.value;
  if (!instance) return;
  if (action.onClick) {
    action.onClick();
    return;
  }
  action.command?.(instance.chain().focus()).run();
};

const setBlock = (value: BlockValue) => {
  const chain = editor.value?.chain().focus();
  if (!chain) return;
  (value === 'paragraph' ? chain.setParagraph() : chain.setHeading({ level: value })).run();
};

const tableChain = (chain: ChainedCommands, command: TableCommand): ChainedCommands =>
  command === 'insertTable' ? chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) : chain[command]();

const canRunTableCommand = (command: TableCommand): boolean => {
  void stateVersion.value;
  const instance = editor.value;
  if (!instance) return false;
  if (command === 'insertTable' && instance.isActive('table')) return false;
  return tableChain(instance.can().chain(), command).run();
};

const runTableCommand = (command: TableCommand) => {
  const instance = editor.value;
  if (instance) tableChain(instance.chain().focus(), command).run();
};

const promptLink = async () => {
  const instance = editor.value;
  if (!instance) return;
  const current = instance.getAttributes('link').href as string | undefined;
  let input: string;
  try {
    ({ value: input } = await ElMessageBox.prompt(
      '仅支持 http、https 或 mailto 链接',
      current ? '编辑链接' : '插入链接',
      {
        inputValue: current ?? '',
        inputPlaceholder: 'https://',
        inputValidator: value => isAllowedLinkUrl(value.trim()) || LINK_INVALID,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      },
    ));
  } catch {
    return;
  }
  const href = input.trim();
  if (!isAllowedLinkUrl(href)) {
    ElMessage.warning(LINK_INVALID);
    return;
  }
  const chain = instance.chain().focus();
  if (instance.state.selection.empty && !instance.isActive('link')) {
    chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
  } else {
    chain.extendMarkRange('link').setLink({ href }).run();
  }
};
</script>

<style scoped lang="scss">
.agreement-editor {
  overflow: hidden;
  border: 1px solid var(--aix-colorBorder);
  border-radius: 4px;
  background: var(--aix-colorBgContainer);

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--aix-colorBorder);
    background: var(--aix-colorFillQuaternary);

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  &__action,
  &__dropdown {
    color: var(--aix-colorText);

    &.is-active {
      background: var(--aix-colorPrimaryBg);
      color: var(--aix-colorPrimary);
    }
  }

  &__action {
    width: 28px;
    padding: 0;
  }

  &__glyph {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 15px;
    line-height: 1;

    &.is-bold {
      font-weight: 700;
    }

    &.is-italic {
      font-style: italic;
    }

    &.is-underline {
      text-decoration: underline;
    }

    &.is-strike {
      text-decoration: line-through;
    }
  }

  &__body {
    height: 520px;
    overflow-y: auto;
    cursor: text;
  }

  :deep(.agreement-editor__content) {
    box-sizing: border-box;
    min-height: 100%;
    padding: 12px 16px;
    outline: none;
    color: var(--aix-colorText);
    font-size: 14px;
    line-height: 1.7;
    overflow-wrap: anywhere;

    > :first-child {
      margin-top: 0;
    }

    p {
      margin: 0 0 8px;
    }

    h1,
    h2,
    h3,
    h4 {
      margin: 16px 0 8px;
      color: var(--aix-colorTextHeading);
      font-weight: 600;
      line-height: 1.4;
    }

    h1 {
      font-size: 22px;
    }

    h2 {
      font-size: 19px;
    }

    h3 {
      font-size: 17px;
    }

    h4 {
      font-size: 15px;
    }

    ul,
    ol {
      margin: 0 0 8px;
      padding-left: 24px;
    }

    li > p {
      margin: 0;
    }

    blockquote {
      margin: 8px 0;
      padding-left: 12px;
      border-left: 4px solid var(--aix-colorBorder);
      color: var(--aix-colorTextSecondary);
    }

    hr {
      margin: 12px 0;
      border: none;
      border-top: 1px solid var(--aix-colorSplit);

      &.ProseMirror-selectednode {
        border-top-color: var(--aix-colorPrimary);
      }
    }

    a {
      color: var(--aix-colorPrimary);
      text-decoration: underline;
    }

    .tableWrapper {
      margin: 8px 0;
      overflow-x: auto;
    }

    table {
      table-layout: fixed;
      border-collapse: collapse;
    }

    th,
    td {
      position: relative;
      box-sizing: border-box;
      min-width: 80px;
      padding: 4px 8px;
      border: 1px solid var(--aix-colorBorder);
      vertical-align: top;

      > p {
        margin: 0;
      }
    }

    th {
      background: var(--aix-colorFillTertiary);
      font-weight: 600;
      text-align: left;
    }

    .selectedCell::after {
      content: '';
      position: absolute;
      opacity: 0.6;
      background: var(--aix-colorPrimaryBg);
      pointer-events: none;
      inset: 0;
    }

    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      height: 0;
      float: left;
      color: var(--aix-colorTextPlaceholder);
      pointer-events: none;
    }
  }
}
</style>
