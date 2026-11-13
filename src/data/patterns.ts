/**
 * DSA patterns. Every pattern is listed (so the index shows the full roadmap);
 * only those with an entry in CONTENT have a written page and a live animation.
 *
 * Line format:  slug|title|tags|time / space
 */

import { EXTRA_CONTENT } from './patternContent.ts';
import { PACKS } from './packs/index.ts';
import type { PatternExample } from './packs/types.ts';
import { TEMPLATES } from './patternTemplates.ts';
import { DETAIL } from './detail/index.ts';

export type { PatternExample } from './packs/types.ts';

export interface PatternCard {
  slug: string;
  group: string;
  title: string;
  tags: string[];
  complexity: string;
}

/** A practice problem that is not in our catalog (so it can't be animated yet). */
export interface PracticeItem {
  /** LeetCode number (without #). */
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  /** Optional short suffix shown after the title, e.g. "fixed window + HashSet". */
  note?: string;
  /** Optional link, e.g. https://leetcode.com/problems/contains-duplicate-ii/ */
  href?: string;
}

/** A catalog problem with an explanatory suffix, e.g. { slug: '239-sliding-window-maximum', note: 'fixed window + monotonic deque' }. */
export interface PracticeRef {
  slug: string;
  note?: string;
}

export interface PatternContent {
  /** Slug of the problem animation embedded on the page. */
  animation: string;
  summary: string;
  whenToUse: string[];
  tip: string;
  /** Complete, commented Java template for the pattern (plain multi-line string, ~12-30 lines). */
  template?: string;
  /**
   * Practice list. A string is a catalog slug (links to our animation when one exists);
   * `{slug, note}` is the same with a short suffix; a PracticeItem is a problem outside our catalog.
   */
  practice: (string | PracticeRef | PracticeItem)[];
}

const RAW: Record<string, string> = {
  'Sliding Window': `
sliding-window-fixed|Fixed Sliding Window|Array, String|O(n) / O(1)
sliding-window-dynamic|Variable Sliding Window|Array, String|O(n) / O(k)
`,
  'Two Pointers': `
two-pointers-opposite|Opposite Ends|Sorted array, String|O(n) / O(1)
two-pointers-same|Same Direction (Slow / Fast)|Array, In-place|O(n) / O(1)
two-pointers-threesum|Sort + Fix One + Two Pointers|Array, k-Sum|O(n²) / O(1)
`,
  'Prefix Sum & Hashing': `
prefix-sum|Prefix Sum Array|Array|O(n) build, O(1) query / O(n)
hashing-frequency|Frequency Hash Map|HashMap, HashSet|O(n) / O(n)
kadane|Kadane's Algorithm|Array, DP|O(n) / O(1)
`,
  'Binary Search': `
binary-search-classic|Classic Binary Search|Sorted array|O(log n) / O(1)
binary-search-on-answer|Binary Search on Answer|Optimization, Feasibility|O(n log k) / O(1)
`,
  Stack: `
stack-simple|Simple Stack|String, Expression|O(n) / O(n)
stack-monotonic-dec|Monotonic Decreasing Stack|Next greater, Temperatures|O(n) / O(n)
stack-monotonic-inc|Monotonic Increasing Stack|Histogram, Rectangle area|O(n) / O(n)
`,
  'BFS / Grid': `
bfs-standard|Standard BFS (Level Order)|Graph, Grid|O(V + E) / O(V)
bfs-multisource|Multi-Source BFS|Grid, Min distance|O(R×C) / O(R×C)
grid-flood-fill|Grid Flood Fill (DFS)|Matrix, Connected regions|O(R×C) / O(R×C)
`,
  'Linked List': `
linkedlist-fastslow|Fast / Slow Pointers|Cycle, Middle|O(n) / O(1)
linkedlist-reversal|In-Place List Reversal|In-place|O(n) / O(1)
linkedlist-merge|Two-Pointer Merge / Remove Nth|Offset, Merge|O(n) / O(1)
`,
  Tree: `
tree-dfs|DFS Traversal|Recursion, DFS|O(n) / O(h)
tree-bfs|BFS Level Order|Queue, Levels|O(n) / O(n)
tree-paths|Tree Path Problems|Path sum, Backtrack|O(n) / O(h)
tree-bst|BST Operations|BST, Bounds|O(h) / O(h)
`,
  Backtracking: `
backtrack-subsets|Subsets / Power Set|Choose or skip|O(2ⁿ·n)
backtrack-perms|Permutations|All orders|O(n!·n)
backtrack-combos|Combinations + Pruning|Pruning, Target sum|O(2ᵗ)
`,
  Greedy: `
greedy-intervals|Sort + Greedy / Intervals|Intervals, Sort|O(n log n)
greedy-jump|Greedy Reach (Jump Game)|Array, Reach|O(n) / O(1)
`,
  'Heap / Priority Queue': `
heap-topk|Top K Elements|Min-heap, Top K|O(n log k) / O(k)
heap-two-heaps|Two Heaps (Running Median)|Median, Balance|O(log n) add, O(1) median
heap-kway|K-Way Merge|Merge K lists|O(n log k) / O(k)
`,
  Graph: `
graph-union-find|Union-Find (Disjoint Set)|Connectivity, Cycle detection|O(α(n)) / O(n)
graph-topo-sort|Topological Sort (Kahn's BFS)|DAG, Dependencies|O(V + E) / O(V)
graph-dijkstra|Dijkstra's Shortest Path|Weighted, Non-negative|O((V + E) log V)
graph-bellman-ford|Bellman-Ford / K-Stop Paths|Negative weights, K stops|O(V·E) / O(V)
graph-prims|Prim's Minimum Spanning Tree|MST, Min cost|O(E log V)
`,
  'Dynamic Programming': `
dp-1d|1D Linear DP|Fibonacci, House Robber|O(n) / O(1)
dp-2d-grid|2D Grid DP|Grid, Paths|O(R×C)
dp-two-sequence|Two-Sequence DP (LCS / Edit Distance)|String DP|O(n×m)
dp-lis|Longest Increasing Subsequence|LIS, Patience sort|O(n log n)
dp-minmax|Min / Max DP|Negatives, Product|O(n)
`,
  'Bit Manipulation': `
bits-xor|XOR Tricks|XOR, Single number|O(n) / O(1)
bits-counting|Bit Counting|Popcount, Power of two|O(1) per number
bits-modulo|Bit Modulo (Single Number II)|Mod 3, Bit columns|O(32·n)
`,
};

