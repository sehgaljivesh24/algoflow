import type { ProblemDef } from '../engine/types.ts';
import { buildTree, find, inorderValues, parseTokens } from './treeKit.ts';
import type { TreeIn } from './treeKit.ts';
import { runMorris } from './morrisKit.ts';
import type { MorrisLines } from './morrisKit.ts';

const java = [
  'public void recoverTree(TreeNode root) {',
  '    TreeNode cur = root, prev = null, first = null, second = null;',
  '    while (cur != null) {',
  '        if (cur.left == null) {',
  '            if (prev != null && prev.val > cur.val) {   // visit cur',
  '                if (first == null) first = prev;',
  '                second = cur;',
  '            }',
  '            prev = cur;',
  '            cur = cur.right;',
  '        } else {',
  '            TreeNode pred = cur.left;',
  '            while (pred.right != null && pred.right != cur) pred = pred.right;',
  '            if (pred.right == null) {',
  '                pred.right = cur;                       // thread',
  '                cur = cur.left;',
  '            } else {',
  '                pred.right = null;                      // cut the thread',
  '                if (prev != null && prev.val > cur.val) {   // visit cur',
  '                    if (first == null) first = prev;',
  '                    second = cur;',
  '                }',
  '                prev = cur;',
  '                cur = cur.right;',
  '            }',
  '        }',
  '    }',
  '    int t = first.val; first.val = second.val; second.val = t;',
  '}',
];
const python = [
  'def recover_tree(root):',
  '    cur, prev, first, second = root, None, None, None',
  '    while cur:',
  '        if not cur.left:',
  '            if prev and prev.val > cur.val:           # visit cur',
  '                first = first or prev',
  '                second = cur',
  '            prev = cur',
  '            cur = cur.right',
  '        else:',
  '            pred = cur.left',
  '            while pred.right and pred.right is not cur:',
  '                pred = pred.right',
  '            if pred.right is None:',
  '                pred.right = cur                      # thread',
  '                cur = cur.left',
  '            else:',
  '                pred.right = None                     # cut the thread',
  '                if prev and prev.val > cur.val:       # visit cur',
  '                    first = first or prev',
  '                    second = cur',
  '                prev = cur',
  '                cur = cur.right',
  '    first.val, second.val = second.val, first.val',
];
const J: MorrisLines = {
  start: find(java, 'TreeNode cur = root, prev'),
  leaf: find(java, 'if (cur.left == null)', 'if (prev != null', 'if (first == null)', 'second = cur;', 'prev = cur;', 'cur = cur.right;'),
  find: find(java, 'TreeNode pred = cur.left'),
  hop: find(java, 'while (pred.right != null'),
  link: find(java, 'if (pred.right == null)', 'pred.right = cur;', 'cur = cur.left;'),
  cut: find(java, 'pred.right = null;', ['if (prev != null', 2], ['if (first == null)', 2], ['second = cur;', 2], ['prev = cur;', 2], ['cur = cur.right;', 2]),
  fix: find(java, 'int t = first.val'),
  ret: find(java, 'int t = first.val'),
};
const P: MorrisLines = {
  start: find(python, 'cur, prev, first, second'),
  leaf: find(python, 'if not cur.left', 'if prev and', 'first = first or prev', 'second = cur', 'prev = cur', 'cur = cur.right'),
  find: find(python, 'pred = cur.left'),
  hop: find(python, 'while pred.right and', 'pred = pred.right'),
  link: find(python, 'if pred.right is None', 'pred.right = cur', 'cur = cur.left'),
  cut: find(python, 'pred.right = None', ['if prev and', 2], ['first = first or prev', 2], ['second = cur', 2], ['prev = cur', 2], ['cur = cur.right', 2]),
  fix: find(python, 'first.val, second.val'),
  ret: find(python, 'first.val, second.val'),
};

function parse(raw: string): TreeIn {
  const tokens = parseTokens(raw);
  const vals = inorderValues(buildTree(tokens), 0);
  if (new Set(vals).size !== vals.length) throw new Error('All values must be different');
  const sorted = [...vals].sort((a, b) => a - b);
  const wrong = vals.filter((v, i) => v !== sorted[i]).length;
  if (wrong !== 2) throw new Error('Give a BST in which exactly two values were swapped (its in-order sequence must be sorted except for one swapped pair)');
  return { tokens };
}

export const recoverBst: ProblemDef<TreeIn> = {
  slug: '99-recover-binary-search-tree',
  id: '99', title: 'Recover Binary Search Tree', difficulty: 'Medium', category: 'Tree', tag: 'Morris in-order, O(1) space',
  statement: 'Exactly two nodes of a binary search tree had their values swapped by mistake. Recover the tree without changing its structure, ideally using O(1) extra space.',
  constraints: '2 ≤ nodes ≤ 1000 (animation input is limited to 12 distinct values; write the tree in level order, using null for gaps).',
  examples: [
    { label: '1 3 null null 2', input: { tokens: [1, 3, null, null, 2] }, output: '[3,1,null,null,2]' },
    { label: '3 1 4 null null 2', input: { tokens: [3, 1, 4, null, null, 2] }, output: '[2,1,4,null,null,3]' },
    { label: '5 3 8 1 4 7 9 2', input: { tokens: [5, 3, 8, 1, 4, 7, 9, 2] }, output: '[5,3,8,2,4,7,9,1]' },
  ],
  inputPlaceholder: 'e.g. 3 1 4 null null 2',
  parseInput: parse,
  buildSteps: ({ tokens }) => runMorris({ tokens, mode: 'recover', J, P, orderName: 'In-order values' }),
  viz: 'cells',
  vizTitle: 'BST with two swapped values',
  legend: [{ label: 'cur (current node)', state: 'active' }, { label: 'pred (walking to the predecessor)', state: 'compare' }, { label: 'Visited', state: 'found' }, { label: 'Out-of-order suspect', state: 'error' }, { label: 'Swapped back', state: 'swap' }],
  varLabels: ['cur', 'pred', 'threads', 'visited', 'prev', 'first', 'second'],
  emphasis: ['two nodes', 'swapped', 'without changing its structure'],
  phases: [
    { icon: '🧵', label: 'Morris in-order walk', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare prev with cur', tone: 'gold' },
    { icon: '🚩', label: 'Mark first / second', tone: 'orange' },
    { icon: '🔁', label: 'Swap the two values', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Morris in-order + spot the descents',
    text: 'An in-order walk of a valid BST is increasing, and a swap creates one or two places where a value is bigger than its successor. Walk in-order with Morris threads while remembering the previous node: the first node of the first descent and the second node of the last descent are the culprits. Swap their values at the end.',
  },
  java, python,
  algorithm: [
    'Run the Morris in-order loop with cur = root and prev = null',
    'On every visit compare prev.val with cur.val; a larger prev marks a descent',
    'first = prev at the first descent; second = cur at the latest descent',
    'After the walk, swap the values of first and second',
    'Return the repaired tree: its in-order sequence is increasing again',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) extra' }],
  why: 'Swapping two values in a sorted sequence leaves one descent when they were neighbours and two when they were not. In the first descent the larger (wrong) value sits at prev; in the last descent the smaller (wrong) value sits at cur. So taking first from the first descent and second from the last one pins down both nodes in every case. Morris threading gives the in-order visits without a stack, so the whole repair needs only a handful of pointers.',
};
