import type { Aux, CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, fmtList, fmtLists, listAux, parseTreeAndNumber, stackAux, treeScene } from './treeKit.ts';
import type { TreeAndNumber as In } from './treeKit.ts';

const FORMAT = '5 4 8 11 null 13 4 7 2 null null 5 1 ; 22';

const java = [
  'public List<List<Integer>> pathSum(TreeNode root, int target) {',
  '    List<List<Integer>> res = new ArrayList<>();',
  '    dfs(root, target, new ArrayList<>(), res);',
  '    return res;',
  '}',
  'private void dfs(TreeNode n, int rem, List<Integer> path, List<List<Integer>> res) {',
  '    if (n == null) return;',
  '    path.add(n.val);',
  '    rem -= n.val;',
  '    if (n.left == null && n.right == null && rem == 0)',
  '        res.add(new ArrayList<>(path));',
  '    dfs(n.left, rem, path, res);',
  '    dfs(n.right, rem, path, res);',
  '    path.remove(path.size() - 1);',
  '}',
];
const python = [
  'def path_sum(root, target):',
  '    res, path = [], []',
  '    def dfs(n, rem):',
  '        if not n:',
  '            return',
  '        path.append(n.val)',
  '        rem -= n.val',
  '        if not n.left and not n.right and rem == 0:',
  '            res.append(path[:])',
  '        dfs(n.left, rem)',
  '        dfs(n.right, rem)',
  '        path.pop()',
  '    dfs(root, target)',
  '    return res',
];
const J = { start: find(java, 'dfs(root, target'), choose: find(java, 'path.add(n.val)', 'rem -= n.val'), leaf: find(java, 'if (n.left == null && n.right == null && rem == 0)'), save: find(java, 'res.add(new ArrayList<>(path))'), kids: find(java, 'dfs(n.left, rem', 'dfs(n.right, rem'), undo: find(java, 'path.remove'), ret: find(java, 'return res;') };
const P = { start: find(python, 'dfs(root, target)'), choose: find(python, 'path.append(n.val)', 'rem -= n.val'), leaf: find(python, 'if not n.left and not n.right and rem == 0'), save: find(python, 'res.append(path[:])'), kids: find(python, 'dfs(n.left, rem)', 'dfs(n.right, rem)'), undo: find(python, 'path.pop()'), ret: find(python, 'return res') };

function build({ tokens, target }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const path: number[] = []; // node ids
  const res: number[][] = [];
  const onSolution = new Set<number>();
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = (): Aux[] => [
    stackAux('path (current root → node)', path.map((id) => String(val(id)))),
    listAux('paths found', res.map(fmtList)),
  ];
  const vars = (node: number | string, r: number | string) => ({ node, remaining: r, 'path sum': path.reduce((a, id) => a + val(id), 0), found: res.length });

  add({
    title: 'Start', desc: `Collect every root-to-leaf path that adds up to ${target}. Keep the path in a list; add a node when going down, remove it when coming back.`,
    logic: 'This is DFS with backtracking: one shared path list is extended and then restored so every branch starts from the correct prefix.',
    j: J.start, p: P.start, a: 0, vars: vars('—', target), aux: aux(),
  });

  const dfs = (id: number, remBefore: number) => {
    const v = val(id);
    const n = nodes[id];
    path.push(id);
    const rem = remBefore - v;
    states[id] = 'active';
    labels[id] = `rem ${rem}`;
    add({
      title: `Choose ${v}`, desc: `Add ${v} to the path. Remaining target: ${remBefore} − ${v} = ${rem}.`,
      logic: 'Commit to this node, then explore below it.',
      j: J.choose, p: P.choose, a: 1, vars: vars(v, rem), aux: aux(),
    });
    const leaf = n.left === null && n.right === null;
    if (leaf) {
      const hit = rem === 0;
      if (hit) {
        res.push([...path.map(val)]);
        path.forEach((p) => onSolution.add(p));
      }
      add({
        title: hit ? `Leaf ${v}: path ${fmtList(path.map(val))} works` : `Leaf ${v}: remaining ${rem} ≠ 0`,
        desc: hit ? 'The remaining target is exactly 0 at a leaf. Save a COPY of the current path.' : `A leaf with ${rem} still needed — this path does not hit the target.`,
        logic: hit ? 'Copy the list: the shared path will keep changing as we backtrack.' : 'Nothing to save; just undo and try another branch.', tone: hit ? 'success' : 'warn',
        j: hit ? [...J.leaf, ...J.save] : J.leaf, p: hit ? [...P.leaf, ...P.save] : P.leaf, a: 2, vars: vars(v, rem), aux: aux(),
      });
    }
    if (n.left !== null) dfs(n.left, rem);
    if (n.right !== null) dfs(n.right, rem);
    path.pop();
    states[id] = onSolution.has(id) ? 'found' : 'dim';
    add({
      title: `Backtrack from ${v}`, desc: `Remove ${v} from the path${path.length ? ` — back at ${val(path[path.length - 1])}` : ''}. ${onSolution.has(id) ? 'It lies on a saved path (green).' : 'No saved path goes through it (faded).'}`,
      logic: 'Undo the choice so sibling branches see the original path.',
      j: J.undo, p: P.undo, a: 3, vars: vars(path.length ? val(path[path.length - 1]) : '—', path.length ? remBefore : target), aux: aux(),
    });
  };
  dfs(0, target);

  const out = fmtLists(res);
  add({
    title: 'Done', desc: res.length ? `${res.length} path${res.length === 1 ? ' sums' : 's sum'} to ${target}: ${out}` : `No root-to-leaf path sums to ${target}, so the result is empty.`,
    logic: 'Every root-to-leaf path was examined once.', tone: res.length ? 'success' : 'warn',
    j: J.ret, p: P.ret, a: 3, vars: vars('—', target), aux: aux(), result: { title: out, text: `Paths with sum ${target}` },
  });
  return steps;
}

