import { makeOrderProblem } from './dfsOrderKit.ts';

export const binaryTreePostorderTraversal = makeOrderProblem('post', {
  slug: '145-binary-tree-postorder-traversal',
  id: '145', title: 'Binary Tree Postorder Traversal', difficulty: 'Easy', tag: 'recursive DFS, node last',
  method: 'postorderTraversal',
  statement:
    'Return the post-order traversal of a binary tree with plain recursion: walk the whole left subtree, then the whole right subtree, and record the node last. Children are always finished before their parent.',
  emphasis: ['post-order', 'left subtree', 'right subtree', 'record the node last'],
  approach: {
    title: 'Recurse first, record last',
    text: 'dfs(node) returns at once for null. Otherwise it calls dfs(node.left), then dfs(node.right) and only then records node.val. A node is written when both of its subtrees are completely done.',
  },
  why: 'The record is the last line of the function, so by the time a node is written both of its subtrees have already been written. This bottom-up order is exactly what you need when a parent’s answer depends on its children (heights, sizes, deleting a tree) and the root always comes out last.',
  examples: [
    { label: '1 2 3 4 5 null 6', tokens: [1, 2, 3, 4, 5, null, 6], output: '[4,5,2,6,3,1]' },
    { label: '4 2 6 1 3 5 7', tokens: [4, 2, 6, 1, 3, 5, 7], output: '[1,3,2,5,7,6,4]' },
    { label: '1 null 2 3', tokens: [1, null, 2, 3], output: '[3,2,1]' },
  ],
});
