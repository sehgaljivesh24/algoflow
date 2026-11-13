/**
 * Study priority of every catalog problem (my own judgement, not copied from anywhere):
 *  - P1 "Must do":      the classic interview staples; if you only have a week, do these.
 *  - P2 "Important":    commonly asked variations and the second-tier standards.
 *  - P3 "Good to know": warm-ups, near-duplicates of a P1/P2 idea, or rarely asked.
 * P1 and P3 are listed explicitly below; everything else is P2 by definition (pattern-pack problems also list P2
 * explicitly in P2_PACKS so each one is a deliberate rating).
 * `scripts/check-library.mts` verifies every slug exists and the overall split stays sensible.
 */
import { ALL_ENTRIES } from './catalog.ts';

export type Priority = 'p1' | 'p2' | 'p3';

export const PRIORITY_LABEL: Record<Priority, { name: string; hint: string }> = {
  p1: { name: 'P1 — Must Do', hint: 'High interview frequency, core patterns' },
  p2: { name: 'P2 — Important', hint: 'Commonly asked, good to know' },
  p3: { name: 'P3 — Good to Know', hint: 'Warmup / low frequency' },
};

const P1 = new Set<string>([
  // Arrays
  '1-two-sum', '15-3sum', '42-trapping-rain-water', '11-container-with-most-water', '53-maximum-subarray',
  '121-best-time-to-buy-and-sell-stock', '238-product-of-array-except-self', '560-subarray-sum-equals-k',
  // Strings
  '3-longest-substring-without-repeating-characters', '76-minimum-window-substring', '242-valid-anagram',
  '49-group-anagrams', '125-valid-palindrome', '5-longest-palindromic-substring',
  // Matrix
  '200-number-of-islands',
  // Stack
  '20-valid-parentheses', '155-min-stack', '739-daily-temperatures',
  // Queue / sliding window
  '239-sliding-window-maximum',
  // Binary search
  '704-binary-search', '33-search-in-rotated-sorted-array', '153-find-minimum-in-rotated-sorted-array',
  // Linked list
  '206-reverse-linked-list', '141-linked-list-cycle', '21-merge-two-sorted-lists', '19-remove-nth-node-from-end',
  // Greedy, intervals
  '55-jump-game', '56-merge-intervals',
  // Backtracking
  '78-subsets', '46-permutations', '39-combination-sum',
  // Tree
  '102-binary-tree-level-order-traversal', '104-maximum-depth-of-binary-tree', '226-invert-binary-tree',
  '98-validate-binary-search-tree', '236-lowest-common-ancestor', '543-diameter-of-binary-tree',
  // Heap
  '215-kth-largest-element-in-an-array', '347-top-k-frequent-elements',
  // Graph
  '207-course-schedule', '133-clone-graph', '994-rotting-oranges',
  // Dynamic programming
  '70-climbing-stairs', '198-house-robber', '322-coin-change', '300-longest-increasing-subsequence',
  '1143-longest-common-subsequence',
  // Bits
  '136-single-number',
  // Sorting
  '912-quick-sort', '912-merge-sort',
  // Trie, design
  '208-implement-trie', '146-lru-cache',
]);

const P3 = new Set<string>([
  // Arrays: warm-ups and single-trick problems
  '1929-concatenation-of-array', '1480-running-sum-of-1d-array', '1672-richest-customer-wealth',
  '1470-shuffle-the-array', '832-flipping-an-image', '2239-find-closest-number-to-zero',
  '26-remove-duplicates-from-sorted-array', '977-squares-of-a-sorted-array', '643-maximum-average-subarray-i',
  '383-ransom-note', '169-majority-element', '41-first-missing-positive', '189-rotate-array',
  // Strings
  '13-roman-to-integer', '14-longest-common-prefix', '205-isomorphic-strings', '271-encode-and-decode-strings',
  '344-reverse-string', '1189-maximum-number-of-balloons', '680-valid-palindrome-ii',
  // Matrix
  '59-spiral-matrix-ii', '74-search-a-2d-matrix', '36-valid-sudoku',
  // Stack, queue
  '496-next-greater-element-i', '150-evaluate-reverse-polish-notation', 'gfg-reverse-first-k-elements-of-queue',
  // Binary search
  '35-search-insert-position', '268-missing-number', '81-search-in-rotated-sorted-array-ii',
  'gfg-allocate-minimum-pages', 'ib-painters-partition-problem',
  // Linked list
  '83-remove-duplicates-from-sorted-list', '202-happy-number', '876-middle-of-the-linked-list',
  '234-palindrome-linked-list', '92-reverse-linked-list-ii',
  // Greedy, intervals
  '135-candy', '763-partition-labels', 'gfg-minimum-platforms', '452-minimum-arrows-to-burst-balloons',
  // Backtracking
  '17-letter-combinations-of-a-phone-number', '37-sudoku-solver',
  // Tree
  '637-average-of-levels-in-binary-tree', '94-binary-tree-inorder-traversal', '108-convert-sorted-array-to-bst',
  '110-balanced-binary-tree', '129-sum-root-to-leaf-numbers',
  // Heap
  '1046-last-stone-weight', '621-task-scheduler',
  // Graph
  '1971-find-if-path-exists-in-graph', 'gfg-is-graph-a-tree', '1584-min-cost-to-connect-all-points',
  '399-evaluate-division',
  // Dynamic programming
  '509-fibonacci-number', 'gfg-longest-common-substring', '746-min-cost-climbing-stairs',
  '63-unique-paths-ii', '120-triangle',
  // Bits
  '389-find-the-difference', '231-power-of-two', '371-sum-of-two-integers', '260-single-number-iii',
  // Sorting
  '912-bubble-sort', '912-insertion-sort', '912-heap-sort',
]);

