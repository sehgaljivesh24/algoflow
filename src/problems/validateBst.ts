import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, parseTree, stackAux, treeScene } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';

const java = [
  'public boolean isValidBST(TreeNode root) {',
  '    return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);',
  '}',
  'private boolean valid(TreeNode n, long lo, long hi) {',
  '    if (n == null) return true;',
  '    if (n.val <= lo || n.val >= hi) return false;',
  '    return valid(n.left, lo, n.val)',
  '        && valid(n.right, n.val, hi);',
  '}',
];
const python = [
  'def is_valid_bst(root):',
  '    return valid(root, float("-inf"), float("inf"))',
  '',
  'def valid(n, lo, hi):',
  '    if not n:',
  '        return True',
  '    if n.val <= lo or n.val >= hi:',
  '        return False',
  '    return valid(n.left, lo, n.val) and valid(n.right, n.val, hi)',
];
const J = { start: find(java, 'return valid(root'), nul: find(java, 'if (n == null)'), check: find(java, 'if (n.val <= lo'), recurse: find(java, 'return valid(n.left', '&& valid(n.right') };
const P = { start: find(python, 'return valid(root'), nul: find(python, 'if not n', 'return True'), check: find(python, 'if n.val <= lo', ['return False', 1]), recurse: find(python, 'return valid(n.left') };

function build({ tokens }: TreeIn): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let violator: number | null = null;
  const val = (id: number) => Number(nodes[id].value);
  const b = (x: number | null, inf: string) => (x === null ? inf : String(x));
  const range = (lo: number | null, hi: number | null) => `(${b(lo, '−∞')}, ${b(hi, '∞')})`;
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack: valid(node, lo, hi)', stack)];
  const vars = (node: number | string, lo: number | string, hi: number | string, ret: string) => ({ node, lo, hi, returns: ret });

  add({
    title: 'Start', desc: 'Every node must lie strictly between a lower bound and an upper bound inherited from ALL of its ancestors, not just its parent.',
    logic: 'Going left makes the parent’s value the new upper bound; going right makes it the new lower bound. The root starts with no bounds (−∞, ∞).',
    j: J.start, p: P.start, a: 0, vars: vars('—', '−∞', '∞', '—'), aux: aux(),
  });

  const valid = (id: number, lo: number | null, hi: number | null): boolean => {
    const v = val(id);
    stack.push(`node ${v} in ${range(lo, hi)}`);
    states[id] = 'active';
    labels[id] = range(lo, hi);
    const bad = (lo !== null && v <= lo) || (hi !== null && v >= hi);
    add({
      title: `Check ${v} against ${range(lo, hi)}`, desc: bad ? `${v} is not strictly inside ${range(lo, hi)}.` : `${b(lo, '−∞')} < ${v} < ${b(hi, '∞')} holds.`,
      logic: bad ? `${v} ${lo !== null && v <= lo ? `≤ ${lo}` : `≥ ${hi}`} — an ancestor’s rule is broken, so this is not a BST.` : 'This node respects every bound; now check its children with tighter bounds.',
      tone: bad ? 'warn' : 'info',
      j: J.check, p: P.check, a: 1, vars: vars(v, b(lo, '−∞'), b(hi, '∞'), bad ? 'false' : '—'), aux: aux(),
    });
    if (bad) {
      states[id] = 'error';
      violator = id;
      stack.pop();
      return false;
    }
    const n = nodes[id];
    if (n.left !== null || n.right !== null) {
      add({
        title: `Children of ${v}`, desc: `Left child must lie in ${range(lo, v)}; right child must lie in ${range(v, hi)}${n.left === null ? ' (no left child → true)' : ''}${n.right === null ? ' (no right child → true)' : ''}.`,
        logic: 'The new bound replaces only one side of the range; the other side is inherited unchanged.',
        j: J.recurse, p: P.recurse, a: 2, vars: vars(v, b(lo, '−∞'), b(hi, '∞'), '—'), aux: aux(),
      });
    }
    const ok = (n.left === null || valid(n.left, lo, v)) && (n.right === null || valid(n.right, v, hi));
    if (ok) states[id] = 'found';
    stack.pop();
    return ok;
  };

  const answer = valid(0, null, null);
  add({
    title: 'Done', desc: answer ? 'Every node stayed inside its bounds.' : `Node ${val(violator!)} broke its bounds.`,
    logic: answer ? 'The tree is a valid BST.' : 'One violation is enough: the tree is not a valid BST.', tone: answer ? 'success' : 'warn',
    j: J.start, p: P.start, a: 3, vars: vars('—', '—', '—', String(answer)), aux: aux(), result: { title: String(answer), text: answer ? 'Valid BST' : 'Not a valid BST' },
  });
  return steps;
}

