import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseTree, stackAux, toLevelOrder, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public TreeNode invertTree(TreeNode root) {',
  '    if (root == null) return null;',
  '    TreeNode left = invertTree(root.left);',
  '    TreeNode right = invertTree(root.right);',
  '    root.left = right;',
  '    root.right = left;',
  '    return root;',
  '}',
];
const python = [
  'def invert_tree(root):',
  '    if not root:',
  '        return None',
  '    left = invert_tree(root.left)',
  '    right = invert_tree(root.right)',
  '    root.left, root.right = right, left',
  '    return root',
];
const J = { start: find(java, 'invertTree(TreeNode root)'), visit: find(java, 'if (root == null)', 'invertTree(root.left)', 'invertTree(root.right)'), swap: find(java, 'root.left = right', 'root.right = left'), ret: find(java, 'return root;') };
const P = { start: find(python, 'def invert_tree'), visit: find(python, 'if not root', 'left = invert_tree', 'right = invert_tree'), swap: find(python, 'root.left, root.right ='), ret: find(python, 'return root') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const nm = (id: number | null) => (id === null ? '∅' : String(val(id)));
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, left: number | string, right: number | string) => ({ node, left, right });

  add({
    title: 'Start', desc: 'Invert the tree: every node swaps its left and right children, all the way down.',
    logic: 'Invert each subtree first, then swap the two (already inverted) subtrees at the current node.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—'), aux: aux(),
  });

  const invert = (id: number) => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    const n = nodes[id];
    const leaf = n.left === null && n.right === null;
    add({
      title: `Visit node ${val(id)}`, desc: leaf ? `${val(id)} is a leaf: both children are null, so there is nothing to swap.` : `Call invertTree(${val(id)}). Invert the left subtree, then the right subtree.`,
      logic: leaf ? 'A leaf (or a null) is already its own mirror image.' : 'Go to the bottom first — swapping happens on the way back up.',
      j: J.visit, p: P.visit, a: 1, vars: vars(val(id), nm(n.left), nm(n.right)), aux: aux(),
    });
    if (n.left !== null) invert(n.left);
    if (n.right !== null) invert(n.right);
    if (!leaf) {
      const [oldL, oldR] = [n.left, n.right];
      n.left = oldR;
      n.right = oldL;
      states[id] = 'swap';
      add({
        title: `Swap children of ${val(id)}`, desc: `left was ${nm(oldL)}, right was ${nm(oldR)}. After the swap left = ${nm(n.left)}, right = ${nm(n.right)}.`,
        logic: 'Both subtrees are already inverted, so swapping the pointers finishes this node.', tone: 'success',
        j: J.swap, p: P.swap, a: 2, vars: vars(val(id), nm(n.left), nm(n.right)), aux: aux(),
      });
    }
    states[id] = 'found';
    stack.pop();
  };
  invert(0);

  const out = toLevelOrder(nodes, 0);
  add({
    title: 'Done', desc: `The tree is mirrored. Level order of the result: ${out}`, logic: 'Every node was visited once and swapped once.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('—', '—', '—'), aux: aux(), result: { title: out, text: 'Inverted tree (level order)' },
  });
  return steps;
}

export const invertBinaryTree: ProblemDef<TreeIn> = {
  slug: '226-invert-binary-tree',
  id: '226', title: 'Invert Binary Tree', difficulty: 'Easy', category: 'Tree', tag: 'DFS',
  statement: 'Invert a binary tree by swapping the left and right child of every node, and return its root.',
  constraints: '0 ≤ nodes ≤ 100 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '4 2 7 1 3 6 9', input: { tokens: [4, 2, 7, 1, 3, 6, 9] }, output: '[4,7,2,9,6,3,1]' },
    { label: '2 1 3', input: { tokens: [2, 1, 3] }, output: '[2,3,1]' },
    { label: '1 2 null 3', input: { tokens: [1, 2, null, 3] }, output: '[1,null,2,null,3]' },
  ],
  inputPlaceholder: 'e.g. 4 2 7 1 3 6 9',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Just swapped', state: 'swap' }, { label: 'Inverted', state: 'found' }],
  varLabels: ['node', 'left', 'right'],
  approach: {
    title: 'Recurse, then swap',
    text: 'Invert the left and right subtrees recursively, then exchange the two child pointers of the current node. A null node is returned as-is.',
  },
  java, python,
  algorithm: [
    'If the node is null, return null',
    'Recursively invert the left subtree and the right subtree',
    'Swap root.left and root.right',
    'Return the node',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Mirroring a tree is the same as mirroring both subtrees and then swapping their places. Each node does constant work, so the total is O(n); the recursion depth equals the tree height h.',
};
