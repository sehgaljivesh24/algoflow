import type { Aux, CellState, ProblemDef, Step, TreeNodeVM } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { annotateRules } from './annotate.ts';
import { emitter, find, listAux, parseInts, splitParts, stackAux, toLevelOrder, treeScene } from './treeKit.ts';

interface In { pre: number[]; ino: number[] }

const FORMAT = '3 9 20 15 7 ; 9 3 15 20 7';

/** Plain reconstruction used only to validate that the two orders describe the same tree. */
function rebuilds(pre: number[], ino: number[]): boolean {
  const pos = new Map(ino.map((v, i) => [v, i]));
  let k = 0;
  const outPre: number[] = [];
  const outIn: number[] = [];
  const go = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (k >= pre.length) {
      k = Infinity;
      return;
    }
    const v = pre[k++];
    outPre.push(v);
    const m = pos.get(v)!;
    if (m === undefined || m < lo || m > hi) {
      k = Infinity;
      return;
    }
    go(lo, m - 1);
    outIn.push(v);
    go(m + 1, hi);
  };
  go(0, ino.length - 1);
  return k === pre.length && outPre.join() === pre.join() && outIn.join() === ino.join();
}

function parse(raw: string): In {
  const [a, b] = splitParts(raw, 2, FORMAT);
  const pre = parseInts(a, 'Preorder');
  const ino = parseInts(b, 'Inorder');
  if (pre.length > 12) throw new Error('Use 12 nodes or fewer');
  if (pre.length !== ino.length) throw new Error('Preorder and inorder must have the same number of values');
  if (new Set(pre).size !== pre.length) throw new Error('All values must be distinct');
  if (!pre.every((v) => ino.includes(v))) throw new Error('Preorder and inorder must contain the same values');
  if (!rebuilds(pre, ino)) throw new Error('These two orders do not describe the same binary tree');
  return { pre, ino };
}

const java = [
  'private int pre = 0;',
  'private Map<Integer, Integer> pos = new HashMap<>();',
  'public TreeNode buildTree(int[] preorder, int[] inorder) {',
  '    for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);',
  '    return build(preorder, 0, inorder.length - 1);',
  '}',
  'private TreeNode build(int[] preorder, int lo, int hi) {',
  '    if (lo > hi) return null;',
  '    int rootVal = preorder[pre++];',
  '    TreeNode node = new TreeNode(rootVal);',
  '    int mid = pos.get(rootVal);',
  '    node.left = build(preorder, lo, mid - 1);',
  '    node.right = build(preorder, mid + 1, hi);',
  '    return node;',
  '}',
];
const python = [
  'def build_tree(preorder, inorder):',
  '    pos = {v: i for i, v in enumerate(inorder)}',
  '    pre = iter(preorder)',
  '    def build(lo, hi):',
  '        if lo > hi:',
  '            return None',
  '        root_val = next(pre)',
  '        node = TreeNode(root_val)',
  '        mid = pos[root_val]',
  '        node.left = build(lo, mid - 1)',
  '        node.right = build(mid + 1, hi)',
  '        return node',
  '    return build(0, len(inorder) - 1)',
];
const J = { start: find(java, 'pos.put', 'return build(preorder, 0'), empty: find(java, 'if (lo > hi)'), take: find(java, 'int rootVal', 'new TreeNode'), mid: find(java, 'int mid = pos.get'), kids: find(java, 'node.left = build', 'node.right = build'), ret: find(java, 'return node;') };
const P = { start: find(python, 'pos = {', 'return build(0'), empty: find(python, 'if lo > hi', 'return None'), take: find(python, 'root_val = next', 'node = TreeNode'), mid: find(python, 'mid = pos[root_val]'), kids: find(python, 'node.left = build', 'node.right = build'), ret: find(python, 'return node') };

