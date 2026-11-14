import type { JavaCase, JavaCaseModule } from './types.ts';

/**
 * Java check, batch J5 — dynamic programming (47 problems).
 * `expected` is the animation's final answer (its last step's `result.title`, fuzz/oracle-verified); the displayed Java is
 * compiled and run through `new Solution()` (or `Solution.method` when the snippet is static-only).
 */
const ia = (a: number[]): string => `new int[]{${a.join(', ')}}`;
const ia2 = (a: number[][]): string => `new int[][]{${a.map((r) => `{${r.join(', ')}}`).join(', ')}}`;
const title = (steps: any[]): string => String(steps[steps.length - 1].result.title);
const line = (expr: string): string => `            System.out.println(${expr});`;
type S = (input: any) => string;

/** One-expression case: `call` returns the Java expression (inside println). */
const mk = (slug: string, call: S, extra: Partial<JavaCase> = {}): JavaCase => ({
  slug,
  main: (input) => line(call(input)),
  expected: (_input, steps) => title(steps as any[]),
  ...extra,
});

const TREE = `class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
class TB {
    static TreeNode build(Integer[] t) {
        if (t.length == 0 || t[0] == null) return null;
        TreeNode root = new TreeNode(t[0]);
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < t.length) {
            TreeNode n = q.poll();
            if (i < t.length && t[i] != null) { n.left = new TreeNode(t[i]); q.add(n.left); }
            i++;
            if (i < t.length && t[i] != null) { n.right = new TreeNode(t[i]); q.add(n.right); }
            i++;
        }
        return root;
    }
}
`;
const tokens = (t: (number | null)[]): string => `TB.build(new Integer[]{${t.map((x) => (x === null ? 'null' : String(x))).join(', ')}})`;
const q = (s: string): string => JSON.stringify(s);

