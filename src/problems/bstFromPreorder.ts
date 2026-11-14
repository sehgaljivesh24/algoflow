import type { Aux, Cell, CellState, ProblemDef, Scene, Step, TreeNodeVM } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { annotateRules } from './annotate.ts';
import { parseInts } from './stepKit.ts';
import { emitter, find, stackAux, toLevelOrder, treeScene } from './treeKit.ts';
import { ptr } from './ssbShared.ts';

interface In { pre: number[] }

const java = [
  'private int idx = 0;',
  'public TreeNode bstFromPreorder(int[] preorder) {',
  '    return build(preorder, Integer.MAX_VALUE);',
  '}',
  'private TreeNode build(int[] pre, int bound) {',
  '    if (idx == pre.length || pre[idx] > bound) return null;   // out of values, or it belongs further up',
  '    TreeNode node = new TreeNode(pre[idx++]);',
  '    node.left = build(pre, node.val);                  // left values must stay below this node',
  '    node.right = build(pre, bound);                    // right values may go up to the inherited bound',
  '    return node;',
  '}',
];
const python = [
  'def bst_from_preorder(preorder):',
  '    idx = 0',
  '    def build(bound):',
  '        nonlocal idx',
  '        if idx == len(preorder) or preorder[idx] > bound:   # out of values, or it belongs further up',
  '            return None',
  '        node = TreeNode(preorder[idx])',
  '        idx += 1',
  '        node.left = build(node.val)                      # left values must stay below this node',
  '        node.right = build(bound)                        # right values may go up to the inherited bound',
  '        return node',
  '    return build(float("inf"))',
];
const J = { start: find(java, 'return build(preorder, Integer'), empty: find(java, 'if (idx == pre.length'), take: find(java, 'TreeNode node = new'), left: find(java, 'node.left = build'), right: find(java, 'node.right = build'), ret: find(java, 'return node;') };
const P = { start: find(python, 'return build(float'), empty: find(python, 'if idx == len(preorder)', 'return None'), take: find(python, 'node = TreeNode', 'idx += 1'), left: find(python, 'node.left = build'), right: find(python, 'node.right = build'), ret: find(python, 'return node') };

function build({ pre }: In): Step[] {
  const n = pre.length;
  const nodes: TreeNodeVM[] = [];
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  let idx = 0;
  let boundNow: number | string = '∞';
  const bs = (b: number) => (b === Infinity ? '∞' : String(b));

  const scene = (): Scene => ({
    kind: 'split',
    parts: [
      {
        kind: 'array',
        cells: pre.map((value, i): Cell => ({ key: i, value, state: i < idx ? 'found' : i === idx ? 'active' : undefined })),
        pointers: idx < n ? [ptr('idx', 'idx', idx, 'blue')] : [],
      },
      treeScene(nodes, states, labels) as Exclude<Scene, { kind: 'split' }>,
    ],
  });
  const { steps, add } = emitter(scene);
  const aux = (): Aux[] => [stackAux('call stack: build(bound)', stack)];
  const vars = (node: number | string) => ({ idx, bound: boundNow, node });
  const frame = (title: string, desc: string, logic: string, j: number[], p: number[], a: number, tone: 'info' | 'warn' | 'success' = 'info', node: number | string = '—') =>
    add({ title, desc, logic, tone, j, p, a, vars: vars(node), aux: aux() });

  frame('Start', `Rebuild the BST whose preorder is ${JSON.stringify(pre)}. No inorder list is needed: the BST ordering rule supplies it.`,
    'Preorder lists a node, then its whole left subtree, then its right subtree. A value too large for the current subtree must belong to an ancestor’s right side.', J.start, P.start, 0);

  const make = (bound: number, parent: number | null, side: 'left' | 'right') => {
    boundNow = bs(bound);
    stack.push(`build(${bs(bound)})`);
    if (idx === n || pre[idx] > bound) {
      frame(`build(${bs(bound)}) → null`, idx === n ? 'All values are used, so there is nothing left to attach here.' : `The next value ${pre[idx]} is larger than the bound ${bs(bound)}, so it cannot live in this subtree. It belongs further up (as a right child).`,
        'The bound is the rule that ends a subtree: once the next preorder value exceeds it, the subtree is complete.', J.empty, P.empty, 1, 'warn');
      stack.pop();
      return;
    }
    const id = nodes.length;
    const value = pre[idx];
    nodes.push({ id, value, left: null, right: null });
    if (parent !== null) nodes[parent][side] = id;
    states[id] = 'active';
    idx++;
    frame(`Take ${value} as a node`, `${value} ≤ ${bs(bound)}, so it fits. It becomes ${parent === null ? 'the root' : `the ${side} child of ${nodes[parent].value}`}. Left values must be below ${value}; right values below ${bs(bound)}.`,
      'The first unread preorder value is always the root of the subtree being built.', J.take, P.take, 1, 'success', value);
    states[id] = 'compare';
    boundNow = value;
    make(value, id, 'left');
    boundNow = bs(bound);
    frame(`Left subtree of ${value} done`, `The next value ${idx < n ? pre[idx] : '(none)'} is ${idx < n ? `above ${value}, so it starts the right subtree` : 'missing'}. Build the right subtree with bound ${bs(bound)}.`,
      'Left values are strictly below the node; everything after them that is still within the old bound goes right.', J.right, P.right, 2, 'info', value);
    make(bound, id, 'right');
    states[id] = 'found';
    stack.pop();
  };
  make(Infinity, null, 'left');

  boundNow = '—';
  const out = toLevelOrder(nodes, 0);
  frame('Done', `All ${plural(n, 'value')} ${verb(n, 'is', 'are')} placed. Level order of the BST: ${out}`, 'Each value was consumed exactly once, so the work is linear.', J.ret, P.ret, 3, 'success');
  steps[steps.length - 1].result = { title: out, text: 'BST (level order)' };
  return steps;
}

