import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public int rob(TreeNode root) {',
  '    int[] r = dfs(root);',
  '    return Math.max(r[0], r[1]);',
  '}',
  'private int[] dfs(TreeNode node) {                  // returns {robThis, skipThis}',
  '    if (node == null) return new int[]{0, 0};',
  '    int[] left = dfs(node.left);',
  '    int[] right = dfs(node.right);',
  '    int rob = node.val + left[1] + right[1];        // robbing this house forces both children to be skipped',
  '    int skip = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);   // below: free choice',
  '    return new int[]{rob, skip};',
  '}',
];
const python = [
  'def rob(root):',
  '    def dfs(node):                                  # returns (rob_this, skip_this)',
  '        if not node:',
  '            return (0, 0)',
  '        left = dfs(node.left)',
  '        right = dfs(node.right)',
  '        rob = node.val + left[1] + right[1]         # robbing this house forces both children to be skipped',
  '        skip = max(left) + max(right)               # below: free choice',
  '        return (rob, skip)',
  '    return max(dfs(root))',
];
const J = { start: find(java, 'int[] r = dfs(root)'), visit: find(java, 'if (node == null)', 'int[] left = dfs', 'int[] right = dfs'), calc: find(java, 'int rob = node.val', 'int skip =', 'return new int[]{rob, skip}'), fin: find(java, 'return Math.max(r[0], r[1])') };
const P = { start: find(python, 'def dfs(node)'), visit: find(python, 'if not node', 'left = dfs', 'right = dfs'), calc: find(python, 'rob = node.val', 'skip = max', 'return (rob, skip)'), fin: find(python, 'return max(dfs(root))') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const pair: Record<number, [number, number]> = {};
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, rob: number | string, skip: number | string, best: number | string) => ({ node, rob, skip, best });

  add({
    title: 'Two numbers per house', desc: 'Thieves cannot rob two directly linked houses. Each node reports a pair: rob = best haul if THIS house is robbed, skip = best haul if it is NOT. Each label will read rob/skip.',
    logic: 'A parent only needs to know how each child fares in both situations, so two values per node make the choice local.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—', '—'), aux: aux(),
    tag: 'DEFINE —', note: 'dfs(node) → (rob, skip), labels read rob/skip',
  });

  const dfs = (id: number): [number, number] => {
    stack.push(`node ${val(id)}`);
    states[id] = 'active';
    add({
      title: `Visit node ${val(id)}`, desc: `Call dfs(${val(id)}). The children must report first (post-order), because both of this node's options depend on them.`,
      logic: 'Post-order: a node is evaluated only after its children are done.', j: J.visit, p: P.visit, a: 1, vars: vars(val(id), '?', '?', '—'), aux: aux(),
      tag: 'VISIT —', note: `dfs(${val(id)}): go down first, combine on the way back`,
    });
    const n = nodes[id];
    const l: [number, number] = n.left === null ? [0, 0] : dfs(n.left);
    const r: [number, number] = n.right === null ? [0, 0] : dfs(n.right);
    const rob = val(id) + l[1] + r[1];
    const skip = Math.max(l[0], l[1]) + Math.max(r[0], r[1]);
    pair[id] = [rob, skip];
    states[id] = 'found';
    labels[id] = `${rob}/${skip}`;
    add({
      title: `Node ${val(id)}: rob ${rob}, skip ${skip}`,
      desc: `Rob it: ${val(id)} + children's skip values (${l[1]} + ${r[1]}) = ${rob}. Skip it: each child may do its best, max(${l[0]}, ${l[1]}) + max(${r[0]}, ${r[1]}) = ${skip}.`,
      logic: 'Robbing forces the children to be skipped; skipping leaves each child free to choose its better option.', tone: rob > skip ? 'success' : 'info',
      j: J.calc, p: P.calc, a: 2, vars: vars(val(id), rob, skip, Math.max(rob, skip)), aux: aux(),
      tag: rob > skip ? 'ROB WINS —' : 'SKIP WINS —',
      note: `rob = ${val(id)} + ${l[1]} + ${r[1]} = ${rob}; skip = max(${l[0]},${l[1]}) + max(${r[0]},${r[1]}) = ${skip}`,
    });
    stack.pop();
    return [rob, skip];
  };

  const [rootRob, rootSkip] = dfs(0);
  const best = Math.max(rootRob, rootSkip);

  // reconstruct which houses are robbed
  const robbed = new Set<number>();
  const pick = (id: number | null, allowed: boolean) => {
    if (id === null) return;
    const [rb, sk] = pair[id];
    const take = allowed && rb >= sk;
    if (take) robbed.add(id);
    pick(nodes[id].left, !take);
    pick(nodes[id].right, !take);
  };
  pick(0, true);
  nodes.forEach((_, id) => {
    states[id] = robbed.has(id) ? 'found' : 'dim';
  });
  const list = [...robbed].sort((a, b) => a - b).map(val);
  add({
    title: 'Done', desc: `The root offers rob = ${rootRob} or skip = ${rootSkip}, so the best haul is ${best}. Robbed houses (green): ${list.join(', ') || 'none'}.`,
    logic: 'Taking the larger of the root’s two numbers is the answer; walking down and following the winning options rebuilds which houses to rob.', tone: 'success',
    j: J.fin, p: P.fin, a: 3, vars: vars('—', rootRob, rootSkip, best), aux: aux(), tag: '✅ Done!', note: `max(${rootRob}, ${rootSkip}) = ${best}`, result: { title: String(best), text: 'Maximum haul' },
  });
  return steps;
}