/**
 * Problems added by the pattern packs, rated one by one. P1 additions are the few new staples; P3 additions are mostly
 * competitive-programming / advanced-structure material and near-duplicates; P2 is listed explicitly so every pack
 * problem carries a deliberate rating (scripts/check-priorities.mts enforces this).
 */
const P1_PACKS = [
  '269-alien-dictionary', '131-palindrome-partitioning', '211-design-add-and-search-words-data-structure', '50-pow-x-n',
];

const P2_PACKS = [
  // Arrays
  '1438-longest-continuous-subarray-with-abs-diff-limit', '862-shortest-subarray-with-sum-at-least-k', '16-3sum-closest',
  '229-majority-element-ii', '454-4sum-ii', '1696-jump-game-vi', '611-valid-triangle-number',
  '442-find-all-duplicates-in-an-array',
  // Strings
  '459-repeated-substring-pattern',
  '28-find-the-index-of-the-first-occurrence-in-a-string', 'alg-rabin-karp-substring-search', '187-repeated-dna-sequences',
  // Matrix, stack, binary search, intervals, backtracking
  '695-max-area-of-island', '130-surrounded-regions', '498-diagonal-traverse',
  '503-next-greater-element-ii', '402-remove-k-digits',
  // DFS traversal orders, BST search / insert (pack p10)
  'alg-preorder-traversal-recursive-dfs', 'alg-inorder-traversal-recursive-dfs', '145-binary-tree-postorder-traversal', '701-insert-into-a-binary-search-tree',
  '540-single-element-in-a-sorted-array', '658-find-k-closest-elements',
  '1094-car-pooling', '218-the-skyline-problem', '47-permutations-ii',
  // Tree
  '99-recover-binary-search-tree', '235-lowest-common-ancestor-of-a-binary-search-tree',
  '1008-construct-binary-search-tree-from-preorder-traversal',
  // Heap
  '502-ipo', '378-kth-smallest-element-in-a-sorted-matrix', '480-sliding-window-median',
  '632-smallest-range-covering-elements-from-k-lists', '654-maximum-binary-tree',
  // Graph
  'cp-prims-mst-with-a-heap', '1135-connecting-cities-with-minimum-cost', '1514-path-with-maximum-probability',
  '886-possible-bipartition', '305-number-of-islands-ii',
  '542-01-matrix', '990-satisfiability-of-equality-equations', '1319-number-of-operations-to-make-network-connected',
  '547-number-of-provinces', '310-minimum-height-trees', '1631-path-with-minimum-effort',
  'alg-bellman-ford-shortest-paths-negative-edges', 'alg-floyd-warshall-all-pairs-shortest-paths',
  '1192-critical-connections-in-a-network', '785-is-graph-bipartite',
  // Union-find with rank and path compression (pack p11)
  'alg-union-find-number-of-provinces-union-by-rank-path-compression',
  // Dynamic programming
  'cp-0-1-knapsack', 'cp-unbounded-knapsack', '518-coin-change-ii', '279-perfect-squares', '516-longest-palindromic-subsequence',
  '494-target-sum', '309-best-time-to-buy-and-sell-stock-with-cooldown', '918-maximum-sum-circular-subarray',
  '96-unique-binary-search-trees', '698-partition-to-k-equal-sum-subsets', '312-burst-balloons',
  'gfg-matrix-chain-multiplication', '337-house-robber-iii', '1049-last-stone-weight-ii', '132-palindrome-partitioning-ii',
  '714-best-time-to-buy-and-sell-stock-with-transaction-fee', '673-number-of-longest-increasing-subsequence',
  '354-russian-doll-envelopes', '486-predict-the-winner',
  '648-replace-words', '398-random-pick-index', '241-different-ways-to-add-parentheses',
  // Trie, design, randomized, math, advanced structures
  '421-maximum-xor-of-two-numbers-in-an-array', '460-lfu-cache', '1146-snapshot-array', '382-linked-list-random-node',
  '204-count-primes', '307-range-sum-query-mutable', 'alg-fenwick-tree-binary-indexed-tree',
  '315-count-of-smaller-numbers-after-self',
];