export const cases: JavaCaseModule['cases'] = [
  mk('1049-last-stone-weight-ii', ({ stones }) => `new Solution().lastStoneWeightII(${ia(stones)})`),
  mk('1143-longest-common-subsequence', ({ a, b }) => `new Solution().longestCommonSubsequence(${q(a)}, ${q(b)})`),
  {
    slug: '120-triangle',
    main: ({ tri }: { tri: number[][] }) =>
      `            List<List<Integer>> t = new ArrayList<>();\n${tri.map((r) => `            t.add(Arrays.asList(${r.join(', ')}));`).join('\n')}\n            System.out.println(new Solution().minimumTotal(t));`,
    expected: (_i, steps) => title(steps as any[]),
  },
  mk('1312-minimum-insertion-steps-to-make-a-string-palindrome', ({ s }) => `new Solution().minInsertions(${q(s)})`),
  mk('132-palindrome-partitioning-ii', ({ s }) => `new Solution().minCut(${q(s)})`),
  mk('1406-stone-game-iii', ({ stones }) => `new Solution().stoneGameIII(${ia(stones)})`),
  mk('188-best-time-to-buy-and-sell-stock-iv', ({ k, prices }) => `new Solution().maxProfit(${k}, ${ia(prices)})`),
  mk('198-house-robber', ({ nums }) => `new Solution().rob(${ia(nums)})`),
  mk('2376-count-special-integers', ({ n }) => `new Solution().countSpecialNumbers(${n})`),
  mk('279-perfect-squares', ({ n }) => `new Solution().numSquares(${n})`),
  mk('300-longest-increasing-subsequence', ({ nums }) => `new Solution().lengthOfLIS(${ia(nums)})`),
  mk('309-best-time-to-buy-and-sell-stock-with-cooldown', ({ prices }) => `new Solution().maxProfit(${ia(prices)})`),
  mk('312-burst-balloons', ({ nums }) => `new Solution().maxCoins(${ia(nums)})`),
  mk('322-coin-change', ({ coins, amount }) => `new Solution().coinChange(${ia(coins)}, ${amount})`),
  mk('337-house-robber-iii', ({ tokens: t }) => `new Solution().rob(${tokens(t)})`, { extra: TREE }),
  mk('354-russian-doll-envelopes', ({ env }) => `new Solution().maxEnvelopes(${ia2(env)})`),
  mk('416-partition-equal-subset-sum', ({ nums }) => `new Solution().canPartition(${ia(nums)})`),
  mk('464-can-i-win', ({ m, total }) => `new Solution().canIWin(${m}, ${total})`),
  mk('486-predict-the-winner', ({ nums }) => `new Solution().predictTheWinner(${ia(nums)})`),
  mk('494-target-sum', ({ nums, target }) => `Solution.ways(${ia(nums)}, 0, ${target}, new HashMap<>())`, {
    notes: 'the snippet is only the memoised helper `ways` (no findTargetSumWays entry point); called directly with i = 0, rem = target',
  }),
  mk('516-longest-palindromic-subsequence', ({ s }) => `new Solution().longestPalindromeSubseq(${q(s)})`),
  mk('518-coin-change-ii', ({ coins, amount }) => `new Solution().change(${amount}, ${ia(coins)})`),
  mk('62-unique-paths', ({ m, n }) => `new Solution().uniquePaths(${m}, ${n})`),
  mk('63-unique-paths-ii', ({ grid }: { grid: string[] }) => `new Solution().uniquePathsWithObstacles(${ia2(grid.map((r) => [...r].map(Number)))})`),
  mk('647-palindromic-substrings', ({ s }) => `new Solution().countSubstrings(${q(s)})`),
  mk('664-strange-printer', ({ s }) => `new Solution().strangePrinter(${q(s)})`),
  mk('673-number-of-longest-increasing-subsequence', ({ nums }) => `new Solution().findNumberOfLIS(${ia(nums)})`),
  mk('698-partition-to-k-equal-sum-subsets', ({ nums, k }) => `new Solution().canPartitionKSubsets(${ia(nums)}, ${k})`),
  mk('70-climbing-stairs', ({ n }) => `new Solution().climbStairs(${n})`),
  mk('714-best-time-to-buy-and-sell-stock-with-transaction-fee', ({ prices, fee }) => `new Solution().maxProfit(${ia(prices)}, ${fee})`),
  mk('72-edit-distance', ({ a, b }) => `new Solution().minDistance(${q(a)}, ${q(b)})`),
  mk('847-shortest-path-visiting-all-nodes', ({ n, edges }: { n: number; edges: number[][] }) => {
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
    return `new Solution().shortestPathLength(${ia2(adj)})`;
  }, { notes: 'undirected adjacency lists built from the example edge list' }),
  mk('902-numbers-at-most-n-given-digit-set', ({ digits, n }: { digits: number[]; n: number }) => `new Solution().atMostNGivenDigitSet(new String[]{${digits.map((d) => q(String(d))).join(', ')}}, ${n})`),
  mk('91-decode-ways', ({ s }) => `new Solution().numDecodings(${q(s)})`),
  mk('918-maximum-sum-circular-subarray', ({ nums }) => `new Solution().maxSubarraySumCircular(${ia(nums)})`),
  mk('96-unique-binary-search-trees', ({ n }) => `new Solution().numTrees(${n})`),
  mk('968-binary-tree-cameras', ({ tokens: t }) => `new Solution().minCameraCover(${tokens(t)})`, { extra: TREE }),
  mk('alg-memoized-fibonacci', ({ n }) => `Solution.fib(${n})`, { notes: 'static memoised helper fib called directly' }),
  mk('cp-0-1-knapsack', ({ wt, val, cap }) => `new Solution().knapsack(${ia(wt)}, ${ia(val)}, ${cap})`),
  mk('cp-count-numbers-with-digit-sum', ({ n, target }) => `new Solution().countWithDigitSum(${n}, ${target})`),
  mk('cp-count-valid-parentheses-sequences', ({ n }) => `new Solution().countSequences(${n})`),
  mk('cp-grid-paths-with-memoization', ({ rows, cols }) => `Solution.paths(0, 0, ${rows}, ${cols}, new int[${rows}][${cols}])`, { notes: 'static memoised helper paths called directly from (0,0)' }),
  mk('cp-travelling-salesman-bitmask-dp', ({ d }) => `new Solution().tsp(${ia2(d)})`, { notes: 'prints the optimal tour cost only (the tour itself is not returned by the snippet)' }),
  mk('cp-triangulate-a-convex-polygon', ({ n }) => `new Solution().triangulations(${n})`),
  mk('cp-unbounded-knapsack', ({ wt, val, cap }) => `new Solution().unboundedKnapsack(${ia(wt)}, ${ia(val)}, ${cap})`),
  mk('gfg-longest-common-substring', ({ a, b }) => `Solution.longestCommonSubstring(${q(a)}, ${q(b)})`),
  mk('gfg-matrix-chain-multiplication', ({ dims }) => `new Solution().matrixChain(${ia(dims)})`),
];
