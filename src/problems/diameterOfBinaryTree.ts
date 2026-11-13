import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'private int best = 0;',
  'public int diameterOfBinaryTree(TreeNode root) {',
  '    height(root);',
  '    return best;',
  '}',
  'private int height(TreeNode node) {',
  '    if (node == null) return 0;',
  '    int left = height(node.left);',
  '    int right = height(node.right);',
  '    best = Math.max(best, left + right);',
  '    return 1 + Math.max(left, right);',
  '}',
];
const python = [
  'def diameter_of_binary_tree(root):',
  '    best = 0',
  '    def height(node):',
  '        nonlocal best',
  '        if not node:',
  '            return 0',
  '        left = height(node.left)',
  '        right = height(node.right)',
  '        best = max(best, left + right)',
  '        return 1 + max(left, right)',
  '    height(root)',
  '    return best',
];
const J = {
  start: find(java, 'height(root);'), visit: find(java, 'if (node == null)', 'int left = height', 'int right = height'),
  cand: find(java, 'best = Math.max'), ret: find(java, 'return 1 + Math.max'), fin: find(java, 'return best;'),
};
const P = {
  start: find(python, 'height(root)'), visit: find(python, 'if not node', 'left = height', 'right = height'),
  cand: find(python, 'best = max'), ret: find(python, 'return 1 + max'), fin: find(python, 'return best'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let best = 0;
  let bestNode: number | null = null;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, left: number | string, right: number | string) => ({ node, left, right, best });

  add({
    title: 'Start', desc: 'The diameter is the longest path (counted in edges) between any two nodes. It does not have to pass through the root.',
    logic: 'Every longest path has a highest node where it "bends". At node v the longest bending path is left height + right height.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—'), aux: aux(),
  });

  const height = (id: number): number => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    add({
      title: `Visit node ${val(id)}`, desc: `Call height(${val(id)}). Get the heights of both subtrees first.`,
      logic: 'Post-order: a node can only be scored after both children report their heights.',
      j: J.visit, p: P.visit, a: 1, vars: vars(val(id), '?', '?'), aux: aux(),
    });
    const n = nodes[id];
    const l = n.left === null ? 0 : height(n.left);
    const r = n.right === null ? 0 : height(n.right);
    const through = l + r;
    const improved = through > best;
    if (improved) {
      if (bestNode !== null) states[bestNode] = 'found';
      best = through;
      bestNode = id;
    }
    const h = 1 + Math.max(l, r);
    states[id] = improved ? 'swap' : 'found';
    labels[id] = `h=${h}`;
    add({
      title: `Node ${val(id)}: path through it = ${through}`, desc: `left = ${l}, right = ${r}. A path bending here has ${l} + ${r} = ${through} edges. ${improved ? `New best diameter: ${best}.` : `Best stays ${best}.`} Return height 1 + max(${l}, ${r}) = ${h}.`,
      logic: improved ? 'This bend beats every earlier candidate, so it is highlighted.' : 'Not better than the best bend seen so far.', tone: improved ? 'success' : 'info',
      j: [...J.cand, ...J.ret], p: [...P.cand, ...P.ret], a: 2, vars: vars(val(id), l, r), aux: aux(),
    });
    stack.pop();
    return h;
  };

  height(0);
  add({
    title: 'Done', desc: bestNode === null ? 'A single node has no edges, so the diameter is 0.' : `The longest path has ${best} edge${best === 1 ? '' : 's'}. It bends at node ${val(bestNode)} (purple).`,
    logic: 'Only the best bend matters; the height returned by the root is not the answer.', tone: 'success',
    j: J.fin, p: P.fin, a: 3, vars: vars('—', '—', '—'), aux: aux(), result: { title: String(best), text: 'Diameter (edges)' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'best = 0; height(root)' },
    { on: /^Visit node (-?\d+)/, tag: 'VISIT —', note: (m) => `height(${m[1]}): children first` },
    {
      on: /^Node (-?\d+): path through it = (\d+)/,
      tag: (_m, s) => (s.desc.includes('New best') ? '🏆 NEW BEST —' : 'BEND —'),
      note: (_m, s) => `${s.vars.left} + ${s.vars.right} = ${Number(s.vars.left) + Number(s.vars.right)}; best = ${s.vars.best}`,
    },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return best = ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const diameterOfBinaryTree: ProblemDef<TreeIn> = {
  slug: '543-diameter-of-binary-tree',
  id: '543', title: 'Diameter of Binary Tree', difficulty: 'Easy', category: 'Tree', tag: 'DFS height',
  statement: 'Return the length of the longest path between any two nodes of a binary tree, measured in edges. The path may or may not pass through the root.',
  constraints: '1 ≤ nodes ≤ 10⁴ (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 2 3 4 5', input: { tokens: [1, 2, 3, 4, 5] }, output: '3' },
    { label: '1 2', input: { tokens: [1, 2] }, output: '1' },
    { label: '1 2 null 3 null 4 5 6', input: { tokens: [1, 2, null, 3, null, 4, 5, 6] }, output: '4' },
  ],
  inputPlaceholder: 'e.g. 1 2 3 4 5',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Height known', state: 'found' }, { label: 'Best bend so far', state: 'swap' }],
  varLabels: ['node', 'left', 'right', 'best'],
  emphasis: ['diameter', 'longest path', 'edges'],
  phases: [
    { icon: '🚀', label: 'Run height(root), best = 0', tone: 'blue' },
    { icon: '⬇️', label: 'Visit: children first', tone: 'cyan' },
    { icon: '🏆', label: 'Bend here: update best', tone: 'gold' },
    { icon: '⬆️', label: 'Return 1 + max(left, right)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Height recursion with a global maximum',
    text: 'Compute heights bottom-up. At each node, left height + right height is the longest path that bends at that node; track the maximum over all nodes while returning the usual height upward.',
  },
  java, python,
  algorithm: [
    'Run height(root); keep a global best = 0',
    'Recurse to get the left and right heights (null → 0)',
    'Update best = max(best, left + right)',
    'Return 1 + max(left, right); the answer is best',
    'The global best is the diameter',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Any path has a unique topmost node. For that node the longest path through it descends as far as possible on both sides, i.e. left + right edges. Taking the maximum across all nodes therefore covers every possible diameter, and each node is processed once.',
};
