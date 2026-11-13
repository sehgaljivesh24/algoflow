import type { PracticeItem } from '../patterns.ts';
import type { DetailMap } from './types.ts';

// Batch d5 (dynamic programming) — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const d5: DetailMap = {
  'dp-1d': {
    tags: ['Fibonacci', 'House Robber', 'Coin Change', 'Decode Ways'],
    examples: [
      { slug: '70-climbing-stairs', why: 'The warm-up: dp[i] = dp[i−1] + dp[i−2] counts ways, and the state boxes show that only the last two values are ever read.' },
      { slug: '198-house-robber', why: 'A choice at every house: rob it (and skip its neighbour) or skip it. The recurrence takes a max of two plans instead of a sum.' },
      { slug: '91-decode-ways', why: 'The transition is conditional: a digit or a pair of digits only counts when it is a valid letter code, so zeros and ranges become edge cases.' },
      { slug: '322-coin-change', why: 'The same 1-D table, now minimising: every amount tries each coin as its last piece, and ∞ marks amounts that cannot be made. Greedy fails on coins 1, 3, 4.' },
    ],
    content: {
      summary: 'Let entry i answer the whole problem for the first i items (stairs, houses, digits, dollars) and fill the table left to right. Each entry is built from one, two or a few earlier entries, so a recursion that repeats itself becomes a single pass.',
      whenToUse: [
        'The answer for size **i** can be built from the answers for smaller sizes, usually the previous one or two: stairs reachable from i−1 and i−2, houses robbed or skipped, characters decoded one or two at a time. Write that sentence first; it is your recurrence.',
        'A plain recursion is correct but **recomputes the same subproblems** again and again, so its call tree grows like Fibonacci. If fib(n) style repeats appear when you draw three levels of the tree, one array indexed by the argument removes all of them.',
        'You are **counting ways** to reach a target (climb n stairs, decode a string, form an amount) and different last moves never overlap, so the counts simply add: dp[i] = dp[i−1] + dp[i−2], or a sum over the allowed last pieces.',
        'You **minimise or maximise** over a few choices at each position: rob or skip a house, use this coin or that one. The cell is a min or max over candidate cells already computed, and ∞ or −∞ safely marks states that cannot be reached.',
        'The state is **one number** (an index, a remaining amount, a length) and only a fixed window of earlier cells is ever read. That is the signal that a rolling pair of variables can replace the array and cut memory from O(n) to O(1).',
      ],
      tip: 'Write the recurrence in words first ("the last move came from i−1 or i−2"), then fix the base cases, then the loop order. If a cell only reads the previous two, keep two variables.',
      template: `static int ways(int n) {                         // pattern: count ways with dp[i] = dp[i-1] + dp[i-2]
    if (n <= 2) return n;                        // base cases first: dp[1] = 1, dp[2] = 2

    // ── Phase 1: dp[i] = answer for the first i items ──
    int[] dp = new int[n + 1];
    dp[1] = 1;
    dp[2] = 2;

    // ── Phase 2: fill left to right, every cell reads cells already computed ──
    for (int i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];           // the last move was a 1-step or a 2-step (disjoint, so add)
    }
    return dp[n];                                // O(n) time; two rolling variables give O(1) space
}

static int minCoins(int[] coins, int amount) {   // same table, minimising: every coin is a possible last piece
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);                 // "infinity": larger than any real answer
    dp[0] = 0;                                   // zero coins make amount 0
    for (int a = 1; a <= amount; a++)
        for (int c : coins)
            if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}`,
      practice: [
        '70-climbing-stairs',
        '746-min-cost-climbing-stairs',
        '198-house-robber',
        '213-house-robber-ii',
        '91-decode-ways',
        '322-coin-change',
        '139-word-break',
        lc('740', 'Delete and Earn', 'Medium', 'delete-and-earn', 'bucket values, then house robber on the sums'),
      ],
    },
    meta: {
      useNote: 'State the recurrence in words, then the base cases, then the loop order. If a cell reads only the previous one or two, two variables replace the array.',
      complexityNote: 'The table has n entries and each is computed from a constant number of earlier ones, so time is O(n). Keeping only the last two values, as Fibonacci and House Robber allow, reduces memory from O(n) to O(1).',
      highlight: ['smaller sizes', 'recomputes the same subproblems', 'counting ways', 'minimise or maximise', 'one number', 'rolling pair of variables'],
    },
  },

  'dp-2d-grid': {
    tags: ['Grid paths', 'Obstacles', 'Min path sum', 'Triangle'],
    content: {
      whenToUse: [
        'You walk through a **grid moving right and down** (or down a triangle) and must count the paths or find the cheapest one. Every route to a cell arrives from the cell above or the cell to the left, so those two answers are all the cell needs.',
        'The value of a cell is a **function of neighbours already computed**: sum for counting, min or max for cost, min of three for the largest square. Row-by-row fill order guarantees every input is ready, so no recursion or visited set is needed.',
        '**Obstacles, costs or walls** change only the transition, not the table shape: a blocked cell is simply 0 ways or ∞ cost. Unique Paths II and Minimum Path Sum are the same loop with one extra line.',
        'Plain recursion on (row, column) is **exponential because paths cross**: many routes reach the same cell and each re-solves it. A table indexed by (row, column) has only R × C states, which is the whole speed-up.',
        'The table is **rectangular or triangular and the answer sits in a corner** (bottom-right, or the apex when filling from the bottom). If row r only reads row r−1, keep one row of length C and overwrite it left to right.',
      ],
      tip: 'Fill the first row and column explicitly as base cases, then every inner cell from its top and left. A row only reads the one above, so one array of length C is enough.',
      practice: [
        '62-unique-paths',
        '63-unique-paths-ii',
        '120-triangle',
        lc('64', 'Minimum Path Sum', 'Medium', 'minimum-path-sum', 'min of top and left plus the cell'),
        lc('931', 'Minimum Falling Path Sum', 'Medium', 'minimum-falling-path-sum', 'three parents instead of two'),
        lc('221', 'Maximal Square', 'Medium', 'maximal-square', 'min of three neighbours plus one'),
        lc('174', 'Dungeon Game', 'Hard', 'dungeon-game', 'fill backwards from the goal'),
        lc('741', 'Cherry Pickup', 'Hard', 'cherry-pickup', 'two walkers at once, a 3-D state'),
      ],
    },
    meta: {
      useNote: 'Fill the first row and column as base cases, then each cell from its top and left. A row only needs the previous one, so one row of memory is enough.',
      complexityNote: 'There are R × C cells and each is filled from a constant number of neighbours, giving O(R × C) time. A row only reads the previous row, so one rolling array cuts space from O(R × C) to O(C).',
      highlight: ['grid moving right and down', 'neighbours already computed', 'Obstacles, costs or walls', 'exponential because paths cross', 'answer sits in a corner'],
    },
  },

  'dp-two-sequence': {
    tags: ['LCS', 'Edit distance', 'Prefix table', 'Strings'],
    content: {
      whenToUse: [
        'Two strings or arrays are **compared or transformed into each other**: longest common subsequence, edit distance, uncrossed lines, delete operations to make them equal. Cell (i, j) means "the first i items of one against the first j of the other".',
        'The question asks for the **longest shared piece or the fewest edits**. A match at the ends extends the diagonal cell, a mismatch inherits from a neighbour: the maximum of up and left for LCS, one plus the minimum of three for edit distance.',
        'A decision at the end of both prefixes **depends only on smaller prefix pairs**: take it, drop it from one side, or drop it from the other. If a brute-force recursion branches exactly like that, a table over (i, j) collapses it to n × m states.',
        'You count or test **ways to interleave or match**: is s3 an interleaving of s1 and s2, how many distinct subsequences of s equal t, does a pattern with wildcards match. The recurrence changes, but the (i, j) prefix table stays the same.',
        'Contiguity changes the rule: for **longest common substring** a mismatch resets the cell to 0 and the answer is the maximum anywhere in the table, not the corner. Read the problem for "subsequence" versus "substring" before choosing.',
      ],
      tip: 'Allocate (n + 1) × (m + 1) so row 0 and column 0 are the empty prefix and need no special cases. Walk back from the corner to rebuild the subsequence or edit script.',
      practice: [
        '1143-longest-common-subsequence',
        '72-edit-distance',
        'gfg-longest-common-substring',
        lc('1035', 'Uncrossed Lines', 'Medium', 'uncrossed-lines', 'LCS in disguise'),
        lc('583', 'Delete Operation for Two Strings', 'Medium', 'delete-operation-for-two-strings', 'n + m − 2 × LCS'),
        lc('97', 'Interleaving String', 'Medium', 'interleaving-string', 'dp over how much of each string is used'),
        lc('115', 'Distinct Subsequences', 'Hard', 'distinct-subsequences', 'count matches instead of taking a max'),
        lc('10', 'Regular Expression Matching', 'Hard', 'regular-expression-matching', 'the star adds a second transition'),
      ],
    },
    meta: {
      useNote: 'Use (n+1) × (m+1) so the empty prefix is row 0 and column 0. Matches extend the diagonal; edit distance adds 1 to the cheapest of three neighbours.',
      complexityNote: 'The table has n × m cells, each computed from at most three neighbours, so time is O(n × m). A cell reads only the previous row, so two rows give O(m) space when only the number is needed.',
      highlight: ['compared or transformed', 'longest shared piece or the fewest edits', 'smaller prefix pairs', 'ways to interleave or match', 'longest common substring'],
    },
  },

  'dp-lis': {
    tags: ['LIS', 'Patience sort', 'Binary search', 'Nesting'],
    content: {
      whenToUse: [
        'You need the **longest chain that keeps a strict order** while skipping elements: rising temperatures, growing prices, increasing indexes. The subsequence need not be contiguous, so sliding window does not apply and every earlier smaller value is a candidate predecessor.',
        'Items nest or stack when **every dimension is strictly smaller**: Russian dolls, box stacking, pair chains. Sort by one dimension (breaking ties the opposite way) and the rest collapses to a longest increasing subsequence on the other dimension.',
        'The answer is a **length or a count of optimal chains**, not necessarily the chain itself. Length alone fits the O(n log n) tails array; counting best chains needs the O(n²) table with a length and a count per position.',
        'Constraints reach **n = 10⁵**, so the O(n²) check of all earlier elements is too slow. Keep tails[k], the smallest tail of any increasing run of length k + 1, and place each value with a binary search for the first tail not smaller than it.',
        'A problem asks for the **fewest decreasing runs, deletions to make a sequence sorted, or the longest bitonic shape**. Each reduces to LIS (or LIS from both ends): n minus the LIS is the minimum number of elements to remove.',
      ],
      tip: 'tails[k] is the smallest possible last value of an increasing subsequence of length k + 1. Its size is the answer, but its contents are not a valid subsequence. Use lower bound for strict increase.',
      practice: [
        '300-longest-increasing-subsequence',
        '673-number-of-longest-increasing-subsequence',
        '354-russian-doll-envelopes',
        lc('646', 'Maximum Length of Pair Chain', 'Medium', 'maximum-length-of-pair-chain', 'sort, then LIS or greedy'),
        lc('368', 'Largest Divisible Subset', 'Medium', 'largest-divisible-subset', 'sorted LIS where "increasing" means divisible'),
        lc('1048', 'Longest String Chain', 'Medium', 'longest-string-chain', 'sort by length, predecessor by deleting a letter'),
        lc('334', 'Increasing Triplet Subsequence', 'Medium', 'increasing-triplet-subsequence', 'tails of size two is enough'),
      ],
    },
    meta: {
      useNote: 'tails[k] holds the smallest tail of any increasing run of length k+1. Its length is the answer; its contents are not a real run. Replace with lower bound.',
      complexityNote: 'Each of the n values costs one binary search over at most n tails, so O(n log n) time with O(n) space. The DP over all earlier elements is O(n²), accepted when you must also count or rebuild chains.',
      highlight: ['longest chain that keeps a strict order', 'every dimension is strictly smaller', 'length or a count', 'n = 10⁵', 'fewest decreasing runs'],
    },
  },

  'dp-minmax': {
    tags: ['Max + min', 'Negatives', 'Product', 'Circular'],
    content: {
      whenToUse: [
        'A **negative factor flips the order**: multiplying the worst product by a negative can produce the new best. Maximum Product Subarray needs both a running maximum and a running minimum ending at each index, because either may be the one that matters next.',
        'A single running best **loses information a later element would reverse**. If the next input can turn your smallest value into your largest (or the other way round), the state has to be a pair, and both halves are updated from the old values.',
        'The array is **circular**: the best slice either lies inside or wraps around the ends, and a wrapping slice is the total minus the worst middle slice. Run max-Kadane and min-Kadane together and compare best with total − worst.',
        'You need the **best and the worst of something at once**: largest absolute subarray sum, a subarray with at most one deletion, longest stretch with a positive product. Track two (or more) values per position and combine them at the end.',
        '**Zeros and sign changes reset the run**: a zero wipes out every product and a restart candidate (just x) must always be considered. Taking the max and min over {x, x · curMax, x · curMin} handles starts, extensions and flips in one line.',
      ],
      tip: 'At each element compute x, x · curMax and x · curMin, then take the max and min of those three. Save the old curMax in a temporary before overwriting it.',
      practice: [
        '53-maximum-subarray',
        '152-maximum-product-subarray',
        '918-maximum-sum-circular-subarray',
        '121-best-time-to-buy-and-sell-stock',
        lc('1567', 'Maximum Length of Subarray With Positive Product', 'Medium', 'maximum-length-of-subarray-with-positive-product', 'track lengths for positive and negative'),
        lc('1749', 'Maximum Absolute Sum of Any Subarray', 'Medium', 'maximum-absolute-sum-of-any-subarray', 'max-Kadane and min-Kadane in one pass'),
        lc('1186', 'Maximum Subarray Sum with One Deletion', 'Medium', 'maximum-subarray-sum-with-one-deletion', 'two states: no deletion yet, one used'),
      ],
    },
    meta: {
      useNote: 'Consider x, x·curMax and x·curMin and keep the max and min of the three. Store the old curMax in a temporary before overwriting it.',
      complexityNote: 'One left-to-right scan updates a constant number of running values per element, so time is O(n). Only curMax, curMin and the best so far are stored, so extra space is O(1) regardless of the array length.',
      highlight: ['negative factor flips the order', 'loses information a later element would reverse', 'circular', 'best and the worst of something at once', 'Zeros and sign changes reset the run'],
    },
  },

  'dp-knapsack-01': {
    tags: ['Take or skip', 'Subset sum', 'Partition', 'Target sum'],
    content: {
      whenToUse: [
        'You pick a **subset of items under a budget** (weight, sum, count) and each item may be used at most once. For every item the decision is take or skip, and the table remembers the best result for each smaller bag.',
        'The question is **"can some subset reach exactly this sum"**, "how many subsets do", or "what is the best total value". Booleans, counts and maxima all use the same grid of (items considered, capacity used); only the combine rule differs.',
        'A **split into two groups with equal or nearly equal sums** can be rewritten as subset sum on half the total: Partition Equal Subset Sum, Last Stone Weight II, Target Sum with signs. Spotting that reduction is most of the problem.',
        'A recursion that branches **take it or skip it repeats (item, remaining budget) pairs**. Those pairs are exactly the cells of the knapsack table, so memoising the recursion and filling the table are two views of one solution.',
        'There are **two budgets at once** (zeros and ones, cost and time): add a dimension to the table. Memory is the usual worry, and a single row works if the capacity loop runs from high to low so each item is used once.',
      ],
      tip: 'With one rolling row, loop the capacity from high to low. Going upward would let an item feed on its own update and be used several times, which is unbounded knapsack, a different problem.',
      practice: [
        'cp-0-1-knapsack',
        '416-partition-equal-subset-sum',
        '1049-last-stone-weight-ii',
        '494-target-sum',
        lc('474', 'Ones and Zeroes', 'Medium', 'ones-and-zeroes', 'two budgets: zeros and ones'),
        lc('879', 'Profitable Schemes', 'Hard', 'profitable-schemes', 'two constraints, count the ways'),
      ],
    },
    meta: {
      useNote: 'One rolling row works if the capacity loop runs from high to low. Many "split into groups" problems reduce to subset sum on half the total.',
      complexityNote: 'The table has n item rows and W capacity columns with constant work per cell, so time is O(n × W). One row swept from high to low cuts memory from O(n × W) to O(W).',
      highlight: ['subset of items under a budget', 'can some subset reach exactly this sum', 'equal or nearly equal sums', 'take it or skip it repeats', 'two budgets at once'],
    },
  },

  'dp-knapsack-unbounded': {
    tags: ['Coins', 'Reusable items', 'Combinations', 'Fewest items'],
    content: {
      whenToUse: [
        'You may use **each kind of item as many times as you like** to reach a total: coins, rod pieces, perfect squares, steps of fixed sizes. The capacity loop runs upward so a cell can build on a cell that already used the same item.',
        'You want the **fewest items, the best value, or the number of ways** to reach an exact amount. Minimising takes dp[a − c] + 1, maximising adds a value, counting adds ways; unreachable amounts stay at ∞ or 0.',
        'The **order of the items must not matter** (combinations) or must matter (sequences). Items in the outer loop and amounts inside count each multiset once; amounts outside and items inside count ordered sequences, as in Combination Sum IV.',
        'The "items" are **implicit**, such as all squares not larger than n or all digit costs in Form Largest Integer. Generate them on the fly in the inner loop; the table shape stays the same as for explicit coins.',
        'A **greedy choice is tempting but fails**: coins 1, 3, 4 for amount 6 give 4 + 1 + 1 greedily but 3 + 3 optimally. When the largest-first rule has a counterexample, switch to the table that tries every last piece.',
      ],
      tip: 'Loop direction decides reuse: capacity upward means unlimited copies, downward at most one. Loop nesting decides what you count: items outside counts combinations, amount outside counts sequences.',
      practice: [
        'cp-unbounded-knapsack',
        '322-coin-change',
        '518-coin-change-ii',
        '279-perfect-squares',
        lc('377', 'Combination Sum IV', 'Medium', 'combination-sum-iv', 'amount outside: counts ordered sequences'),
        lc('343', 'Integer Break', 'Medium', 'integer-break', 'unbounded pieces, maximise the product'),
        lc('1449', 'Form Largest Integer With Digits That Add up to Target', 'Hard', 'form-largest-integer-with-digits-that-add-up-to-target', 'unbounded with a lexicographic tie-break'),
      ],
    },
    meta: {
      useNote: 'Upward loop means reuse. Items outside the loop count combinations; amount outside counts ordered sequences. Greedy fails on coins like 1, 3, 4.',
      complexityNote: 'Each of the amount + 1 cells tries every item once, so time is O(amount × items) with constant work per try. A single array indexed by amount is all that is needed, so space is O(amount).',
      highlight: ['each kind of item as many times as you like', 'fewest items, the best value, or the number of ways', 'order of the items must not matter', 'implicit', 'greedy choice is tempting but fails'],
    },
  },

  'dp-palindromic': {
    tags: ['Palindromes', 'Interval table', 'Cuts', 'Insertions'],
    content: {
      whenToUse: [
        'The question is about **palindromes inside a string**: the longest palindromic subsequence, minimum insertions or deletions to make one, minimum cuts into palindromes, how many palindromic substrings. A palindrome is decided from both ends inward.',
        'Whether the **outer two characters match** decides the cell: if they do, wrap the best answer for the inside, dp[i+1][j−1]; if not, drop one end and take the better of dp[i+1][j] and dp[i][j−1], never both.',
        'A cell depends on **shorter intervals inside it**, which forces the fill order: by increasing length, or with i from n−1 down to 0 and j upward. Getting this order wrong is the classic bug in interval tables.',
        'You need **O(1) palindrome tests for many substrings**, as in Palindrome Partitioning II or when counting palindromic substrings. Precompute a boolean table pal[i][j] once, then a second one-dimensional DP over cut positions reads it for free.',
        'A shortcut exists: the longest palindromic subsequence equals the **LCS of the string and its reverse**, and minimum insertions equal n minus that length. Use the interval table when you need the structure, the LCS view when you already have LCS code ready.',
      ],
      tip: 'Fill order is the usual bug: by interval length, or with i descending and j ascending, so every shorter interval is ready. For palindromic substrings, expanding around centres needs no table at all.',
      practice: [
        '516-longest-palindromic-subsequence',
        '132-palindrome-partitioning-ii',
        '1312-minimum-insertion-steps-to-make-a-string-palindrome',
        { slug: '647-palindromic-substrings', note: 'count them: expand around centres or fill the table' },
        { slug: '5-longest-palindromic-substring', note: 'same table, track the best interval' },
        lc('730', 'Count Different Palindromic Subsequences', 'Hard', 'count-different-palindromic-subsequences', 'interval DP that counts instead of maximising'),
        lc('1216', 'Valid Palindrome III', 'Hard', 'valid-palindrome-iii', 'at most k deletions: n − LPS ≤ k'),
      ],
    },
    meta: {
      useNote: 'Every cell reads cells below, to the left or diagonally inside it, so fill by length. LPS equals LCS(s, reverse s); insertions equal n − LPS.',
      complexityNote: 'There are about n²/2 intervals (i ≤ j) and each is filled from at most three inner cells, so time is O(n²). The triangular table itself is the memory cost, O(n²), unless only the length is needed.',
      highlight: ['palindromes inside a string', 'outer two characters match', 'shorter intervals inside it', 'O(1) palindrome tests', 'LCS of the string and its reverse'],
    },
  },

  'dp-memoization': {
    tags: ['Top-down', 'Memo', 'Recursion', 'State design'],
    content: {
      whenToUse: [
        'A recursive solution is **correct but exponential** because different paths reach the same arguments, as in naive Fibonacci, grid paths or Target Sum. Draw the call tree three levels deep; repeated nodes are the signal to cache.',
        'The result of a call **depends only on its arguments** (index, remaining amount, row and column), not on how you got there. If that holds, the arguments are a complete state and a map keyed by them is always safe.',
        'It is **easier to write the recurrence recursively** than to find the loop order: word break, longest increasing path in a matrix, memoised DFS on a DAG. Write the recursion, add the cache, and only convert to loops if depth is a problem.',
        'Only some states are **reachable**, so a lazy top-down cache does less work than a full table: Target Sum with large values or game states reached by few move orders. Bottom-up would fill cells nobody asks for.',
        'You want to **move from brute force to a table** step by step: plain recursion, then memoisation, then the bottom-up loop. All three visit the same states; the memo table is exactly the table the loops would fill.',
      ],
      tip: 'Decide the state first: the smallest set of parameters that determines the answer. Then add three lines: check the cache, compute, store. If recursion depth is huge, convert to the bottom-up loop.',
      practice: [
        'alg-memoized-fibonacci',
        'cp-grid-paths-with-memoization',
        '494-target-sum',
        '70-climbing-stairs',
        '139-word-break',
        lc('140', 'Word Break II', 'Hard', 'word-break-ii', 'memoise on the start index, return lists of sentences'),
        lc('329', 'Longest Increasing Path in a Matrix', 'Hard', 'longest-increasing-path-in-a-matrix', 'DFS memoised on (row, col)'),
      ],
    },
    meta: {
      useNote: 'The state is the set of parameters the answer really depends on. Check the cache, compute, store. Bottom-up is the same table in loop order.',
      complexityNote: 'Each distinct state is computed once and every later request is a lookup, so the number of calls is about the number of states times the work inside one call. The cache plus the recursion depth are the space cost.',
      highlight: ['correct but exponential', 'depends only on its arguments', 'easier to write the recurrence recursively', 'reachable', 'move from brute force to a table'],
    },
  },

  'dp-state-machine': {
    tags: ['Stocks', 'Cooldown', 'Fee', 'At most k trades'],
    content: {
      whenToUse: [
        'Actions are **restricted by what you did before**: cooldown after selling, a transaction fee, at most k trades, no two adjacent picks. The legal next move depends on a small mode, so each mode becomes a state of the table.',
        'The problem can be drawn as **a few boxes with arrows** (hold, sold, rest). Draw them first, including the arrows that are not allowed: the cooldown is exactly the missing sold-to-hold arrow, and a fee lives on the sell arrow.',
        'You must track the **profit separately for each mode** instead of one running total. A day\'s value for a state is the best over the states that may move into it, computed only from yesterday\'s values.',
        'A **count of transactions** is part of the state: one buy and one sell row per allowed trade, chained so trade j starts from the profit after trade j−1. That is how "at most k" becomes enforceable and why k = 2 and general k share one table.',
        'The answer is **the best among the allowed ending states** on the last day (usually sold or resting, never holding). The table is n days by a handful of states, so it collapses to a few variables updated with temporaries.',
      ],
      tip: 'Draw the state graph first, including the forbidden arrows. Compute every new state from the previous day\'s values using temporaries, so you never mix today and yesterday.',
      practice: [
        '309-best-time-to-buy-and-sell-stock-with-cooldown',
        '714-best-time-to-buy-and-sell-stock-with-transaction-fee',
        '188-best-time-to-buy-and-sell-stock-iv',
        '121-best-time-to-buy-and-sell-stock',
        lc('122', 'Best Time to Buy and Sell Stock II', 'Medium', 'best-time-to-buy-and-sell-stock-ii', 'unlimited trades: the two-state version'),
        lc('123', 'Best Time to Buy and Sell Stock III', 'Hard', 'best-time-to-buy-and-sell-stock-iii', 'exactly the k = 2 table'),
      ],
    },
    meta: {
      useNote: 'Draw the arrows first, including the forbidden ones. Compute every new state from yesterday\'s values through temporaries.',
      complexityNote: 'One pass over the days updates a constant number of states each, so time is O(n × states), linear for a fixed number of modes. Only the previous day is read, so extra space is O(states).',
      highlight: ['restricted by what you did before', 'a few boxes with arrows', 'profit separately for each mode', 'count of transactions', 'best among the allowed ending states'],
    },
  },

  'dp-catalan': {
    tags: ['Catalan', 'Unique BSTs', 'Brackets', 'Polygons'],
    content: {
      whenToUse: [
        'You must **count binary trees, bracket strings or non-crossing partitions** of a given size. These objects look different but share one recurrence, so recognising the family tells you the whole algorithm before you write any code.',
        'Choosing one **root, first return or apex cuts the object in two** independent smaller objects of the same kind: the keys below and above a BST root, the inside and the rest of a bracket pair, the two polygons beside a triangle.',
        'The answer for size n has the shape **Σ f(i) · f(n−1−i)**: multiply the counts of the two halves, then add over every split point. With f(0) = 1 for the empty piece, edge splits need no special case.',
        'The counts begin **1, 1, 2, 5, 14, 42**: a strong hint that the closed form C(2n, n) / (n + 1) applies. Use the O(n²) table when you also need the structures, or when a variant changes the weights.',
        'A variant **lists the objects or scores them** (Unique BSTs II, different ways to add parentheses, minimum score triangulation). The same split-by-root recursion applies, with a list product or a min in place of the count.',
      ],
      tip: 'Say what the two halves are before coding: keys below and above the root, the inside and the rest of a bracket pair, the two pieces beside a triangle. dp[0] = 1, not 0.',
      practice: [
        '96-unique-binary-search-trees',
        'cp-count-valid-parentheses-sequences',
        'cp-triangulate-a-convex-polygon',
        '22-generate-parentheses',
        lc('95', 'Unique Binary Search Trees II', 'Medium', 'unique-binary-search-trees-ii', 'list the trees, same split by root'),
        lc('241', 'Different Ways to Add Parentheses', 'Medium', 'different-ways-to-add-parentheses', 'split at each operator'),
        lc('1039', 'Minimum Score Triangulation of Polygon', 'Medium', 'minimum-score-triangulation-of-polygon', 'same split, min instead of count'),
        lc('894', 'All Possible Full Binary Trees', 'Medium', 'all-possible-full-binary-trees', 'list structures, memoised by size'),
      ],
    },
    meta: {
      useNote: 'The sequence 1, 1, 2, 5, 14, 42 means Catalan. The base case dp[0] = 1 lets empty halves multiply cleanly.',
      complexityNote: 'Each of the n sizes sums over up to n split points, so time is O(n²) and the table has n + 1 entries. Computing C(2n, n) / (n + 1) directly takes O(n) when only the count is needed.',
      highlight: ['count binary trees, bracket strings or non-crossing partitions', 'root, first return or apex cuts the object in two', 'Σ f(i) · f(n−1−i)', '1, 1, 2, 5, 14, 42', 'lists the objects or scores them'],
    },
  },

  'dp-game-theory': {
    tags: ['Minimax', 'Score difference', 'Nim', 'Win / lose'],
    content: {
      whenToUse: [
        'Two players **alternate and play optimally**, and you must say who wins or by how much: Predict the Winner, Stone Game, Can I Win. Optimal play means each side assumes the other also picks the best reply.',
        'The position is a **small state**: an interval of a row, a suffix, or a set of used numbers. If the next player\'s options depend only on that state, one table entry summarises every possible history that reached it.',
        'The game always ends with **no hidden information or randomness**, so a position is winning exactly when some move reaches a losing position for the opponent. That recursive definition is well founded because every move shrinks the state.',
        'For score games store **"mover minus opponent"** instead of two scores: after your move the opponent is just the mover of the smaller game, so you subtract their value. A non-negative lead for the first player means they never lose.',
        'Brute force explores a **game tree whose positions repeat**: the same interval or the same set of numbers is reached by different move orders. Memoise on a bitmask for subset games or fill an interval or suffix table for row games.',
      ],
      tip: 'Store "mover minus opponent" so you never track whose turn it is. For win/lose games use a boolean: a state wins if SOME move reaches a losing state and loses when every move reaches a winning one.',
      practice: [
        '486-predict-the-winner',
        '464-can-i-win',
        '1406-stone-game-iii',
        lc('877', 'Stone Game', 'Medium', 'stone-game', 'same interval table; the first player always wins'),
        lc('1140', 'Stone Game II', 'Medium', 'stone-game-ii', 'state (start, M)'),
        lc('1690', 'Stone Game VII', 'Medium', 'stone-game-vii', 'interval table with a range sum'),
        lc('1510', 'Stone Game IV', 'Hard', 'stone-game-iv', 'win/lose over the remaining stones'),
        lc('292', 'Nim Game', 'Easy', 'nim-game', 'win/lose positions mod 4'),
      ],
    },
    meta: {
      useNote: 'Score games use "mover minus opponent"; win/lose games use a boolean: a position wins if some move reaches a losing one.',
      complexityNote: 'Interval and suffix games fill O(n²) or O(n) cells in constant time each. Subset games touch each of the 2ⁿ masks once and try up to n moves, giving O(2ⁿ × n) time and O(2ⁿ) memo space.',
      highlight: ['alternate and play optimally', 'small state', 'no hidden information or randomness', 'mover minus opponent', 'game tree whose positions repeat'],
    },
  },

  'dp-bitmask': {
    tags: ['Bitmask', 'TSP', 'Subsets', 'Assignment'],
    content: {
      whenToUse: [
        'You **assign, visit or choose every item of a small set** (n up to about 16 to 20) exactly once: a tour through all cities, partitioning numbers into buckets, giving each person a distinct job. The bits of one integer record which items are used.',
        'Only **which items are used** matters for the future, not the order they were used in. Brute force over permutations costs n!, but there are only 2ⁿ distinct subsets, and each subset is one table row.',
        'Typical tasks are a **tour or path visiting every node**, a minimum cost assignment, a team that covers all skills, or a split of items into equal groups. If the statement says "every" with n ≤ 20, think bitmask first.',
        'The state needs **the set plus one more fact**: the last city for TSP (dp[mask][last]), the fill of the current bucket for partition problems, the current node for BFS over (mask, node). That second index multiplies the table by n.',
        'You process masks **in increasing numeric order**, because a superset always has a larger value than its subsets, so every sub-mask is solved before the masks that extend it. Test a bit with (mask >> i) & 1, set it with mask | (1 << i).',
      ],
      tip: 'Increasing numeric order guarantees all sub-masks are done first. Test a bit with (mask >> i) & 1, set with mask | (1 << i), clear with mask ^ (1 << i).',
      practice: [
        '847-shortest-path-visiting-all-nodes',
        '698-partition-to-k-equal-sum-subsets',
        'cp-travelling-salesman-bitmask-dp',
        lc('526', 'Beautiful Arrangement', 'Medium', 'beautiful-arrangement', 'mask of used numbers, fill positions in order'),
        lc('1125', 'Smallest Sufficient Team', 'Hard', 'smallest-sufficient-team', 'mask of covered skills'),
        lc('943', 'Find the Shortest Superstring', 'Hard', 'find-the-shortest-superstring', 'TSP over word overlaps'),
        lc('1879', 'Minimum XOR Sum of Two Arrays', 'Hard', 'minimum-xor-sum-of-two-arrays', 'assignment with a mask of used partners'),
        lc('1986', 'Minimum Number of Work Sessions to Finish the Tasks', 'Medium', 'minimum-number-of-work-sessions-to-finish-the-tasks', 'subset DP over sessions'),
      ],
    },
    meta: {
      useNote: 'Only the set of used items matters, never their order. Fill masks in increasing order, extending each by one unused bit.',
      complexityNote: 'There are 2ⁿ masks and each tries n (or n × n for tours) transitions, giving O(2ⁿ × n) to O(2ⁿ × n²) time and O(2ⁿ × n) memory. Fine up to n of about 16 to 20, hopeless beyond.',
      highlight: ['assign, visit or choose every item of a small set', 'which items are used', 'tour or path visiting every node', 'the set plus one more fact', 'in increasing numeric order'],
    },
  },

  'dp-interval': {
    tags: ['Intervals', 'Burst Balloons', 'Matrix chain', 'Last action'],
    content: {
      whenToUse: [
        'The problem is about a **contiguous segment that shrinks, merges or splits** as you act: bursting balloons, multiplying a chain of matrices, cutting a stick, printing a string. The state is the segment, written dp[l][r].',
        'The **last (or first) operation on a segment divides it** into two independent smaller segments. Choose the last one when the first one would tie the two sides together, as in Burst Balloons where the last popped balloon has fixed neighbours.',
        'A state needs **two endpoints** and each cell depends on shorter intervals inside it, so you fill by increasing length (2, 3, … n) and then by left end. Looping by left end alone reads cells that are not computed yet.',
        'Each cell **tries every split point k** between l and r, so the cost is cubic: n² intervals times up to n splits. If n is at most a few hundred this is fine; a Knuth-style optimisation can lower it for special cost shapes.',
        'The segments are **parts of a string with equal ends**: Strange Printer, Palindrome Partitioning, minimum cost to merge stones. The recurrence changes (equal letters share a stroke), but the interval table and the fill order stay the same.',
      ],
      tip: 'Loop by length first, then by left end, so every shorter interval is computed. If choosing the FIRST action breaks independence (as in Burst Balloons), choose the LAST one instead.',
      practice: [
        '312-burst-balloons',
        'gfg-matrix-chain-multiplication',
        '664-strange-printer',
        '516-longest-palindromic-subsequence',
        lc('1000', 'Minimum Cost to Merge Stones', 'Hard', 'minimum-cost-to-merge-stones', 'adds a group-size constraint'),
        lc('1547', 'Minimum Cost to Cut a Stick', 'Hard', 'minimum-cost-to-cut-a-stick', 'same shape as matrix chain'),
        lc('1130', 'Minimum Cost Tree From Leaf Values', 'Medium', 'minimum-cost-tree-from-leaf-values', 'split points of a leaf sequence'),
        lc('375', 'Guess Number Higher or Lower II', 'Medium', 'guess-number-higher-or-lower-ii', 'minimax over the guess inside [l, r]'),
      ],
    },
    meta: {
      useNote: 'Loop length outermost. If the first action ties the two sides together, switch to thinking about the last action.',
      complexityNote: 'There are about n²/2 intervals and each tries up to n split points with constant work, so time is O(n³). The table of intervals needs O(n²) memory, which is the practical limit for n in the hundreds.',
      highlight: ['contiguous segment that shrinks, merges or splits', 'last (or first) operation on a segment divides it', 'two endpoints', 'tries every split point k', 'equal ends'],
    },
  },

  'dp-tree': {
    tags: ['Tree', 'Rob / skip', 'Post-order', 'Cameras'],
    content: {
      whenToUse: [
        'Decisions on a node **interact with its parent or children**: cannot rob two linked houses, a camera must watch its neighbours, a chosen node blocks adjacent ones. The question is a tree and the constraint is local.',
        'The best answer for a subtree depends on **a few states of its root**, such as robbed or skipped, camera, covered or gap. Return all states together as a pair or triple from the recursive call, computed after both children.',
        'You want a **global optimum such as a path or a diameter** while each call returns something simple to its parent. Update a global best at every node and return only the one-sided chain the parent can extend.',
        'A plain recursion would **revisit the same subtrees under different assumptions** (parent taken or not). Returning the pair for both assumptions at once solves each subtree exactly once, in O(n) instead of an exponential choose-or-skip tree.',
        'The tree is **rooted and small enough for recursion depth** (otherwise use an explicit stack). Work is post-order: leaves first, so every node reads finished children. Rerooting techniques extend this to answers for every node as root.',
      ],
      tip: 'Name the node states first (rob or skip, camera or covered or gap), write what each demands from the children, and return all states. For bending paths keep a global best.',
      practice: [
        '337-house-robber-iii',
        '968-binary-tree-cameras',
        '124-binary-tree-maximum-path-sum',
        '543-diameter-of-binary-tree',
        lc('979', 'Distribute Coins in Binary Tree', 'Medium', 'distribute-coins-in-binary-tree', 'return the surplus a subtree sends up'),
        lc('834', 'Sum of Distances in Tree', 'Hard', 'sum-of-distances-in-tree', 'rerooting after a first post-order pass'),
        lc('1372', 'Longest ZigZag Path in a Binary Tree', 'Medium', 'longest-zigzag-path-in-a-binary-tree', 'two states per node: arrived left or right'),
      ],
    },
    meta: {
      useNote: 'Name the node states first, combine children per state, and keep a global best separately when answers can bend through a node.',
      complexityNote: 'Every node is combined exactly once from the summaries of its children, so time is O(n). The only extra memory is the recursion stack, whose depth is the tree height h: O(log n) when balanced, O(n) when skewed.',
      highlight: ['interact with its parent or children', 'few states of its root', 'global optimum such as a path or a diameter', 'revisit the same subtrees', 'rooted and small enough for recursion depth'],
    },
  },

  'dp-digit': {
    tags: ['Digits', 'Tight flag', 'Counting ≤ N', 'Free suffix'],
    content: {
      whenToUse: [
        'You **count integers in a range [0, N]** (or [A, B] as f(B) − f(A−1)) that satisfy a property of their digits: only allowed digits, all digits different, digit sum equal to S. Looping over N is impossible; its digits are few.',
        'The property needs **a small digit state**: a digit sum, a mask of used digits, the last digit, a remainder. The table is indexed by (position, state) and a transition appends one digit, so 10 transitions per cell.',
        'N is huge (up to 10¹⁸) but has **at most 19 digits**. That bounds the DP: positions × states × 10 is only a few thousand operations, so counting over 10¹⁸ numbers finishes instantly in any language.',
        'You build numbers **left to right with a tight flag**: while the prefix equals N\'s prefix you may only use digits up to N[i]; once a smaller digit is placed the rest is free, and free suffixes can be tabulated or memoised.',
        '**Leading zeros need a decision**: they may be part of the count (digit sum) or must be ignored (distinct digits, allowed digit sets). Add a started flag, or count shorter lengths separately as 9 × P(9, k) style formulas.',
      ],
      tip: 'The state is (position, tight?, started?, property). For a range [A, B] count f(B) − f(A−1). Memoise only non-tight states: they are reusable, while the tight path is one walk along N.',
      practice: [
        '902-numbers-at-most-n-given-digit-set',
        '2376-count-special-integers',
        'cp-count-numbers-with-digit-sum',
        lc('357', 'Count Numbers with Unique Digits', 'Medium', 'count-numbers-with-unique-digits', 'count by length: 9 · 9 · 8 · …'),
        lc('233', 'Number of Digit One', 'Hard', 'number-of-digit-one', 'count ones per position'),
        lc('2719', 'Count of Integers', 'Hard', 'count-of-integers', 'digit-sum range via f(num2) − f(num1 − 1)'),
        lc('600', 'Non-negative Integers without Consecutive Ones', 'Hard', 'non-negative-integers-without-consecutive-ones', 'state: previous bit, tight'),
        lc('1012', 'Numbers With Repeated Digits', 'Hard', 'numbers-with-repeated-digits', 'complement of Count Special Integers'),
      ],
    },
    meta: {
      useNote: 'Count f(B) − f(A−1) for ranges. Shorter numbers are free; along N the tight prefix is a single walk, and non-tight states can be memoised.',
      complexityNote: 'The table has L positions, a small number of digit states and ten digit choices per cell, so time is O(L × states × 10). With at most about 19 digits this is tiny even when N is near 10¹⁸.',
      highlight: ['count integers in a range', 'small digit state', 'at most 19 digits', 'tight flag', 'Leading zeros need a decision'],
    },
  },
};