const BASE_GROUPS: { name: string; cards: PatternCard[] }[] = Object.entries(RAW).map(([name, body]) => ({
  name,
  cards: body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [slug, title, tags, complexity] = l.split('|');
      return { slug, group: name, title, tags: tags.split(',').map((t) => t.trim()), complexity };
    }),
}));

/** New pattern cards from the packs are appended to their family; unknown families are added at the end. */
function mergeGroups(base: { name: string; cards: PatternCard[] }[]): { name: string; cards: PatternCard[] }[] {
  const out = base.map((g) => ({ name: g.name, cards: [...g.cards] }));
  for (const pack of PACKS) {
    for (const g of pack.groups ?? []) {
      let fam = out.find((x) => x.name === g.name);
      if (!fam) {
        fam = { name: g.name, cards: [] };
        out.push(fam);
      }
      fam.cards.push(...g.cards.map((c) => ({ ...c, group: g.name })));
    }
  }
  return out;
}

/** Hero tag overrides from `src/data/detail/*` are applied last. */
export const PATTERN_GROUPS: { name: string; cards: PatternCard[] }[] = mergeGroups(BASE_GROUPS).map((g) => ({
  name: g.name,
  cards: g.cards.map((c) => (DETAIL[c.slug]?.tags ? { ...c, tags: DETAIL[c.slug].tags! } : c)),
}));

export const ALL_PATTERNS: PatternCard[] = PATTERN_GROUPS.flatMap((g) => g.cards);