function build({ pre, ino }: In): Step[] {
  const nodes: TreeNodeVM[] = [];
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const pos = new Map(ino.map((v, i) => [v, i]));
  let preIdx = 0;
  let hlPre: number | undefined;
  let hlIn: number | undefined;
  let range = `[0..${ino.length - 1}]`;
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = (): Aux[] => [
    listAux('preorder (next root = highlighted)', pre, hlPre),
    listAux(`inorder — current range ${range}`, ino, hlIn),
    { title: 'value → inorder index', kind: 'map', items: ino.map((v, i) => `${v} → ${i}`), highlight: hlIn },
    stackAux('call stack: build(lo, hi)', stack),
  ];
  const vars = (lo: number | string, hi: number | string, root: number | string, mid: number | string) => ({ lo, hi, root, mid, pre: preIdx });

  hlPre = 0;
  add({
    title: 'Start', desc: 'Rebuild the tree from its preorder (root first) and inorder (left, root, right) lists. Index the inorder list in a hash map first.',
    logic: 'Preorder tells us each subtree’s root in the order we need it; inorder tells us how many nodes belong to the left and to the right of that root.',
    j: J.start, p: P.start, a: 0, vars: vars(0, ino.length - 1, '—', '—'), aux: aux(),
  });

  const make = (lo: number, hi: number, parent: number | null, side: 'left' | 'right') => {
    stack.push(`build(${lo}, ${hi})`);
    range = lo > hi ? `[${lo}..${hi}] (empty)` : `[${lo}..${hi}]`;
    hlIn = undefined;
    hlPre = preIdx < pre.length ? preIdx : undefined;
    if (lo > hi) {
      add({
        title: `build(${lo}, ${hi}) → null`, desc: 'The inorder range is empty: this child does not exist.',
        logic: 'Base case — no elements left for this subtree, and preorder is not consumed.', tone: 'warn',
        j: J.empty, p: P.empty, a: 1, vars: vars(lo, hi, '—', '—'), aux: aux(),
      });
      stack.pop();
      return;
    }
    const rootVal = pre[preIdx];
    const id = nodes.length;
    nodes.push({ id, value: rootVal, left: null, right: null });
    if (parent !== null) nodes[parent][side] = id;
    states[id] = 'active';
    hlPre = preIdx;
    preIdx++;
    add({
      title: `Next preorder value ${rootVal} is the root`, desc: `Take preorder[${preIdx - 1}] = ${rootVal} and create its node${parent === null ? ' (the root)' : ` as the ${side} child of ${nodes[parent].value}`}.`,
      logic: 'In preorder the first unread value is always the root of the subtree we are building.', tone: 'success',
      j: J.take, p: P.take, a: 1, vars: vars(lo, hi, rootVal, '—'), aux: aux(),
    });
    const mid = pos.get(rootVal)!;
    hlIn = mid;
    add({
      title: `Locate ${rootVal} in inorder: index ${mid}`, desc: `Everything in [${lo}..${mid - 1}] (${mid - lo} value${mid - lo === 1 ? '' : 's'}) is the left subtree; [${mid + 1}..${hi}] (${hi - mid} value${hi - mid === 1 ? '' : 's'}) is the right subtree.`,
      logic: 'The hash map gives this index in O(1); scanning the array would make the whole algorithm quadratic.',
      j: J.mid, p: P.mid, a: 2, vars: vars(lo, hi, rootVal, mid), aux: aux(),
    });
    states[id] = 'compare';
    make(lo, mid - 1, id, 'left');
    range = `[${lo}..${hi}]`;
    hlIn = mid;
    hlPre = preIdx < pre.length ? preIdx : undefined;
    add({
      title: `Left subtree of ${rootVal} done`, desc: `Preorder has now consumed the whole left part. Next build the right range [${mid + 1}..${hi}].`,
      logic: 'Preorder visits the left subtree completely before the right one, so the shared index is exactly at the right subtree’s root.',
      j: J.kids, p: P.kids, a: 3, vars: vars(lo, hi, rootVal, mid), aux: aux(),
    });
    make(mid + 1, hi, id, 'right');
    states[id] = 'found';
    stack.pop();
  };

  make(0, ino.length - 1, null, 'left');
  hlPre = undefined;
  hlIn = undefined;
  range = `[0..${ino.length - 1}]`;
  const out = toLevelOrder(nodes, 0);
  add({
    title: 'Done', desc: `All ${plural(pre.length, 'value')} ${verb(pre.length, 'is', 'are')} placed. Level order of the rebuilt tree: ${out}`,
    logic: 'Each node consumed exactly one preorder value and one inorder slot.', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars('—', '—', '—', '—'), aux: aux(), result: { title: out, text: 'Constructed tree (level order)' },
  });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'pos = {value → inorder index}; next = 0' },
    { on: /^build\((-?\d+), (-?\d+)\) → null/, tag: '∅ EMPTY —', note: (m) => `lo ${m[1]} > hi ${m[2]} → return null`, algoStep: 1 },
    { on: /^Next preorder value (-?\d+) is the root/, tag: '🌱 ROOT —', note: (m) => `rootVal = preorder[next++] = ${m[1]}`, algoStep: 2 },
    { on: /^Locate (-?\d+) in inorder: index (\d+)/, tag: '📍 SPLIT —', note: (m) => `mid = pos.get(${m[1]}) = ${m[2]}`, algoStep: 2 },
    { on: /^Left subtree of (-?\d+) done/, tag: '➡️ RIGHT —', note: () => 'root.right = build(mid + 1, hi)', algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return root → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const constructTreePreIn: ProblemDef<In> = {
  slug: '105-construct-tree-from-preorder-inorder',
  id: '105', title: 'Construct Tree from Preorder + Inorder', difficulty: 'Medium', category: 'Tree', tag: 'divide & conquer',
  statement: 'Given the preorder and inorder traversals of a binary tree with distinct values, reconstruct and return the tree.',
  constraints: '1 ≤ n ≤ 3000, all values distinct (animation input is limited to 12 values). Input format: preorder, then ";", then inorder.',
  examples: [
    { label: '3 9 20 15 7 ; 9 3 15 20 7', input: { pre: [3, 9, 20, 15, 7], ino: [9, 3, 15, 20, 7] }, output: '[3,9,20,null,null,15,7]' },
    { label: '1 2 3 ; 3 2 1', input: { pre: [1, 2, 3], ino: [3, 2, 1] }, output: '[1,2,null,3]' },
    { label: '1 2 4 5 3 ; 4 2 5 1 3', input: { pre: [1, 2, 4, 5, 3], ino: [4, 2, 5, 1, 3] }, output: '[1,2,3,4,5]' },
  ],
  inputPlaceholder: `e.g. ${FORMAT}`,
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Node just created', state: 'active' }, { label: 'Waiting on its subtrees', state: 'compare' }, { label: 'Subtree complete', state: 'found' }],
  varLabels: ['lo', 'hi', 'root', 'mid', 'pre'],
  emphasis: ['preorder', 'inorder', 'binary tree'],
  phases: [
    { icon: '🗺️', label: 'Index inorder (map)', tone: 'blue' },
    { icon: '∅', label: 'Empty range: null', tone: 'orange' },
    { icon: '🌱', label: 'Next preorder = root, find mid', tone: 'gold' },
    { icon: '↔️', label: 'Build left, then right', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Preorder gives roots, inorder gives sizes',
    text: 'The next unread preorder value is the root of the current subtree. Find it in the inorder list (via a hash map): values to its left form the left subtree, values to its right the right subtree. Recurse on those ranges, left first.',
  },
  java, python,
  algorithm: [
    'Map each inorder value to its index',
    'Call build(lo, hi); an empty range returns null',
    'Take the next preorder value as the root and find mid = pos[root]',
    'Build the left subtree on [lo, mid − 1], then the right subtree on [mid + 1, hi]',
    'Return the root of the rebuilt tree',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'Preorder lists a subtree’s root first, then the whole left subtree, then the whole right subtree. Because we build the left subtree entirely before the right one, the single shared preorder pointer is always positioned at the root of whichever subtree we build next. The inorder position of that root splits the remaining values into the two child ranges. The hash map makes each split O(1), so the total is O(n).',
};
