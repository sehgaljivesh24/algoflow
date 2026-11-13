import type { PatternPack } from './types.ts';

/** Pack p10: the three recursive DFS traversal orders for the DFS pattern page, and BST search / insert. */
export const pack: PatternPack = {
  id: 'p10',
  problems: [
    { id: 'ALG', title: 'Preorder Traversal (Recursive DFS)', difficulty: 'Easy', tag: 'recursive DFS, node first', category: 'Tree' },
    { id: 'ALG', title: 'Inorder Traversal (Recursive DFS)', difficulty: 'Easy', tag: 'recursive DFS, node between', category: 'Tree' },
    { id: '145', title: 'Binary Tree Postorder Traversal', difficulty: 'Easy', tag: 'recursive DFS, node last', category: 'Tree' },
    { id: '700', title: 'Search in a Binary Search Tree', difficulty: 'Easy', tag: 'BST property, one root-to-node walk', category: 'Tree' },
    { id: '701', title: 'Insert into a Binary Search Tree', difficulty: 'Medium', tag: 'BST property, new leaf at the failed-search slot', category: 'Tree' },
  ],
};
