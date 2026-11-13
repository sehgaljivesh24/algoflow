import type { ProblemDef } from '../../engine/types.ts';
import { LCA_USAGE, lcaCode, lcaExample, lcaSteps, parseLca } from './lcaEngine.ts';
import type { LcaIn } from './lcaEngine.ts';

const code = lcaCode(true);

export const distanceBetweenNodesInTree: ProblemDef<LcaIn> = {
  slug: 'cp-distance-between-two-nodes-in-a-tree',
  id: 'CP', title: 'Distance Between Two Nodes in a Tree', difficulty: 'Medium', category: 'Tree', tag: 'LCA + depth',
  statement: 'For each query pair (u, v) in a rooted tree report the number of edges on the unique path between them. Use the lowest common ancestor found by binary lifting: the path goes up from u to the LCA and down to v.',
  constraints: 'n ≤ 10⁵ nodes, many queries (animation: parents of nodes 1..n-1 before |, at most 11 nodes and 3 queries written u:v)',
  examples: [
    lcaExample([-1, 0, 0, 1, 1, 2, 2, 3, 3], [[7, 8], [7, 6], [4, 4]], true),
    lcaExample([-1, 0, 1, 2, 3, 3, 1, 6, 7], [[5, 8], [4, 5], [8, 0]], true),
    lcaExample([-1, 0, 0, 0, 1, 1, 2, 4, 4, 7], [[8, 9], [6, 3], [9, 5]], true),
  ],
  inputPlaceholder: `e.g. ${LCA_USAGE}`,
  parseInput: parseLca, buildSteps: (i) => lcaSteps(i, true), viz: 'cells', vizTitle: 'Tree and ancestor table', vizCaption: 'd = depth of the node; up[j][v] = 2^j-th ancestor',
  legend: [{ label: 'u (deeper node)', state: 'active' }, { label: 'v', state: 'swap' }, { label: 'LCA / found', state: 'found' }, { label: 'Equal ancestors (skipped)', state: 'compare' }],
  varLabels: ['query', 'u', 'v', 'level j', 'answer'],
  approach: {
    title: 'distance = depth[u] + depth[v] − 2·depth[lca]',
    text: 'The path between u and v climbs from u to their lowest common ancestor and then descends to v. Find the LCA with binary lifting, then the edge count is (depth[u] − depth[lca]) + (depth[v] − depth[lca]).',
  },
  java: code.java, python: code.python,
  phases: [
    { icon: '🏗', label: 'Build depth[] and up[ ][ ]', tone: 'blue' },
    { icon: '⬆', label: 'Equalise depths', tone: 'cyan' },
    { icon: '🎯', label: 'Met: u == v', tone: 'gold' },
    { icon: '🦘', label: 'Jump while ancestors differ', tone: 'green' },
    { icon: '📌', label: 'Found the LCA', tone: 'orange' },
    { icon: '✅', label: 'Done: distance', tone: 'green' },
  ],
  emphasis: ['number of edges', 'unique path', 'lowest common ancestor'],
  algorithm: [
    'Precompute depth[] and the ancestor table up[j][v]',
    'Equalise the depths of u and v by lifting the deeper one',
    'If they met, that node is the LCA',
    'Otherwise jump both for j from high to low while ancestors differ',
    'The LCA is the common parent of the two nodes',
    'distance = depth[u] + depth[v] − 2·depth[lca]',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n) build, O(log n) per query' }, { label: 'Space', value: 'O(n log n)' }],
  why: 'In a tree there is exactly one simple path between two nodes, and it is the union of the root-paths of u and v with their common part removed. The common part is the root path of the LCA, which has depth[lca] edges and is counted once in each of depth[u] and depth[v]; subtracting it twice leaves the length of the path.',
  naive: 'A BFS from u costs O(n) per query. With the LCA the answer is a depth formula plus an O(log n) lookup.',
};
