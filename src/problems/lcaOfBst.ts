import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { buildTree, emitter, find, inorderValues, isStrictBst, listAux, parseInts, parseTokens, splitParts, treeScene } from './treeKit.ts';
import type { Token } from './treeKit.ts';

interface In { tokens: Token[]; p: number; q: number }

const java = [
  'public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {',
  '    TreeNode cur = root;',
  '    while (cur != null) {',
  '        if (p.val < cur.val && q.val < cur.val) {',
  '            cur = cur.left;                      // both targets are smaller: go left',
  '        } else if (p.val > cur.val && q.val > cur.val) {',
  '            cur = cur.right;                     // both targets are larger: go right',
  '        } else {',
  '            return cur;                          // the paths split here (or cur is p or q)',
  '        }',
  '    }',
  '    return null;',
  '}',
];
const python = [
  'def lowest_common_ancestor(root, p, q):',
  '    cur = root',
  '    while cur:',
  '        if p.val < cur.val and q.val < cur.val:',
  '            cur = cur.left                       # both targets are smaller: go left',
  '        elif p.val > cur.val and q.val > cur.val:',
  '            cur = cur.right                      # both targets are larger: go right',
  '        else:',
  '            return cur                           # the paths split here (or cur is p or q)',
  '    return None',
];
const J = { start: find(java, 'TreeNode cur = root'), left: find(java, 'if (p.val < cur.val', 'cur = cur.left'), right: find(java, 'else if (p.val > cur.val', 'cur = cur.right'), found: find(java, 'return cur;') };
const P = { start: find(python, 'cur = root'), left: find(python, 'if p.val < cur.val', 'cur = cur.left'), right: find(python, 'elif p.val > cur.val', 'cur = cur.right'), found: find(python, 'return cur') };

function parse(raw: string): In {
  const [t, pq] = splitParts(raw, 2, '6 2 8 0 4 7 9 ; 2 8');
  const tokens = parseTokens(t);
  const nodes = buildTree(tokens);
  if (!isStrictBst(nodes)) throw new Error('The tree must be a valid BST with distinct values');
  const two = parseInts(pq, 'p and q');
  if (two.length !== 2 || two[0] === two[1]) throw new Error('After ";" give two different values p and q');
  const vals = new Set(inorderValues(nodes, 0));
  if (!vals.has(two[0]) || !vals.has(two[1])) throw new Error('p and q must both be values in the tree');
  return { tokens, p: two[0], q: two[1] };
}

function build({ tokens, p, q }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const idOf = (v: number) => nodes.find((n) => n.value === v)!.id;
  labels[idOf(p)] = 'p';
  labels[idOf(q)] = 'q';
  const path: number[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [listAux('path walked', path.map(val))];
  const vars = (cur: number | string, rule: string) => ({ cur, p, q, rule });

  add({
    title: 'Start', desc: `Find the lowest common ancestor of p = ${p} and q = ${q} in this BST, starting at the root.`,
    logic: 'In a BST, comparing p and q with the current value tells us on which side both of them live, so no search of the whole tree is needed.',
    j: J.start, p: P.start, a: 0, vars: vars(val(0), '—'), aux: aux(),
  });
  let cur: number | null = 0;
  let ans = 0;
  while (cur !== null) {
    const c: number = cur;
    const v = val(c);
    path.push(c);
    states[c] = 'active';
    if (p < v && q < v) {
      add({
        title: `${v}: both ${p} and ${q} are smaller`, desc: `${p} < ${v} and ${q} < ${v}, so both live in the left subtree. Move left.`,
        logic: 'The right subtree holds only values larger than the current node, so it cannot contain p or q.',
        j: J.left, p: P.left, a: 1, vars: vars(v, 'go left'), aux: aux(),
      });
      states[c] = 'dim';
      cur = nodes[c].left;
    } else if (p > v && q > v) {
      add({
        title: `${v}: both ${p} and ${q} are larger`, desc: `${p} > ${v} and ${q} > ${v}, so both live in the right subtree. Move right.`,
        logic: 'The left subtree holds only smaller values, so it cannot contain p or q.',
        j: J.right, p: P.right, a: 2, vars: vars(v, 'go right'), aux: aux(),
      });
      states[c] = 'dim';
      cur = nodes[c].right;
    } else {
      ans = c;
      states[c] = 'found';
      const why = v === p || v === q ? `${v} is itself one of the two nodes, and the other lies in its subtree` : `${Math.min(p, q)} ≤ ${v} ≤ ${Math.max(p, q)}: p and q fall on different sides of ${v}`;
      add({
        title: `${v} is the lowest common ancestor`, desc: `Neither "both smaller" nor "both larger" holds: ${why}.`,
        logic: 'This is the first node where the paths to p and q diverge (or where one of them is reached), so it is the lowest node with both in its subtree.', tone: 'success',
        j: J.found, p: P.found, a: 3, vars: vars(v, 'split'), aux: aux(),
        result: { title: String(v), text: 'Lowest common ancestor' },
      });
      cur = null;
    }
  }
  void ans;
  return steps;
}

function annotated(input: In): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'cur = root' },
    { on: /both (-?\d+) and (-?\d+) are smaller/, tag: '⬅️ GO LEFT —', note: (m, s) => `${m[1]} < ${s.vars.cur} && ${m[2]} < ${s.vars.cur} → cur = cur.left` },
    { on: /both (-?\d+) and (-?\d+) are larger/, tag: '➡️ GO RIGHT —', note: (m, s) => `${m[1]} > ${s.vars.cur} && ${m[2]} > ${s.vars.cur} → cur = cur.right` },
    { on: /is the lowest common ancestor/, tag: '🎯 SPLIT —', note: (_m, s) => `neither both smaller nor both larger → return ${s.vars.cur}` },
  ]);
}

