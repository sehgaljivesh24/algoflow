import type { PatternPack } from './types.ts';

/**
 * Pack p7 "dp-advanced": six new Dynamic Programming patterns (Catalan, game theory, bitmask, interval, tree, digit),
 * each with three animated worked examples and 17 new problem animations.
 */

const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;
const G = 'Dynamic Programming';

export const pack: PatternPack = {
  id: 'p7',

  problems: [
    { id: '96', title: 'Unique Binary Search Trees', difficulty: 'Medium', tag: 'Catalan convolution', category: G, group: 'Catalan numbers' },
    { id: 'CP', title: 'Count Valid Parentheses Sequences', difficulty: 'Medium', tag: 'Catalan · ballot table', category: G, group: 'Catalan numbers' },
    { id: 'CP', title: 'Triangulate a Convex Polygon', difficulty: 'Medium', tag: 'Catalan convolution', category: G, group: 'Catalan numbers' },
    { id: '486', title: 'Predict the Winner', difficulty: 'Medium', tag: 'interval minimax', category: G, group: 'Game theory' },
    { id: '464', title: 'Can I Win', difficulty: 'Medium', tag: 'game · bitmask memo', category: G, group: 'Game theory' },
    { id: '1406', title: 'Stone Game III', difficulty: 'Hard', tag: 'game · suffix minimax', category: G, group: 'Game theory' },
    { id: '847', title: 'Shortest Path Visiting All Nodes', difficulty: 'Hard', tag: 'bitmask BFS', category: G, group: 'Bitmask DP' },
    { id: '698', title: 'Partition to K Equal Sum Subsets', difficulty: 'Medium', tag: 'bitmask DP', category: G, group: 'Bitmask DP' },
    { id: 'CP', title: 'Travelling Salesman (Bitmask DP)', difficulty: 'Hard', tag: 'Held–Karp bitmask', category: G, group: 'Bitmask DP' },
    { id: '312', title: 'Burst Balloons', difficulty: 'Hard', tag: 'interval DP', category: G, group: 'Interval DP' },
    { id: 'GFG', title: 'Matrix Chain Multiplication', difficulty: 'Hard', tag: 'interval DP · min over splits', category: G, group: 'Interval DP' },
    { id: '664', title: 'Strange Printer', difficulty: 'Hard', tag: 'interval DP · equal ends', category: G, group: 'Interval DP' },
    { id: '337', title: 'House Robber III', difficulty: 'Medium', tag: 'tree DP · rob / skip', category: G, group: 'Tree DP' },
    { id: '968', title: 'Binary Tree Cameras', difficulty: 'Hard', tag: 'tree DP · 3 states', category: G, group: 'Tree DP' },
    { id: '902', title: 'Numbers At Most N Given Digit Set', difficulty: 'Hard', tag: 'digit DP · tight prefix', category: G, group: 'Digit DP' },
    { id: '2376', title: 'Count Special Integers', difficulty: 'Hard', tag: 'digit DP · used digits', category: G, group: 'Digit DP' },
    { id: 'CP', title: 'Count Numbers With Digit Sum', difficulty: 'Hard', tag: 'digit DP · free suffix table', category: G, group: 'Digit DP' },
  ],

  groups: [
    {
      name: G,
      cards: [
        { slug: 'dp-catalan', group: G, title: 'Catalan Numbers (Split & Multiply)', tags: ['Catalan', 'BSTs', 'Brackets'], complexity: 'O(n²) / O(n)' },
        { slug: 'dp-game-theory', group: G, title: 'Game Theory (Minimax DP)', tags: ['Minimax', 'Nim', 'Two players'], complexity: 'O(n²) or O(2ⁿ·n)' },
        { slug: 'dp-bitmask', group: G, title: 'Bitmask DP (Subset States)', tags: ['Bitmask', 'TSP', 'Subsets'], complexity: 'O(2ⁿ·n)' },
        { slug: 'dp-interval', group: G, title: 'Interval DP', tags: ['Intervals', 'Burst Balloons', 'Matrix chain'], complexity: 'O(n³) / O(n²)' },
        { slug: 'dp-tree', group: G, title: 'Tree DP (Post-order States)', tags: ['Tree', 'Rob / skip', 'Post-order'], complexity: 'O(n) / O(h)' },
        { slug: 'dp-digit', group: G, title: 'Digit DP (Tight Flag)', tags: ['Digits', 'Tight', 'Counting ≤ N'], complexity: 'O(L·10·state)' },
      ],
    },
  ],

  content: {
    'dp-catalan': {
      animation: '96-unique-binary-search-trees',
      summary: 'Count structures that split into an independent left part and right part by multiplying the two counts, then adding over every possible split point. That recurrence produces the Catalan numbers 1, 1, 2, 5, 14, 42, …',
      whenToUse: [
        'You must count binary trees, bracket strings, or non-crossing partitions of a given size',
        'Choosing one "root", "first return" or "apex" cuts the object into two independent smaller objects of the same kind',
        'The answer for size n looks like Σ f(i) · f(n−1−i)',
        'The counts begin 1, 1, 2, 5, 14, 42 — a strong hint that you are looking at Catalan numbers',
      ],
      tip: 'Say what the two halves are before coding. For BSTs they are the keys below and above the root, for brackets the inside and the rest, for polygons the two pieces next to the chosen triangle. Then dp[0] = 1 is the empty piece, not 0.',
      template: `static long catalan(int n) {
    long[] ways = new long[n + 1];       // ways[k] = number of structures of size k
    ways[0] = 1;                         // the empty structure counts as one

    // ── Phase 1: grow the size one step at a time ──
    for (int size = 1; size <= n; size++) {
        // ── Phase 2: choose the "root" and multiply the independent halves ──
        for (int left = 0; left < size; left++) {
            int right = size - 1 - left;             // everything not used by the root and the left part
            ways[size] += ways[left] * ways[right];  // halves are independent: multiply, then add over splits
        }
    }
    return ways[n];                      // O(n^2) time, O(n) space (closed form: C(2n, n) / (n + 1))
}`,
      practice: [
        '96-unique-binary-search-trees',
        '22-generate-parentheses',
        { slug: 'cp-triangulate-a-convex-polygon', note: 'polygon pieces instead of subtrees' },
        { id: '95', title: 'Unique Binary Search Trees II', difficulty: 'Medium', note: 'list the trees, same split by root', href: LC('unique-binary-search-trees-ii') },
        { id: '241', title: 'Different Ways to Add Parentheses', difficulty: 'Medium', note: 'split at each operator', href: LC('different-ways-to-add-parentheses') },
        { id: '1039', title: 'Minimum Score Triangulation of Polygon', difficulty: 'Medium', note: 'same split, min instead of count', href: LC('minimum-score-triangulation-of-polygon') },
      ],
    },
    'dp-game-theory': {
      animation: '486-predict-the-winner',
      summary: 'In a two-player game with perfect play, store for each position how well the player on move can do. A move scores its gain minus the best the opponent can then do, so one table covers both players.',
      whenToUse: [
        'Two players alternate, both play optimally, and you must say who wins or by how much',
        'The position is described by a small state: an interval of a row, a suffix, or a set of used numbers',
        'The game always ends and has no hidden information',
        'Brute force explores a game tree whose positions repeat (the same interval or set reached by different move orders)',
      ],
      tip: 'Store "mover minus opponent" instead of two separate scores: after your move the opponent is simply the mover of the smaller game, so subtract their value. For pure win/lose games use a boolean: a state wins if SOME move leads to a losing state.',
      template: `// Score-difference version: dp[i][j] = best lead of the player on move over piles i..j
static boolean firstPlayerWins(int[] piles) {
    int n = piles.length;
    int[][] dp = new int[n][n];
    for (int i = 0; i < n; i++) dp[i][i] = piles[i];       // one pile: the mover takes it

    // ── Phase 1: grow the interval one pile at a time ──
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            int takeLeft = piles[i] - dp[i + 1][j];         // the opponent is now the mover on i+1..j
            int takeRight = piles[j] - dp[i][j - 1];
            dp[i][j] = Math.max(takeLeft, takeRight);       // the mover picks the better outcome
        }
    }
    // ── Phase 2: a non-negative lead for the first player means they do not lose ──
    return dp[0][n - 1] >= 0;                              // win/lose games: memo[mask] = exists move to a losing state
}`,
      practice: [
        '486-predict-the-winner',
        '464-can-i-win',
        '1406-stone-game-iii',
        { id: '877', title: 'Stone Game', difficulty: 'Medium', note: 'same interval table; the first player always wins', href: LC('stone-game') },
        { id: '1140', title: 'Stone Game II', difficulty: 'Medium', note: 'state (start, M)', href: LC('stone-game-ii') },
        { id: '292', title: 'Nim Game', difficulty: 'Easy', note: 'win/lose positions mod 4', href: LC('nim-game') },
      ],
    },
    'dp-bitmask': {
      animation: '847-shortest-path-visiting-all-nodes',
      summary: 'When the state is "which of n ≤ ~20 items have I used", store it as the bits of an integer. The table dp[mask][…] then has 2ⁿ rows instead of n! orderings.',
      whenToUse: [
        'You assign, visit or choose every item of a small set (n up to about 16–20) exactly once',
        'Only WHICH items are used matters for the future, not the order they were used in',
        'Brute force over permutations is n!, but there are only 2ⁿ distinct subsets',
        'Typical tasks: tour or path visiting every node, partitioning items into groups, assigning people to jobs',
      ],
      tip: 'Iterating masks in increasing numeric order guarantees every sub-mask is solved before the masks that extend it. Test a bit with (mask >> i) & 1, set it with mask | (1 << i), clear it with mask ^ (1 << i).',
      template: `// Held–Karp style: dp[mask][last] = cheapest way to visit exactly the cities in mask and end at last
static int shortestTour(int[][] dist) {
    int n = dist.length, full = (1 << n) - 1, INF = 1_000_000_000;
    int[][] dp = new int[1 << n][n];
    for (int[] row : dp) Arrays.fill(row, INF);
    dp[1][0] = 0;                                          // start at city 0 with only city 0 visited

    // ── Phase 1: masks in increasing order, so smaller subsets are always ready ──
    for (int mask = 1; mask <= full; mask++) {
        for (int last = 0; last < n; last++) {
            if ((mask & (1 << last)) == 0 || dp[mask][last] == INF) continue;
            // ── Phase 2: extend the route by one unvisited city ──
            for (int next = 0; next < n; next++) {
                if ((mask & (1 << next)) != 0) continue;
                int nm = mask | (1 << next);
                dp[nm][next] = Math.min(dp[nm][next], dp[mask][last] + dist[last][next]);
            }
        }
    }
    int best = INF;                                        // close the loop back to the start
    for (int last = 1; last < n; last++) best = Math.min(best, dp[full][last] + dist[last][0]);
    return best;                                           // O(2^n * n^2) time, O(2^n * n) space
}`,
      practice: [
        '847-shortest-path-visiting-all-nodes',
        '698-partition-to-k-equal-sum-subsets',
        'cp-travelling-salesman-bitmask-dp',
        { id: '526', title: 'Beautiful Arrangement', difficulty: 'Medium', note: 'mask of used numbers, fill positions in order', href: LC('beautiful-arrangement') },
        { id: '1125', title: 'Smallest Sufficient Team', difficulty: 'Hard', note: 'mask of covered skills', href: LC('smallest-sufficient-team') },
        { id: '943', title: 'Find the Shortest Superstring', difficulty: 'Hard', note: 'TSP over word overlaps', href: LC('find-the-shortest-superstring') },
      ],
    },
    'dp-interval': {
      animation: '312-burst-balloons',
      summary: 'Let dp[l][r] describe the best way to handle everything between positions l and r. Fill the table by increasing interval length, trying every split point or "last action" inside the interval.',
      whenToUse: [
        'The problem is about a contiguous segment that shrinks, merges or splits as you act',
        'The last (or first) operation on a segment divides it into two independent smaller segments',
        'A state needs two endpoints, and a cell depends on shorter intervals inside it',
        'Typical: bursting, merging, cutting, bracketing, printing or removing within a row',
      ],
      tip: 'Loop by length first, then by left end — never by left end alone — so every shorter interval is already computed. If choosing the FIRST action breaks independence (as in Burst Balloons), choose the LAST one instead.',
      template: `static int intervalDp(int[] a) {
    int n = a.length;
    int[][] dp = new int[n][n];            // dp[l][r] = best value for the segment l..r (0 for empty / single)

    // ── Phase 1: shorter intervals first ──
    for (int len = 2; len <= n; len++) {
        for (int l = 0; l + len - 1 < n; l++) {
            int r = l + len - 1;
            dp[l][r] = Integer.MAX_VALUE;  // or Integer.MIN_VALUE when maximising

            // ── Phase 2: try every split point (or last action) k inside the interval ──
            for (int k = l; k < r; k++) {
                int cost = dp[l][k] + dp[k + 1][r] + joinCost(a, l, k, r);   // two independent parts + the join
                dp[l][r] = Math.min(dp[l][r], cost);
            }
        }
    }
    return dp[0][n - 1];                   // O(n^3) time, O(n^2) space
}`,
      practice: [
        '312-burst-balloons',
        'gfg-matrix-chain-multiplication',
        '664-strange-printer',
        { id: '1000', title: 'Minimum Cost to Merge Stones', difficulty: 'Hard', note: 'adds a group-size constraint', href: LC('minimum-cost-to-merge-stones') },
        { id: '1547', title: 'Minimum Cost to Cut a Stick', difficulty: 'Hard', note: 'same shape as matrix chain', href: LC('minimum-cost-to-cut-a-stick') },
        { id: '516', title: 'Longest Palindromic Subsequence', difficulty: 'Medium', note: 'endpoints match or one is dropped', href: LC('longest-palindromic-subsequence') },
      ],
    },
    'dp-tree': {
      animation: '337-house-robber-iii',
      summary: 'Solve a tree by returning a small summary from every node, computed from its children in post-order. Usually the summary is a pair or triple of values, one per state the node can be in.',
      whenToUse: [
        'Decisions on a node interact with its parent or children (cannot pick both, must be covered, …)',
        'The best answer for a subtree depends on a few states of its root, such as chosen / not chosen',
        'You need a global optimum (path, diameter, set) while each call only returns something simple to its parent',
        'A plain recursion would revisit the same subtrees under different assumptions',
      ],
      tip: 'Decide the node states first (rob / skip, camera / covered / gap), write what each state requires from the children, and return all states together. When the answer can bend through a node (paths), update a global best and return only the one-sided chain.',
      template: `// returns {best if this node is taken, best if it is not taken}
static int[] dfs(TreeNode node) {
    if (node == null) return new int[]{0, 0};              // an empty subtree contributes nothing

    // ── Phase 1: solve both children first (post-order) ──
    int[] left = dfs(node.left);
    int[] right = dfs(node.right);

    // ── Phase 2: combine the child summaries for each state of this node ──
    int taken = node.val + left[1] + right[1];             // taking this node forces its children out
    int skipped = Math.max(left[0], left[1]) + Math.max(right[0], right[1]);   // free choice below
    return new int[]{taken, skipped};
}
static int solve(TreeNode root) {
    int[] r = dfs(root);
    return Math.max(r[0], r[1]);                           // O(n) time, O(h) stack
}`,
      practice: [
        '337-house-robber-iii',
        '968-binary-tree-cameras',
        '124-binary-tree-maximum-path-sum',
        '543-diameter-of-binary-tree',
        { id: '979', title: 'Distribute Coins in Binary Tree', difficulty: 'Medium', note: 'return the surplus a subtree sends up', href: LC('distribute-coins-in-binary-tree') },
        { id: '834', title: 'Sum of Distances in Tree', difficulty: 'Hard', note: 'rerooting after a first post-order pass', href: LC('sum-of-distances-in-tree') },
      ],
    },
    'dp-digit': {
      animation: '902-numbers-at-most-n-given-digit-set',
      summary: 'To count numbers up to N with a digit property, build them digit by digit from the most significant one while remembering whether the prefix is still tight (equal to N). Once the prefix drops below N the remaining digits are free.',
      whenToUse: [
        'You count integers in a range [0, N] (or [A, B] via two prefixes) that satisfy a property of their digits',
        'The property can be tracked with a small state: digit sum, used-digit mask, last digit, remainder',
        'N is too large to loop over, but it only has 10 to 19 digits',
        'Leading zeros need care: they may or may not count as digits of the number',
      ],
      tip: 'The state is (position, tight?, started?, property). For a range [A, B] count f(B) − f(A − 1). Memoise only the non-tight states: they are reusable, while the tight path is a single walk along N.',
      template: `static long countUpTo(String n, int[] allowed) {
    int len = n.length(), d = allowed.length;
    long count = 0;

    // ── Phase 1: every number with fewer digits is automatically below n ──
    for (int shorter = 1; shorter < len; shorter++) count += pow(d, shorter);

    // ── Phase 2: walk n from the left while the prefix is still tight ──
    for (int i = 0; i < len; i++) {
        int digit = n.charAt(i) - '0';
        int smaller = 0; boolean canFollow = false;
        for (int x : allowed) {
            if (x < digit) smaller++;                      // drop below n here: the rest is free
            if (x == digit) canFollow = true;              // stay tight by copying n's digit
        }
        count += smaller * pow(d, len - i - 1);
        if (!canFollow) return count;                      // the tight path ends here
    }
    return count + 1;                                      // n itself is buildable; O(len * d) time
}`,
      practice: [
        '902-numbers-at-most-n-given-digit-set',
        '2376-count-special-integers',
        'cp-count-numbers-with-digit-sum',
        { id: '357', title: 'Count Numbers with Unique Digits', difficulty: 'Medium', note: 'count by length: 9 · 9 · 8 · …', href: LC('count-numbers-with-unique-digits') },
        { id: '233', title: 'Number of Digit One', difficulty: 'Hard', note: 'count ones per position', href: LC('number-of-digit-one') },
        { id: '2719', title: 'Count of Integers', difficulty: 'Hard', note: 'digit-sum range via f(num2) − f(num1 − 1)', href: LC('count-of-integers') },
      ],
    },
  },

  meta: {
    'dp-catalan': {
      icon: '🌳', label: 'Catalan',
      desc: 'Count BSTs, bracket strings and polygon triangulations: pick the split, multiply the independent halves, add over every split.',
      useNote: 'The sequence 1, 1, 2, 5, 14, 42, … means Catalan. The base case dp[0] = 1 lets empty halves multiply cleanly.',
      complexityNote: 'Each of the n sizes sums over up to n splits, so n² time and n memory (or compute C(2n, n)/(n+1) directly).',
      highlight: ['Catalan', 'binary trees', 'bracket', 'independent', 'split'],
    },
    'dp-game-theory': {
      icon: '🎲', label: 'Game theory',
      desc: 'Two players, perfect play: store how well the player on move can do from each position, and let the opponent’s best reply cancel out.',
      useNote: 'Score games use "mover minus opponent"; win/lose games use a boolean: a position wins if some move reaches a losing one.',
      complexityNote: 'Interval games fill n² cells in O(1) each; subset games touch each of 2ⁿ masks once, trying n moves.',
      highlight: ['Two players', 'optimally', 'win', 'mover', 'memo'],
    },
    'dp-bitmask': {
      icon: '🧮', label: 'Bitmask',
      desc: 'Pack "which items are used" into the bits of an integer so a state is just a number and the table has 2ⁿ rows.',
      useNote: 'Only the set of used items matters, never their order. Fill masks in increasing order, extending each by one unused bit.',
      complexityNote: '2ⁿ masks times n (or n²) transitions each: fine for n up to about 16–20, hopeless beyond.',
      highlight: ['Bitmask', 'subset', 'exactly once', 'which items', '2ⁿ'],
    },
    'dp-interval': {
      icon: '📐', label: 'Interval',
      desc: 'Define dp[l][r] for a segment and fill by growing length; the last action inside the segment splits it into two independent parts.',
      useNote: 'Loop length outermost. If the first action ties the two sides together, switch to thinking about the last action.',
      complexityNote: 'n² intervals, each trying up to n split points: cubic time, quadratic table.',
      highlight: ['Interval', 'contiguous', 'split', 'last action', 'shorter'],
    },
    'dp-tree': {
      icon: '🌲', label: 'Tree DP',
      desc: 'Return a small summary (a pair or triple of state values) from every node, built from its children in post-order.',
      useNote: 'Name the node states first. Combine children per state, and keep a global best separately when answers can bend through a node.',
      complexityNote: 'Every node is combined exactly once, so time is linear; the stack depth is the tree height.',
      highlight: ['Tree', 'post-order', 'states', 'children', 'global'],
    },
    'dp-digit': {
      icon: '🔢', label: 'Digit DP',
      desc: 'Count numbers up to N by building digits left to right with a tight flag; once below N, the rest is a free suffix.',
      useNote: 'Count f(B) − f(A−1) for ranges. Shorter numbers are free; along N the tight prefix is a single walk, and non-tight states can be memoised.',
      complexityNote: 'Positions × states × 10 digits per transition; with at most ~19 digits this is tiny even for N near 10¹⁸.',
      highlight: ['Digit', 'tight', 'leading zeros', 'prefix', 'free'],
    },
  },

  examples: {
    'dp-catalan': [
      { slug: '96-unique-binary-search-trees', why: 'The textbook split: the root divides the keys into a left and a right part, and the counts multiply. Watch dp[k] fill from the sum over every root.' },
      { slug: 'cp-count-valid-parentheses-sequences', why: 'The same Catalan numbers from a different angle: a 2-D lattice-path table where each cell adds its upper and left neighbours and the table stays below the diagonal.' },
      { slug: 'cp-triangulate-a-convex-polygon', why: 'A geometric split: the triangle on a fixed edge cuts the polygon into two smaller polygons, and the picture shows which pieces get multiplied.' },
    ],
    'dp-game-theory': [
      { slug: '486-predict-the-winner', why: 'Interval minimax with a score difference: dp[i][j] is the mover’s lead, so the opponent’s reply is just subtracted. Ends with a replay of the optimal moves.' },
      { slug: '464-can-i-win', why: 'A win/lose game on a bitmask of taken numbers with memoised recursion; you see whose turn it is, the line of play and the cache reuse.' },
      { slug: '1406-stone-game-iii', why: 'A suffix game where each turn takes 1–3 items and values can be negative: one number per index summarises every history.' },
    ],
    'dp-bitmask': [
      { slug: '847-shortest-path-visiting-all-nodes', why: 'BFS whose state is (visited mask, current node): the mask table makes revisiting nodes finite and the first full mask is optimal.' },
      { slug: '698-partition-to-k-equal-sum-subsets', why: 'Subset DP where the table stores the fill of the current bucket for each mask of used numbers; shows reachable and unreachable subsets.' },
      { slug: 'cp-travelling-salesman-bitmask-dp', why: 'Held–Karp: dp[mask][last] with a cost minimum over predecessors, plus rebuilding the actual tour from stored choices.' },
    ],
    'dp-interval': [
      { slug: '312-burst-balloons', why: 'Choosing the last balloon in each gap makes the two sides independent; the table fills diagonal by diagonal by interval length.' },
      { slug: 'gfg-matrix-chain-multiplication', why: 'A min over split points with a join cost from the outer dimensions, ending with the optimal bracketing reconstructed.' },
      { slug: '664-strange-printer', why: 'Interval DP driven by equal characters: the first letter either prints alone or shares a stroke with a later copy of itself.' },
    ],
    'dp-tree': [
      { slug: '337-house-robber-iii', why: 'Two states per node (rob / skip) returned as a pair from a post-order walk; the labels on the tree show both values.' },
      { slug: '968-binary-tree-cameras', why: 'Three states per node (gap / camera / covered) with a greedy-looking rule that is really tree DP, including the root fix-up.' },
      { slug: '124-binary-tree-maximum-path-sum', why: 'The answer bends through a node while the call returns only a one-sided chain, so a global best is updated separately.' },
    ],
    'dp-digit': [
      { slug: '902-numbers-at-most-n-given-digit-set', why: 'The cleanest tight-flag walk: shorter lengths are free, then along N count smaller digits times free slots and stop when N’s digit is missing.' },
      { slug: '2376-count-special-integers', why: 'Adds a used-digit set and the leading-zero rule: choices shrink as digits are consumed, so free slots are permutations.' },
      { slug: 'cp-count-numbers-with-digit-sum', why: 'A real DP table: free[r][sum] filled by a ten-way convolution, then looked up while walking N, including the early stop when the prefix overshoots.' },
    ],
  },
};
