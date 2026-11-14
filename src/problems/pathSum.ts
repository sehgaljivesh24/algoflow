import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseTreeAndNumber, stackAux, treeScene } from './treeKit.ts';
import type { TreeAndNumber as In } from './treeKit.ts';

const FORMAT = '5 4 8 11 null 13 4 7 2 null null null 1 ; 22';

const java = [
  'public boolean hasPathSum(TreeNode node, int target) {',
  '    if (node == null) return false;',
  '    if (node.left == null && node.right == null)',
  '        return target == node.val;',
  '    return hasPathSum(node.left, target - node.val)',
  '        || hasPathSum(node.right, target - node.val);',
  '}',
];
const python = [
  'def has_path_sum(node, target):',
  '    if not node:',
  '        return False',
  '    if not node.left and not node.right:',
  '        return target == node.val',
  '    rest = target - node.val',
  '    return has_path_sum(node.left, rest) or has_path_sum(node.right, rest)',
];
const J = { start: find(java, 'public boolean hasPathSum'), nul: find(java, 'if (node == null)'), leaf: find(java, 'if (node.left == null && node.right == null)', 'return target == node.val'), kids: find(java, 'return hasPathSum(node.left', '|| hasPathSum(node.right') };
const P = { start: find(python, 'def has_path_sum'), nul: find(python, 'if not node', 'return False'), leaf: find(python, 'if not node.left', 'return target == node.val'), kids: find(python, 'rest = target', 'return has_path_sum') };

function build({ tokens, target }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack: node, target left', stack)];
  const vars = (node: number | string, need: number | string, ret: string) => ({ node, 'target left': need, returns: ret });

  add({
    title: 'Start', desc: `Is there a root-to-leaf path whose values add up to ${target}? Carry the amount still needed down the tree.`,
    logic: 'At each node subtract its value from the target; a leaf succeeds when the remaining target equals its own value.',
    j: J.start, p: P.start, a: 0, vars: vars('—', target, '—'), aux: aux(),
    tag: 'CALL', note: `hasPathSum(${val(0)}, ${target})`,
  });

  const walk = (id: number, need: number): boolean => {
    const v = val(id);
    const n = nodes[id];
    stack.push(`${v} (need ${need})`);
    states[id] = 'active';
    labels[id] = `need ${need}`;
    const leaf = n.left === null && n.right === null;
    if (leaf) {
      const hit = need === v;
      states[id] = hit ? 'found' : 'error';
      add({
        title: `Leaf ${v}: ${hit ? 'match' : 'no match'}`, desc: hit ? `Leaf ${v} with ${need} still needed: ${v} = ${need}, so this path sums to ${target}!` : `Leaf ${v} with ${need} still needed: ${v} ≠ ${need}, so this path misses the target.`,
        logic: 'Only a leaf can end a path, so this is the only place we compare.', tone: hit ? 'success' : 'warn',
        j: J.leaf, p: P.leaf, a: 2, vars: vars(v, need, String(hit)), aux: aux(),
        tag: 'LEAF', note: `target == node.val → ${need} == ${v} is ${hit}`,
        alert: hit ? undefined : `Leaf ${v} does not equal the remaining ${need}: this path is rejected.`,
      });
      stack.pop();
      return hit;
    }
    add({
      title: `Visit ${v}, need ${need}`, desc: `Node ${v} is not a leaf. Pass ${need} − ${v} = ${need - v} down to its child${n.left !== null && n.right !== null ? 'ren' : ''}.`,
      logic: 'The target shrinks by this node’s value on the way down.',
      j: J.kids, p: P.kids, a: 1, vars: vars(v, need, '—'), aux: aux(),
      tag: 'VISIT', note: `target − node.val = ${need} − ${v} = ${need - v}`,
    });
    let ok = false;
    let skipped = false;
    if (n.left !== null) ok = walk(n.left, need - v);
    if (!ok && n.right !== null) ok = walk(n.right, need - v);
    else if (ok && n.right !== null) skipped = true;
    if (ok) {
      states[id] = 'found';
      add({
        title: `${v}: path found below`, desc: skipped ? `A child of ${v} returned true, so ${v} returns true and its right subtree is never visited.` : `A child of ${v} returned true, so ${v} returns true to its parent.`,
        logic: 'The || short-circuits: after the first success nothing else needs to be searched.', tone: 'success',
        j: J.kids, p: P.kids, a: 3, vars: vars(v, need, 'true'), aux: aux(),
        tag: 'FOUND', note: `hasPathSum(${v}, ${need}) = true`,
        alert: skipped ? `Right subtree of ${v} is skipped: the left side already succeeded.` : undefined,
      });
    } else {
      states[id] = 'dim';
      add({
        title: `${v}: no path below`, desc: `No path under ${v} adds up to ${need}, so return false to the parent.`,
        logic: 'Both subtrees failed (or do not exist), so backtrack.', tone: 'warn',
        j: J.kids, p: P.kids, a: 3, vars: vars(v, need, 'false'), aux: aux(),
        tag: 'BACKTRACK', note: `hasPathSum(${v}, ${need}) = false`,
        alert: `Both subtrees of ${v} failed: dead end, backtrack.`,
      });
    }
    stack.pop();
    return ok;
  };

  const answer = walk(0, target);
  add({
    title: 'Done', desc: answer ? `A root-to-leaf path sums to ${target} (the green path), so the answer is true.` : `No root-to-leaf path sums to ${target}, so the answer is false.`,
    logic: answer ? 'The search stopped at the first success; the right side may never have been visited.' : 'Every root-to-leaf path was tried.', tone: answer ? 'success' : 'warn',
    j: J.start, p: P.start, a: 4, vars: vars('—', target, String(answer)), aux: aux(), result: { title: String(answer), text: answer ? `Path with sum ${target} exists` : `No path with sum ${target}` },
    tag: '✅ Done!', note: `return ${answer}`,
  });
  return steps;
}

