import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { buildTree, emitter, find, parseInts, parseTokens, splitParts, stackAux, treeScene } from './treeKit.ts';
import type { Token } from './treeKit.ts';

interface In { tokens: Token[]; p: number; q: number }

const FORMAT = '3 5 1 6 2 0 8 null null 7 4 ; 5 1';

function parse(raw: string): In {
  const [t, pq] = splitParts(raw, 2, FORMAT);
  const tokens = parseTokens(t);
  const pair = parseInts(pq, 'p and q');
  if (pair.length !== 2) throw new Error(`After ";" give exactly two values p and q, e.g. ${FORMAT}`);
  const vals = buildTree(tokens).map((n) => Number(n.value));
  if (new Set(vals).size !== vals.length) throw new Error('All node values must be distinct for this problem');
  const [p, q] = pair;
  if (p === q) throw new Error('p and q must be two different nodes');
  if (!vals.includes(p) || !vals.includes(q)) throw new Error('Both p and q must be values that exist in the tree');
  return { tokens, p, q };
}

const java = [
  'public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {',
  '    if (root == null || root == p || root == q) return root;',
  '    TreeNode left = lowestCommonAncestor(root.left, p, q);',
  '    TreeNode right = lowestCommonAncestor(root.right, p, q);',
  '    if (left != null && right != null) return root;',
  '    return left != null ? left : right;',
  '}',
];
const python = [
  'def lowest_common_ancestor(root, p, q):',
  '    if root is None or root is p or root is q:',
  '        return root',
  '    left = lowest_common_ancestor(root.left, p, q)',
  '    right = lowest_common_ancestor(root.right, p, q)',
  '    if left and right:',
  '        return root',
  '    return left or right',
];
const J = { start: find(java, 'public TreeNode lowest'), hit: find(java, 'root == p || root == q'), kids: find(java, 'TreeNode left =', 'TreeNode right ='), both: find(java, 'if (left != null && right != null)'), pass: find(java, 'return left != null ? left') };
const P = { start: find(python, 'def lowest'), hit: find(python, 'if root is None', 'return root'), kids: find(python, 'left = lowest', 'right = lowest'), both: find(python, 'if left and right', ['return root', 2]), pass: find(python, 'return left or right') };

