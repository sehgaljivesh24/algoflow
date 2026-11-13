import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, parseTokens, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

function parse(raw: string): TreeIn {
  const tokens = parseTokens(raw);
  if (tokens.some((t) => t !== null && Math.abs(t) > 999)) throw new Error('Keep node values between −999 and 999');
  return { tokens };
}

const java = [
  'private int best;',
  'public int maxPathSum(TreeNode root) {',
  '    best = Integer.MIN_VALUE;',
  '    gain(root);',
  '    return best;',
  '}',
  'private int gain(TreeNode n) {',
  '    if (n == null) return 0;',
  '    int l = Math.max(0, gain(n.left));',
  '    int r = Math.max(0, gain(n.right));',
  '    best = Math.max(best, n.val + l + r);',
  '    return n.val + Math.max(l, r);',
  '}',
];
const python = [
  'def max_path_sum(root):',
  '    best = float("-inf")',
  '    def gain(n):',
  '        nonlocal best',
  '        if not n:',
  '            return 0',
  '        l = max(0, gain(n.left))',
  '        r = max(0, gain(n.right))',
  '        best = max(best, n.val + l + r)',
  '        return n.val + max(l, r)',
  '    gain(root)',
  '    return best',
];
const J = { start: find(java, 'best = Integer.MIN_VALUE', 'gain(root);'), visit: find(java, 'if (n == null)', 'int l = Math.max', 'int r = Math.max'), through: find(java, 'best = Math.max'), ret: find(java, 'return n.val + Math.max'), fin: find(java, 'return best;') };
const P = { start: find(python, 'best = float', 'gain(root)'), visit: find(python, 'if not n', 'l = max(0', 'r = max(0'), through: find(python, 'best = max'), ret: find(python, 'return n.val + max'), fin: find(python, 'return best') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let best: number | null = null;
  let bestNode = -1;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, l: number | string, r: number | string) => ({ node, left: l, right: r, best: best === null ? '−∞' : best });

  add({
    title: 'Start', desc: 'Find the path (any start, any end, going only parent↔child) with the largest sum. It need not touch the root.',
    logic: 'Every path has a topmost node. For node v the best path bending there is v + best left gain + best right gain; a negative gain is better replaced by 0 (just stop).',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—'), aux: aux(),
  });

  const gain = (id: number): number => {
    const v = val(id);
    const n = nodes[id];
    stack.push(`node ${v}`);
    states[id] = 'active';
    add({
      title: `Visit node ${v}`, desc: `Compute the best downward gain from each child first.`,
      logic: 'Post-order again: the node can only be scored once both child gains are known.',
      j: J.visit, p: P.visit, a: 1, vars: vars(v, '?', '?'), aux: aux(),
    });
    const lRaw = n.left === null ? 0 : gain(n.left);
    const rRaw = n.right === null ? 0 : gain(n.right);
    const l = Math.max(0, lRaw);
    const r = Math.max(0, rRaw);
    const through = v + l + r;
    const improved = best === null || through > best;
    if (improved) {
      if (bestNode >= 0) states[bestNode] = 'found';
      best = through;
      bestNode = id;
    }
    const up = v + Math.max(l, r);
    states[id] = improved ? 'swap' : 'found';
    labels[id] = `↑${up}`;
    const clampNote = [lRaw < 0 ? `left gain ${lRaw} is negative → use 0` : '', rRaw < 0 ? `right gain ${rRaw} is negative → use 0` : ''].filter(Boolean).join('; ');
    add({
      title: `Node ${v}: path through it = ${through}`, desc: `${clampNote ? `${clampNote}. ` : ''}Bending here: ${v} + ${l} + ${r} = ${through}. ${improved ? `New best: ${best}.` : `Best stays ${best}.`} Report up: ${v} + max(${l}, ${r}) = ${up}.`,
      logic: 'A parent can extend only ONE branch, so what we return is the single better side; what we score is both sides.', tone: improved ? 'success' : 'info',
      j: [...J.through, ...J.ret], p: [...P.through, ...P.ret], a: improved ? 2 : 3, vars: vars(v, l, r), aux: aux(),
    });
    stack.pop();
    return up;
  };

  gain(0);
  add({
    title: 'Done', desc: `The maximum path sum is ${best}, bending at node ${val(bestNode)} (purple).`,
    logic: 'The root’s returned gain is not the answer — the best bend anywhere in the tree is.', tone: 'success',
    j: J.fin, p: P.fin, a: 3, vars: vars('—', '—', '—'), aux: aux(), result: { title: String(best), text: 'Maximum path sum' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'best = −∞; gain(root)' },
    { on: /^Visit node (-?\d+)/, tag: 'VISIT —', note: (m) => `gain(${m[1]}): children first` },
    { on: /^Node (-?\d+): path through it = (-?\d+)/, tag: (_m, s) => (s.desc.includes('New best') ? '🏆 NEW BEST —' : 'BEND —'), note: (m, s) => `${m[1]} + ${s.vars.left} + ${s.vars.right} = ${m[2]}; best = ${s.vars.best}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return best = ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const binaryTreeMaxPathSum: ProblemDef<TreeIn> = {
  slug: '124-binary-tree-maximum-path-sum',
  id: '124', title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', category: 'Tree', tag: 'DFS gain',
  statement: 'A path in a binary tree is a sequence of connected nodes that never revisits a node; it need not pass through the root. Return the largest possible sum of node values along any path with at least one node.',
  constraints: '1 ≤ nodes ≤ 3·10⁴, −1000 ≤ val ≤ 1000 (animation input: up to 12 nodes). Write the tree in level order, using null for gaps.',
  examples: [
    { label: '1 2 3', input: { tokens: [1, 2, 3] }, output: '6' },
    { label: '-10 9 20 null null 15 7', input: { tokens: [-10, 9, 20, null, null, 15, 7] }, output: '42' },
    { label: '-3', input: { tokens: [-3] }, output: '-3' },
    { label: '2 -1 -2', input: { tokens: [2, -1, -2] }, output: '2' },
  ],
  inputPlaceholder: 'e.g. -10 9 20 null null 15 7',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Visiting', state: 'active' }, { label: 'Gain known', state: 'found' }, { label: 'Best bend so far', state: 'swap' }],
  varLabels: ['node', 'left', 'right', 'best'],
  emphasis: ['path', 'maximum path sum', 'any start, any end'],
  phases: [
    { icon: '🚀', label: 'Start: best = −∞', tone: 'blue' },
    { icon: '⬇️', label: 'Visit: children first', tone: 'cyan' },
    { icon: '🏆', label: 'Bend here: update best', tone: 'gold' },
    { icon: '⬆️', label: 'Return one branch up', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Return one branch, score both',
    text: 'Each call returns the best sum of a path that starts at that node and goes down one side only (negative sides are clipped to 0). While computing it, also score the path that bends at the node: value + left gain + right gain, and keep the global maximum.',
  },
  java, python,
  algorithm: [
    'Start best = −∞ and call gain(root)',
    'Get left and right gains from the children, replacing negatives by 0',
    'Update best = max(best, val + left + right)',
    'Return val + max(left, right) to the parent',
    'The best bend seen anywhere is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'The best path has a unique highest node where it bends, and through that node the best choice is its value plus the best downward extension on each side (or nothing, hence the clipping at 0). The parent, however, can only continue along one branch, so each call returns just the better side. Starting best at −∞ (not 0) handles trees whose values are all negative.',
};
