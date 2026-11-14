import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public boolean isSymmetric(TreeNode root) {',
  '    return root == null || isMirror(root.left, root.right);',
  '}',
  'private boolean isMirror(TreeNode a, TreeNode b) {',
  '    if (a == null && b == null) return true;',
  '    if (a == null || b == null) return false;',
  '    if (a.val != b.val) return false;',
  '    return isMirror(a.left, b.right)',
  '        && isMirror(a.right, b.left);',
  '}',
];
const python = [
  'def is_symmetric(root):',
  '    return not root or is_mirror(root.left, root.right)',
  '',
  'def is_mirror(a, b):',
  '    if not a and not b:',
  '        return True',
  '    if not a or not b:',
  '        return False',
  '    if a.val != b.val:',
  '        return False',
  '    return is_mirror(a.left, b.right) and is_mirror(a.right, b.left)',
];
const J = {
  start: find(java, 'return root == null'), bothNull: find(java, 'if (a == null && b == null)'), oneNull: find(java, 'if (a == null || b == null)'),
  differ: find(java, 'if (a.val != b.val)'), recurse: find(java, 'return isMirror(a.left', '&& isMirror(a.right'),
};
const P = {
  start: find(python, 'return not root'), bothNull: find(python, 'if not a and not b', 'return True'), oneNull: find(python, 'if not a or not b', ['return False', 1]),
  differ: find(python, 'if a.val != b.val', ['return False', 2]), recurse: find(python, 'return is_mirror(a.left'),
};

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const nm = (id: number | null) => (id === null ? '∅' : String(val(id)));
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack: isMirror(a, b)', stack)];
  const vars = (a: number | string, b: number | string, ret: string) => ({ a, b, returns: ret });

  add({
    title: 'Start', desc: 'A tree is symmetric when its left subtree is the mirror image of its right subtree. Compare them in mirrored pairs.',
    logic: 'Mirror pairs are (a.left, b.right) and (a.right, b.left): the outer nodes meet, and the inner nodes meet.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—'), aux: aux(),
  });

  const mirror = (a: number | null, b: number | null): boolean => {
    stack.push(`(${nm(a)}, ${nm(b)})`);
    if (a === null && b === null) {
      add({
        title: `(∅, ∅) → true`, desc: 'Both sides are empty — they trivially mirror each other.',
        logic: 'Base case: two empty subtrees match.', tone: 'success',
        j: J.bothNull, p: P.bothNull, a: 1, vars: vars('∅', '∅', 'true'), aux: aux(),
      });
      stack.pop();
      return true;
    }
    if (a === null || b === null) {
      const real = (a ?? b)!;
      states[real] = 'error';
      add({
        title: `(${nm(a)}, ${nm(b)}) → false`, desc: `One side has node ${val(real)} but its mirror position is empty.`,
        logic: 'The shapes differ, so the tree cannot be symmetric.', tone: 'warn',
        j: J.oneNull, p: P.oneNull, a: 1, vars: vars(nm(a), nm(b), 'false'), aux: aux(),
      });
      stack.pop();
      return false;
    }
    states[a] = 'compare';
    states[b] = 'compare';
    const same = val(a) === val(b);
    add({
      title: `Compare ${val(a)} and ${val(b)}`, desc: `Check that the two mirrored nodes hold the same value: ${val(a)} vs ${val(b)}.`,
      logic: 'Shapes must match and so must the values at mirrored positions.',
      j: J.differ, p: P.differ, a: 2, vars: vars(val(a), val(b), '—'), aux: aux(),
    });
    let ok = same;
    if (!same) {
      states[a] = 'error';
      states[b] = 'error';
      add({
        title: `${val(a)} ≠ ${val(b)} → false`, desc: 'The mirrored values differ, so the tree is not symmetric.',
        logic: 'One mismatch is enough to answer false.', tone: 'warn',
        j: J.differ, p: P.differ, a: 2, vars: vars(val(a), val(b), 'false'), aux: aux(),
      });
    } else {
      add({
        title: `Recurse on the children of ${val(a)} / ${val(b)}`, desc: `Values match. Next pairs: (${nm(nodes[a].left)}, ${nm(nodes[b].right)}) outer and (${nm(nodes[a].right)}, ${nm(nodes[b].left)}) inner.`,
        logic: 'Left child of a pairs with right child of b, and vice versa.',
        j: J.recurse, p: P.recurse, a: 3, vars: vars(val(a), val(b), '—'), aux: aux(),
      });
      ok = mirror(nodes[a].left, nodes[b].right) && mirror(nodes[a].right, nodes[b].left);
      states[a] = ok ? 'found' : 'error';
      states[b] = ok ? 'found' : 'error';
      add({
        title: `(${val(a)}, ${val(b)}) → ${ok}`, desc: ok ? 'Both inner and outer pairs mirror, so this pair does.' : 'A deeper pair failed, so this pair fails (the && short-circuits).',
        logic: ok ? 'Everything below this pair matched.' : 'false propagates all the way up.', tone: ok ? 'success' : 'warn',
        j: J.recurse, p: P.recurse, a: 3, vars: vars(val(a), val(b), String(ok)), aux: aux(),
      });
    }
    stack.pop();
    return ok;
  };

  const answer = mirror(nodes[0].left, nodes[0].right);
  add({
    title: 'Done', desc: answer ? 'Every mirrored pair matched.' : 'At least one mirrored pair did not match.',
    logic: answer ? 'The tree is symmetric.' : 'The tree is not symmetric.', tone: answer ? 'success' : 'warn',
    j: J.start, p: P.start, a: 3, vars: vars('—', '—', String(answer)), aux: aux(),
    result: { title: String(answer), text: answer ? 'Symmetric' : 'Not symmetric' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'isMirror(root.left, root.right)' },
    { on: /^\(∅, ∅\) → true/, tag: '∅ BOTH NULL —', note: 'a == null && b == null → true' },
    {
      on: /^\(.*\) → false$/,
      tag: (_m, s) => (s.desc.startsWith('One side') ? '✗ ONE NULL —' : '✗ FAILS —'),
      note: (_m, s) => (s.desc.startsWith('One side') ? 'exactly one of a, b is null → false' : 'a deeper pair failed → false'),
      alert: (_m, s) => (s.desc.startsWith('One side') ? 'Not a mirror: one side has a node where the other side is empty.' : undefined),
    },
    { on: /^\(.*\) → true$/, tag: 'RETURN —', note: 'outer and inner pairs mirror → true' },
    { on: /^Compare (-?\d+) and (-?\d+)/, tag: 'COMPARE —', note: (m) => `a.val vs b.val: ${m[1]} vs ${m[2]}` },
    { on: /^(-?\d+) ≠ (-?\d+) → false/, tag: '✗ MISMATCH —', note: (m) => `${m[1]} != ${m[2]} → return false`, alert: (m) => `Not a mirror: the paired values ${m[1]} and ${m[2]} differ.` },
    { on: /^Recurse on the children/, tag: 'RECURSE —', note: () => 'isMirror(a.left, b.right) && isMirror(a.right, b.left)' },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const symmetricTree: ProblemDef<TreeIn> = {
  slug: '101-symmetric-tree',
  id: '101', title: 'Symmetric Tree', difficulty: 'Easy', category: 'Tree', tag: 'DFS mirror',
  statement: 'Check whether a binary tree is a mirror of itself: the left subtree must be the reflection of the right subtree, in both shape and values.',
  constraints: '1 ≤ nodes ≤ 1000 (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '1 2 2 3 4 4 3', input: { tokens: [1, 2, 2, 3, 4, 4, 3] }, output: 'true' },
    { label: '1 2 2 null 3 null 3', input: { tokens: [1, 2, 2, null, 3, null, 3] }, output: 'false' },
    { label: '1 2 2 3 null null 3', input: { tokens: [1, 2, 2, 3, null, null, 3] }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 1 2 2 3 4 4 3',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Pair being compared', state: 'compare' }, { label: 'Pair mirrors', state: 'found' }, { label: 'Mismatch', state: 'error' }],
  varLabels: ['a', 'b', 'returns'],
  emphasis: ['symmetric', 'mirror image'],
  phases: [
    { icon: '🚀', label: 'Compare root.left / root.right', tone: 'blue' },
    { icon: '∅', label: 'Null checks', tone: 'orange' },
    { icon: '⚖️', label: 'Compare the two values', tone: 'cyan' },
    { icon: '🔁', label: 'Recurse on mirrored pairs', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Walk two pointers in mirrored directions',
    text: 'Compare the left and right subtrees together. Two nodes mirror each other when both are empty, or both exist with equal values and (a.left, b.right) and (a.right, b.left) also mirror.',
  },
  java, python,
  algorithm: [
    'Start by comparing root.left with root.right',
    'Both null → true; exactly one null → false',
    'Values differ → false',
    'Recurse on (a.left, b.right) and (a.right, b.left); both must be true',
    'Return the verdict for the whole tree',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'A mirror image swaps left and right at every level, so the node at position "left then right" must equal the node at "right then left". The recursion checks exactly those pairs, each node participates in one pair, giving O(n) time; the recursion depth is the tree height.',
};
