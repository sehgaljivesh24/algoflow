import type { PatternPack } from './types.ts';

/** Fragment e of pack p9: binary lifting / LCA and heavy-light decomposition. Merged by p9.ts. */

const lc = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard', slug: string, note?: string) => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: 'Advanced Data Structures',
      cards: [
        { slug: 'tree-lca-binary-lifting', group: 'Advanced Data Structures', title: 'LCA & Binary Lifting', tags: ['Tree', 'Ancestors', 'Jump pointers'], complexity: 'O(n log n) build, O(log n) query / O(n log n)' },
        { slug: 'heavy-light-decomposition', group: 'Advanced Data Structures', title: 'Heavy-Light Decomposition', tags: ['Tree', 'Path queries', 'Chains'], complexity: 'O(n) build, O(log² n) path query / O(n)' },
      ],
    },
  ],
  content: {
    'tree-lca-binary-lifting': {
      animation: '1483-kth-ancestor-of-a-tree-node',
      summary: 'Store for every node its 1st, 2nd, 4th, 8th ... ancestor. Any climb of k levels is then a handful of table jumps, one per set bit of k, and the same table finds lowest common ancestors.',
      whenToUse: [
        'You must repeatedly ask for the k-th ancestor of a node, or for the lowest common ancestor of two nodes',
        'Distances or path properties in a tree reduce to "depth plus LCA"',
        'Walking up one parent at a time costs O(depth) per query, which is O(n) on a path-shaped tree',
        'The tree is static, so an O(n log n) preprocessing step is paid once',
      ],
      tip: 'Build row j from row j-1 (up[j][v] = up[j-1][up[j-1][v]]). For LCA let the root point to itself, equalise depths first, and only then jump both nodes while their ancestors differ.',
      template: `// up[j][v] = the 2^j-th ancestor of v (the root points to itself)
static int[][] buildLifting(int[] parent) {
    int n = parent.length, log = 32 - Integer.numberOfLeadingZeros(n);
    int[][] up = new int[log][];
    up[0] = parent.clone();
    up[0][0] = 0;                                   // root -> root
    for (int j = 1; j < log; j++) {
        up[j] = new int[n];
        for (int v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];   // two half-jumps
    }
    return up;
}

// k-th ancestor: one jump per set bit of k
static int kthAncestor(int[][] up, int v, int k) {
    for (int j = 0; j < up.length; j++)
        if (((k >> j) & 1) == 1) v = up[j][v];
    return v;
}

// LCA: lift the deeper node, then jump both while their ancestors differ
static int lca(int[][] up, int[] depth, int u, int v) {
    if (depth[u] < depth[v]) { int t = u; u = v; v = t; }
    u = kthAncestor(up, u, depth[u] - depth[v]);
    if (u == v) return u;
    for (int j = up.length - 1; j >= 0; j--)
        if (up[j][u] != up[j][v]) { u = up[j][u]; v = up[j][v]; }
    return up[0][u];
}`,
      practice: [
        '1483-kth-ancestor-of-a-tree-node',
        '236-lowest-common-ancestor',
        { slug: 'cp-lowest-common-ancestor-via-binary-lifting', note: 'equalise depths, then jump together' },
        { slug: 'cp-distance-between-two-nodes-in-a-tree', note: 'distance from depths and the LCA' },
        lc('235', 'Lowest Common Ancestor of a Binary Search Tree', 'Medium', 'lowest-common-ancestor-of-a-binary-search-tree', 'the BST shortcut, for contrast'),
        lc('2846', 'Minimum Edge Weight Equilibrium Queries in a Tree', 'Hard', 'minimum-edge-weight-equilibrium-queries-in-a-tree', 'LCA plus edge-weight counts per jump'),
      ],
    },
    'heavy-light-decomposition': {
      animation: 'cp-heavy-light-decomposition-chains',
      summary: 'Split a tree into chains by always continuing to the child with the biggest subtree. Any root path then crosses only O(log n) chains, and each chain piece is a contiguous range of an array, so a path query becomes a few range queries.',
      whenToUse: [
        'You need path queries or path updates on a tree (maximum, sum, add) and the tree is static',
        'Values can change on nodes or edges, so a plain LCA table is not enough',
        'You already know a segment tree or Fenwick tree and want to lift it from arrays to trees',
        'Climbing one node at a time would be too slow on a deep tree',
      ],
      tip: 'Number nodes with a DFS that visits the heavy child first, so every chain is a consecutive block. A path query is then: while the heads differ, take the deeper head\'s piece and hop to the head\'s parent; finish with one range on the shared chain.',
      template: `// Heavy-light decomposition (parents have smaller ids than children)
int[] parent, size, heavy, head, pos, depth;
int cur = 0;

void decompose(int n, List<Integer>[] children) {
    Arrays.fill(size, 1);
    for (int v = n - 1; v >= 1; v--) size[parent[v]] += size[v];   // subtree sizes
    for (int v = 0; v < n; v++) {
        heavy[v] = -1;
        for (int c : children[v])                                   // biggest child is heavy
            if (heavy[v] < 0 || size[c] > size[heavy[v]]) heavy[v] = c;
    }
    assign(0, 0, children);
}

void assign(int v, int h, List<Integer>[] children) {
    head[v] = h;
    pos[v] = cur++;                                // heavy child gets the next position
    if (heavy[v] >= 0) assign(heavy[v], h, children);
    for (int c : children[v])
        if (c != heavy[v]) assign(c, c, children); // a light child starts a new chain
}

// Path query: cut the path into chain pieces, one range query each
int pathQuery(int u, int v) {
    int best = NEG_INF;
    while (head[u] != head[v]) {
        if (depth[head[u]] < depth[head[v]]) { int t = u; u = v; v = t; }
        best = Math.max(best, rangeMax(pos[head[u]], pos[u]));
        u = parent[head[u]];
    }
    if (depth[u] > depth[v]) { int t = u; u = v; v = t; }
    return Math.max(best, rangeMax(pos[u], pos[v]));
}`,
      practice: [
        'cp-heavy-light-decomposition-chains',
        'cp-hld-path-maximum-query',
        'cp-lca-via-heavy-light-decomposition',
        { slug: 'cp-lowest-common-ancestor-via-binary-lifting', note: 'the O(n log n)-memory alternative for LCA' },
        { slug: '236-lowest-common-ancestor', note: 'the same question on a binary tree, solved by plain DFS' },
      ],
    },
  },
  meta: {
    'tree-lca-binary-lifting': {
      icon: '🦘', label: 'Lifting',
      desc: 'Precompute the 2^j-th ancestor of every node. A climb of any length becomes a few table jumps, and two nodes meet at their LCA by jumping together.',
      useNote: 'Think of k in binary: each set bit is one jump. For LCA, equalise depths first, then jump both nodes only while their ancestors differ.',
      complexityNote: 'The table has log n rows of n entries, built once. Every query then takes O(log n) lookups.',
      highlight: ['Binary Lifting', 'k-th ancestor', 'lowest common ancestor', 'O(depth)', 'static'],
    },
    'heavy-light-decomposition': {
      icon: '⛓️', label: 'Chains',
      desc: 'Link every node to its biggest child to form chains. A root path crosses only O(log n) chains, and each chain piece is one array range.',
      useNote: 'Number the heavy child right after its parent so chains are contiguous, then answer a path by climbing chain heads and querying ranges.',
      complexityNote: 'Building is linear. A path touches O(log n) chains and each piece costs O(log n) with a segment tree, so a query is O(log² n).',
      highlight: ['Heavy-Light', 'path queries', 'path updates', 'segment tree', 'static'],
    },
  },
  examples: {
    'tree-lca-binary-lifting': [
      { slug: '1483-kth-ancestor-of-a-tree-node', why: 'Builds the up[j][v] table row by row from two half-jumps, then answers a query by one jump per set bit of k, including the case where k climbs past the root.' },
      { slug: 'cp-lowest-common-ancestor-via-binary-lifting', why: 'Reuses the same table for a two-node question: equalise the depths with bit jumps, then scan j downward and jump both nodes only while their ancestors differ.' },
      { slug: 'cp-distance-between-two-nodes-in-a-tree', why: 'Shows that LCA is a building block: once the meeting point is known, path length is just depth[u] + depth[v] - 2 * depth[lca].' },
    ],
    'heavy-light-decomposition': [
      { slug: 'cp-heavy-light-decomposition-chains', why: 'Builds the decomposition itself: subtree sizes, heavy children, chain heads and the consecutive positions that make every chain a range.' },
      { slug: 'cp-hld-path-maximum-query', why: 'Uses the decomposition: a u-to-v path is cut into chain pieces, each answered as a range maximum on the position array, hopping over light edges in between.' },
      { slug: 'cp-lca-via-heavy-light-decomposition', why: 'Needs no jump table at all: climbing from the deeper chain head finds the LCA in O(log n) hops with O(n) memory.' },
    ],
  },
  problems: [
    { id: '1483', title: 'Kth Ancestor of a Tree Node', difficulty: 'Hard', tag: 'binary lifting', category: 'Tree' },
    { id: 'CP', title: 'Lowest Common Ancestor via Binary Lifting', difficulty: 'Medium', tag: 'binary lifting', category: 'Tree' },
    { id: 'CP', title: 'Distance Between Two Nodes in a Tree', difficulty: 'Medium', tag: 'LCA + depth', category: 'Tree' },
    { id: 'CP', title: 'Heavy-Light Decomposition: Chains', difficulty: 'Hard', tag: 'heavy-light decomposition', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'HLD Path Maximum Query', difficulty: 'Hard', tag: 'heavy-light decomposition', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'LCA via Heavy-Light Decomposition', difficulty: 'Hard', tag: 'heavy-light decomposition', category: 'Advanced Data Structures' },
  ],
};