function build({ tokens, p, q }: In): Step[] {
  const nodes = buildTree(tokens);
  const states: Record<number, CellState> = {};
  const labels: Record<number, string> = {};
  const stack: string[] = [];
  const val = (id: number) => Number(nodes[id].value);
  const nm = (id: number | null) => (id === null ? '∅' : String(val(id)));
  const { steps, add } = emitter(() => treeScene(nodes, states, labels));
  const aux = () => [stackAux('call stack', stack)];
  const vars = (node: number | string, left: string, right: string, ret: string) => ({ node, left, right, returns: ret });
  const targets = nodes.filter((n) => n.value === p || n.value === q).map((n) => n.id);
  for (const t of targets) {
    states[t] = 'compare';
    labels[t] = val(t) === p ? 'p' : 'q';
  }
  let lca: number | null = null;

  add({
    title: 'Start', desc: `Find the lowest node that has both p = ${p} and q = ${q} in its subtree (a node counts as its own descendant). p and q are marked in yellow.`,
    logic: 'Each call answers: "which of p, q (or their LCA) lives in this subtree?" Combining the answers of two children reveals where the paths split.',
    j: J.start, p: P.start, a: 0, vars: vars('—', '—', '—', '—'), aux: aux(),
  });

  const lcaOf = (id: number): number | null => {
    const n = nodes[id];
    const v = val(id);
    stack.push(`node ${v}`);
    states[id] = 'active';
    const isTarget = v === p || v === q;
    add({
      title: `Visit node ${v}`, desc: isTarget ? `${v} is ${v === p ? 'p' : 'q'}. No need to look deeper: it either is the answer or the other target lies below it.` : `${v} is neither p nor q. Ask both children.`,
      logic: isTarget ? 'Return this node immediately — the target found here "speaks for" its whole subtree.' : 'A null child contributes null; otherwise it reports what it found.',
      j: J.hit, p: P.hit, a: 1, vars: vars(v, '?', '?', isTarget ? String(v) : '—'), aux: aux(),
    });
    if (isTarget) {
      states[id] = 'found';
      labels[id] = `↑${v}`;
      stack.pop();
      return id;
    }
    const l = n.left === null ? null : lcaOf(n.left);
    const r = n.right === null ? null : lcaOf(n.right);
    let ret: number | null;
    let why: string;
    if (l !== null && r !== null) {
      ret = id;
      lca = id;
      states[id] = 'swap';
      why = `Left found ${nm(l)} and right found ${nm(r)}: p and q are on different sides, so ${v} is their lowest common ancestor.`;
    } else {
      ret = l !== null ? l : r;
      states[id] = ret === null ? 'dim' : 'found';
      why = ret === null ? 'Neither side found p or q, so report null upward.' : `Only one side found something (${nm(ret)}), so pass it up unchanged.`;
    }
    labels[id] = `↑${nm(ret)}`;
    add({
      title: `Node ${v} returns ${nm(ret)}`, desc: why,
      logic: l !== null && r !== null ? 'The first node where both sides report non-null is the LCA.' : 'One-sided results travel up until two of them meet.', tone: l !== null && r !== null ? 'success' : 'info',
      j: [...J.kids, ...(l !== null && r !== null ? J.both : J.pass)], p: [...P.kids, ...(l !== null && r !== null ? P.both : P.pass)],
      a: l !== null && r !== null ? 2 : 3, vars: vars(v, nm(l), nm(r), nm(ret)), aux: aux(),
    });
    stack.pop();
    return ret;
  };

  const res = lcaOf(0)!;
  const answer = lca !== null ? lca : res;
  states[answer] = 'swap';
  add({
    title: 'Done', desc: `The lowest common ancestor of ${p} and ${q} is ${val(answer)}.`,
    logic: lca === null ? 'One target sits above the other, so that target is itself the ancestor.' : 'The paths to p and q split at this node.', tone: 'success',
    j: J.pass, p: P.pass, a: 3, vars: vars('—', '—', '—', String(val(answer))), aux: aux(), result: { title: String(val(answer)), text: `LCA of ${p} and ${q}` },
  });
  return steps;
}

export const lowestCommonAncestor: ProblemDef<In> = {
  slug: '236-lowest-common-ancestor',
  id: '236', title: 'Lowest Common Ancestor', difficulty: 'Medium', category: 'Tree', tag: 'DFS',
  statement: 'Given a binary tree and two nodes p and q that both exist in it, return their lowest common ancestor: the deepest node that has both p and q as descendants (a node may be a descendant of itself).',
  constraints: '2 ≤ nodes ≤ 10⁵, all values distinct (animation input: up to 12 nodes). Input format: tree in level order, then ";", then p and q.',
  examples: [
    { label: '3 5 1 6 2 0 8 null null 7 4 ; 5 1', input: { tokens: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 }, output: '3' },
    { label: '3 5 1 6 2 0 8 null null 7 4 ; 5 4', input: { tokens: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 }, output: '5' },
    { label: '1 2 3 4 5 ; 4 5', input: { tokens: [1, 2, 3, 4, 5], p: 4, q: 5 }, output: '2' },
  ],
  inputPlaceholder: `e.g. ${FORMAT}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'p or q (target)', state: 'compare' }, { label: 'Visiting', state: 'active' }, { label: 'Found something below', state: 'found' }, { label: 'LCA', state: 'swap' }, { label: 'Nothing found', state: 'dim' }],
  varLabels: ['node', 'left', 'right', 'returns'],
  approach: {
    title: 'Each subtree reports what it contains',
    text: 'Recurse into both children. A call returns null if p and q are absent, the node itself if it is p or q, or the LCA if both were found. The first node whose two children both return non-null is the answer.',
  },
  java, python,
  algorithm: [
    'If the node is null, p or q, return it',
    'Recurse into the left and right subtrees',
    'If both sides returned non-null, the current node is the LCA',
    'Otherwise return whichever side was non-null (or null)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(h)' }],
  why: 'If p and q lie in different child subtrees, the current node is the lowest point that still contains both, so it is the LCA. If both lie on one side, the answer is found deeper, and the other side returns null. If the current node is p (or q) and the other target is below it, returning early is correct because a node is its own descendant. Each node is visited once.',
};
