import type { CellState, Phase, ProblemDef, Step, TreeNodeVM } from '../engine/types.ts';
import { buildTree, inorderValues, isStrictBst, listAux, parseInts, parseTokens, splitParts, toLevelOrder, treeScene } from './treeKit.ts';
import type { Token } from './treeKit.ts';

interface In { tokens: Token[]; value: number }

const java = [
  'public TreeNode insertIntoBST(TreeNode root, int val) {',
  '    if (root == null) return new TreeNode(val);',
  '    TreeNode cur = root;',
  '    while (true) {',
  '        if (val < cur.val) {',
  '            if (cur.left == null) { cur.left = new TreeNode(val); break; }',
  '            cur = cur.left;',
  '        } else {',
  '            if (cur.right == null) { cur.right = new TreeNode(val); break; }',
  '            cur = cur.right;',
  '        }',
  '    }',
  '    return root;',
  '}',
];
const python = [
  'def insert_into_bst(root, val):',
  '    if not root:',
  '        return TreeNode(val)',
  '    cur = root',
  '    while True:',
  '        if val < cur.val:',
  '            if not cur.left:',
  '                cur.left = TreeNode(val)',
  '                break',
  '            cur = cur.left',
  '        else:',
  '            if not cur.right:',
  '                cur.right = TreeNode(val)',
  '                break',
  '            cur = cur.right',
  '    return root',
];

const phases: Phase[] = [
  { icon: '🌱', label: 'Start at the root', tone: 'blue' },
  { icon: '⚖️', label: 'Compare and descend', tone: 'cyan' },
  { icon: '🌿', label: 'Attach new leaf — Done', tone: 'green' },
];

function parse(raw: string): In {
  const [t, n] = splitParts(raw, 2, '4 2 7 1 3 ; 5');
  const tokens = parseTokens(t);
  const nodes = buildTree(tokens);
  if (nodes.length > 11) throw new Error('Use 11 nodes or fewer so the new node still fits');
  if (!isStrictBst(nodes)) throw new Error('The tree must be a valid BST with distinct values');
  const nums = parseInts(n, 'value to insert');
  if (nums.length !== 1) throw new Error('After ";" give a single whole number');
  if (inorderValues(nodes, 0).includes(nums[0])) throw new Error('That value is already in the tree (the value to insert must be new)');
  return { tokens, value: nums[0] };
}

