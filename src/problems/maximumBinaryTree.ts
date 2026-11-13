import type { Aux, Cell, CellState, Pointer, ProblemDef, Scene, Step, TreeNodeVM } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { parseInts } from './stepKit.ts';
import { emitter, find, stackAux, toLevelOrder, treeScene } from './treeKit.ts';
import { ptr } from './ssbShared.ts';

interface In { nums: number[] }

const java = [
  'public TreeNode constructMaximumBinaryTree(int[] nums) {',
  '    return build(nums, 0, nums.length - 1);',
  '}',
  'private TreeNode build(int[] nums, int lo, int hi) {',
  '    if (lo > hi) return null;                          // empty range: no node',
  '    int m = lo;                                        // index of the maximum in [lo, hi]',
  '    for (int i = lo + 1; i <= hi; i++) if (nums[i] > nums[m]) m = i;',
  '    TreeNode node = new TreeNode(nums[m]);             // the maximum becomes the root',
  '    node.left = build(nums, lo, m - 1);                // everything left of it',
  '    node.right = build(nums, m + 1, hi);               // everything right of it',
  '    return node;',
  '}',
];
const python = [
  'def construct_maximum_binary_tree(nums):',
  '    def build(lo, hi):',
  '        if lo > hi:',
  '            return None                                 # empty range: no node',
  '        m = max(range(lo, hi + 1), key=lambda i: nums[i])   # index of the maximum',
  '        node = TreeNode(nums[m])                        # the maximum becomes the root',
  '        node.left = build(lo, m - 1)                    # everything left of it',
  '        node.right = build(m + 1, hi)                   # everything right of it',
  '        return node',
  '    return build(0, len(nums) - 1)',
];
const J = { start: find(java, 'return build(nums, 0'), empty: find(java, 'if (lo > hi)'), scan: find(java, 'int m = lo', 'for (int i = lo + 1'), node: find(java, 'TreeNode node = new'), kids: find(java, 'node.left = build', 'node.right = build'), ret: find(java, 'return node;') };
const P = { start: find(python, 'return build(0'), empty: find(python, 'if lo > hi', 'return None'), scan: find(python, 'm = max(range'), node: find(python, 'node = TreeNode'), kids: find(python, 'node.left = build', 'node.right = build'), ret: find(python, 'return node') };