export const pathSum: ProblemDef<In> = {
  slug: '112-path-sum',
  id: '112', title: 'Path Sum', difficulty: 'Easy', category: 'Tree', tag: 'DFS',
  statement: 'Given a binary tree and an integer target, decide whether the tree has a root-to-leaf path whose node values add up to the target.',
  constraints: '0 ≤ nodes ≤ 5000 (animation input: up to 12 nodes). Input format: tree in level order, then ";", then the target sum.',
  examples: [
    { label: '5 4 8 11 null 13 4 7 2 null null null 1 ; 22', input: { tokens: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], target: 22 }, output: 'true' },
    { label: '1 2 3 ; 5', input: { tokens: [1, 2, 3], target: 5 }, output: 'false' },
    { label: '1 2 ; 1', input: { tokens: [1, 2], target: 1 }, output: 'false' },
  ],
  inputPlaceholder: `e.g. ${FORMAT}`,
  parseInput: (raw) => parseTreeAndNumber(raw, 'target sum', FORMAT), buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current path', state: 'active' }, { label: 'On the matching path', state: 'found' }, { label: 'Leaf with wrong sum', state: 'error' }, { label: 'Dead end', state: 'dim' }],
  varLabels: ['node', 'target left', 'returns'],
  emphasis: ['root-to-leaf path', 'add up to the target'],
  phases: [
    { icon: '🎯', label: 'CALL (root, target)', tone: 'blue' },
    { icon: '⬇', label: 'DESCEND (subtract)', tone: 'cyan' },
    { icon: '🍃', label: 'LEAF check', tone: 'gold' },
    { icon: '↩', label: 'RETURN / backtrack', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Subtract as you descend',
    text: 'Recurse with the remaining target. At a leaf, check whether the remaining target equals the leaf’s value. At an internal node, subtract its value and try the left subtree, then the right; stop as soon as one succeeds.',
  },
  java, python,
  algorithm: [
    'Call hasPathSum(root, target); null → false',
    'At an internal node, recurse into the children with target − node.val',
    'At a leaf, return target == node.val',
    'Return true if either child succeeds (stop at the first success), else false',
    'Return the root’s answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'A root-to-leaf path sums to the target exactly when, after subtracting every ancestor’s value, the leaf’s own value equals what is left. Carrying the remainder down avoids re-adding the path. Each node is visited at most once. Note that a non-leaf node must never return true — a path has to end at a leaf — which is why the empty child of a one-child node does not count.',
};