function build({ tokens, value }: In): Step[] {
  const base = buildTree(tokens);
  const nodes: TreeNodeVM[] = base.map((n) => ({ ...n }));
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const path: number[] = [];
  const steps: Step[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const scene = () => treeScene(nodes, states, labels);
  const aux = (cmp: string[]) => [listAux('path walked', path.map(val)), listAux('compare', cmp)];
  const vars = (node: number | string, rule: string) => ({ node, value, rule, depth: path.length });

  steps.push({
    title: 'Start', tag: 'INIT —', desc: `Insert ${value}. Walk down exactly as a search for ${value} would, until the empty slot where it belongs.`,
    note: `cur = root (${val(0)}), val = ${value}`,
    scene: scene(), aux: aux([`val = ${value}`]), vars: vars(val(0), '—'),
    logic: 'Inserting at the spot where an unsuccessful search ends keeps the BST ordering intact without moving any existing node.',
    logicTone: 'info', javaLines: [2], pyLines: [3], algoStep: 0,
  });

  let cur = 0;
  for (;;) {
    const v = val(cur);
    path.push(cur);
    states[cur] = 'active';
    const left = value < v;
    const slot = left ? nodes[cur].left : nodes[cur].right;
    steps.push({
      title: `${value} ${left ? '<' : '>'} ${v}`, tag: 'COMPARE —',
      desc: `${value} ${left ? '<' : '>'} ${v}, so ${value} belongs in the ${left ? 'left' : 'right'} subtree. ${slot === null ? `The ${left ? 'left' : 'right'} child of ${v} is empty: that is the slot.` : `Move to ${val(slot)}.`}`,
      note: `${value} ${left ? '<' : '>'} ${v} → ${slot === null ? `${v}.${left ? 'left' : 'right'} == null` : `cur = ${val(slot)}`}`,
      scene: scene(), aux: aux([`${value} ${left ? '<' : '>'} ${v}`, slot === null ? 'empty slot' : left ? '→ go left' : '→ go right']), vars: vars(v, slot === null ? 'slot is free' : left ? 'go left' : 'go right'),
      logic: `Everything in the ${left ? 'right' : 'left'} subtree of ${v} is on the other side of ${value}, so only one child can hold the new key.`, logicTone: 'info',
      javaLines: left ? [4, slot === null ? 5 : 6] : [7, slot === null ? 8 : 9], pyLines: left ? [5, slot === null ? 6 : 9] : [10, slot === null ? 11 : 14], algoStep: 1,
    });
    states[cur] = 'dim';
    if (slot === null) {
      const id = nodes.length;
      nodes.push({ id, value, left: null, right: null });
      nodes[cur][left ? 'left' : 'right'] = id;
      states[id] = 'found';
      labels[id] = 'new';
      const out = toLevelOrder(nodes, 0);
      steps.push({
        title: `Attach ${value}`, tag: 'INSERT —', desc: `Create a node ${value} and hang it as the ${left ? 'left' : 'right'} child of ${v}. No other node moves. Tree: ${out}.`,
        note: `${v}.${left ? 'left' : 'right'} = new TreeNode(${value})`,
        scene: scene(), aux: aux([`${value} is a new leaf`]), vars: vars(value, 'inserted'),
        logic: 'A new key always becomes a leaf, so the existing structure stays valid.', logicTone: 'success',
        javaLines: left ? [5, 12] : [8, 12], pyLines: left ? [7, 15] : [12, 15], algoStep: 2,
        result: { title: out, text: `${value} inserted as a leaf under ${v}` },
      });
      break;
    }
    cur = slot;
  }
  return steps;
}

export const insertIntoBst: ProblemDef<In> = {
  slug: '701-insert-into-a-binary-search-tree',
  id: '701', title: 'Insert into a Binary Search Tree', difficulty: 'Medium', category: 'Tree', tag: 'BST property, new leaf at the failed-search slot',
  statement: 'Insert a new value into a binary search tree and return its root. The value is not in the tree yet; any result that is still a valid BST is accepted, and the leaf insertion shown here is the simplest.',
  emphasis: ['binary search tree', 'new value', 'valid BST', 'leaf'],
  constraints: '0 ≤ nodes ≤ 10⁴, distinct values, the value to insert is not in the tree (animation input is limited to 11 nodes). Input: the tree in level order, then ";", then val.',
  examples: [
    { label: '8 4 12 2 6 10 14 1 3 5 7 ; 9', input: { tokens: [8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7], value: 9 }, output: '[8,4,12,2,6,10,14,1,3,5,7,9]' },
    { label: '4 2 7 1 3 ; 5', input: { tokens: [4, 2, 7, 1, 3], value: 5 }, output: '[4,2,7,1,3,5]' },
    { label: '40 20 60 10 30 50 70 ; 25', input: { tokens: [40, 20, 60, 10, 30, 50, 70], value: 25 }, output: '[40,20,60,10,30,50,70,null,null,25]' },
    { label: '4 2 7 1 3 ; 0', input: { tokens: [4, 2, 7, 1, 3], value: 0 }, output: '[4,2,7,1,3,null,null,0]' },
  ],
  inputPlaceholder: 'e.g. 4 2 7 1 3 ; 5',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Passed', state: 'dim' }, { label: 'New leaf', state: 'found' }],
  varLabels: ['node', 'value', 'rule', 'depth'],
  phases,
  approach: {
    title: 'Search, then hang a leaf where the search ends',
    text: 'Walk down comparing the new value with each node: smaller goes left, larger goes right. The first empty child slot on that path is where the value belongs; create a leaf there.',
  },
  java, python,
  algorithm: [
    'Start at the root (an empty tree just returns the new node)',
    'Compare val with cur: smaller goes left, larger goes right',
    'At the first empty child slot, attach the new leaf',
  ],
  complexity: [{ label: 'Time', value: 'O(h)' }, { label: 'Space', value: 'O(1) iteratively' }],
  why: 'The path a failed search for val would take ends at the only empty slot where val can sit without breaking left < node < right at any ancestor, because every ancestor on the path already sent val to the correct side. Adding a leaf there touches one pointer and disturbs nothing else.',
};
