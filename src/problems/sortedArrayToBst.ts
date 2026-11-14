import type { CellState, ProblemDef, Step, TreeNodeVM } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { annotateRules } from './annotate.ts';
import { emitter, find, listAux, parseInts, stackAux, toLevelOrder, treeScene } from './treeKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const nums = parseInts(raw, 'The array');
  if (nums.length > 12) throw new Error('Use 12 numbers or fewer');
  if (nums.some((v, i) => i > 0 && v <= nums[i - 1])) throw new Error('The array must be sorted in strictly increasing order, e.g. -10 -3 0 5 9');
  return { nums };
}

const java = [
  'public TreeNode sortedArrayToBST(int[] nums) {',
  '    return build(nums, 0, nums.length - 1);',
  '}',
  'private TreeNode build(int[] nums, int lo, int hi) {',
  '    if (lo > hi) return null;',
  '    int mid = lo + (hi - lo) / 2;',
  '    TreeNode node = new TreeNode(nums[mid]);',
  '    node.left = build(nums, lo, mid - 1);',
  '    node.right = build(nums, mid + 1, hi);',
  '    return node;',
  '}',
];
const python = [
  'def sorted_array_to_bst(nums):',
  '    def build(lo, hi):',
  '        if lo > hi:',
  '            return None',
  '        mid = (lo + hi) // 2',
  '        node = TreeNode(nums[mid])',
  '        node.left = build(lo, mid - 1)',
  '        node.right = build(mid + 1, hi)',
  '        return node',
  '    return build(0, len(nums) - 1)',
];
const J = { start: find(java, 'return build(nums, 0'), empty: find(java, 'if (lo > hi)'), mid: find(java, 'int mid', 'new TreeNode'), left: find(java, 'node.left = build'), right: find(java, 'node.right = build'), ret: find(java, 'return node;') };
const P = { start: find(python, 'return build(0'), empty: find(python, 'if lo > hi', 'return None'), mid: find(python, 'mid = (lo + hi)', 'node = TreeNode'), left: find(python, 'node.left = build'), right: find(python, 'node.right = build'), ret: find(python, 'return node') };

function build({ nums }: In): Step[] {
  const nodes: TreeNodeVM[] = [];
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let range = `[0..${nums.length - 1}]`;
  let midIdx = -1;
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [listAux(`nums — current range ${range}`, nums, midIdx >= 0 ? midIdx : undefined), stackAux('call stack: build(lo, hi)', stack)];
  const vars = (lo: number | string, hi: number | string, mid: number | string) => ({ lo, hi, mid });

  add({
    title: 'Start', desc: 'Turn the sorted array into a height-balanced BST. The middle element becomes the root; the two halves become its subtrees.',
    logic: 'In a sorted array everything left of the middle is smaller and everything right is larger — exactly the BST rule — and halves have equal size, which keeps the tree balanced.',
    j: J.start, p: P.start, a: 0, vars: vars(0, nums.length - 1, '—'), aux: aux(),
  });

  const make = (lo: number, hi: number, parent: number | null, side: 'left' | 'right'): number | null => {
    stack.push(`build(${lo}, ${hi})`);
    range = lo > hi ? `[${lo}..${hi}] (empty)` : `[${lo}..${hi}]`;
    if (lo > hi) {
      midIdx = -1;
      add({
        title: `build(${lo}, ${hi}) → null`, desc: `lo > hi: the range is empty, so this child stays null.`,
        logic: 'Base case: no elements left means no node.', tone: 'warn',
        j: J.empty, p: P.empty, a: 1, vars: vars(lo, hi, '—'), aux: aux(),
      });
      stack.pop();
      return null;
    }
    const mid = lo + Math.floor((hi - lo) / 2);
    midIdx = mid;
    const id = nodes.length;
    nodes.push({ id, value: nums[mid], left: null, right: null });
    if (parent !== null) nodes[parent][side] = id;
    states[id] = 'active';
    add({
      title: `Middle of [${lo}..${hi}] is ${nums[mid]}`, desc: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}. Create a node with nums[${mid}] = ${nums[mid]}${parent === null ? ' — the root' : ` as the ${side} child of ${nodes[parent].value}`}.`,
      logic: `${mid - lo} element${mid - lo === 1 ? ' goes' : 's go'} left, ${hi - mid} ${hi - mid === 1 ? 'goes' : 'go'} right — their counts differ by at most 1.`, tone: 'success',
      j: J.mid, p: P.mid, a: 2, vars: vars(lo, hi, mid), aux: aux(),
    });
    states[id] = 'compare';
    make(lo, mid - 1, id, 'left');
    make(mid + 1, hi, id, 'right');
    states[id] = 'found';
    range = `[${lo}..${hi}]`;
    midIdx = mid;
    stack.pop();
    return id;
  };

  make(0, nums.length - 1, null, 'left');
  midIdx = -1;
  const out = toLevelOrder(nodes, 0);
  add({
    title: 'Done', desc: `All ${plural(nums.length, 'element')} ${verb(nums.length, 'is', 'are')} placed. Level order of the BST: ${out}`,
    logic: 'In-order reading of this tree gives back the sorted array, and no two subtrees differ in height by more than 1.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('—', '—', '—'), aux: aux(), result: { title: out, text: 'Height-balanced BST (level order)' },
  });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'build(0, n − 1)' },
    { on: /^build\((-?\d+), (-?\d+)\) → null/, tag: '∅ EMPTY —', note: (m) => `lo ${m[1]} > hi ${m[2]} → return null` },
    { on: /^Middle of \[(-?\d+)\.\.(-?\d+)\] is (-?\d+)/, tag: '🎯 MIDDLE —', note: (m) => `mid = ${m[1]} + (${m[2]} − ${m[1]}) / 2 → node ${m[3]}` },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return root → ${s.result?.title}` },
  ]);
}

