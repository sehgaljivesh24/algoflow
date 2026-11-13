import type { PatternPack } from './types.ts';
import type { PracticeItem } from '../patterns.ts';

const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

/** Fragment b of pack p9: segment tree + Fenwick tree. Merged by p9.ts. */
export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: 'Advanced Data Structures',
      cards: [
        { slug: 'segment-tree', group: 'Advanced Data Structures', title: 'Segment Tree (Range Query + Update)', tags: ['Range sum / min', 'Lazy propagation'], complexity: 'O(n) build, O(log n) per op / O(n)' },
        { slug: 'fenwick-tree', group: 'Advanced Data Structures', title: 'Fenwick Tree (Binary Indexed Tree)', tags: ['Prefix sums with updates', 'Counting inversions'], complexity: 'O(n) build, O(log n) per op / O(n)' },
      ],
    },
  ],
  content: {
    'segment-tree': {
      animation: '307-range-sum-query-mutable',
      summary: 'Store an aggregate (sum, min, max, gcd, ...) of every range in a binary tree of halves. Point updates repair one root-to-leaf path and range queries stitch together O(log n) ready-made pieces.',
      whenToUse: [
        'You must answer many range queries (sum, minimum, maximum) on an array that also changes between queries',
        'A prefix-sum array is too slow because each update would rebuild O(n) totals',
        'A whole range must be updated at once (add a value to every item), which calls for lazy propagation',
        'The combine operation is associative (sum, min, max, gcd, xor) and has a neutral element',
        'You need the answer for an arbitrary [left, right], not just prefixes',
      ],
      tip: 'Decide three things before coding: what a node stores, how two children combine, and what a disjoint range returns (the neutral element: 0 for sum, +infinity for min). Allocate 4n slots when the tree is stored in an array.',
      template: `// Segment tree for range sum with point update (array form, node 1 is the root)
static int[] tree;

static void build(int[] a, int node, int l, int r) {
    if (l == r) { tree[node] = a[l]; return; }          // leaf = one item
    int mid = (l + r) / 2;
    build(a, 2 * node, l, mid);
    build(a, 2 * node + 1, mid + 1, r);
    tree[node] = tree[2 * node] + tree[2 * node + 1];   // combine the halves
}

static void update(int node, int l, int r, int i, int val) {
    if (l == r) { tree[node] = val; return; }
    int mid = (l + r) / 2;
    if (i <= mid) update(2 * node, l, mid, i, val);     // exactly one child holds i
    else update(2 * node + 1, mid + 1, r, i, val);
    tree[node] = tree[2 * node] + tree[2 * node + 1];   // repair on the way back
}

static int query(int node, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return 0;                     // disjoint: neutral element
    if (ql <= l && r <= qr) return tree[node];          // fully inside: ready-made piece
    int mid = (l + r) / 2;                              // partial overlap: split
    return query(2 * node, l, mid, ql, qr) + query(2 * node + 1, mid + 1, r, ql, qr);
}
// tree = new int[4 * n]; build(a, 1, 0, n - 1); O(log n) per update / query`,
      practice: [
        '307-range-sum-query-mutable',
        { slug: 'cp-range-add-range-sum-lazy-propagation', note: 'range add needs lazy tags' },
        lc('699', 'Falling Squares', 'Hard', 'falling-squares', 'range max query + range assign'),
        lc('732', 'My Calendar III', 'Hard', 'my-calendar-iii', 'range add, global max'),
        lc('2407', 'Longest Increasing Subsequence II', 'Hard', 'longest-increasing-subsequence-ii', 'max over a value window'),
      ],
    },
    'fenwick-tree': {
      animation: 'alg-fenwick-tree-binary-indexed-tree',
      summary: 'A compact array where slot i stores the sum of the lowbit(i) items ending at i. Prefix sums and point updates both take O(log n) by hopping with i & -i.',
      whenToUse: [
        'You need prefix sums (or range sums as a difference of two prefixes) while elements change',
        'You want counting problems like "how many earlier items are smaller", which become prefix counts over ranks',
        'A segment tree would work, but you want less code and a single extra array',
        'The operation has an inverse (sum, count, xor), so a range can be a difference of prefixes',
      ],
      tip: 'Keep the tree 1-indexed. Query moves down with i -= i & -i, update moves up with i += i & -i. For values that are large or negative, compress them to ranks first.',
      template: `// Fenwick tree (binary indexed tree), 1-based positions
static int[] tree;

static void add(int i, int delta) {
    for (; i < tree.length; i += i & -i) {   // next block that also contains i
        tree[i] += delta;
    }
}

static int prefix(int i) {                   // sum of positions 1..i
    int sum = 0;
    for (; i > 0; i -= i & -i) {             // drop the lowest set bit
        sum += tree[i];
    }
    return sum;
}

static int range(int l, int r) {             // sum of positions l..r
    return prefix(r) - prefix(l - 1);
}

// counting pattern: rank = position of the value among the sorted distinct values
// for each item: smallerSeen = prefix(rank - 1); add(rank, 1);
// tree = new int[n + 1]; every operation is O(log n)`,
      practice: [
        'alg-fenwick-tree-binary-indexed-tree',
        '315-count-of-smaller-numbers-after-self',
        { slug: 'cp-count-inversions-with-a-fenwick-tree', note: 'count earlier larger items' },
        { slug: '307-range-sum-query-mutable', note: 'same problem as a Fenwick tree' },
        lc('493', 'Reverse Pairs', 'Hard', 'reverse-pairs', 'count with a doubled threshold'),
        lc('327', 'Count of Range Sum', 'Hard', 'count-of-range-sum', 'prefix sums + rank counting'),
        lc('1649', 'Create Sorted Array through Instructions', 'Hard', 'create-sorted-array-through-instructions', 'min(smaller, larger) per insert'),
      ],
    },
  },
  meta: {
    'segment-tree': {
      icon: '🌲', label: 'Segment tree',
      desc: 'A binary tree where every node stores the answer for a range. Updates fix one path, queries combine a few ready-made pieces.',
      useNote: 'Think "node = range": the root is [0, n-1], children are the two halves. Ask what each node stores and what a disjoint range returns.',
      complexityNote: 'Height is log n, and at most two partly-overlapping nodes per level are explored. The tree itself holds about 2n to 4n numbers.',
      highlight: ['Segment tree', 'range queries', 'lazy propagation', 'associative', 'neutral element'],
    },
    'fenwick-tree': {
      icon: '🧮', label: 'Fenwick',
      desc: 'One array, one bit trick: slot i covers the last lowbit(i) items, so prefix sums and updates hop in O(log n).',
      useNote: 'Query goes down by clearing the lowest bit, update goes up by adding it. Counting problems become prefix counts over ranks.',
      complexityNote: 'Each walk clears or carries at most log2(n)+1 bits. Only n extra numbers are stored and the constant factor is tiny.',
      highlight: ['Fenwick', 'prefix sums', 'smaller', 'single extra array', 'inverse'],
    },
  },
  examples: {
    'segment-tree': [
      { slug: '307-range-sum-query-mutable', why: 'The base case: a sum tree with point updates. Shows the three query cases (outside, fully inside, partial) and the leaf-to-root repair after an update.' },
      { slug: 'cp-range-minimum-query-segment-tree', why: 'Same shape, different merge: min instead of sum. Shows why the neutral element matters (infinity for disjoint ranges) and why prefix tricks cannot replace the tree.' },
      { slug: 'cp-range-add-range-sum-lazy-propagation', why: 'Range updates. Fully covered nodes stop and keep a lazy tag; the tag is pushed down only when a later operation must look inside.' },
    ],
    'fenwick-tree': [
      { slug: 'alg-fenwick-tree-binary-indexed-tree', why: 'The structure itself: how tree[i] covers a block, the O(n) build, the update walk i += lowbit and the query walk i -= lowbit.' },
      { slug: '315-count-of-smaller-numbers-after-self', why: 'Fenwick as a counter over compressed ranks, scanning right to left: each answer is a prefix count of strictly smaller ranks.' },
      { slug: 'cp-count-inversions-with-a-fenwick-tree', why: 'The mirror image: scan left to right and count earlier items that are larger as (items seen) minus a prefix count, so every pair is counted once.' },
    ],
  },
  problems: [
    { id: '307', title: 'Range Sum Query - Mutable', difficulty: 'Medium', tag: 'segment tree', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Range Minimum Query (Segment Tree)', difficulty: 'Medium', tag: 'segment tree (min)', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Range Add Range Sum (Lazy Propagation)', difficulty: 'Hard', tag: 'lazy segment tree', category: 'Advanced Data Structures' },
    { id: 'ALG', title: 'Fenwick Tree (Binary Indexed Tree)', difficulty: 'Medium', tag: 'fenwick tree', category: 'Advanced Data Structures' },
    { id: '315', title: 'Count of Smaller Numbers After Self', difficulty: 'Hard', tag: 'fenwick tree + ranks', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Count Inversions with a Fenwick Tree', difficulty: 'Medium', tag: 'fenwick tree', category: 'Advanced Data Structures' },
  ],
};
