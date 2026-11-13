import type { PatternPack } from './types.ts';

/**
 * Pack p4 "greedy-heap-grid": three worked examples for the greedy / heap / BFS / grid patterns, plus the new patterns
 * line-sweep, reservoir-sampling and matrix-traversal (see PATTERNS-GUIDE.md).
 */
export const pack: PatternPack = {
  id: 'p4',

  /* ------------------------------------------------------------------ new catalog problems */
  problems: [
    { id: '502', title: 'IPO', difficulty: 'Hard', tag: 'two heaps', category: 'Heap' },
    { id: '480', title: 'Sliding Window Median', difficulty: 'Hard', tag: 'two heaps + lazy delete', category: 'Heap' },
    { id: '378', title: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium', tag: 'k-way merge', category: 'Heap' },
    { id: '632', title: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard', tag: 'k-way merge + running max', category: 'Heap' },
    { id: '542', title: '01 Matrix', difficulty: 'Medium', tag: 'multi-source BFS', category: 'Graph' },
    { id: '695', title: 'Max Area of Island', difficulty: 'Medium', tag: 'DFS returns area', category: 'Matrix' },
    { id: '130', title: 'Surrounded Regions', difficulty: 'Medium', tag: 'border DFS', category: 'Matrix' },
    { id: '498', title: 'Diagonal Traverse', difficulty: 'Medium', tag: 'diagonal simulation', category: 'Matrix' },
    { id: '1094', title: 'Car Pooling', difficulty: 'Medium', tag: 'line sweep', category: 'Intervals' },
    { id: '218', title: 'The Skyline Problem', difficulty: 'Hard', tag: 'line sweep + multiset', category: 'Intervals' },
    { id: '382', title: 'Linked List Random Node', difficulty: 'Medium', tag: 'reservoir sampling (k = 1)', category: 'Randomized & Streaming' },
    { id: '398', title: 'Random Pick Index', difficulty: 'Medium', tag: 'reservoir sampling over matches', category: 'Randomized & Streaming' },
    { id: 'ALG', title: 'Reservoir Sampling (k Items)', difficulty: 'Medium', tag: 'reservoir sampling (k items)', category: 'Randomized & Streaming' },
  ],

  /* ------------------------------------------------------------------ new pattern cards */
  groups: [
    { name: 'Greedy', cards: [{ slug: 'line-sweep', group: 'Greedy', title: 'Line Sweep (Events)', tags: ['Intervals', 'Events', 'Sort'], complexity: 'O(n log n) / O(n)' }] },
    { name: 'Randomized & Streaming', cards: [{ slug: 'reservoir-sampling', group: 'Randomized & Streaming', title: 'Reservoir Sampling', tags: ['Stream', 'Random', 'O(k) memory'], complexity: 'O(n) / O(k)' }] },
    { name: 'BFS / Grid', cards: [{ slug: 'matrix-traversal', group: 'BFS / Grid', title: 'Matrix Traversal (Spiral / Diagonal / Rotate)', tags: ['Matrix', 'Simulation', 'In-place'], complexity: 'O(R×C) / O(1)' }] },
  ],

  /* ------------------------------------------------------------------ new pattern pages */
  content: {
    'line-sweep': {
      animation: '253-meeting-rooms-ii',
      summary: 'Turn every interval into events at its two ends, sort the events by coordinate, and walk a vertical line across them once. The state you keep (how many things are active, which height is tallest) only changes when the line passes an event.',
      whenToUse: [
        'You need the maximum overlap, the busiest moment, or whether any overlap exceeds a limit',
        'Intervals, bookings, trips or buildings are described by a start and an end on one axis',
        'The answer depends on what is "active" at each coordinate, not on pairs of intervals',
        'Brute force would test every pair of intervals, or every coordinate in a huge range',
      ],
      tip: 'Decide the tie-break before coding: if an interval ending at x and another starting at x may share the resource, process the end first. The sign of the delta usually does this for free when you sort (x, delta).',
      template: `int sweep(int[][] intervals) {
    // ── Phase 1: turn every interval into two events ──────────
    List<int[]> events = new ArrayList<>();          // {coordinate, delta}
    for (int[] iv : intervals) {
        events.add(new int[]{iv[0], +1});            // something starts here
        events.add(new int[]{iv[1], -1});            // something ends here
    }

    // ── Phase 2: order the events; on ties, ends (-1) come before starts (+1) ──
    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);

    // ── Phase 3: walk the line once, updating the state at each event ──
    int active = 0, best = 0;
    for (int[] e : events) {
        active += e[1];                              // state changes only at events
        best = Math.max(best, active);               // inspect / record the answer here
    }
    return best;                                     // O(n log n) time, O(n) space
}`,
      practice: [
        '253-meeting-rooms-ii',
        '1094-car-pooling',
        '218-the-skyline-problem',
        { id: '731', title: 'My Calendar II', difficulty: 'Medium', note: 'sweep over +1 / -1 events, reject a triple booking', href: 'https://leetcode.com/problems/my-calendar-ii/' },
        { id: '732', title: 'My Calendar III', difficulty: 'Hard', note: 'maximum overlap after every insertion', href: 'https://leetcode.com/problems/my-calendar-iii/' },
      ],
    },

    'reservoir-sampling': {
      animation: '382-linked-list-random-node',
      summary: 'Pick uniformly at random from a sequence whose length you do not know and cannot store. Keep a small reservoir and let the n-th item replace a random slot with probability k / n, so every item ends up equally likely.',
      whenToUse: [
        'Data arrives as a stream or a linked list and the total count is unknown in advance',
        'You must choose one item (or k items) uniformly at random using O(1) / O(k) memory',
        'Storing everything and sampling afterwards is impossible or wasteful',
        'A problem asks for a "random pick" among elements that satisfy a condition',
      ],
      tip: 'Only the probability of the n-th arrival matters: k / n. If you can justify "every earlier item survives with probability (n − 1) / n", the algorithm is uniform by induction. Use a seeded generator when you need a reproducible test.',
      template: `int[] sampleK(Iterator<Integer> stream, int k, Random rnd) {
    int[] reservoir = new int[k];
    int seen = 0;

    while (stream.hasNext()) {
        int x = stream.next();
        seen++;

        if (seen <= k) {
            reservoir[seen - 1] = x;                 // phase 1: the first k items fill the reservoir
        } else {
            int j = rnd.nextInt(seen);               // phase 2: j is uniform in [0, seen)
            if (j < k) reservoir[j] = x;             // keep the newcomer with probability k / seen
        }
    }
    return reservoir;                                // O(n) time, O(k) space; every item had chance k / n
}`,
      practice: [
        '382-linked-list-random-node',
        '398-random-pick-index',
        'alg-reservoir-sampling-k-items',
        { id: '384', title: 'Shuffle an Array', difficulty: 'Medium', note: 'Fisher–Yates: the in-memory cousin of reservoir sampling', href: 'https://leetcode.com/problems/shuffle-an-array/' },
        { id: '528', title: 'Random Pick with Weight', difficulty: 'Medium', note: 'weighted choice via prefix sums + binary search', href: 'https://leetcode.com/problems/random-pick-with-weight/' },
      ],
    },

    'matrix-traversal': {
      animation: '54-spiral-matrix',
      summary: 'Many matrix problems are about a movement rule rather than a clever algorithm: walk the ring of a spiral, ride the diagonals, rotate layer by layer, or mark rows and columns in place. The skill is keeping boundaries and directions exact.',
      whenToUse: [
        'The output order is a pattern over the grid: spiral, zigzag, diagonal, layer by layer',
        'You must transform a square matrix in place (rotate, transpose, flip) with O(1) extra space',
        'Rows or columns must be marked or cleared and you can reuse the matrix itself as storage',
        'The cell coordinates satisfy a simple identity, for example r + c is constant along an anti-diagonal',
      ],
      tip: 'Write down the invariant for your walk (the four walls, or "diagonal d holds the cells with r + c = d") and test the 1×n, n×1 and 1×1 matrices; they break most first attempts.',
      template: `List<Integer> spiral(int[][] m) {
    List<Integer> out = new ArrayList<>();
    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;

    // Boundary walk: peel one ring per loop, then shrink the walls.
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) out.add(m[top][c]);        // → along the top row
        top++;
        for (int r = top; r <= bottom; r++) out.add(m[r][right]);      // ↓ down the right column
        right--;
        if (top <= bottom) {                                           // guard: a single row is already done
            for (int c = right; c >= left; c--) out.add(m[bottom][c]); // ← back along the bottom row
            bottom--;
        }
        if (left <= right) {                                           // guard: a single column is already done
            for (int r = bottom; r >= top; r--) out.add(m[r][left]);   // ↑ up the left column
            left++;
        }
    }
    return out;   // O(R*C) time, O(1) extra space
    // Other movement rules follow the same recipe: diagonal = one step (r--, c++) with wall bounces,
    // rotate = transpose then reverse each row, in-place marking = use row 0 / column 0 as flags.
}`,
      practice: [
        '54-spiral-matrix',
        '59-spiral-matrix-ii',
        '498-diagonal-traverse',
        '48-rotate-image',
        '73-set-matrix-zeroes',
        { id: '289', title: "Game of Life", difficulty: 'Medium', note: 'encode old and new state in the same cell', href: 'https://leetcode.com/problems/game-of-life/' },
      ],
    },
  },

  /* ------------------------------------------------------------------ new pattern meta */
  meta: {
    'line-sweep': {
      icon: '🧹', label: 'Sweep',
      desc: 'Sort the starts and ends of everything on one axis, then slide a line across: the picture only changes when the line meets an event.',
      useNote: 'Pairing every interval with every other costs O(n²). Events turn the question into one sorted pass with a running count, maximum or multiset.',
      complexityNote: 'Sorting 2n events dominates at O(n log n); the sweep itself is linear (a multiset adds a log factor per event). Memory is the event list.',
      highlight: ['Line Sweep', 'maximum overlap', 'busiest moment', 'start and an end', 'every pair'],
    },
    'reservoir-sampling': {
      icon: '🎲', label: 'Reservoir',
      desc: 'Choose uniformly from a stream of unknown length by keeping a tiny reservoir and swapping the n-th arrival in with probability k / n.',
      useNote: 'Think in probabilities, not positions: the n-th item enters with k / n and each resident survives with (n − 1) / n, which keeps the odds equal for everyone.',
      complexityNote: 'One pass over the data and one random draw per item. Only the reservoir (k items) and a counter are stored.',
      highlight: ['unknown in advance', 'stream or a linked list', 'uniformly at random', 'O(1) / O(k) memory', 'random pick'],
    },
    'matrix-traversal': {
      icon: '🧮', label: 'Matrix',
      desc: 'Walk, rotate or mark a grid by a precise movement rule: spiral rings, diagonals, layers, or flags stored inside the matrix itself.',
      useNote: 'Pick the invariant first (four walls, r + c = d, transpose then reverse) and the loops follow. Check 1×n, n×1 and 1×1 inputs.',
      complexityNote: 'Every cell is touched a constant number of times, so time is O(R×C). In-place variants need no extra grid; only the output list is extra.',
      highlight: ['spiral', 'diagonal', 'in place', 'layer by layer', 'r + c is constant'],
    },
  },

  /* ------------------------------------------------------------------ worked examples (first = flagship) */
  examples: {
    'greedy-intervals': [
      { slug: '56-merge-intervals', why: 'Sort by start and keep extending one running interval: the greedy choice is to absorb every interval that begins before the current end.' },
      { slug: '435-non-overlapping-intervals', why: 'The sort key flips to the end time: finishing earliest leaves the most room, so you count how many intervals must be thrown away to keep a conflict-free set.' },
      { slug: '57-insert-interval', why: 'The list is already sorted, so no sorting is needed: a three-phase linear scan (before, overlapping, after) shows the same merge rule without a sort.' },
    ],
    'greedy-jump': [
      { slug: '55-jump-game', why: 'Track only the furthest reachable index; failing means the scan outran it. A yes/no question answered with one integer.' },
      { slug: '45-jump-game-ii', why: 'Now you want the fewest jumps, so the reach is split into levels: each time you leave the current window you must have spent one more jump (greedy BFS without a queue).' },
      { slug: '134-gas-station', why: 'The greedy rule moves to a circular route: if the tank goes negative, no start inside the failed stretch can work, so the start restarts after it.' },
    ],
    'heap-topk': [
      { slug: '215-kth-largest-element-in-an-array', why: 'A min-heap capped at size k keeps the k largest values; its root is the answer, and anything smaller than the root is ignored.' },
      { slug: '347-top-k-frequent-elements', why: 'The ranking key is no longer the value but its count, so a frequency map is built first and the heap orders (count, value) pairs.' },
      { slug: '973-k-closest-points-to-origin', why: 'The direction reverses: to keep the k smallest distances you hold a max-heap and evict its root, with squared distance as the key.' },
    ],
    'heap-two-heaps': [
      { slug: '295-find-median-from-data-stream', why: 'A max-heap of the lower half and a min-heap of the upper half meet at the median; balancing the sizes after every insert keeps it at the roots.' },
      { slug: '502-ipo', why: 'The two heaps are not halves of one set: a list sorted by capital feeds a max-heap of affordable profits, and finishing a project unlocks more of the list.' },
      { slug: '480-sliding-window-median', why: 'Add removals: items leave the window, so entries are lazily deleted and the live sizes are counted separately while the heaps keep their balance.' },
    ],
    'heap-kway': [
      { slug: '23-merge-k-sorted-lists', why: 'The heap holds the head of every list; pop the smallest and push its successor from the same list.' },
      { slug: '378-kth-smallest-element-in-a-sorted-matrix', why: 'Each row of the matrix is a sorted list, so the same merge runs on a grid and stops after k pops instead of merging everything.' },
      { slug: '632-smallest-range-covering-elements-from-k-lists', why: 'The heap tracks the left edge of a window and a separate running maximum tracks the right edge; the merge is used to shrink a range, not to produce an order.' },
    ],
    'bfs-standard': [
      { slug: '102-binary-tree-level-order-traversal', why: 'The queue length at the start of each round is one level, so BFS naturally yields the nodes grouped by distance from the root.' },
      { slug: '127-word-ladder', why: 'There is no explicit graph: neighbours are generated on the fly (words one letter apart) and the number of levels is the shortest transformation.' },
      { slug: '1971-find-if-path-exists-in-graph', why: 'On a general graph a visited set is mandatory, because cycles would otherwise make the queue grow forever; the question is reachability, not distance.' },
    ],
    'bfs-multisource': [
      { slug: '994-rotting-oranges', why: 'Every rotten orange starts in the queue together, so each BFS level is one minute and the number of levels is the answer.' },
      { slug: '417-pacific-atlantic-water-flow', why: 'The sources are the border cells of each ocean and the search runs uphill in reverse; the answer is the intersection of two multi-source searches.' },
      { slug: '542-01-matrix', why: 'Every cell wants its own distance, so the BFS writes a distance into each cell on first touch; the grid itself is the answer.' },
    ],
    'grid-flood-fill': [
      { slug: '200-number-of-islands', why: 'Each flood visits one island and marks it; the number of times a flood starts is the answer.' },
      { slug: '695-max-area-of-island', why: 'The recursion returns a value: area = 1 + the areas of the four neighbours, so one flood measures the size of the region it covers.' },
      { slug: '130-surrounded-regions', why: 'Flood from the border instead of from the target regions: whatever the border can reach is safe, and everything left over is captured.' },
    ],
    'line-sweep': [
      { slug: '253-meeting-rooms-ii', why: 'Sort the meetings and watch how many are running at once; the heap of end times is a sweep line that counts overlap.' },
      { slug: '1094-car-pooling', why: 'Explicit +/- events on a number line with a running load: the cleanest form of the pattern, with drop-offs ordered before pick-ups on ties.' },
      { slug: '218-the-skyline-problem', why: 'The state is richer than a count: a multiset of active heights, and the output is produced only when its maximum changes.' },
    ],
    'reservoir-sampling': [
      { slug: '382-linked-list-random-node', why: 'The one-slot case on a linked list of unknown length: the i-th node replaces the pick with probability 1/i.' },
      { slug: '398-random-pick-index', why: 'Only elements that match a target enter the lottery, so the counter counts matches and non-matches must not disturb the odds.' },
      { slug: 'alg-reservoir-sampling-k-items', why: 'The general algorithm with k slots: fill first, then each newcomer draws a slot in [0, n) and replaces it if the draw lands inside the reservoir.' },
    ],
    'matrix-traversal': [
      { slug: '54-spiral-matrix', why: 'Four shrinking walls drive a ring-by-ring walk, with guards for the last row or column.' },
      { slug: '498-diagonal-traverse', why: 'A single position bounces between walls: the cells share r + c, and the direction flips at each edge with a fixed priority.' },
      { slug: '48-rotate-image', why: 'The task is an in-place transformation rather than a reading order: transpose, then reverse each row, with no extra matrix.' },
      { slug: '73-set-matrix-zeroes', why: 'The matrix stores its own bookkeeping: the first row and column become flags, so the O(1)-space version needs a careful order of operations.' },
    ],
  },
};