export const lcaOfBst: ProblemDef<In> = {
  slug: '235-lowest-common-ancestor-of-a-binary-search-tree',
  id: '235', title: 'Lowest Common Ancestor of a Binary Search Tree', difficulty: 'Medium', category: 'Tree', tag: 'BST property, one root-to-node walk',
  statement: 'Given a binary search tree and two of its nodes p and q, return their lowest common ancestor: the deepest node that has both p and q in its subtree (a node counts as a descendant of itself).',
  constraints: '2 ≤ nodes ≤ 10⁵, distinct values (animation input is limited to 12 nodes). Input: the tree in level order, then ";", then p and q.',
  examples: [
    { label: '50 30 70 null 40 null null 35 null null 38 36 ; 36 38', input: { tokens: [50, 30, 70, null, 40, null, null, 35, null, null, 38, 36], p: 36, q: 38 }, output: '38' },
    { label: '6 2 8 0 4 7 9 ; 2 8', input: { tokens: [6, 2, 8, 0, 4, 7, 9], p: 2, q: 8 }, output: '6' },
    { label: '6 2 8 0 4 7 9 ; 2 4', input: { tokens: [6, 2, 8, 0, 4, 7, 9], p: 2, q: 4 }, output: '2' },
    { label: '5 3 8 1 4 7 9 ; 7 9', input: { tokens: [5, 3, 8, 1, 4, 7, 9], p: 7, q: 9 }, output: '8' },
  ],
  inputPlaceholder: 'e.g. 6 2 8 0 4 7 9 ; 2 8',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Current node', state: 'active' }, { label: 'Passed (one side discarded)', state: 'dim' }, { label: 'Lowest common ancestor', state: 'found' }],
  varLabels: ['cur', 'p', 'q', 'rule'],
  emphasis: ['lowest common ancestor', 'binary search tree'],
  phases: [
    { icon: '🚀', label: 'Start at the root', tone: 'blue' },
    { icon: '⬅️', label: 'Both smaller: go left', tone: 'cyan' },
    { icon: '➡️', label: 'Both larger: go right', tone: 'green' },
    { icon: '🎯', label: 'Split found: LCA', tone: 'gold' },
  ],
  approach: {
    title: 'Walk down until p and q split',
    text: 'Start at the root. If both p and q are smaller than the current value, go left; if both are larger, go right. The first node where that is not true (they are on different sides, or the node is one of them) is the lowest common ancestor.',
  },
  java, python,
  algorithm: [
    'Start at the root',
    'If p and q are both smaller than cur, move to cur.left',
    'If both are larger, move to cur.right',
    'Otherwise cur is the lowest common ancestor',
  ],
  complexity: [{ label: 'Time', value: 'O(h)' }, { label: 'Space', value: 'O(1) iteratively' }],
  why: 'Everything in a node’s left subtree is smaller than it and everything in the right subtree is larger. If p and q are both smaller, both lie in the left subtree, so the answer is there too and the right side can be dropped; symmetrically for larger. At the first node where they are not on the same side, p and q are in different child subtrees (or the node is one of them), so no deeper node contains both while this node does.',
};
