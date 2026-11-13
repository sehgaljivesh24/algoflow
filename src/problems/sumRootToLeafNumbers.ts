import type { Aux, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, listAux, parseTokens, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const LIMIT = 2147483647;

function parse(raw: string): TreeIn {
  const tokens = parseTokens(raw);
  if (tokens.some((t) => t !== null && (t < 0 || t > 9))) throw new Error('Every node must be a single digit 0–9 (each root-to-leaf path spells a number), e.g. 4 9 0 5 1');
  const nodes = buildTree(tokens);
  let total = 0;
  const go = (id: number, cur: number) => {
    const n = nodes[id];
    const next = cur * 10 + Number(n.value);
    if (next > LIMIT) throw new Error('A path is too long: its number would not fit in a 32-bit int. Use a shallower tree.');
    if (n.left === null && n.right === null) total += next;
    if (n.left !== null) go(n.left, next);
    if (n.right !== null) go(n.right, next);
  };
  go(0, 0);
  if (total > LIMIT) throw new Error('The total would not fit in a 32-bit int. Use smaller digits or a shallower tree.');
  return { tokens };
}

const java = [
  'public int sumNumbers(TreeNode root) {',
  '    return dfs(root, 0);',
  '}',
  'private int dfs(TreeNode n, int cur) {',
  '    if (n == null) return 0;',
  '    cur = cur * 10 + n.val;',
  '    if (n.left == null && n.right == null) return cur;',
  '    return dfs(n.left, cur) + dfs(n.right, cur);',
  '}',
];
const python = [
  'def sum_numbers(root):',
  '    def dfs(n, cur):',
  '        if not n:',
  '            return 0',
  '        cur = cur * 10 + n.val',
  '        if not n.left and not n.right:',
  '            return cur',
  '        return dfs(n.left, cur) + dfs(n.right, cur)',
  '    return dfs(root, 0)',
];
const J = { start: find(java, 'return dfs(root, 0)'), nul: find(java, 'if (n == null)'), build: find(java, 'cur = cur * 10'), leaf: find(java, 'if (n.left == null && n.right == null)'), sum: find(java, 'return dfs(n.left, cur)') };
const P = { start: find(python, 'return dfs(root, 0)'), nul: find(python, 'if not n', 'return 0'), build: find(python, 'cur = cur * 10'), leaf: find(python, 'if not n.left and not n.right', 'return cur'), sum: find(python, 'return dfs(n.left, cur)') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const leaves: number[] = [];
  let total = 0;
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = (): Aux[] => [stackAux('call stack: node → number so far', stack), listAux(`leaf numbers (sum = ${total})`, leaves)];
  const vars = (node: number | string, cur: number | string, ret: number | string) => ({ node, cur, returns: ret, total });

  add({
    title: 'Start', desc: 'Each root-to-leaf path spells a number, one digit per node. Add up all of those numbers.',
    logic: 'Extending a path by one node shifts its number left one decimal place and appends the digit: cur × 10 + digit.',
    j: J.start, p: P.start, a: 0, vars: vars('—', 0, '—'), aux: aux(),
  });

  const dfs = (id: number, before: number): number => {
    const n = nodes[id];
    const v = val(id);
    const cur = before * 10 + v;
    stack.push(`${v} → ${cur}`);
    states[id] = 'active';
    labels[id] = String(cur);
    const leaf = n.left === null && n.right === null;
    add({
      title: `Visit ${v}: number so far ${cur}`, desc: `${before} × 10 + ${v} = ${cur}.${leaf ? ' This is a leaf, so the path is complete: return it.' : ' Not a leaf yet; continue down both sides.'}`,
      logic: leaf ? 'A leaf finishes a path; its number is part of the answer.' : 'The running number travels down as a parameter, so siblings are independent.',
      tone: leaf ? 'success' : 'info', j: leaf ? [...J.build, ...J.leaf] : J.build, p: leaf ? [...P.build, ...P.leaf] : P.build, a: leaf ? 2 : 1, vars: vars(v, cur, leaf ? cur : '—'), aux: aux(),
    });
    if (leaf) {
      leaves.push(cur);
      total += cur;
      states[id] = 'found';
      add({
        title: `Leaf ${v} adds ${cur}`, desc: `Running total of completed paths: ${total}.`, logic: 'The total is just the sum of every leaf’s number.', tone: 'success',
        j: J.leaf, p: P.leaf, a: 2, vars: vars(v, cur, cur), aux: aux(),
      });
      stack.pop();
      return cur;
    }
    const l = n.left === null ? 0 : dfs(n.left, cur);
    const r = n.right === null ? 0 : dfs(n.right, cur);
    states[id] = 'found';
    add({
      title: `Node ${v} returns ${l + r}`, desc: `left subtree gave ${l}${n.left === null ? ' (null)' : ''}, right gave ${r}${n.right === null ? ' (null)' : ''}: ${l} + ${r} = ${l + r}.`,
      logic: 'An internal node contributes nothing itself; it just adds up what its subtrees found.',
      j: J.sum, p: P.sum, a: 3, vars: vars(v, cur, l + r), aux: aux(),
    });
    stack.pop();
    return l + r;
  };

  const answer = dfs(0, 0);
  add({
    title: 'Done', desc: `The root returned ${answer}: ${leaves.join(' + ')}.`, logic: 'Each root-to-leaf number was added exactly once.', tone: 'success',
    j: J.start, p: P.start, a: 3, vars: vars('—', '—', answer), aux: aux(), result: { title: String(answer), text: 'Sum of all root-to-leaf numbers' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'dfs(root, 0)' },
    { on: /^Visit (-?\d+): number so far (\d+)/, tag: 'VISIT —', note: (m, s) => `cur = ${/^(\d+) × 10/.exec(s.desc)?.[1] ?? '0'} × 10 + ${m[1]} = ${m[2]}` },
    { on: /^Leaf (-?\d+) adds (\d+)/, tag: '🍃 LEAF —', note: (m, s) => `total += ${m[2]} → ${s.vars.total}` },
    { on: /^Node (-?\d+) returns (\d+)/, tag: 'RETURN —', note: (m) => `return dfs(left) + dfs(right) = ${m[2]}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return dfs(root, 0) → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const sumRootToLeafNumbers: ProblemDef<TreeIn> = {
  slug: '129-sum-root-to-leaf-numbers',
  id: '129', title: 'Sum Root to Leaf Numbers', difficulty: 'Medium', category: 'Tree', tag: 'DFS',
  statement: 'Every node holds a single digit 0–9, so a root-to-leaf path reads as a decimal number (for example 1 → 2 → 3 is 123). Return the sum of all such numbers.',
  constraints: '1 ≤ nodes ≤ 1000, digits only (animation input: up to 12 nodes, answer must fit in 32 bits). Write the tree in level order, using null for gaps.',
  examples: [
    { label: '1 2 3', input: { tokens: [1, 2, 3] }, output: '25' },
    { label: '4 9 0 5 1', input: { tokens: [4, 9, 0, 5, 1] }, output: '1026' },
    { label: '1 2 null 3', input: { tokens: [1, 2, null, 3] }, output: '123' },
  ],
  inputPlaceholder: 'e.g. 4 9 0 5 1 (digits 0-9)',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current path', state: 'active' }, { label: 'Done', state: 'found' }],
  varLabels: ['node', 'cur', 'returns', 'total'],
  emphasis: ['root-to-leaf path', 'number', 'sum'],
  phases: [
    { icon: '🚀', label: 'Call dfs(root, 0)', tone: 'blue' },
    { icon: '🔢', label: 'cur = cur × 10 + val', tone: 'cyan' },
    { icon: '🍃', label: 'Leaf: return cur', tone: 'gold' },
    { icon: '↩️', label: 'Return left + right', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Carry the number down, add at the leaves',
    text: 'Pass the number built so far to each child as cur × 10 + digit. A leaf returns its finished number; an internal node returns the sum of its two children’s results.',
  },
  java, python,
  algorithm: [
    'Call dfs(root, 0); null → 0',
    'Update cur = cur × 10 + node.val',
    'At a leaf return cur',
    'Otherwise return dfs(left, cur) + dfs(right, cur)',
    'The value returned to the root is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Appending a digit d to a number x gives 10x + d, so the value of a path can be built incrementally while descending — no list of digits is needed. Every leaf corresponds to exactly one path, and every path ends at exactly one leaf, so summing the leaf values counts each number once. Note that a node with one child is not a leaf: only both-children-null ends a path.',
};