const P3_PACKS = [
  // Tree warm-up (pack p10)
  '700-search-in-a-binary-search-tree',
  // Arrays: niche tricks, meet in the middle
  'cp-majority-element-with-verification', '1331-rank-transform-of-an-array', '506-relative-ranks',
  '1755-closest-subsequence-sum', '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
  // Strings: KMP / Z / hashing / Manacher variants
  '1392-longest-happy-prefix', 'alg-z-algorithm-pattern-search',
  '2223-sum-of-scores-of-built-strings', 'alg-all-periods-of-a-string', '1044-longest-duplicate-substring',
  'alg-manachers-algorithm', 'cp-palindromic-substrings-via-manacher', '214-shortest-palindrome',
  // Intervals, tree
  'cp-maximum-overlap-of-wide-intervals', 'alg-morris-inorder-traversal', '144-binary-tree-preorder-traversal',
  '1483-kth-ancestor-of-a-tree-node', 'cp-lowest-common-ancestor-via-binary-lifting',
  'cp-distance-between-two-nodes-in-a-tree',
  // Heap
  // Graph: MST variants, shortest-path variants, flow, SCC, union-find extras
  '1168-optimize-water-distribution-in-a-village',
  'cp-max-spacing-k-clustering-kruskal', '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
  'cp-negative-cycle-detection-currency-arbitrage',
  '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
  'cp-transitive-closure-warshall-reachability', 'alg-max-flow-edmonds-karp', 'cp-maximum-bipartite-matching-flow',
  'cp-minimum-cut-from-max-flow', 'alg-articulation-points-cut-vertices', 'cp-strongly-connected-components-tarjan',
  'cp-find-an-odd-cycle', 'cp-weighted-union-find-ratios',
  'cp-union-find-with-rollback',
  // Dynamic programming: harder or niche families
  '1312-minimum-insertion-steps-to-make-a-string-palindrome',
  'alg-memoized-fibonacci', 'cp-grid-paths-with-memoization',
  '188-best-time-to-buy-and-sell-stock-iv',
  'cp-count-valid-parentheses-sequences', 'cp-triangulate-a-convex-polygon', '464-can-i-win',
  '1406-stone-game-iii', '847-shortest-path-visiting-all-nodes', 'cp-travelling-salesman-bitmask-dp',
  '664-strange-printer', '968-binary-tree-cameras', '902-numbers-at-most-n-given-digit-set', '2376-count-special-integers',
  'cp-count-numbers-with-digit-sum',
  // Bits, sorting, trie, design, divide and conquer, randomized, math
  '1310-xor-queries-of-a-subarray', '477-total-hamming-distance', '2275-largest-combination-with-bitwise-and-greater-than-zero',
  'cp-cyclic-sort', '912-counting-sort', '912-radix-sort', '164-maximum-gap',
  '1032-stream-of-characters', '432-all-o-1-data-structure',
  'alg-maximum-subarray-divide-and-conquer', '493-reverse-pairs',
  'alg-reservoir-sampling-k-items', 'alg-euclids-gcd-and-lcm',
  // Advanced data structures and geometry (competitive programming)
  'cp-range-minimum-query-segment-tree', 'cp-range-add-range-sum-lazy-propagation', 'cp-count-inversions-with-a-fenwick-tree',
  'alg-sqrt-decomposition-range-sum-with-updates', 'cp-range-add-and-range-sum-with-blocks', '2080-range-frequency-queries',
  'cp-persistent-segment-tree-version-array', 'cp-kth-smallest-in-a-range-persistent-segment-tree',
  'cp-suffix-array-and-lcp-array', 'cp-count-distinct-substrings-suffix-trie', 'cp-pattern-search-with-a-suffix-array',
  'cp-aho-corasick-build-failure-links', 'cp-multi-keyword-search-aho-corasick', 'cp-heavy-light-decomposition-chains',
  'cp-hld-path-maximum-query', 'cp-lca-via-heavy-light-decomposition', '587-erect-the-fence',
  'cp-graham-scan-convex-hull', 'cp-jarvis-march-gift-wrapping', 'cp-rotating-calipers-polygon-diameter',
];

for (const s of P1_PACKS) P1.add(s);
for (const s of P3_PACKS) P3.add(s);
const P2 = new Set<string>(P2_PACKS);

/** Slugs named in the explicit lists (exported for the check scripts). */
export const P1_SLUGS: ReadonlySet<string> = P1;
export const P2_SLUGS: ReadonlySet<string> = P2;
export const P3_SLUGS: ReadonlySet<string> = P3;

/** Priority of every catalog slug. */
export const PRIORITY: Record<string, Priority> = Object.fromEntries(
  ALL_ENTRIES.map((e) => [e.slug, P1.has(e.slug) ? 'p1' : P3.has(e.slug) ? 'p3' : 'p2'] as const),
);

export type PriorityFilter = 'all' | 'p1' | 'p1p2' | 'p3';

export function matchesPriority(slug: string, f: PriorityFilter): boolean {
  const p = PRIORITY[slug] ?? 'p2';
  if (f === 'all') return true;
  if (f === 'p1') return p === 'p1';
  if (f === 'p1p2') return p !== 'p3';
  return p === 'p3';
}