function annotated(input: TreeIn): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'valid(root, −∞, +∞)' },
    {
      on: /^Check (-?\d+) against/,
      tag: (_m, s) => (s.logicTone === 'warn' ? '✗ VIOLATION —' : 'CHECK —'),
      note: (m, s) => `${s.vars.lo} < ${m[1]} < ${s.vars.hi} → ${s.logicTone === 'warn' ? 'false' : 'ok'}`,
      alert: (m, s) => (s.logicTone === 'warn' ? `Node ${m[1]} breaks the bounds (${s.vars.lo}, ${s.vars.hi}) it inherited from its ancestors.` : undefined),
    },
    { on: /^Children of (-?\d+)/, tag: 'BOUNDS —', note: (m, s) => `left gets (${s.vars.lo}, ${m[1]}); right gets (${m[1]}, ${s.vars.hi})` },
    {
      on: 'last',
      tag: '✅ Done!',
      note: (_m, s) => `return ${s.result?.title}`,
      alert: (_m, s) => (s.result?.title === 'true' ? '✅ Valid BST: every node stayed inside its bounds.' : `Not a valid BST: ${s.desc}`),
      algoStep: 4,
    },
  ]);
}

export const validateBst: ProblemDef<TreeIn> = {
  slug: '98-validate-binary-search-tree',
  id: '98', title: 'Validate Binary Search Tree', difficulty: 'Medium', category: 'Tree', tag: 'inorder / bounds',
  statement: 'Determine whether a binary tree is a valid binary search tree: every node’s left subtree holds strictly smaller values, its right subtree strictly larger ones, and both subtrees are themselves valid BSTs.',
  constraints: '1 ≤ nodes ≤ 10⁴ (animation input is limited to 12 nodes; write the tree in level order, using null for gaps)',
  examples: [
    { label: '5 1 4 null null 3 6', input: { tokens: [5, 1, 4, null, null, 3, 6] }, output: 'false' },
    { label: '2 1 3', input: { tokens: [2, 1, 3] }, output: 'true' },
    { label: '5 4 6 null null 3 7', input: { tokens: [5, 4, 6, null, null, 3, 7] }, output: 'false' },
    { label: '8 4 12 2 6 10 14', input: { tokens: [8, 4, 12, 2, 6, 10, 14] }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. 5 1 4 null null 3 6',
  parseInput: parseTree, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Being checked', state: 'active' }, { label: 'Subtree valid', state: 'found' }, { label: 'Violates a bound', state: 'error' }],
  varLabels: ['node', 'lo', 'hi', 'returns'],
  emphasis: ['bound', 'ancestors', 'strictly'],
  phases: [
    { icon: '🚀', label: 'Start: (−∞, +∞)', tone: 'blue' },
    { icon: '🔍', label: 'Check node vs bounds', tone: 'cyan' },
    { icon: '📐', label: 'Tighten bounds for children', tone: 'gold' },
    { icon: '↩️', label: 'Both sides must be true', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Pass an allowed range down the tree',
    text: 'Checking only parent versus child is not enough — a deep node must also respect every ancestor. So carry (lo, hi) down: the left child inherits (lo, node.val) and the right child inherits (node.val, hi). A node outside its range makes the tree invalid.',
  },
  java, python,
  algorithm: [
    'Call valid(root, −∞, +∞)',
    'null → true; if val ≤ lo or val ≥ hi → false',
    'Left child gets the range (lo, val); right child gets (val, hi)',
    'The tree is valid only if both recursive calls return true',
    'Return the verdict at the root',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'The BST rule says each value is bounded by every ancestor at which the path turned left (upper bounds) or right (lower bounds). The tightest such bounds are exactly the (lo, hi) we carry, so checking each node against them is equivalent to the full definition. Using strict comparisons rejects duplicates, and 64-bit sentinels avoid trouble when a node holds Integer.MIN_VALUE or MAX_VALUE.',
};