function build({ nums }: In): Step[] {
  const n = nums.length;
  const nodes: TreeNodeVM[] = [];
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let lo0 = 0;
  let hi0 = n - 1;
  let marks: Record<number, CellState> = {};
  let ptrs: Pointer[] = [];
  const v: Record<string, string | number> = { lo: 0, hi: n - 1, i: '—', max: '—' };

  const scene = (): Scene => ({
    kind: 'split',
    parts: [
      { kind: 'array', cells: nums.map((value, i): Cell => ({ key: i, value, state: marks[i] ?? (i < lo0 || i > hi0 ? 'dim' : undefined) })), pointers: ptrs.map((p) => ({ ...p })) },
      treeScene(nodes, states, labels) as Exclude<Scene, { kind: 'split' }>,
    ],
  });
  const { steps, add } = emitter(scene);
  const aux = (): Aux[] => [stackAux('call stack: build(lo, hi)', stack)];
  const frame = (title: string, desc: string, logic: string, j: number[], p: number[], a: number, tone: 'info' | 'warn' | 'success' = 'info') =>
    add({ title, desc, logic, tone, j, p, a, vars: { ...v }, aux: aux() });

  frame('Start', `Build the maximum binary tree of ${JSON.stringify(nums)}: the largest value is the root, the part to its left builds the left subtree, the part to its right the right subtree.`,
    'No traversal order is given; the array itself and the "max is the root" rule determine the whole tree.', J.start, P.start, 0);

  const make = (lo: number, hi: number, parent: number | null, side: 'left' | 'right') => {
    lo0 = lo; hi0 = hi; marks = {}; ptrs = [];
    v.lo = lo; v.hi = hi; v.i = '—'; v.max = '—';
    stack.push(`build(${lo}, ${hi})`);
    if (lo > hi) {
      frame(`build(${lo}, ${hi}) → null`, 'The range is empty, so this child does not exist.', 'Base case: nothing is left between the chosen maximum and the edge of the range.', J.empty, P.empty, 1, 'warn');
      stack.pop();
      return;
    }
    let m = lo;
    ptrs = [ptr('m', 'max', m, 'orange')];
    v.max = nums[m];
    frame(`Scan [${lo}..${hi}] for the maximum`, `Start with nums[${lo}] = ${nums[lo]} as the best candidate and compare it with the rest of the range.`, 'The maximum splits the range into two independent parts.', J.scan, P.scan, 1);
    for (let i = lo + 1; i <= hi; i++) {
      const better = nums[i] > nums[m];
      if (better) m = i;
      marks = { [i]: 'compare' };
      ptrs = [ptr('m', 'max', m, 'orange'), ...(i !== m ? [ptr('i', 'i', i, 'blue')] : [])];
      v.i = i; v.max = nums[m];
      frame(`${nums[i]} ${better ? '>' : '≤'} current max`, better ? `nums[${i}] = ${nums[i]} beats the previous maximum, so the maximum index becomes ${i}.` : `nums[${i}] = ${nums[i]} does not beat ${nums[m]}; the maximum stays at index ${m}.`, 'A single pass over the range finds the maximum.', J.scan, P.scan, 1);
    }
    const id = nodes.length;
    nodes.push({ id, value: nums[m], left: null, right: null });
    if (parent !== null) nodes[parent][side] = id;
    states[id] = 'active';
    marks = { [m]: 'found' };
    ptrs = [ptr('m', 'max', m, 'orange')];
    v.i = '—'; v.max = nums[m];
    frame(`${nums[m]} becomes the root of [${lo}..${hi}]`, `Create a node for ${nums[m]}${parent === null ? ' (the root of the whole tree)' : ` as the ${side} child of ${nodes[parent].value}`}. Left part: [${lo}..${m - 1}], right part: [${m + 1}..${hi}].`,
      'Everything left of the maximum goes into its left subtree, everything right of it into its right subtree, keeping the original order.', J.node, P.node, 2, 'success');
    states[id] = 'compare';
    make(lo, m - 1, id, 'left');
    lo0 = lo; hi0 = hi; marks = { [m]: 'found' }; ptrs = []; v.lo = lo; v.hi = hi; v.max = nums[m];
    frame(`Left side of ${nums[m]} finished`, `Now build the right part [${m + 1}..${hi}].`, 'The two sub-ranges are independent: building one never affects the other.', J.kids, P.kids, 3);
    make(m + 1, hi, id, 'right');
    states[id] = 'found';
    stack.pop();
  };
  make(0, n - 1, null, 'left');

  lo0 = 0; hi0 = n - 1; marks = {}; ptrs = [];
  const out = toLevelOrder(nodes, 0);
  v.lo = '—'; v.hi = '—'; v.i = '—'; v.max = '—';
  frame('Done', `Every value became a node. Level order of the tree: ${out}`, 'Each range was split at its maximum exactly once, so every element is the root of exactly one range.', J.ret, P.ret, 3, 'success');
  steps[steps.length - 1].result = { title: out, text: 'Maximum binary tree (level order)' };
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'build(0, n − 1)' },
    { on: /^build\((-?\d+), (-?\d+)\) → null/, tag: '∅ EMPTY —', note: (m) => `lo ${m[1]} > hi ${m[2]} → return null`, algoStep: 0 },
    { on: /^Scan \[(\d+)\.\.(\d+)\] for the maximum/, tag: '🔍 SCAN —', note: (m) => `m = ${m[1]}; scan i = ${Number(m[1]) + 1}..${m[2]}` },
    { on: /^(-?\d+) (>|≤) current max/, tag: 'COMPARE —', note: (m, s) => `nums[i] = ${m[1]} ${m[2]} max → max = ${s.vars.max}` },
    { on: /^(-?\d+) becomes the root of \[(\d+)\.\.(\d+)\]/, tag: '🌱 ROOT —', note: (m) => `node = new TreeNode(${m[1]}) for range ${m[2]}..${m[3]}` },
    { on: /^Left side of (-?\d+) finished/, tag: '➡️ RIGHT —', note: () => 'root.right = build(m + 1, hi)' },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return root → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const maximumBinaryTree: ProblemDef<In> = {
  slug: '654-maximum-binary-tree',
  id: '654', title: 'Maximum Binary Tree', difficulty: 'Medium', category: 'Tree', tag: 'split at the maximum',
  statement: 'Build a binary tree from an array of distinct integers: the root is the maximum value, its left subtree is built from the part of the array left of the maximum, and its right subtree from the part right of it, recursively.',
  constraints: '1 ≤ nums.length ≤ 1000, all values distinct (animation input is limited to 8 numbers).',
  examples: [
    { label: '[3, 2, 1, 6, 0, 5]', input: { nums: [3, 2, 1, 6, 0, 5] }, output: '[6,3,5,null,2,0,null,null,1]' },
    { label: '[3, 2, 1]', input: { nums: [3, 2, 1] }, output: '[3,null,2,null,1]' },
    { label: '[1, 5, 2, 4]', input: { nums: [1, 5, 2, 4] }, output: '[5,1,4,null,null,2]' },
  ],
  inputPlaceholder: 'e.g. 3 2 1 6 0 5',
  parseInput: (raw) => ({ nums: parseInts(raw, { what: 'numbers', example: '3 2 1 6 0 5', minLen: 1, maxLen: 8, distinct: true }) }),
  buildSteps: annotated, viz: 'cells',
  vizTitle: 'Array and the tree built from it',
  legend: [{ label: 'Maximum / root of the range', state: 'found' }, { label: 'Being compared', state: 'compare' }, { label: 'Outside the current range', state: 'dim' }, { label: 'Node under construction', state: 'active' }],
  varLabels: ['lo', 'hi', 'i', 'max'],
  emphasis: ['maximum', 'root', 'left', 'right'],
  phases: [
    { icon: '🚀', label: 'Call build; empty → null', tone: 'blue' },
    { icon: '🔍', label: 'Scan for the maximum', tone: 'cyan' },
    { icon: '🌱', label: 'Max becomes the root', tone: 'gold' },
    { icon: '↔️', label: 'Recurse left, then right', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'The maximum is the root',
    text: 'For a range [lo, hi], find its maximum, make it a node, then build the left child from [lo, m − 1] and the right child from [m + 1, hi]. An empty range gives no node.',
  },
  java, python,
  algorithm: [
    'Call build(lo, hi); an empty range returns null',
    'Scan the range to find the index m of its maximum',
    'Create a node for nums[m]',
    'Set its left child to build(lo, m − 1) and its right child to build(m + 1, hi)',
    'Return the root of the whole tree',
  ],
  complexity: [{ label: 'Time', value: 'O(n²) worst case (O(n log n) average; O(n) with a monotonic stack)' }, { label: 'Space', value: 'O(h) recursion plus the tree' }],
  why: 'The definition of the tree is itself the recursion: the maximum of a range must be that range’s root, and the elements on each side keep their relative order inside the corresponding subtree. Every element is the maximum of exactly one range, so each one becomes exactly one node. A sorted input makes every split lopsided and costs O(n²) scanning, which the monotonic-stack version avoids.',
};