export const houseRobberIII: ProblemDef<TreeIn> = {
  slug: '337-house-robber-iii',
  id: '337', title: 'House Robber III', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'tree DP · rob / skip',
  statement: 'The houses form a binary tree. Robbing two directly linked houses (parent and child) triggers the alarm. Given the money in each house, return the most you can rob without tripping it.',
  constraints: '1 ≤ nodes ≤ 10⁴, 0 ≤ value ≤ 10⁴ (animation input: ≤ 12 nodes, values 0–99, level order with null for gaps)',
  examples: [
    { label: '3 2 3 null 3 null 1', input: { tokens: [3, 2, 3, null, 3, null, 1] }, output: '7' },
    { label: '3 4 5 1 3 null 1', input: { tokens: [3, 4, 5, 1, 3, null, 1] }, output: '9' },
    { label: '2 1 3 null 4', input: { tokens: [2, 1, 3, null, 4] }, output: '7' },
  ],
  inputPlaceholder: 'level order, e.g. 3 2 3 null 3 null 1',
  parseInput: (raw) => {
    const t = parseTree(raw);
    if (t.tokens.some((v) => v !== null && (v < 0 || v > 99))) throw new Error('House values must be whole numbers from 0 to 99');
    return t;
  },
  buildSteps: build, viz: 'cells',
  legend: [{ label: 'Being evaluated', state: 'active' }, { label: 'Pair known (rob/skip) / robbed', state: 'found' }, { label: 'Not robbed', state: 'dim' }],
  varLabels: ['node', 'rob', 'skip', 'best'],
  emphasis: ['binary tree', 'directly linked houses', 'most you can rob'],
  phases: [
    { icon: '🧩', label: 'Pair (rob, skip) per node', tone: 'blue' },
    { icon: '⬇️', label: 'Visit children first', tone: 'cyan' },
    { icon: '🏠', label: 'rob = val + children skip', tone: 'cyan' },
    { icon: '✅', label: 'Done: max at the root', tone: 'green' },
  ],
  approach: {
    title: 'Post-order with two states per node',
    text: 'For every node compute rob (take this house, so both children are skipped) and skip (leave it, so each child takes whichever of its two options is better). Return the pair up the tree; the root’s larger value is the answer.',
  },
  java, python,
  algorithm: [
    'Define dfs(node) → (rob, skip) with (0, 0) for null',
    'Recurse into the left and right children first',
    'rob = value + left.skip + right.skip',
    'skip = max(left) + max(right); answer = max at the root',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'The only interaction between a node and its subtree is whether the node itself is robbed, so a subtree’s best haul only needs to be known under those two conditions. If the node is robbed its children are forced out; otherwise the two child subtrees are independent and each takes its better condition. Each node is evaluated once from the pairs of its children, which is why the whole tree is solved in one post-order pass instead of the exponential choose-or-skip recursion.',
};
