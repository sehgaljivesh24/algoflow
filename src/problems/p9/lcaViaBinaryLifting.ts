import type { ProblemDef } from '../../engine/types.ts';
import { LCA_USAGE, lcaCode, lcaExample, lcaSteps, parseLca } from './lcaEngine.ts';
import type { LcaIn } from './lcaEngine.ts';

const code = lcaCode(false);

export const lcaViaBinaryLifting: ProblemDef<LcaIn> = {
  slug: 'cp-lowest-common-ancestor-via-binary-lifting',
  id: 'CP', title: 'Lowest Common Ancestor via Binary Lifting', difficulty: 'Medium', category: 'Tree', tag: 'binary lifting',
  statement: 'Given a rooted tree (node 0 is the root) and several pairs of nodes, report the lowest common ancestor of each pair: the deepest node that is an ancestor of both (a node counts as its own ancestor). Preprocess the tree so every query takes O(log n).',
  constraints: 'n ≤ 10⁵ nodes, many queries (animation: parents of nodes 1..n-1 before |, at most 11 nodes and 3 queries written u:v)',
  examples: [
    lcaExample([-1, 0, 0, 1, 1, 2, 2, 3, 3], [[7, 8], [4, 8], [5, 6]], false),
    lcaExample([-1, 0, 1, 2, 3, 3, 1, 6, 7], [[5, 8], [4, 5], [8, 2]], false),
    lcaExample([-1, 0, 0, 0, 1, 1, 2, 4, 4, 7], [[8, 9], [6, 3], [9, 5]], false),
  ],
  inputPlaceholder: `e.g. ${LCA_USAGE}`,
  parseInput: parseLca, buildSteps: (i) => lcaSteps(i, false), viz: 'cells', vizTitle: 'Tree and ancestor table', vizCaption: 'up[j][v] = the 2^j-th ancestor of v (root points to itself)',
  legend: [{ label: 'u (deeper node)', state: 'active' }, { label: 'v', state: 'swap' }, { label: 'LCA / found', state: 'found' }, { label: 'Equal ancestors (skipped)', state: 'compare' }],
  varLabels: ['query', 'u', 'v', 'level j', 'answer'],
  approach: {
    title: 'Equalise depths, then jump together',
    text: 'First lift the deeper node by the depth difference using the table (one jump per set bit). If the nodes meet, that is the answer. Otherwise scan j from high to low and jump both nodes whenever their 2^j-th ancestors differ; afterwards both sit just below the LCA.',
  },
  java: code.java, python: code.python,
  phases: [
    { icon: '🏗', label: 'Build depth[] and up[ ][ ]', tone: 'blue' },
    { icon: '⬆', label: 'Equalise depths', tone: 'cyan' },
    { icon: '🎯', label: 'Met: u == v', tone: 'gold' },
    { icon: '🦘', label: 'Jump while ancestors differ', tone: 'green' },
    { icon: '✅', label: 'Done: LCA', tone: 'green' },
  ],
  emphasis: ['lowest common ancestor', 'deepest node', 'O(log n)'],
  algorithm: [
    'Precompute depth[] and the ancestor table up[j][v] (the root points to itself)',
    'Lift the deeper node up by the depth difference, one jump per set bit',
    'If the two nodes are now equal, that node is the LCA',
    'For j from high to low: if up[j][u] != up[j][v], jump both',
    'Both now hang directly below the LCA: return up[0][u]',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n) build, O(log n) per query' }, { label: 'Space', value: 'O(n log n)' }],
  why: 'After equalising depths, u and v are at the same level, so their k-th ancestors are comparable for every k. The predicate "the 2^j-th ancestors differ" is monotone: it holds exactly while we are strictly below the LCA. Scanning j downward is a binary search on the distance to the LCA: each jump keeps both nodes strictly below it, and the leftover distance is 1, so one parent step finishes.',
  naive: 'Walking both nodes up one parent at a time costs O(depth) per query, which is O(n) on a path-shaped tree.',
};