function annotated(input: In): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: (_m, s) => `path = [], remaining = ${s.vars.remaining}` },
    { on: /^Choose (-?\d+)/, tag: 'CHOOSE —', note: (m, s) => `path.add(${m[1]}); remaining → ${s.vars.remaining}` },
    { on: /^Leaf (-?\d+): path .* works$/, tag: '✔ SAVE PATH —', note: () => 'remaining == 0 → res.add(new ArrayList<>(path))' },
    { on: /^Leaf (-?\d+): remaining/, tag: '✗ DEAD END —', note: (_m, s) => `remaining ${s.vars.remaining} != 0 → reject`, alert: (m, s) => `Leaf ${m[1]} is rejected: remaining ${s.vars.remaining} ≠ 0, so this path is not saved.`, logicTone: 'warn' },
    { on: /^Backtrack from (-?\d+)/, tag: '↩ BACKTRACK —', note: (m) => `path.remove(last) → undo ${m[1]}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return res → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const pathSumII: ProblemDef<In> = {
  slug: '113-path-sum-ii',
  id: '113', title: 'Path Sum II', difficulty: 'Medium', category: 'Tree', tag: 'DFS + backtrack',
  statement: 'Given a binary tree and a target sum, return every root-to-leaf path (as a list of node values) whose values add up to the target.',
  constraints: '0 ≤ nodes ≤ 5000 (animation input: up to 12 nodes). Input format: tree in level order, then ";", then the target sum.',
  examples: [
    { label: '5 4 8 11 null 13 4 7 2 null null 5 1 ; 22', input: { tokens: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1], target: 22 }, output: '[[5,4,11,2],[5,8,4,5]]' },
    { label: '1 2 3 ; 5', input: { tokens: [1, 2, 3], target: 5 }, output: '[]' },
    { label: '1 2 ; 3', input: { tokens: [1, 2], target: 3 }, output: '[[1,2]]' },
  ],
  inputPlaceholder: `e.g. ${FORMAT}`,
  parseInput: (raw) => parseTreeAndNumber(raw, 'target sum', FORMAT), buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'On the current path', state: 'active' }, { label: 'On a saved path', state: 'found' }, { label: 'Explored, backtracked', state: 'dim' }],
  varLabels: ['node', 'remaining', 'path sum', 'found'],
  emphasis: ['root-to-leaf', 'sum', 'path'],
  phases: [
    { icon: '🚀', label: 'Start dfs, empty path', tone: 'blue' },
    { icon: '➕', label: 'Choose node, subtract', tone: 'cyan' },
    { icon: '🍃', label: 'Leaf: remaining == 0?', tone: 'gold' },
    { icon: '↩️', label: 'Backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'DFS with a shared path list',
    text: 'Walk down from the root, adding each node to a path and subtracting it from the remaining target. At a leaf with remaining 0, save a copy of the path. On the way back up, remove the node (backtrack) so the next branch starts clean.',
  },
  java, python,
  algorithm: [
    'Start dfs(root, target) with an empty path list',
    'Add the node to the path and subtract its value from the remaining target',
    'At a leaf with remaining == 0, save a copy of the path',
    'Recurse left and right, then remove the node from the path (backtrack)',
    'Return every saved path',
  ],
  complexity: [{ label: 'Time', value: 'O(n²)' }, { label: 'Space', value: 'O(h)' }],
  why: 'Each node is visited once, but copying a saved path costs up to O(h), and a tree can have O(n) leaves, so the worst case is O(n²) (typically much less). The shared list is modified symmetrically — add on entry, remove on exit — so at any moment it holds exactly the root-to-current-node path. Copying on save is essential: the list will be mutated again after the call returns.',
};
