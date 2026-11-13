import type { CellState, Phase, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, isStrictBst, listAux, parseInts, parseTokens, splitParts, toLevelOrder, treeScene } from './treeKit.ts';
import type { Token } from './treeKit.ts';

interface In { tokens: Token[]; target: number }

const java = [
  'public TreeNode searchBST(TreeNode root, int val) {',
  '    TreeNode cur = root;',
  '    while (cur != null && cur.val != val) {',
  '        cur = val < cur.val ? cur.left : cur.right;   // discard a whole subtree',
  '    }',
  '    return cur;                                        // the node, or null if absent',
  '}',
];
const python = [
  'def search_bst(root, val):',
  '    cur = root',
  '    while cur and cur.val != val:',
  '        cur = cur.left if val < cur.val else cur.right',
  '    return cur',
];

const phases: Phase[] = [
  { icon: '🌱', label: 'Start at the root', tone: 'blue' },
  { icon: '⚖️', label: 'Compare and descend', tone: 'cyan' },
  { icon: '✅', label: 'Found / not found', tone: 'green' },
];

function parse(raw: string): In {
  const [t, n] = splitParts(raw, 2, '4 2 7 1 3 ; 2');
  const tokens = parseTokens(t);
  if (!isStrictBst(buildTree(tokens))) throw new Error('The tree must be a valid BST with distinct values');
  const nums = parseInts(n, 'value to search');
  if (nums.length !== 1) throw new Error('After ";" give a single whole number');
  return { tokens, target: nums[0] };
}

function build({ tokens, target }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const path: number[] = [];
  const steps: Step[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const scene = () => treeScene(nodes, states, labels);
  const aux = (cmp: string[]) => [listAux('path walked', path.map(val)), listAux('compare', cmp)];
  const vars = (node: number | string, rule: string) => ({ node, target, rule, steps: path.length });

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `Look for ${target}. At each node one comparison tells us which whole subtree to throw away.`,
    note: `cur = root (${val(0)}), val = ${target}`,
    scene: scene(), aux: aux([`val = ${target}`]), vars: vars(val(0), '—'),
    logic: 'A BST keeps smaller keys on the left and larger keys on the right, so the search never has to look at both sides.',
    logicTone: 'info', javaLines: [1], pyLines: [1], algoStep: 0,
  });

  let cur: number | null = 0;
  let found: number | null = null;
  while (cur !== null) {
    const c: number = cur;
    const v = val(c);
    path.push(c);
    states[c] = 'active';
    if (v === target) {
      found = c;
      states[c] = 'found';
      steps.push({
        title: `${v} found`, tag: 'FOUND —', desc: `${target} = ${v}: the loop stops. Return this node, which carries its whole subtree ${toLevelOrder(nodes, c)}.`,
        note: `cur.val == val → return node ${v}`,
        scene: scene(), aux: aux([`${target} = ${v}`]), vars: vars(v, 'match'),
        logic: 'The loop condition cur.val != val becomes false, so cur is the answer.', logicTone: 'success',
        javaLines: [2, 5], pyLines: [2, 4], algoStep: 2,
        result: { title: toLevelOrder(nodes, c), text: `Subtree rooted at ${v}` },
      });
      break;
    }
    const left = target < v;
    const next: number | null = left ? nodes[c].left : nodes[c].right;
    steps.push({
      title: `${target} ${left ? '<' : '>'} ${v}`, tag: 'COMPARE —',
      desc: `${target} ${left ? '<' : '>'} ${v}, so ${target} can only be in the ${left ? 'left' : 'right'} subtree. Discard the ${left ? 'right' : 'left'} side${next === null ? `, but the ${left ? 'left' : 'right'} child is empty` : ` and move to ${val(next)}`}.`,
      note: `${target} ${left ? '<' : '>'} ${v} → cur = ${next === null ? 'null' : `${v}.${left ? 'left' : 'right'} = ${val(next)}`}`,
      scene: scene(), aux: aux([`${target} ${left ? '<' : '>'} ${v}`, left ? '→ go left' : '→ go right']), vars: vars(v, left ? 'go left' : 'go right'),
      logic: `Every key in the ${left ? 'right' : 'left'} subtree of ${v} is on the wrong side of ${target}, so that whole subtree is skipped.`, logicTone: 'info',
      javaLines: [2, 3], pyLines: [2, 3], algoStep: 1,
    });
    states[c] = 'dim';
    cur = next;
  }
  if (found === null) {
    const last = path[path.length - 1];
    steps.push({
      title: 'Not found', tag: 'MISSING —', desc: `We fell off the tree below ${val(last)}: ${target} is not stored in this BST, so the answer is null.`,
      note: 'cur = null → return null',
      scene: scene(), aux: aux(['cur = null']), vars: vars('null', 'absent'),
      logic: 'An empty slot where the key would have to be proves it is absent.', logicTone: 'warn', alert: `${target} is not in the tree`,
      javaLines: [2, 5], pyLines: [2, 4], algoStep: 2,
      result: { title: '[]', text: 'null (value not present)' },
    });
  }
  return steps;
}

export const searchInBst: ProblemDef<In> = {
  slug: '700-search-in-a-binary-search-tree',
  id: '700', title: 'Search in a Binary Search Tree', difficulty: 'Easy', category: 'Tree', tag: 'BST property, one root-to-node walk',
  statement: 'Given the root of a binary search tree and a value val, find the node whose value equals val and return the subtree rooted at it, or null when there is no such node.',
  emphasis: ['binary search tree', 'subtree rooted at it', 'null'],
  constraints: '1 ≤ nodes ≤ 5000, distinct values (animation input is limited to 12 nodes). Input: the tree in level order, then ";", then val.',
  examples: [
    { label: '8 4 12 2 6 10 14 1 3 5 7 ; 5', input: { tokens: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7], target: 5 }, output: '[5]' },
    { label: '4 2 7 1 3 ; 2', input: { tokens: [4, 2, 7, 1, 3], target: 2 }, output: '[2,1,3]' },
    { label: '40 20 60 10 30 50 70 ; 50', input: { tokens: [40, 20, 60, 10, 30, 50, 70], target: 50 }, output: '[50]' },
    { label: '4 2 7 1 3 ; 5', input: { tokens: [4, 2, 7, 1, 3], target: 5 }, output: '[]' },
  ],
  inputPlaceholder: 'e.g. 4 2 7 1 3 ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Passed (one side discarded)', state: 'dim' }, { label: 'Found', state: 'found' }],
  varLabels: ['node', 'target', 'rule', 'steps'],
  phases,
  approach: {
    title: 'Compare, then discard half the tree',
    text: 'Start at the root. If the value matches, stop. If it is smaller go to the left child, otherwise to the right child. Reaching an empty slot means the value is not stored.',
  },
  java, python,
  algorithm: [
    'Start at the root',
    'Compare val with cur: smaller goes left, larger goes right',
    'Stop on a match (return the node) or on null (return null)',
  ],
  complexity: [{ label: 'Time', value: 'O(h)' }, { label: 'Space', value: 'O(1) iteratively' }],
  why: 'The BST rule (left < node < right at every node) means a comparison with the current key rules out one entire subtree. The search therefore follows a single root-to-node path, whose length is the tree height h: about log n for a balanced tree and n for a chain.',
};