/** A sequence is the preorder of some BST exactly when inserting its values in order yields a tree with that same preorder. */
function isBstPreorder(pre: number[]): boolean {
  const n = pre.length;
  let idx = 0;
  const go = (bound: number) => {
    if (idx === n || pre[idx] > bound) return;
    const v = pre[idx++];
    go(v);
    go(bound);
  };
  go(Infinity);
  return idx === n;
}

function parse(raw: string): In {
  const pre = parseInts(raw, { what: 'preorder values', example: '8 5 1 7 10 12', minLen: 1, maxLen: 10, distinct: true });
  if (!isBstPreorder(pre)) throw new Error('That is not the preorder of any BST: after a node, the smaller values must come first, then the larger ones (e.g. 8 5 1 7 10 12)');
  return { pre };
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'idx = 0; build(∞)' },
    { on: /^build\(.*\) → null/, tag: '∅ EMPTY —', note: (_m, s) => `idx ${s.vars.idx}: end of input or pre[idx] > bound ${s.vars.bound} → return null`, algoStep: 1 },
    { on: /^Take (-?\d+) as a node/, tag: '🌱 TAKE —', note: (m, s) => `pre[idx++] = ${m[1]} ≤ bound ${s.vars.bound}`, algoStep: 2 },
    { on: /^Left subtree of (-?\d+) done/, tag: '➡️ RIGHT —', note: () => 'node.right = build(oldBound)', algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return root → ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const bstFromPreorder: ProblemDef<In> = {
  slug: '1008-construct-binary-search-tree-from-preorder-traversal',
  id: '1008', title: 'Construct Binary Search Tree from Preorder Traversal', difficulty: 'Medium', category: 'Tree', tag: 'preorder + upper bound',
  statement: 'Given the preorder traversal of a binary search tree (distinct values), rebuild the tree and return its root.',
  constraints: '1 ≤ preorder.length ≤ 100, distinct values (animation input is limited to 10 numbers).',
  examples: [
    { label: '[8, 5, 1, 7, 10, 12]', input: { pre: [8, 5, 1, 7, 10, 12] }, output: '[8,5,10,1,7,null,12]' },
    { label: '[4, 2]', input: { pre: [4, 2] }, output: '[4,2]' },
    { label: '[5, 3, 4, 9, 7, 10]', input: { pre: [5, 3, 4, 9, 7, 10] }, output: '[5,3,9,null,4,7,10]' },
  ],
  inputPlaceholder: 'e.g. 8 5 1 7 10 12',
  parseInput: parse,
  buildSteps: annotated, viz: 'cells',
  vizTitle: 'Preorder array and the BST built from it',
  legend: [{ label: 'Next unread value (idx)', state: 'active' }, { label: 'Placed in the tree', state: 'found' }, { label: 'Waiting on its subtrees', state: 'compare' }],
  varLabels: ['idx', 'bound', 'node'],
  emphasis: ['preorder', 'binary search tree', 'bound'],
  phases: [
    { icon: '🚀', label: 'Shared idx, build(∞)', tone: 'blue' },
    { icon: '∅', label: 'Past the end or > bound: null', tone: 'orange' },
    { icon: '🌱', label: 'Take pre[idx] as a node', tone: 'gold' },
    { icon: '↔️', label: 'Left (bound = val), then right', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'One pass with an upper bound',
    text: 'Keep a shared index into the preorder array. build(bound) takes the next value as a node if it does not exceed bound, builds the left subtree with bound = that value, then the right subtree with the inherited bound. A value that exceeds the bound ends the current subtree.',
  },
  java, python,
  algorithm: [
    'Keep a shared index idx and call build(∞)',
    'If idx is past the end or pre[idx] > bound, return null',
    'Otherwise take pre[idx] as a node and advance idx',
    'Build the left subtree with bound = node value, then the right subtree with the old bound',
    'Return the root once every value is used',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'In the preorder of a BST, a node is followed by all values smaller than it (its left subtree), then the larger ones. Passing the upper bound down tells each call when its subtree must stop: a value above the bound belongs to an ancestor. Because the bound for a right subtree is inherited from the ancestor, a value is rejected only when it truly belongs higher up. Every value is consumed once and every call either consumes a value or returns null, so the run time is linear (inserting values one by one would be O(n·h)).',
};
