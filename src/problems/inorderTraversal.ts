import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, fmtList, listAux, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public List<Integer> inorderTraversal(TreeNode root) {',
  '    List<Integer> res = new ArrayList<>();',
  '    Deque<TreeNode> stack = new ArrayDeque<>();',
  '    TreeNode cur = root;',
  '    while (cur != null || !stack.isEmpty()) {',
  '        while (cur != null) {',
  '            stack.push(cur);',
  '            cur = cur.left;',
  '        }',
  '        cur = stack.pop();',
  '        res.add(cur.val);',
  '        cur = cur.right;',
  '    }',
  '    return res;',
  '}',
];
const python = [
  'def inorder_traversal(root):',
  '    res, stack, cur = [], [], root',
  '    while cur or stack:',
  '        while cur:',
  '            stack.append(cur)',
  '            cur = cur.left',
  '        cur = stack.pop()',
  '        res.append(cur.val)',
  '        cur = cur.right',
  '    return res',
];
const J = { start: find(java, 'List<Integer> res', 'TreeNode cur = root'), push: find(java, 'stack.push(cur)', 'cur = cur.left'), pop: find(java, 'cur = stack.pop()', 'res.add(cur.val)'), right: find(java, 'cur = cur.right'), ret: find(java, 'return res;') };
const P = { start: find(python, 'res, stack, cur'), push: find(python, 'stack.append(cur)', 'cur = cur.left'), pop: find(python, 'cur = stack.pop()', 'res.append(cur.val)'), right: find(python, 'cur = cur.right'), ret: find(python, 'return res') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: number[] = [];
  const res: number[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('stack (top = next to visit)', stack.map(val)), listAux('result (in-order)', res)];
  const vars = (cur: number | string) => ({ cur, 'stack size': stack.length, visited: res.length });

  add({
    title: 'Start', desc: 'In-order means: left subtree, then the node, then the right subtree. Recursion hides a stack; here we keep it ourselves.',
    logic: 'The stack remembers ancestors whose left subtree we are still exploring — they are visited when we come back up.',
    j: J.start, p: P.start, a: 0, vars: vars('root'), aux: aux(),
  });

  let cur: number | null = 0;
  while (cur !== null || stack.length) {
    while (cur !== null) {
      stack.push(cur);
      states[cur] = 'compare';
      add({
        title: `Push ${val(cur)}, go left`, desc: `${val(cur)} waits on the stack until its left subtree is done. ${nodes[cur].left === null ? 'There is no left child, so stop descending.' : `Move to the left child ${val(nodes[cur].left!)}.`}`,
        logic: 'Keep going left; the leftmost node is the first in-order node.',
        j: J.push, p: P.push, a: 1, vars: vars(val(cur)), aux: aux(),
      });
      cur = nodes[cur].left;
    }
    const id: number = stack.pop()!;
    res.push(val(id));
    states[id] = 'active';
    labels[id] = `#${res.length}`;
    add({
      title: `Pop and visit ${val(id)}`, desc: `Nothing is left of ${val(id)}, so visit it: append ${val(id)} to the result.`,
      logic: 'A popped node has had its entire left subtree visited — it is next in order.', tone: 'success',
      j: J.pop, p: P.pop, a: 2, vars: vars(val(id)), aux: aux(),
    });
    states[id] = 'found';
    cur = nodes[id].right;
    add({
      title: `Go right of ${val(id)}`, desc: cur === null ? `${val(id)} has no right child; pop the next ancestor.` : `Now process the right subtree starting at ${val(cur)}.`,
      logic: 'After the node comes its right subtree.',
      j: J.right, p: P.right, a: 3, vars: vars(cur === null ? 'null' : val(cur)), aux: aux(),
    });
  }

  const out = fmtList(res);
  add({
    title: 'Done', desc: `cur is null and the stack is empty. In-order result: ${out}`, logic: 'Every node was pushed once and popped once.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('null'), aux: aux(), result: { title: out, text: 'In-order traversal' },
  });
  return steps;
}

export const inorderTraversal: ProblemDef<TreeIn> = {
  slug: '94-binary-tree-inorder-traversal',
  id: '94', title: 'Binary Tree Inorder Traversal', difficulty: 'Easy', category: 'Tree', tag: 'iterative stack',
  statement: 'Return the in-order traversal (left, node, right) of a binary tree, using an explicit stack instead of recursion.',
  constraints: '0 ≤ nodes ≤ 100 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 null 2 3', input: { tokens: [1, null, 2, 3] }, output: '[1,3,2]' },
    { label: '4 2 6 1 3 5 7', input: { tokens: [4, 2, 6, 1, 3, 5, 7] }, output: '[1,2,3,4,5,6,7]' },
    { label: '1 2 3 4 5', input: { tokens: [1, 2, 3, 4, 5] }, output: '[4,2,5,1,3]' },
  ],
  inputPlaceholder: 'e.g. 1 null 2 3',
  parseInput: parseTree, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Waiting on the stack', state: 'compare' }, { label: 'Visiting now', state: 'active' }, { label: 'Visited', state: 'found' }],
  varLabels: ['cur', 'stack size', 'visited'],
  approach: {
    title: 'Simulate the recursion with a stack',
    text: 'Push the current node and move left until you fall off the tree. Pop a node, record it, then move to its right child and repeat. The stack holds the ancestors still waiting for their turn.',
  },
  java, python,
  algorithm: [
    'Start with cur = root and an empty stack',
    'While cur is not null: push it and move to cur.left',
    'Pop a node, append its value to the result',
    'Set cur to the popped node’s right child and repeat until cur is null and the stack is empty',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'The recursive version pushes a call frame for every ancestor whose left subtree is still being traversed; the explicit stack stores exactly those nodes. A node is popped only after its left subtree is complete, and its right subtree is processed immediately after, which is the in-order rule. Each node is pushed and popped once.',
};
