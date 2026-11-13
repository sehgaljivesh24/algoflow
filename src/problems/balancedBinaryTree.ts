import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public boolean isBalanced(TreeNode root) {',
  '    return height(root) != -1;',
  '}',
  'private int height(TreeNode n) {',
  '    if (n == null) return 0;',
  '    int l = height(n.left);',
  '    if (l == -1) return -1;',
  '    int r = height(n.right);',
  '    if (r == -1) return -1;',
  '    if (Math.abs(l - r) > 1) return -1;',
  '    return 1 + Math.max(l, r);',
  '}',
];
const python = [
  'def is_balanced(root):',
  '    return height(root) != -1',
  '',
  'def height(n):',
  '    if not n:',
  '        return 0',
  '    l = height(n.left)',
  '    if l == -1:',
  '        return -1',
  '    r = height(n.right)',
  '    if r == -1:',
  '        return -1',
  '    if abs(l - r) > 1:',
  '        return -1',
  '    return 1 + max(l, r)',
];
const J = {
  start: find(java, 'return height(root)'), visit: find(java, 'if (n == null)', 'int l = height', 'int r = height'),
  propL: find(java, 'if (l == -1)'), propR: find(java, 'if (r == -1)'), diff: find(java, 'Math.abs(l - r)'), ok: find(java, 'return 1 + Math.max'),
};
const P = {
  start: find(python, 'return height(root)'), visit: find(python, 'if not n', 'l = height', 'r = height'),
  propL: find(python, 'if l == -1', ['return -1', 1]), propR: find(python, 'if r == -1', ['return -1', 2]), diff: find(python, 'if abs(l - r)', ['return -1', 3]), ok: find(python, 'return 1 + max'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, l: number | string, r: number | string, ret: number | string) => ({ node, left: l, right: r, returns: ret });

  add({
    title: 'Start', desc: 'A tree is height-balanced when, at every node, the two subtree heights differ by at most 1.',
    logic: 'Compute heights bottom-up and let the value −1 mean "an imbalance was found below" so we can stop early.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—', '—'), aux: aux(),
  });

  const fail = (id: number, l: number | string, r: number | string, why: string, lines: { j: number[]; p: number[] }, tone: 'warn' = 'warn') => {
    states[id] = 'error';
    labels[id] = '−1';
    add({
      title: `Node ${val(id)} returns −1`, desc: why, logic: 'Once any subtree is unbalanced the whole tree is unbalanced; −1 travels up without further work.', tone,
      j: lines.j, p: lines.p, a: 2, vars: vars(val(id), l, r, -1), aux: aux(),
    });
    stack.pop();
    return -1;
  };

  const height = (id: number): number => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    const n = nodes[id];
    add({
      title: `Visit node ${val(id)}`, desc: `Call height(${val(id)}). Measure the left subtree, then the right.`,
      logic: 'We need both child heights before we can judge this node.',
      j: J.visit, p: P.visit, a: 1, vars: vars(val(id), '?', '?', '—'), aux: aux(),
    });
    const l = n.left === null ? 0 : height(n.left);
    if (l === -1) return fail(id, -1, '?', `The left subtree already reported −1, so return −1 immediately (skip the right side).`, { j: J.propL, p: P.propL });
    const r = n.right === null ? 0 : height(n.right);
    if (r === -1) return fail(id, l, -1, `The right subtree reported −1, so this node returns −1 too.`, { j: J.propR, p: P.propR });
    if (Math.abs(l - r) > 1) return fail(id, l, r, `|${l} − ${r}| = ${Math.abs(l - r)} > 1: the subtree heights differ too much here.`, { j: J.diff, p: P.diff });
    const h = 1 + Math.max(l, r);
    states[id] = 'found';
    labels[id] = `h=${h}`;
    add({
      title: `Node ${val(id)} is balanced, height ${h}`, desc: `|${l} − ${r}| = ${Math.abs(l - r)} ≤ 1, so return 1 + max(${l}, ${r}) = ${h}.`,
      logic: 'A balanced node reports its real height to its parent.', tone: 'success',
      j: J.ok, p: P.ok, a: 3, vars: vars(val(id), l, r, h), aux: aux(),
    });
    stack.pop();
    return h;
  };

  const h = height(0);
  const balanced = h !== -1;
  add({
    title: 'Done', desc: balanced ? `The root returned height ${h}, not −1.` : 'The root returned −1.',
    logic: balanced ? 'Every node had subtree heights within 1 of each other.' : 'Some node had subtree heights differing by more than 1.', tone: balanced ? 'success' : 'warn',
    j: J.start, p: P.start, a: 3, vars: vars('—', '—', '—', h), aux: aux(), result: { title: String(balanced), text: balanced ? 'Balanced' : 'Not balanced' },
  });
  return steps;
}

export const balancedBinaryTree: ProblemDef<TreeIn> = {
  slug: '110-balanced-binary-tree',
  id: '110', title: 'Balanced Binary Tree', difficulty: 'Easy', category: 'Tree', tag: 'DFS height',
  statement: 'Decide whether a binary tree is height-balanced: for every node, the heights of its left and right subtrees differ by no more than one.',
  constraints: '0 ≤ nodes ≤ 5000 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '3 9 20 null null 15 7', input: { tokens: [3, 9, 20, null, null, 15, 7] }, output: 'true' },
    { label: '1 2 2 3 3 null null 4 4', input: { tokens: [1, 2, 2, 3, 3, null, null, 4, 4] }, output: 'false' },
    { label: '1 2 null 3', input: { tokens: [1, 2, null, 3] }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. 3 9 20 null null 15 7',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Balanced, height known', state: 'found' }, { label: 'Imbalance (−1)', state: 'error' }],
  varLabels: ['node', 'left', 'right', 'returns'],
  approach: {
    title: 'Height with an early-exit sentinel',
    text: 'Compute each node’s height bottom-up, but return −1 as soon as a child is unbalanced or the two heights differ by more than 1. The tree is balanced exactly when the root does not return −1.',
  },
  java, python,
  algorithm: [
    'Compute height(root); −1 is the “unbalanced” signal',
    'Get the left height; if it is −1, return −1',
    'Get the right height; if it is −1, return −1',
    'If the heights differ by more than 1 return −1, else return 1 + max',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Checking balance by calling height() at every node repeats work and costs O(n²). Folding the check into the height computation visits each node once: a node is balanced iff both children are balanced and their heights are within 1, and the −1 sentinel carries that failure to the root.',
};
