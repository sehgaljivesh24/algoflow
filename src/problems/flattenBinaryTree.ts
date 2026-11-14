import type { CellState, ProblemDef, Step, TreeNodeVM } from '../engine/types.ts';
import { buildTree, emitter, find, fmtList, listAux, parseTree, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public void flatten(TreeNode root) {',
  '    TreeNode cur = root;',
  '    while (cur != null) {',
  '        if (cur.left != null) {',
  '            TreeNode pred = cur.left;',
  '            while (pred.right != null)',
  '                pred = pred.right;',
  '            pred.right = cur.right;',
  '            cur.right = cur.left;',
  '            cur.left = null;',
  '        }',
  '        cur = cur.right;',
  '    }',
  '}',
];
const python = [
  'def flatten(root):',
  '    cur = root',
  '    while cur:',
  '        if cur.left:',
  '            pred = cur.left',
  '            while pred.right:',
  '                pred = pred.right',
  '            pred.right = cur.right',
  '            cur.right = cur.left',
  '            cur.left = None',
  '        cur = cur.right',
];
const J = {
  start: find(java, 'TreeNode cur = root'), at: find(java, 'while (cur != null)', 'if (cur.left != null)'), pred: find(java, 'TreeNode pred = cur.left'), hop: find(java, 'while (pred.right != null)', 'pred = pred.right;'),
  wire: find(java, 'pred.right = cur.right', 'cur.right = cur.left', 'cur.left = null'), next: find(java, 'cur = cur.right;'),
};
const P = {
  start: find(python, 'cur = root'), at: find(python, 'while cur', 'if cur.left'), pred: find(python, 'pred = cur.left'), hop: find(python, 'while pred.right', 'pred = pred.right'),
  wire: find(python, 'pred.right = cur.right', 'cur.right = cur.left', 'cur.left = None'), next: find(python, 'cur = cur.right'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  let labels: Record<number, string> = {};
  const chain: number[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const nm = (id: number | null) => (id === null ? 'null' : String(val(id)));
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [listAux('flattened list so far (preorder)', chain)];
  const vars = (cur: number | string, pred: number | string) => ({ cur, pred });

  add({
    title: 'Start', desc: 'Flatten the tree in place into a right-leaning chain that follows preorder (node, left subtree, right subtree).',
    logic: 'Idea: if cur has a left subtree, that whole subtree must come right after cur. Hang the old right subtree off the rightmost node of the left subtree, then move the left subtree to the right.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—'), aux: aux(), tag: 'START', note: `cur = root = ${val(0)}`,
  });

  let cur: number | null = 0;
  while (cur !== null) {
    const c: number = cur;
    const n: TreeNodeVM = nodes[c];
    states[c] = 'active';
    labels = { [c]: 'cur' };
    chain.push(val(c));
    add({
      title: `cur = ${val(c)}`, desc: n.left === null ? `cur=${val(c)} has no left child, so it is already in the right place. Move right.` : `cur=${val(c)} has a left subtree (root ${nm(n.left)}) that must come next in the list.`,
      logic: n.left === null ? 'Nothing to rewire here.' : 'Rewire first, then step to the right child.',
      j: J.at, p: P.at, a: 1, vars: vars(val(c), '—'), aux: aux(), tag: 'CHECK',
      note: n.left === null ? `cur.left == null for node ${val(c)}: skip rewiring` : `cur.left = ${nm(n.left)} != null: rewire`,
    });
    if (n.left !== null) {
      let pred: number = n.left;
      states[pred] = 'compare';
      labels = { [c]: 'cur', [pred]: 'pred' };
      add({
        title: `pred starts at ${val(pred)}`, desc: `Find the rightmost node of the left subtree, starting at pred = cur.left = ${val(pred)}.`,
        logic: 'That node is the last one in preorder of the left subtree, so the old right subtree will attach to it.',
        j: J.pred, p: P.pred, a: 2, vars: vars(val(c), val(pred)), aux: aux(), tag: 'FIND PRED',
        note: `pred = cur.left = ${val(pred)}`,
      });
      while (nodes[pred].right !== null) {
        delete states[pred];
        const from = pred;
        pred = nodes[pred].right!;
        states[pred] = 'compare';
        labels = { [c]: 'cur', [pred]: 'pred' };
        add({
          title: `pred → ${val(pred)}`, desc: `pred=${val(from)} has a right child, so step right to pred=${val(pred)}.`,
          logic: 'Keep going right until there is nothing further right.',
          j: J.hop, p: P.hop, a: 2, vars: vars(val(c), val(pred)), aux: aux(), tag: 'HOP',
          note: `pred.right = ${val(pred)} != null: pred = ${val(pred)}`,
        });
      }
      const oldRight = n.right;
      const left: number = n.left;
      nodes[pred].right = oldRight;
      n.right = left;
      n.left = null;
      add({
        title: `Rewire at ${val(c)}`, desc: `pred=${val(pred)} is rightmost: pred.right = ${nm(oldRight)} (old right subtree), cur.right = ${val(left)} (old left subtree), cur.left = null.`,
        logic: 'The left subtree now sits where the right one was, with the old right subtree hanging off its last node.', tone: 'success',
        j: J.wire, p: P.wire, a: 3, vars: vars(val(c), val(pred)), aux: aux(), tag: 'REWIRE',
        note: `${val(pred)}.right = ${nm(oldRight)}; ${val(c)}.right = ${val(left)}; ${val(c)}.left = null`,
      });
      delete states[pred];
    }
    states[c] = 'found';
    cur = n.right;
    labels = {};
    if (cur !== null) {
      add({
        title: `Move right to ${val(cur)}`, desc: `Finished with ${val(c)}, so cur = cur.right = ${val(cur)}.`, logic: 'Continue down the chain; everything we have passed is finished.',
        j: J.next, p: P.next, a: 4, vars: vars(val(cur), '—'), aux: aux(), tag: 'MOVE',
        note: `cur = ${val(c)}.right = ${val(cur)}`,
      });
    }
  }

  const out = fmtList(chain);
  add({
    title: 'Done', desc: `cur ran off the end. Following right pointers gives ${out}, and every left pointer is null.`,
    logic: 'The chain is exactly the preorder of the original tree.', tone: 'success',
    j: J.next, p: P.next, a: 5, vars: vars('null', '—'), aux: aux(), result: { title: out, text: 'Flattened list (preorder)' },
    tag: '✅ Done!', note: `cur = null, chain = ${out}`,
  });
  return steps;
}

export const flattenBinaryTree: ProblemDef<TreeIn> = {
  slug: '114-flatten-binary-tree-to-linked-list',
  id: '114', title: 'Flatten Binary Tree to Linked List', difficulty: 'Medium', category: 'Tree', tag: 'DFS in place',
  statement: 'Flatten a binary tree in place into a "linked list": every node’s right pointer points to the next node in preorder and every left pointer is null.',
  constraints: '0 ≤ nodes ≤ 2000 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 2 5 3 4 null 6', input: { tokens: [1, 2, 5, 3, 4, null, 6] }, output: '[1,2,3,4,5,6]' },
    { label: '1 2 null 3', input: { tokens: [1, 2, null, 3] }, output: '[1,2,3]' },
    { label: '1 null 2 3', input: { tokens: [1, null, 2, 3] }, output: '[1,2,3]' },
  ],
  inputPlaceholder: 'e.g. 1 2 5 3 4 null 6',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'cur (being fixed)', state: 'active' }, { label: 'pred (rightmost of left subtree)', state: 'compare' }, { label: 'Finished', state: 'found' }],
  varLabels: ['cur', 'pred'],
  emphasis: ['in place', 'preorder', 'right pointer'],
  phases: [
    { icon: '🚩', label: 'START (cur = root)', tone: 'blue' },
    { icon: '🔍', label: 'CHECK cur.left', tone: 'cyan' },
    { icon: '🔎', label: 'FIND pred (rightmost)', tone: 'orange' },
    { icon: '🔗', label: 'REWIRE', tone: 'gold' },
    { icon: '➡', label: 'MOVE cur right', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Splice the left subtree in, O(1) space',
    text: 'Walk down the right spine with cur. If cur has a left child, find the rightmost node of that left subtree (pred), attach cur’s old right subtree to pred, then move the left subtree to the right and null out left.',
  },
  java, python,
  algorithm: [
    'Start with cur = root',
    'Check cur.left: if there is none, nothing to rewire',
    'Find pred = rightmost node of cur.left',
    'Set pred.right = cur.right, cur.right = cur.left, cur.left = null',
    'Move cur = cur.right and repeat until null',
    'Return: the right pointers now spell the preorder',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'In preorder the entire left subtree comes directly after cur, and the old right subtree comes after the last node of that left subtree — which is the rightmost node pred. Rewiring pointers puts them in exactly that order. Each edge is walked by pred at most once overall, so the work is O(n) with no stack or recursion.',
};
