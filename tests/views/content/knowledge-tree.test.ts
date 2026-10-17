import { describe, it, expect } from 'vitest';
import {
  findNode,
  leafIds,
  migrateTargets,
  moveTargets,
  nodePathName,
  subtreeDepth,
  toTreeOptions,
  type KnowledgeNode,
} from '@/views/content/shared/knowledge-tree';

const node = (
  id: string,
  parentPath: string,
  level: number,
  children: KnowledgeNode[] = [],
  questionCount = 0,
): KnowledgeNode => ({
  id,
  subjectId: 's',
  parentId: parentPath === '/' ? null : parentPath.split('/').filter(Boolean).pop()!,
  name: id.toUpperCase(),
  level,
  sort: 0,
  path: `${parentPath}${id}/`,
  isLeaf: children.length === 0,
  questionCount,
  createdAt: '',
  updatedAt: '',
  children,
});

const tree = [
  node('a', '/', 1, [node('a1', '/a/', 2, [node('a11', '/a/a1/', 3)]), node('a2', '/a/', 2, [], 5)]),
  node('b', '/', 1),
];

describe('知识点树工具', () => {
  it('查找节点、叶子集合与名称路径', () => {
    expect(findNode(tree, 'a11')?.name).toBe('A11');
    expect([...leafIds(tree)].sort()).toEqual(['a11', 'a2', 'b']);
    expect(nodePathName(tree, 'a11')).toBe('A / A1 / A11');
  });

  it('子树深度', () => {
    expect(subtreeDepth(tree[0])).toBe(3);
    expect(subtreeDepth(tree[1])).toBe(1);
  });

  it('移动目标排除自身与下级、超过三级与已有题目的叶子', () => {
    const a1 = findNode(tree, 'a1')!;

    expect(moveTargets(tree, a1).map(item => item.id)).toEqual(['a', 'b']);
    expect(moveTargets(tree, tree[1]).map(item => item.id)).toEqual(['a', 'a1']);
  });

  it('迁移目标只能是其他叶子', () => {
    expect(migrateTargets(tree, findNode(tree, 'a2')!).map(item => item.id)).toEqual(['a11', 'b']);
  });

  it('仅叶子可选时非叶子节点禁用', () => {
    const [a] = toTreeOptions(tree, true);

    expect(a.disabled).toBe(true);
    expect(a.children?.[1]).toMatchObject({ value: 'a2', disabled: false });
    expect(toTreeOptions(tree)[0].disabled).toBe(false);
  });
});
