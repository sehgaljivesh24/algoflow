import type { PracticeItem } from '../patterns.ts';
import type { PatternPack } from './types.ts';

const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id,
  title,
  difficulty,
  note,
  href: `https://leetcode.com/problems/${slug}/`,
});

/**
 * Pack p6 (dp-core): three worked examples for the five existing DP patterns, plus five new patterns —
 * 0/1 knapsack, unbounded knapsack, palindromic interval DP, memoization (recursion to DP) and state-machine DP.
 */
export const pack: PatternPack = {
  id: 'p6',

  problems: [
    { id: 'CP', title: '0/1 Knapsack', difficulty: 'Medium', tag: '0/1 knapsack table', category: 'Dynamic Programming' },
    { id: '1049', title: 'Last Stone Weight II', difficulty: 'Medium', tag: '0/1 knapsack (subset sum)', category: 'Dynamic Programming' },
    { id: 'CP', title: 'Unbounded Knapsack', difficulty: 'Medium', tag: 'unbounded knapsack', category: 'Dynamic Programming' },
    { id: '518', title: 'Coin Change II', difficulty: 'Medium', tag: 'unbounded knapsack (count combinations)', category: 'Dynamic Programming' },
    { id: '279', title: 'Perfect Squares', difficulty: 'Medium', tag: 'unbounded knapsack (squares as coins)', category: 'Dynamic Programming' },
    { id: '516', title: 'Longest Palindromic Subsequence', difficulty: 'Medium', tag: 'interval DP', category: 'Dynamic Programming' },
    { id: '132', title: 'Palindrome Partitioning II', difficulty: 'Hard', tag: 'palindrome table + cut DP', category: 'Dynamic Programming' },
    { id: '1312', title: 'Minimum Insertion Steps to Make a String Palindrome', difficulty: 'Hard', tag: 'interval DP', category: 'Dynamic Programming' },
    { id: 'ALG', title: 'Memoized Fibonacci', difficulty: 'Easy', tag: 'recursion → memoization', category: 'Dynamic Programming' },
    { id: 'CP', title: 'Grid Paths with Memoization', difficulty: 'Medium', tag: 'top-down memo, 2-D state', category: 'Dynamic Programming' },
    { id: '494', title: 'Target Sum', difficulty: 'Medium', tag: 'memoized recursion → subset-sum knapsack', category: 'Dynamic Programming' },
    { id: '309', title: 'Best Time to Buy and Sell Stock with Cooldown', difficulty: 'Medium', tag: 'state machine DP', category: 'Dynamic Programming' },
    { id: '714', title: 'Best Time to Buy and Sell Stock with Transaction Fee', difficulty: 'Medium', tag: 'state machine DP', category: 'Dynamic Programming' },
    { id: '188', title: 'Best Time to Buy and Sell Stock IV', difficulty: 'Hard', tag: 'state machine DP (k transactions)', category: 'Dynamic Programming' },
    { id: '673', title: 'Number of Longest Increasing Subsequence', difficulty: 'Medium', tag: 'LIS DP with counts', category: 'Dynamic Programming' },
    { id: '354', title: 'Russian Doll Envelopes', difficulty: 'Hard', tag: 'sort + LIS (tails)', category: 'Dynamic Programming' },
    { id: '918', title: 'Maximum Sum Circular Subarray', difficulty: 'Medium', tag: 'max + min Kadane', category: 'Dynamic Programming' },
  ],

  groups: [
    {
      name: 'Dynamic Programming',
      cards: [
        { slug: 'dp-knapsack-01', group: 'Dynamic Programming', title: '0/1 Knapsack (Subset Sum)', tags: ['Take or skip', 'Subset sum'], complexity: 'O(n × W)' },
        { slug: 'dp-knapsack-unbounded', group: 'Dynamic Programming', title: 'Unbounded Knapsack (Coin Change)', tags: ['Coins', 'Reusable items'], complexity: 'O(n × W)' },
        { slug: 'dp-palindromic', group: 'Dynamic Programming', title: 'Palindromic DP (Interval Table)', tags: ['Palindromes', 'Intervals'], complexity: 'O(n²)' },
        { slug: 'dp-memoization', group: 'Dynamic Programming', title: 'Recursion → Memoization → Table', tags: ['Top-down', 'Memo'], complexity: 'O(states × work per state)' },
        { slug: 'dp-state-machine', group: 'Dynamic Programming', title: 'State-Machine DP (Stocks)', tags: ['Stocks', 'States'], complexity: 'O(n × states)' },
      ],
    },
  ],

  content: {
    'dp-knapsack-01': {
      animation: 'cp-0-1-knapsack',
      summary: 'Every item can be used at most once, so each one is a decision: leave it out or put it in. A table indexed by "items considered" and "capacity (or target sum) used" remembers the best outcome of every smaller situation.',
      whenToUse: [
        'You pick a subset of items under a budget (weight, sum, count) and each item may be used only once',
        'The question is "can some subset reach exactly this sum", "how many subsets do", or "what is the best total value"',
        'Splitting into two groups with equal or nearly equal sums can be turned into a subset-sum target',
        'A recursion that branches "take it or skip it" repeats the same (item, remaining budget) pairs',
      ],
      tip: 'With one row, loop the capacity from high to low. Going upward would let an item feed on its own update and be used several times — that is the unbounded knapsack, a different problem.',
      template: `static int knapsack01(int[] wt, int[] val, int W) {
    int[] dp = new int[W + 1];                           // dp[c]: best value with capacity c (one rolling row)
                                                         // for "reachable?" use boolean[] with dp[0] = true,
                                                         // for "how many ways?" use int[] with dp[0] = 1

    // ── Phase 1: consider the items one at a time ──
    for (int i = 0; i < wt.length; i++) {

        // ── Phase 2: sweep capacity DOWNWARD so item i is used at most once ──
        for (int c = W; c >= wt[i]; c--) {
            dp[c] = Math.max(dp[c],                      // skip item i
                             dp[c - wt[i]] + val[i]);    // take item i: reads the row from BEFORE this item
        }
    }

    // ── Phase 3: the full bag is at index W ──
    return dp[W];                                        // O(n*W) time, O(W) space
}`,
      practice: [
        '416-partition-equal-subset-sum',
        '494-target-sum',
        '1049-last-stone-weight-ii',
        lc('474', 'Ones and Zeroes', 'Medium', 'ones-and-zeroes', 'two budgets: zeros and ones'),
        lc('879', 'Profitable Schemes', 'Hard', 'profitable-schemes', 'two constraints, count the ways'),
      ],
    },
    'dp-knapsack-unbounded': {
      animation: 'cp-unbounded-knapsack',
      summary: 'Items (coins, pieces, squares) can be reused any number of times. The table is the same shape as 0/1 knapsack, but the capacity loop runs upward so a cell can build on a cell that already used the same item.',
      whenToUse: [
        'You may use each kind of item as many times as you like to reach a total (coins, rod pieces, perfect squares)',
        'You want the fewest items, the best value, or the number of ways to reach an exact amount',
        'The order of items must not matter (combinations) — or must matter (sequences), which flips the loop nesting',
        'The "items" are implicit, such as all squares not larger than n',
      ],
      tip: 'Loop direction decides reuse: capacity upward = unlimited copies, downward = at most one. Loop nesting decides what you count: items outside counts combinations, amount outside counts ordered sequences.',
      template: `static int unboundedMaxValue(int[] wt, int[] val, int W) {
    int[] dp = new int[W + 1];                           // dp[c]: best value with capacity c

    // ── Phase 1: for each kind of item ──
    for (int i = 0; i < wt.length; i++) {

        // ── Phase 2: sweep capacity UPWARD: dp[c - wt[i]] may already contain item i ──
        for (int c = wt[i]; c <= W; c++) {
            dp[c] = Math.max(dp[c], dp[c - wt[i]] + val[i]);
        }
    }
    return dp[W];                                        // O(n*W) time, O(W) space
}

static int countCombinations(int[] coins, int amount) {   // Coin Change II: items OUTSIDE = combinations
    int[] ways = new int[amount + 1];
    ways[0] = 1;                                         // one way to make 0: take nothing
    for (int coin : coins)
        for (int a = coin; a <= amount; a++)
            ways[a] += ways[a - coin];
    return ways[amount];
}`,
      practice: [
        '322-coin-change',
        '518-coin-change-ii',
        '279-perfect-squares',
        lc('377', 'Combination Sum IV', 'Medium', 'combination-sum-iv', 'amount outside: counts ordered sequences'),
        lc('343', 'Integer Break', 'Medium', 'integer-break', 'unbounded pieces, maximise the product'),
        lc('1449', 'Form Largest Integer With Digits That Add up to Target', 'Hard', 'form-largest-integer-with-digits-that-add-up-to-target', 'unbounded with a lexicographic tie-break'),
      ],
    },
    'dp-palindromic': {
      animation: '516-longest-palindromic-subsequence',
      summary: 'A palindrome is decided from both ends inward, so the natural sub-problem is a substring s[i..j]. Fill a triangular table by increasing interval length, because every cell needs only shorter intervals.',
      whenToUse: [
        'The question is about palindromes inside a string: longest subsequence, minimum insertions or deletions, minimum cuts, how many',
        'Whether the outer two characters match decides whether the inside can simply be reused',
        'A cell must depend on dp[i+1][j-1], dp[i+1][j] and dp[i][j-1], which forces the fill order by length (or i descending)',
        'You need O(1) palindrome tests for many substrings, as a precomputed boolean table',
      ],
      tip: 'Fill order is the usual bug: by length, or with i from n-1 down to 0 and j upward, so that i+1 rows are done before row i. A symmetric trick: the longest palindromic subsequence equals the LCS of the string and its reverse.',
      template: `static int longestPalindromeSubseq(String s) {
    int n = s.length();
    int[][] dp = new int[n][n];                          // dp[i][j]: answer for the substring s[i..j]

    // ── Phase 1: base case — one letter is a palindrome of length 1 ──
    for (int i = 0; i < n; i++) dp[i][i] = 1;

    // ── Phase 2: fill by increasing interval length ──
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i + len - 1 < n; i++) {
            int j = i + len - 1;
            if (s.charAt(i) == s.charAt(j)) {
                dp[i][j] = (len == 2 ? 0 : dp[i + 1][j - 1]) + 2;     // ends match: wrap the inside
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);       // drop one end
            }
        }
    }

    // ── Phase 3: the whole string is the top-right corner ──
    return dp[0][n - 1];                                 // O(n^2) time, O(n^2) space
}`,
      practice: [
        '516-longest-palindromic-subsequence',
        '132-palindrome-partitioning-ii',
        '1312-minimum-insertion-steps-to-make-a-string-palindrome',
        { slug: '647-palindromic-substrings', note: 'count them: expand around centers or fill the table' },
        { slug: '5-longest-palindromic-substring', note: 'same table, track the best interval' },
        lc('730', 'Count Different Palindromic Subsequences', 'Hard', 'count-different-palindromic-subsequences', 'interval DP that counts instead of maximising'),
      ],
    },
    'dp-memoization': {
      animation: 'alg-memoized-fibonacci',
      summary: 'Start from the plain recursion, notice that it solves the same sub-problems again and again, and add a cache keyed by the sub-problem\'s state. Top-down memoization and the bottom-up table visit exactly the same states.',
      whenToUse: [
        'A recursive solution is correct but exponential because different paths reach the same arguments',
        'The result of a call depends only on its arguments (index, remaining amount, row and column), not on how you got there',
        'It is easier to write the recurrence recursively than to find the right loop order',
        'Only some of the states are reachable, so a lazy top-down cache does less work than a full table',
      ],
      tip: 'Decide the state first: the smallest set of parameters that determines the answer. Then add three lines: check the cache, compute, store. If the recursion depth is large, convert to the bottom-up loop.',
      template: `static Map<String, Long> memo = new HashMap<>();
static int N;                                            // number of items
static int[] cost;                                       // cost of each item

static long solve(int i, int rem) {                      // state = (i, rem): everything the future depends on
    // ── Phase 1: base cases end the recursion ──
    if (rem < 0) return 0;
    if (i == N) return rem == 0 ? 1 : 0;

    // ── Phase 2: cache hit — skip the whole sub-tree ──
    String key = i + "," + rem;
    Long cached = memo.get(key);
    if (cached != null) return cached;

    // ── Phase 3: compute from smaller states, then remember ──
    long result = solve(i + 1, rem)                      // option A: skip item i
                + solve(i + 1, rem - cost[i]);           // option B: use item i
    memo.put(key, result);
    return result;                                       // O(#distinct states) calls, each doing O(1) extra work
}`,
      practice: [
        '509-fibonacci-number',
        '70-climbing-stairs',
        '494-target-sum',
        '139-word-break',
        lc('140', 'Word Break II', 'Hard', 'word-break-ii', 'memoise on the start index, return lists of sentences'),
        lc('329', 'Longest Increasing Path in a Matrix', 'Hard', 'longest-increasing-path-in-a-matrix', 'DFS memoised on (row, col)'),
      ],
    },
    'dp-state-machine': {
      animation: '309-best-time-to-buy-and-sell-stock-with-cooldown',
      summary: 'When the legal moves depend on a small "mode" (holding a stock, just sold, resting, how many trades used), make each mode a state. A day\'s value for a state is the best of the states that can move into it.',
      whenToUse: [
        'Actions are restricted by what you did before: cooldown after selling, a transaction fee, at most k trades',
        'The problem can be drawn as a few boxes with arrows between them (hold, sold, rest)',
        'You must track profit separately for each mode instead of one running total',
        'The answer is the best value among the allowed ending states on the last step',
      ],
      tip: 'Draw the state graph first, including the arrows that are NOT allowed (the cooldown is the missing sold-to-hold arrow). Compute all new states from the previous day\'s values, using temporaries, so you never mix today and yesterday.',
      template: `static int maxProfitWithCooldown(int[] prices) {
    // states after the first day
    int hold = -prices[0];                               // own a stock
    int sold = 0;                                        // sold today (cooldown tomorrow); nothing sold yet
    int rest = 0;                                        // free, no stock

    // ── Phase 1: advance all states one day, reading only yesterday's values ──
    for (int i = 1; i < prices.length; i++) {
        int newHold = Math.max(hold, rest - prices[i]);  // keep holding, or buy after a rest day
        int newSold = hold + prices[i];                  // sell what we held yesterday
        int newRest = Math.max(rest, sold);              // idle, or leave the cooldown
        hold = newHold;
        sold = newSold;
        rest = newRest;
    }

    // ── Phase 2: ending with a stock in hand is never better than having sold it ──
    return Math.max(sold, rest);                         // O(n) time, O(1) space
}`,
      practice: [
        '309-best-time-to-buy-and-sell-stock-with-cooldown',
        '714-best-time-to-buy-and-sell-stock-with-transaction-fee',
        '188-best-time-to-buy-and-sell-stock-iv',
        '121-best-time-to-buy-and-sell-stock',
        lc('122', 'Best Time to Buy and Sell Stock II', 'Medium', 'best-time-to-buy-and-sell-stock-ii', 'unlimited trades: the two-state version'),
        lc('123', 'Best Time to Buy and Sell Stock III', 'Hard', 'best-time-to-buy-and-sell-stock-iii', 'exactly the k = 2 table'),
      ],
    },
  },

  meta: {
    'dp-knapsack-01': {
      icon: '🎒', label: '0/1 Knapsack',
      desc: 'Each item is taken once or not at all; the table remembers the best result for every smaller bag.',
      useNote: 'One rolling row works if the capacity loop runs from high to low. Many "split into groups" problems reduce to subset sum.',
      complexityNote: 'n items times W capacities, with constant work per cell. A single row cuts memory from n×W to W.',
      highlight: ['subset of items', 'only once', 'subset sum', 'equal or nearly equal', 'take it or skip it'],
    },
    'dp-knapsack-unbounded': {
      icon: '🪙', label: 'Unbounded',
      desc: 'Items can be reused, so the capacity loop goes upward and a cell can build on the same item again.',
      useNote: 'Upward loop = reuse. Items outside the loop counts combinations; amount outside counts ordered sequences.',
      complexityNote: 'Items times capacity, constant work per cell, one array of memory.',
      highlight: ['as many times as you like', 'fewest items', 'number of ways', 'combinations', 'implicit'],
    },
    'dp-palindromic': {
      icon: '🪞', label: 'Palindromic',
      desc: 'Decide palindromes from the two ends inward with a triangular table over substrings, filled short to long.',
      useNote: 'Every cell needs the cells below, to the left or diagonally inside it, so fill by length. LPS equals LCS(s, reverse s).',
      complexityNote: 'About n²/2 cells with constant work each; the table is the memory cost.',
      highlight: ['palindromes', 'outer two characters', 'fill order', 'O(1) palindrome tests'],
    },
    'dp-memoization': {
      icon: '🧠', label: 'Memoization',
      desc: 'Write the recursion, cache each distinct state, and the exponential call tree collapses to the number of states.',
      useNote: 'State = the parameters the answer really depends on. Cache check, compute, store. Bottom-up is the same table in loop order.',
      complexityNote: 'Calls ≈ number of distinct states times the work inside one call; recursion depth costs stack space.',
      highlight: ['exponential', 'same arguments', 'depends only on its arguments', 'recurrence recursively', 'reachable'],
    },
    'dp-state-machine': {
      icon: '🔀', label: 'State machine',
      desc: 'Turn the rules (hold, sold, rest, trades used) into states and let each day move values along the allowed arrows.',
      useNote: 'Draw the arrows first, including the forbidden ones. Compute every new state from yesterday\'s values via temporaries.',
      complexityNote: 'One pass over the days with a handful of states, so linear time and constant extra space.',
      highlight: ['cooldown', 'transaction fee', 'at most k trades', 'hold, sold, rest', 'each mode'],
    },
  },

  examples: {
    // ---------- existing patterns
    'dp-1d': [
      { slug: '70-climbing-stairs', why: 'The warm-up: dp[i] = dp[i−1] + dp[i−2] counts ways, and only the last two values are ever needed.' },
      { slug: '198-house-robber', why: 'A choice at every step: rob this house (and skip the neighbour) or skip it. The recurrence takes a max instead of a sum.' },
      { slug: '91-decode-ways', why: 'The transition is conditional: a digit or a pair of digits only counts when it is a valid letter code, so zeros and ranges become edge cases.' },
    ],
    'dp-2d-grid': [
      { slug: '62-unique-paths', why: 'The cleanest grid table: each cell is the sum of the cell above and the cell to the left.' },
      { slug: '63-unique-paths-ii', why: 'Obstacles zero out cells, which shows how the base row and column change when the grid is not open.' },
      { slug: '120-triangle', why: 'A non-rectangular table filled from the bottom up, taking the minimum of two children instead of adding neighbours.' },
    ],
    'dp-two-sequence': [
      { slug: '1143-longest-common-subsequence', why: 'Matching letters extend the diagonal, mismatches inherit from the better neighbour: the basic two-string table.' },
      { slug: '72-edit-distance', why: 'The same table minimises edits: a mismatch costs one plus the cheapest of insert, delete and replace.' },
      { slug: 'gfg-longest-common-substring', why: 'Contiguity changes the recurrence: a mismatch resets the cell to 0, and the answer is the maximum anywhere in the table.' },
    ],
    'dp-lis': [
      { slug: '300-longest-increasing-subsequence', why: 'The tails array with binary search finds the length in O(n log n); the tails themselves are not a subsequence.' },
      { slug: '673-number-of-longest-increasing-subsequence', why: 'The O(n²) DP keeps a length and a count per position, so ties between predecessors must be added, not just compared.' },
      { slug: '354-russian-doll-envelopes', why: 'LIS in two dimensions: sort by width ascending and height descending, then run the tails algorithm on heights.' },
    ],
    'dp-minmax': [
      { slug: '152-maximum-product-subarray', why: 'A negative factor swaps the best and worst products, so both a running max and a running min are carried.' },
      { slug: '53-maximum-subarray', why: 'The contrast case: with sums a single running best is enough, which shows exactly why products need the extra min.' },
      { slug: '918-maximum-sum-circular-subarray', why: 'Max and min tracked together solve a wrap-around problem: the best circular slice is the total minus the worst middle slice.' },
    ],
    // ---------- new patterns
    'dp-knapsack-01': [
      { slug: 'cp-0-1-knapsack', why: 'The canonical table: rows are items, columns are capacities, and every cell is a take-or-skip choice you can see, plus a walk back to the chosen items.' },
      { slug: '416-partition-equal-subset-sum', why: 'The same table with booleans: "can some subset reach exactly half the total?" turns a splitting question into subset sum.' },
      { slug: '1049-last-stone-weight-ii', why: 'A disguised subset sum compressed to one row, with the capacity loop running downward so each stone is used once.' },
      { slug: '494-target-sum', why: 'Signs become two groups: the memoized (index, remaining) states are exactly the cells of a counting knapsack with target (total + target) / 2.' },
    ],
    'dp-knapsack-unbounded': [
      { slug: 'cp-unbounded-knapsack', why: 'The loop direction is the point: sweeping capacity upward lets dp[c − w] already contain the item, so copies stack up, unlike 0/1 knapsack.' },
      { slug: '322-coin-change', why: 'Minimising the number of items: every amount tries each coin as its last piece, and ∞ marks amounts that cannot be made.' },
      { slug: '518-coin-change-ii', why: 'Counting combinations: with the coin loop outermost each multiset is counted once; swapping the loops would count ordered sequences.' },
      { slug: '279-perfect-squares', why: 'The coins are implicit (all squares up to n), and the winning last piece is recorded so the actual decomposition can be printed.' },
    ],
    'dp-palindromic': [
      { slug: '516-longest-palindromic-subsequence', why: 'The interval table in its purest form: matching ends wrap the inside, otherwise one end is dropped, filled by increasing length.' },
      { slug: '132-palindrome-partitioning-ii', why: 'A palindrome table feeds a second one-dimensional DP of cuts, so the two tables are filled together, column by column.' },
      { slug: '1312-minimum-insertion-steps-to-make-a-string-palindrome', why: 'Same skeleton, opposite objective: mismatches cost one insertion and matches are free, so we minimise instead of maximise.' },
      { slug: '647-palindromic-substrings', why: 'The alternative: expanding around each centre counts palindromic substrings with no table at all, trading O(n²) memory for O(1).' },
    ],
    'dp-memoization': [
      { slug: 'alg-memoized-fibonacci', why: 'The smallest example of the idea: the plain call tree is full of repeats (red), and with a cache the repeats become instant hits.' },
      { slug: 'cp-grid-paths-with-memoization', why: 'A two-parameter state (row, column): the memo fills the same grid a bottom-up solution would, only in the order the recursion demands.' },
      { slug: '494-target-sum', why: 'A harder, branching state (index, remaining target) where different sign choices reach the same remainder, shown next to the subset-sum view.' },
    ],
    'dp-state-machine': [
      { slug: '309-best-time-to-buy-and-sell-stock-with-cooldown', why: 'Three states (hold, sold, rest) where the cooldown is the missing sold-to-hold arrow.' },
      { slug: '714-best-time-to-buy-and-sell-stock-with-transaction-fee', why: 'Only two states, with the fee charged on the sell transition: shows how a cost lives on an arrow instead of a state.' },
      { slug: '188-best-time-to-buy-and-sell-stock-iv', why: 'The trade count joins the state: one buy and one sell row per transaction, chained so at most k trades can ever complete.' },
    ],
  },
};