export const sortedArrayToBst: ProblemDef<In> = {
  slug: '108-convert-sorted-array-to-bst',
  id: '108', title: 'Convert Sorted Array to BST', difficulty: 'Easy', category: 'Tree', tag: 'divide & conquer',
  statement: 'Given an integer array sorted in strictly increasing order, build a height-balanced binary search tree containing exactly those values. (Several answers can be valid; the animation always picks the lower middle.)',
  constraints: '1 ≤ n ≤ 10⁴, values strictly increasing (animation input is limited to 12 numbers)',
  examples: [
    { label: '-10 -3 0 5 9', input: { nums: [-10, -3, 0, 5, 9] }, output: '[0,-10,5,null,-3,null,9]' },
    { label: '1 3', input: { nums: [1, 3] }, output: '[1,null,3]' },
    { label: '1 2 3 4 5 6 7', input: { nums: [1, 2, 3, 4, 5, 6, 7] }, output: '[4,2,6,1,3,5,7]' },
  ],
  inputPlaceholder: 'e.g. -10 -3 0 5 9 (sorted, increasing)',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Node just created', state: 'active' }, { label: 'Waiting on its subtrees', state: 'compare' }, { label: 'Subtree complete', state: 'found' }],
  varLabels: ['lo', 'hi', 'mid'],
  emphasis: ['sorted array', 'height-balanced', 'binary search tree'],
  phases: [
    { icon: '🚀', label: 'Call build(0, n−1)', tone: 'blue' },
    { icon: '∅', label: 'lo > hi: null', tone: 'orange' },
    { icon: '🎯', label: 'Middle is the root; recurse', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Middle element is the root',
    text: 'Pick the middle of the current range as the root, then build the left subtree from the elements before it and the right subtree from the elements after it. Empty ranges become null.',
  },
  java, python,
  algorithm: [
    'Call build(0, n − 1)',
    'If lo > hi return null',
    'Take mid = lo + (hi − lo) / 2 and create a node for nums[mid]',
    'Attach build(lo, mid − 1) and build(mid + 1, hi) as its children, then return the root',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(log n)' }],
  why: 'Choosing the middle splits the remaining elements into two halves whose sizes differ by at most one, so every subtree is balanced and the height is ⌈log₂(n+1)⌉. Smaller values always sit left and larger right, which preserves the BST property. Each element becomes one node, and the recursion depth is the tree height.',
};
