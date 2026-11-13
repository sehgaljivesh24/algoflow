import type { PatternPack } from './types.ts';

/** Fragment c of pack p9: sqrt-decomposition and persistent-structures. Merged by p9.ts. */
const lc = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard', slug: string, note?: string) => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: 'Advanced Data Structures',
      cards: [
        { slug: 'sqrt-decomposition', group: 'Advanced Data Structures', title: 'Sqrt Decomposition', tags: ['Blocks', 'Range queries', 'Lazy tags'], complexity: 'O(√n) per query / O(n)' },
        { slug: 'persistent-structures', group: 'Advanced Data Structures', title: 'Persistent Structures', tags: ['Versions', 'Path copying', 'Time travel'], complexity: 'O(log n) per version / O(n + q log n)' },
      ],
    },
  ],

  content: {
    'sqrt-decomposition': {
      animation: 'alg-sqrt-decomposition-range-sum-with-updates',
      summary: 'Cut the array into blocks of about √n elements and keep a summary (sum, count table, lazy tag) per block. A range operation scans at most two ragged blocks and handles the blocks in between with one summary each.',
      whenToUse: [
        'You need range queries mixed with point or range updates, and prefix sums break because the data changes',
        'The summary of a block is easy to maintain but hard to subtract (a count table, a mode, a sorted copy of the block)',
        'O(√n) per operation is fast enough and a segment tree would be heavy to write or to adapt',
        'Queries are offline or batched and you can afford to rebuild a block now and then',
      ],
      tip: 'Decide what a block remembers (sum, tag, counts) and what a ragged end must read. Then every operation is the same three loops: left partial block, whole blocks, right partial block.',
      template: `// Sqrt decomposition: range sum, point update.
class SqrtSum {
    private final long[] a, block;
    private final int n, B;

    SqrtSum(int[] nums) {
        n = nums.length;
        B = (int) Math.ceil(Math.sqrt(n));              // block size ~ sqrt(n)
        a = new long[n];
        block = new long[(n + B - 1) / B];
        for (int i = 0; i < n; i++) { a[i] = nums[i]; block[i / B] += nums[i]; }
    }

    void set(int i, int v) {                            // O(1): fix one element and one block sum
        block[i / B] += v - a[i];
        a[i] = v;
    }

    long sum(int l, int r) {                            // O(sqrt n)
        long s = 0;
        int bl = l / B, br = r / B;
        if (bl == br) { for (int i = l; i <= r; i++) s += a[i]; return s; }
        for (int i = l; i < (bl + 1) * B; i++) s += a[i];   // left ragged block
        for (int b = bl + 1; b < br; b++) s += block[b];    // whole blocks via summaries
        for (int i = br * B; i <= r; i++) s += a[i];        // right ragged block
        return s;
    }
}`,
      practice: [
        '2080-range-frequency-queries',
        { slug: 'cp-range-add-and-range-sum-with-blocks', note: 'lazy tag per block' },
        lc('303', 'Range Sum Query - Immutable', 'Easy', 'range-sum-query-immutable', 'prefix sums: the static special case'),
        lc('307', 'Range Sum Query - Mutable', 'Medium', 'range-sum-query-mutable', 'blocks, Fenwick or segment tree'),
        lc('1157', 'Online Majority Element In Subarray', 'Hard', 'online-majority-element-in-subarray', 'candidate lookup per block'),
      ],
    },
    'persistent-structures': {
      animation: 'cp-persistent-segment-tree-version-array',
      summary: 'Never modify a node; build a new one. An update copies only the nodes on one root-to-leaf path and shares everything else with the previous version, so every old version stays readable at O(log n) extra memory per update.',
      whenToUse: [
        'You must query an earlier state of a structure ("value at version k", "the array after the first i elements")',
        'Questions about a range can be answered as a difference of two prefixes (k-th smallest in a range, count of values in a range)',
        'Undo / branching histories, snapshots, or offline problems that sweep over time and ask about the past',
        'Copying the whole structure for each version would cost O(n) time and memory per update',
      ],
      tip: 'Path copying rule: new node = old node with exactly one child pointer replaced. Think "which pointers change", and every other pointer is simply reused.',
      template: `// Persistent segment tree (point update, path copying).
class Node {
    final int sum;
    final Node left, right;
    Node(int sum, Node left, Node right) { this.sum = sum; this.left = left; this.right = right; }
}

class PersistentArray {
    private final List<Node> roots = new ArrayList<>();   // roots.get(k) is version k
    private final int n;

    PersistentArray(int[] a) { n = a.length; roots.add(build(a, 0, n - 1)); }

    private Node build(int[] a, int l, int r) {
        if (l == r) return new Node(a[l], null, null);
        int m = (l + r) / 2;
        Node L = build(a, l, m), R = build(a, m + 1, r);
        return new Node(L.sum + R.sum, L, R);
    }

    int set(int i, int v) {                                // returns the new version number
        roots.add(set(roots.get(roots.size() - 1), 0, n - 1, i, v));
        return roots.size() - 1;
    }

    private Node set(Node cur, int l, int r, int i, int v) {
        if (l == r) return new Node(v, null, null);
        int m = (l + r) / 2;
        Node L = cur.left, R = cur.right;                  // share what does not change
        if (i <= m) L = set(L, l, m, i, v); else R = set(R, m + 1, r, i, v);
        return new Node(L.sum + R.sum, L, R);              // only this path is new
    }
}`,
      practice: [
        '1146-snapshot-array',
        { slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree', note: 'difference of two prefix versions' },
        lc('981', 'Time Based Key-Value Store', 'Medium', 'time-based-key-value-store', 'versions per key + binary search'),
        lc('2276', 'Count Integers in Intervals', 'Hard', 'count-integers-in-intervals', 'dynamic tree; compare with persistence'),
        lc('1472', 'Design Browser History', 'Medium', 'design-browser-history', 'a history you can walk back and forth'),
      ],
    },
  },

  meta: {
    'sqrt-decomposition': {
      icon: '🧱', label: 'Blocks',
      desc: 'Split the data into about √n blocks, remember a summary per block, and let every operation touch two ragged ends plus whole blocks.',
      useNote: 'A block summary turns B elements into one number. Choose B ≈ √n so that scanning the ends and walking the blocks cost about the same.',
      complexityNote: 'A range touches at most two partial blocks (about √n elements) and at most √n whole blocks. The summaries use O(n / B) extra space.',
      highlight: ['Sqrt Decomposition', 'range queries', 'point or range updates', 'O(√n)', 'block'],
    },
    'persistent-structures': {
      icon: '🕰️', label: 'Versions',
      desc: 'Updates create a new version instead of changing the old one. Path copying keeps every version alive for O(log n) extra nodes.',
      useNote: 'Only the nodes on the path to the changed position are new. Everything else is shared, so old roots keep describing the old data.',
      complexityNote: 'Each update allocates O(log n) nodes, so q updates cost O(n + q log n) memory in total. Reading any version costs the same as reading a normal tree.',
      highlight: ['Persistent', 'version', 'path copying', 'earlier state', 'difference of two prefixes'],
    },
  },

  examples: {
    'sqrt-decomposition': [
      { slug: 'alg-sqrt-decomposition-range-sum-with-updates', why: 'The core pattern: a block sum makes updates O(1) and lets a query skip whole blocks, with only the two ragged ends scanned element by element.' },
      { slug: 'cp-range-add-and-range-sum-with-blocks', why: 'Range updates: a fully covered block only gets a lazy tag (and a fixed sum) instead of B rewrites, which is the same trick a lazy segment tree uses.' },
      { slug: '2080-range-frequency-queries', why: 'A summary that cannot be subtracted: a per-block count table answers "how many x" for whole blocks, which a plain prefix sum cannot do.' },
    ],
    'persistent-structures': [
      { slug: 'cp-persistent-segment-tree-version-array', why: 'Shows path copying itself: which nodes are new, which are shared, and how any version is read from its own root.' },
      { slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree', why: 'Versions as prefixes: subtracting the trees of two prefixes gives a range, so the k-th smallest becomes one walk down two trees.' },
      { slug: '1146-snapshot-array', why: 'Persistence without a tree: each cell keeps only its changes tagged by snapshot id, and a binary search picks the right version.' },
    ],
  },

  problems: [
    { id: 'ALG', title: 'Sqrt Decomposition (Range Sum with Updates)', difficulty: 'Medium', tag: 'sqrt decomposition', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Range Add and Range Sum with Blocks', difficulty: 'Medium', tag: 'sqrt decomposition + lazy tags', category: 'Advanced Data Structures' },
    { id: '2080', title: 'Range Frequency Queries', difficulty: 'Medium', tag: 'blocks + counts', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Persistent Segment Tree: Version Array', difficulty: 'Hard', tag: 'persistent segment tree', category: 'Advanced Data Structures' },
    { id: 'CP', title: 'Kth Smallest in a Range (Persistent Segment Tree)', difficulty: 'Hard', tag: 'persistent segment tree', category: 'Advanced Data Structures' },
    { id: '1146', title: 'Snapshot Array', difficulty: 'Medium', tag: 'versioned values', category: 'Design' },
  ],
};
