import { makeOrderProblem } from './dfsOrderKit.ts';

export const preorderTraversalRecursive = makeOrderProblem('pre', {
  slug: 'alg-preorder-traversal-recursive-dfs',
  id: 'ALG', title: 'Preorder Traversal (Recursive DFS)', difficulty: 'Easy', tag: 'recursive DFS, node first',
  method: 'preorderTraversal',
  statement:
    'Return the pre-order traversal of a binary tree with plain recursion: record the node first, then walk its whole left subtree, then its whole right subtree. Watch the call stack grow and shrink.',
  emphasis: ['pre-order', 'record the node first', 'left subtree', 'right subtree', 'call stack'],
  approach: {
    title: 'Record the node, then recurse',
    text: 'dfs(node) returns at once for null. Otherwise it records node.val, calls dfs(node.left) and finally dfs(node.right). Because the record comes first, every node appears before everything below it.',
  },
  why: 'The recursion finishes a node’s entire left subtree before it starts the right one, and the node itself is written before either call, so the output lists each node ahead of its descendants, left side first. That is why pre-order is the order used to copy or serialise a tree: the parent is always known before its children.',
  examples: [
    { label: '1 2 3 4 5 null 6', tokens: [1, 2, 3, 4, 5, null, 6], output: '[1,2,4,5,3,6]' },
    { label: '4 2 6 1 3 5 7', tokens: [4, 2, 6, 1, 3, 5, 7], output: '[4,2,1,3,6,5,7]' },
    { label: '1 null 2 3', tokens: [1, null, 2, 3], output: '[1,2,3]' },
  ],
});
