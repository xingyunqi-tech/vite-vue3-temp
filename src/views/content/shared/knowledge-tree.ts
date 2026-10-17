import type { KnowledgePointTreeNodeDto } from '@/api';

export const MAX_KNOWLEDGE_LEVEL = 3;

export type KnowledgeNode = KnowledgePointTreeNodeDto;

export function flattenTree(nodes: KnowledgeNode[]): KnowledgeNode[] {
  return nodes.flatMap(node => [node, ...flattenTree(node.children ?? [])]);
}

export function findNode(nodes: KnowledgeNode[], id: string): KnowledgeNode | undefined {
  return flattenTree(nodes).find(node => node.id === id);
}

export function leafIds(nodes: KnowledgeNode[]): Set<string> {
  return new Set(
    flattenTree(nodes)
      .filter(node => node.isLeaf)
      .map(node => node.id),
  );
}

/** 节点自根起的名称路径，如「言语理解 / 逻辑填空」 */
export function nodePathName(nodes: KnowledgeNode[], id: string, separator = ' / '): string {
  const byId = new Map(flattenTree(nodes).map(node => [node.id, node]));
  const names: string[] = [];
  let current = byId.get(id);
  while (current) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(separator);
}

/** 节点子树的最大深度，叶子为 1 */
export function subtreeDepth(node: KnowledgeNode): number {
  const children = node.children ?? [];
  return 1 + (children.length ? Math.max(...children.map(subtreeDepth)) : 0);
}

const isDescendantOrSelf = (candidate: KnowledgeNode, node: KnowledgeNode) =>
  candidate.id === node.id || candidate.path.startsWith(node.path);

/** 可作为移动目标的父节点：不是自身或其下级，移动后总层级不超过三级，且未直接关联题目 */
export function moveTargets(nodes: KnowledgeNode[], node: KnowledgeNode): KnowledgeNode[] {
  const depth = subtreeDepth(node);
  return flattenTree(nodes).filter(
    candidate =>
      !isDescendantOrSelf(candidate, node) &&
      candidate.level + depth <= MAX_KNOWLEDGE_LEVEL &&
      !(candidate.isLeaf && candidate.questionCount > 0),
  );
}

export function migrateTargets(nodes: KnowledgeNode[], node: KnowledgeNode): KnowledgeNode[] {
  return flattenTree(nodes).filter(candidate => candidate.isLeaf && candidate.id !== node.id);
}

export interface TreeOption {
  value: string;
  label: string;
  disabled?: boolean;
  children?: TreeOption[];
}

export function toTreeOptions(nodes: KnowledgeNode[], leafOnly = false): TreeOption[] {
  return nodes.map(node => ({
    value: node.id,
    label: node.name,
    disabled: leafOnly && !node.isLeaf,
    children: node.children?.length ? toTreeOptions(node.children, leafOnly) : undefined,
  }));
}
