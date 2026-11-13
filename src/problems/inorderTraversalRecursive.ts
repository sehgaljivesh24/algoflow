import { makeOrderProblem } from './dfsOrderKit.ts';

export const inorderTraversalRecursive = makeOrderProblem('in', {
  slug: 'alg-inorder-traversal-recursive-dfs',
  id: 'ALG', title: 'Inorder Traversal (Recursive DFS)', difficulty: 'Easy', tag: 'recursive DFS, node between',
  method: 'inorderTraversal',
  statement:
    'Return the in-order traversal of a binary tree with plain recursion: walk the whole left subtree, record the node, then walk the whole right subtree. On a binary search tree the output comes out sorted.',
  emphasis: ['in-order', 'left subtree', 'record the node', 'right subtree', 'sorted'],
  approach: {
    title: 'Left, record, right',
    text: 'dfs(node) returns at once for null. Otherwise it calls dfs(node.left), records node.val and finally calls dfs(node.right). The record sits between the two calls, so a node is written after its left side and before its right side.',
  },
  why: 'Everything stored in a node’s left subtree is written before the node, and everything in the right subtree after it. In a binary search tree the left subtree holds smaller keys and the right subtree larger ones, so this order lists the keys from smallest to largest.',
  examples: [
    { label: '1 2 3 4 5 null 6', tokens: [1, 2, 3, 4, 5, null, 6], output: '[4,2,5,1,3,6]' },
    { label: '4 2 6 1 3 5 7', tokens: [4, 2, 6, 1, 3, 5, 7], output: '[1,2,3,4,5,6,7]' },
    { label: '1 null 2 3', tokens: [1, null, 2, 3], output: '[1,3,2]' },
  ],
});