const BASE_CONTENT: Record<string, PatternContent> = {
  'sliding-window-fixed': {
    animation: '643-maximum-average-subarray-i',
    summary: 'Slide a window of constant size k across the array, updating a running value instead of recomputing it.',
    whenToUse: [
      'The window size k is given or fixed by the problem',
      'You need a max, min, average, sum or count over every block of k consecutive items',
      'The brute force would re-add k numbers for every starting position',
      'Anagram / permutation checks where the window length equals the pattern length',
    ],
    tip: 'Add the element that enters, subtract the one that leaves. Never loop over the whole window again.',
    practice: [
      '643-maximum-average-subarray-i',
      { id: '219', title: 'Contains Duplicate II', difficulty: 'Easy', note: 'fixed window + HashSet', href: 'https://leetcode.com/problems/contains-duplicate-ii/' },
      { id: '1343', title: 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold', difficulty: 'Medium', href: 'https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/' },
      { id: '2461', title: 'Maximum Sum of Distinct Subarrays With Length K', difficulty: 'Medium', href: 'https://leetcode.com/problems/maximum-sum-of-distinct-subarrays-with-length-k/' },
      { slug: '239-sliding-window-maximum', note: 'fixed window + monotonic deque' },
    ],
  },
  'sliding-window-dynamic': {
    animation: '3-longest-substring-without-repeating-characters',
    summary: 'Grow the right edge until a condition holds, then shrink the left edge while it still holds. Both edges only move forward.',
    whenToUse: [
      'You want the longest or shortest contiguous subarray / substring that satisfies a condition',
      'The window size is not known in advance',
      'Adding an element can only push the window towards the condition and removing one can only pull it back (all positives, "at most k distinct", "no repeats")',
      'Brute force would test every start/end pair in O(n²)',
    ],
    tip: 'Decide what the window "owes" the condition: the loop is always expand with r, then while (condition) shrink with l.',
    practice: ['209-minimum-size-subarray-sum', '3-longest-substring-without-repeating-characters', '76-minimum-window-substring', '424-longest-repeating-character-replacement', '1004-max-consecutive-ones-iii'],
  },
  'two-pointers-opposite': {
    animation: '11-container-with-most-water',
    summary: 'Start one pointer at each end and move them towards each other, discarding whatever can no longer be part of an answer.',
    whenToUse: [
      'The array or string is sorted, or the answer depends on the two ends',
      'You are looking for a pair that meets a target (sum, area, difference)',
      'Palindrome checks and "squeeze from both sides" problems',
      'You can argue that moving one pointer never loses the best answer',
    ],
    tip: 'Ask which pointer is the bottleneck and move that one. Be ready to prove the discarded side cannot win.',
    practice: ['11-container-with-most-water', '167-two-sum-ii', '42-trapping-rain-water', '125-valid-palindrome'],
  },
  'two-pointers-same': {
    animation: '26-remove-duplicates-from-sorted-array',
    summary: 'Two pointers walk in the same direction at different speeds: one reads every item, the other marks where the next kept item is written.',
    whenToUse: [
      'You must filter, compact or partition an array in place with O(1) extra space',
      'The input is sorted, so duplicates are neighbours',
      'The output is a prefix of the input array',
    ],
    tip: 'Invariant: everything before slow is already correct. fast only reads, slow only writes.',
    practice: ['26-remove-duplicates-from-sorted-array', '75-sort-colors', '88-merge-sorted-array'],
  },
  'hashing-frequency': {
    animation: '1-two-sum',
    summary: 'Trade memory for time: a hash map or set answers "have I seen this?" or "how many of these?" in O(1).',
    whenToUse: [
      'You keep asking whether a value, complement or count already exists',
      'The brute force compares every pair (O(n²))',
      'You need frequencies, groups (anagrams) or first occurrences',
      'Order does not matter, only membership or counts',
    ],
    tip: 'Look the answer up before you insert the current element, so an element is never matched with itself.',
    practice: ['1-two-sum', '217-contains-duplicate', '49-group-anagrams', '128-longest-consecutive-sequence'],
  },
  kadane: {
    animation: '53-maximum-subarray',
    summary: 'Keep the best sum of a subarray that ends at the current index. At each step either extend it or start fresh.',
    whenToUse: [
      'You want the maximum (or minimum) sum of a contiguous subarray',
      'The array mixes positive and negative numbers',
      'A running total that goes negative is worse than starting over',
    ],
    tip: 'cur = max(x, cur + x). Track the best answer separately, because the best subarray may end before the last index.',
    practice: ['53-maximum-subarray', '121-best-time-to-buy-and-sell-stock', '152-maximum-product-subarray'],
  },
  'binary-search-classic': {
    animation: '704-binary-search',
    summary: 'On a sorted (or monotone) range, test the middle and throw away the half that cannot contain the answer.',
    whenToUse: [
      'The data is sorted, or a yes/no condition flips exactly once across the range',
      'You need to find a value, an insertion point, or the first / last position that satisfies something',
      'The problem asks for O(log n)',
    ],
    tip: 'Compute mid as lo + (hi − lo) / 2 to avoid overflow, and decide up front whether hi is inclusive or exclusive.',
    practice: ['704-binary-search', '35-search-insert-position', '34-find-first-and-last-position', '33-search-in-rotated-sorted-array', '162-find-peak-element'],
  },
  'stack-simple': {
    animation: '20-valid-parentheses',
    summary: 'A stack remembers unfinished work in last-in, first-out order — perfect for anything nested.',
    whenToUse: [
      'Brackets, tags or any nested structure that must close in the right order',
      'Evaluating expressions (postfix, calculators)',
      'You need the most recent unresolved item, and undoing it is "pop"',
    ],
    tip: 'Decide what goes on the stack (the item, its index, or a running value) before you write the loop.',
    practice: ['20-valid-parentheses', '150-evaluate-reverse-polish-notation', '155-min-stack', '224-basic-calculator'],
  },
  'stack-monotonic-dec': {
    animation: '739-daily-temperatures',
    summary: 'Keep a stack whose values only go down. When a bigger value arrives, everything it beats is resolved and popped.',
    whenToUse: [
      'You need the next greater (or next warmer) element for every position',
      'Each element needs the nearest item to its right (or left) with some ordering',
      'A naive nested loop would be O(n²)',
    ],
    tip: 'Store indexes, not values, so you can compute distances. Every element is pushed once and popped once — that is why it is O(n).',
    practice: [
      '496-next-greater-element-i',
      '739-daily-temperatures',
      { id: '503', title: 'Next Greater Element II', difficulty: 'Medium', note: 'circular array: loop twice', href: 'https://leetcode.com/problems/next-greater-element-ii/' },
      { id: '901', title: 'Online Stock Span', difficulty: 'Medium', note: 'stack of (price, span)', href: 'https://leetcode.com/problems/online-stock-span/' },
    ],
  },
  'linkedlist-reversal': {
    animation: '206-reverse-linked-list',
    summary: 'Walk the list once, flipping each next pointer to point backwards while keeping hold of the rest.',
    whenToUse: [
      'You must reverse all or part of a list in place',
      'A problem needs the second half reversed (palindrome check, reorder)',
      'Nodes must be processed in groups of k',
    ],
    tip: 'Always save curr.next before overwriting it. Draw prev / curr / next on paper once and the code writes itself.',
    practice: ['206-reverse-linked-list', '92-reverse-linked-list-ii', '25-reverse-nodes-in-k-group', '234-palindrome-linked-list'],
  },
  'tree-dfs': {
    animation: '104-maximum-depth-of-binary-tree',
    summary: 'Recurse into the left and right subtrees, then combine their answers. Most tree problems are this one idea.',
    whenToUse: [
      'The answer for a node depends on the answers of its children (height, balance, diameter)',
      'You need a traversal order (pre-, in- or post-order)',
      'You are searching for a node or checking a property across the whole tree',
    ],
    tip: 'Define exactly what the function returns for a null node and for one node — everything else follows by induction.',
    practice: ['104-maximum-depth-of-binary-tree', '543-diameter-of-binary-tree', '110-balanced-binary-tree', '226-invert-binary-tree', '236-lowest-common-ancestor'],
  },
  'grid-flood-fill': {
    animation: '200-number-of-islands',
    summary: 'Treat a grid as a graph: from any cell, spread to its neighbours and mark everything you reach as visited.',
    whenToUse: [
      'You must count, measure or label connected regions in a matrix',
      'Moves are up / down / left / right (or 8 directions) between similar cells',
      'Every region should be handled exactly once',
    ],
    tip: 'Mark a cell visited the moment you enter it, not when you leave, or you will loop forever. Check bounds first.',
    practice: ['200-number-of-islands', '79-word-search', '73-set-matrix-zeroes'],
  },
  'dp-1d': {
    animation: '70-climbing-stairs',
    summary: 'Define a table where entry i answers the problem for the first i items, and build it from earlier entries.',
    whenToUse: [
      'The answer for size i can be built from the answers for smaller sizes',
      'A recursive solution recomputes the same subproblems again and again',
      'You are counting ways, or minimising / maximising over choices at each position',
    ],
    tip: 'Write the recurrence in words first ("last move came from i−1 or i−2"), then fix the base cases, then the loop order.',
    practice: ['70-climbing-stairs', '746-min-cost-climbing-stairs', '198-house-robber', '322-coin-change', '91-decode-ways'],
  },
};

/** First 13 pages (above, with their templates) plus everything in patternContent.ts. */
const BASE_WITH_TEMPLATES: Record<string, PatternContent> = Object.fromEntries(
  Object.entries(BASE_CONTENT).map(([slug, c]) => [slug, { ...c, template: c.template ?? TEMPLATES[slug] }]),
);
const MERGED_CONTENT: Record<string, PatternContent> = {
  ...BASE_WITH_TEMPLATES,
  ...EXTRA_CONTENT,
  ...Object.assign({}, ...PACKS.map((p) => p.content ?? {})),
};
/** Per-pattern overrides from `src/data/detail/*` replace individual fields last. */
export const CONTENT: Record<string, PatternContent> = Object.fromEntries(
  Object.entries(MERGED_CONTENT).map(([slug, c]) => [slug, DETAIL[slug]?.content ? { ...c, ...DETAIL[slug].content } : c]),
);

/**
 * The worked examples of a pattern: at least 3 different animated problems, each with a note on what it adds.
 * Patterns whose pack has not supplied examples yet fall back to their single flagship animation.
 */
export function examplesFor(slug: string): PatternExample[] {
  if (DETAIL[slug]?.examples?.length) return DETAIL[slug].examples!;
  const fromPacks = PACKS.flatMap((p) => p.examples?.[slug] ?? []);
  if (fromPacks.length) return fromPacks;
  const c = CONTENT[slug];
  return c ? [{ slug: c.animation, why: '' }] : [];
}
