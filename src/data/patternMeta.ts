/**
 * Per-pattern copy for the single-pattern page (header pill, hero line, tip box, complexity note).
 * `highlight` lists phrases that are emphasised (cyan) wherever they occur in the page title and the
 * "when to use" bullets (case-insensitive substring match).
 *
 * This file holds the type and the BASE layer (the original 44 patterns). It is a lazily loaded source of the pattern
 * text; the merged PATTERN_META lives in ./patternsFull.ts (Node) and ./patternText/resolve.ts (browser).
 */

export interface PatternMeta {
  /** Emoji shown in the hero and the header pill. */
  icon: string;
  /** Short caps label for the header pill. */
  label: string;
  /** One-line hero description. */
  desc: string;
  /** Text of the tip box under "When to use". */
  useNote: string;
  /** Short explanation under the Time / Space cards. */
  complexityNote: string;
  highlight: string[];
}

export const BASE_META: Record<string, PatternMeta> = {
  'sliding-window-fixed': {
    icon: '📏', label: 'Fixed',
    desc: 'A window of constant size k glides over the data. Each move adds the newcomer and drops the oldest, so one step costs O(1).',
    useNote: 'Recomputing every block from scratch costs O(n·k). Carrying a running value forward brings it down to O(n).',
    complexityNote: 'Every element enters the window once and leaves it once. One pass, and only a couple of variables are kept.',
    highlight: ['Sliding Window', 'window size k', 'max, min, average, sum or count', 'every block of k', 'window length'],
  },
  'sliding-window-dynamic': {
    icon: '🪟', label: 'Variable',
    desc: 'Stretch the right edge until the window is valid, then pull the left edge in while it stays valid. Neither edge ever goes back.',
    useNote: 'Think "expand to satisfy, shrink to optimise". Each index is added once and removed once, so the loop is linear.',
    complexityNote: 'Both pointers only move forward, giving at most 2n moves. Extra space depends on what the window must track, for example a map of counts.',
    highlight: ['Sliding Window', 'Variable', 'longest or shortest', 'not known in advance', 'at most k distinct'],
  },
  'two-pointers-opposite': {
    icon: '↔️', label: 'Opposite',
    desc: 'One pointer starts at each end and they walk toward each other, discarding the side that cannot improve the answer.',
    useNote: 'Before moving a pointer, be able to say why the discarded position can never be part of a better answer.',
    complexityNote: 'The two pointers cover the array between them exactly once. No extra storage is needed.',
    highlight: ['Opposite Ends', 'sorted', 'pair that meets a target', 'squeeze from both sides', 'two ends'],
  },
  'two-pointers-same': {
    icon: '🐢', label: 'Slow / Fast',
    desc: 'A fast pointer scans every element while a slow pointer marks where the next kept element belongs. The array is rewritten in place.',
    useNote: 'Invariant to remember: everything left of slow is already final. fast reads, slow writes.',
    complexityNote: 'A single left-to-right scan with two indices. The result overwrites the input, so no extra array is allocated.',
    highlight: ['Slow / Fast', 'in place', 'O(1) extra space', 'duplicates are neighbours', 'prefix'],
  },
  'two-pointers-threesum': {
    icon: '🔱', label: 'k-Sum',
    desc: 'Sort the data, fix one element, then sweep a pair of pointers over the rest to find every combination that hits the target.',
    useNote: 'Skip repeated values at the fixed position and after each hit, otherwise duplicate triplets slip into the answer.',
    complexityNote: 'Sorting is O(n log n); the n sweeps of O(n) dominate. Apart from the output only a few indices are stored.',
    highlight: ['Two Pointers', 'all unique tuples', 'Sorting the input', 'O(n²)', 'Duplicates must not appear'],
  },
  'prefix-sum': {
    icon: '➕', label: 'Prefix',
    desc: 'Precompute running totals once, then answer any range query with a single subtraction.',
    useNote: 'Let prefix[0] = 0 so that sum(l..r) = prefix[r+1] - prefix[l] works even when the range starts at index 0.',
    complexityNote: 'Building the table takes one pass and O(n) memory; after that every range sum is two lookups and a subtraction.',
    highlight: ['Prefix Sum', 'sum of many different subarrays', 'count subarrays with a given sum', 'without division', 'does not change'],
  },
  'hashing-frequency': {
    icon: '🗂️', label: 'Hash',
    desc: 'Spend memory to save time: a map or set tells you in O(1) whether something was seen and how often.',
    useNote: 'Ask the map about the current element before inserting it. That way a value is never paired with itself.',
    complexityNote: 'One scan with constant-time lookups. The price is a table that can grow to hold every distinct element.',
    highlight: ['Frequency Hash Map', 'already exists', 'compares every pair', 'frequencies', 'membership or counts'],
  },
  kadane: {
    icon: '📈', label: 'Kadane',
    desc: 'Track the best subarray that ends at the current index: extend the previous one or start over, whichever is larger.',
    useNote: 'cur = max(x, cur + x). Keep the global best in a separate variable, since the winner may end before the last index.',
    complexityNote: 'One pass with two running numbers, a current sum and a best sum.',
    highlight: ["Kadane's Algorithm", 'maximum (or minimum) sum', 'positive and negative', 'starting over'],
  },
  'binary-search-classic': {
    icon: '🔍', label: 'Halving',
    desc: 'Test the middle of a sorted range and throw away the half that cannot contain the target. Repeat until one candidate is left.',
    useNote: 'Pick an invariant up front (is hi inclusive?) and keep every update consistent with it. Most bugs are off-by-one.',
    complexityNote: 'The range halves every round, so about log2(n) probes are enough. Only lo, hi and mid are stored.',
    highlight: ['Binary Search', 'sorted', 'flips exactly once', 'first / last position', 'O(log n)'],
  },
  'binary-search-on-answer': {
    icon: '🎯', label: 'On answer',
    desc: 'Binary search over the possible answers instead of the data: guess a value, test if it works, and narrow the range.',
    useNote: 'Write the feasibility check first and try it by hand on two guesses; the search loop is then mechanical.',
    complexityNote: 'log(range) guesses, each verified with an O(n) scan. Memory stays constant.',
    highlight: ['on Answer', 'minimum value that is enough', 'feasibility check', 'monotone', 'numeric range'],
  },
  'stack-simple': {
    icon: '🥞', label: 'Stack',
    desc: 'Last in, first out: a stack remembers unfinished work and hands back the most recent item first.',
    useNote: 'Decide what to store (the value, its index or a running result) before writing the loop, and what a pop means.',
    complexityNote: 'Each item is pushed and popped at most once. In the worst case everything sits on the stack at the same time.',
    highlight: ['Simple Stack', 'nested structure', 'most recent unresolved item', 'Evaluating expressions'],
  },
  'stack-monotonic-dec': {
    icon: '📉', label: 'Mono ↓',
    desc: 'Keep a stack whose values only fall. A bigger newcomer settles every smaller item below it, which is popped with its answer.',
    useNote: 'Push indices rather than values so distances come for free. Each element is pushed once and popped once.',
    complexityNote: 'The inner popping never repeats work, so the total is linear. The stack may hold all elements for a decreasing input.',
    highlight: ['Monotonic Decreasing Stack', 'next greater', 'nearest item', 'O(n²)'],
  },
  'stack-monotonic-inc': {
    icon: '📊', label: 'Mono ↑',
    desc: 'Keep a stack of rising values; when a smaller one arrives, the taller bars are finalised and their reach is measured.',
    useNote: 'Add a sentinel 0 at the end so leftover bars are flushed by the same code. Width after a pop is i - top - 1.',
    complexityNote: 'Linear: every bar goes onto the stack once and comes off once. Worst case the stack holds the whole input.',
    highlight: ['Monotonic Increasing Stack', 'nearest smaller element', 'rectangle, span or range', 'histogram', 'smallest result'],
  },
  'bfs-standard': {
    icon: '🌊', label: 'BFS',
    desc: 'Explore a graph in expanding rings from the start using a queue, so the first time you reach a node is by a shortest route.',
    useNote: 'Mark a node as visited when it is enqueued, not when it is dequeued, or duplicates flood the queue.',
    complexityNote: 'Every vertex enters the queue once and every edge is looked at once. The queue and visited set grow with V.',
    highlight: ['Standard BFS', 'minimum number of steps', 'grouped by level', 'implicit', 'shortest one'],
  },
  'bfs-multisource': {
    icon: '🔥', label: 'Multi-source',
    desc: 'Start the wave from every source at once. All of them spread together, one ring per tick of the clock.',
    useNote: 'Count what is left to reach, decrement as the wave touches it, and report "impossible" if the queue dies first.',
    complexityNote: 'One combined BFS touches each cell a constant number of times; the queue may hold a whole frontier.',
    highlight: ['Multi-Source BFS', 'simultaneously', 'distance to the closest', 'one BFS per source', 'rounds'],
  },
  'grid-flood-fill': {
    icon: '🧭', label: 'Flood fill',
    desc: 'Treat the grid as a graph. From a start cell, spread to neighbours and mark everything reached so no region is visited twice.',
    useNote: 'Mark a cell the moment you step on it and test bounds first. Otherwise the search never terminates.',
    complexityNote: 'Each cell is processed once. The recursion or stack can reach the size of the largest region.',
    highlight: ['Flood Fill', 'connected regions', 'up / down / left / right', 'exactly once'],
  },
  'linkedlist-fastslow': {
    icon: '🏃', label: 'Fast / Slow',
    desc: 'Two pointers move at different speeds along the list. Where they meet, or where one ends, reveals a cycle or the middle.',
    useNote: 'Check fast and fast.next before stepping twice. On even lengths slow lands on the second middle node.',
    complexityNote: 'Fast covers the list at most about twice. Only two references are kept, no visited set.',
    highlight: ['Fast / Slow', 'detect a cycle', 'middle node', 'forbids extra memory', 'cycle begins'],
  },
  'linkedlist-reversal': {
    icon: '🔄', label: 'Reverse',
    desc: 'Walk the list once and point each node backwards at the one before it, holding on to the rest so nothing is lost.',
    useNote: 'Save curr.next before you overwrite it. Sketch prev, curr and next once and the loop writes itself.',
    complexityNote: 'One visit per node and three references in memory, so no additional structure is allocated.',
    highlight: ['In-Place', 'reverse all or part', 'second half reversed', 'groups of k'],
  },
  'linkedlist-merge': {
    icon: '🧵', label: 'Merge',
    desc: 'Use two pointers with an offset or two sorted heads, plus a dummy node, to relink a list in a single pass.',
    useNote: 'A dummy node in front of the head removes every "what if the head changes" special case. Return dummy.next.',
    complexityNote: 'The lists are traversed once, with nodes relinked rather than copied.',
    highlight: ['Remove Nth', 'nth node from the end', 'merged into one sorted list', 'dummy node', 'different lengths'],
  },
  'tree-dfs': {
    icon: '🌲', label: 'DFS',
    desc: 'Recurse down both subtrees and combine what they return. Most tree questions are variations of this one move.',
    useNote: 'Say precisely what the function returns for an empty tree; the rest follows by induction.',
    complexityNote: 'Each node is visited once. The call stack is as deep as the tree is tall: log n if balanced, n if skewed.',
    highlight: ['DFS Traversal', 'answers of its children', 'traversal order', 'whole tree'],
  },
  'tree-bfs': {
    icon: '🪜', label: 'Levels',
    desc: 'Visit the tree one level at a time with a queue, which makes depth-based questions easy.',
    useNote: 'Take len(queue) before the inner loop: that is the width of the level. Newly queued nodes belong to the next one.',
    complexityNote: 'Each node enters the queue once; the queue never exceeds the width of the widest level.',
    highlight: ['Level Order', 'organised by level', 'shallowest node', 'zigzag', 'deep recursion'],
  },
  'tree-paths': {
    icon: '🛤️', label: 'Paths',
    desc: 'Carry state down the tree (target left, number built) and decide at leaves or bends. Undo choices on the way back up.',
    useNote: 'Copy the current path when you store it at a leaf and pop on the way back, or every stored answer shares one list.',
    complexityNote: 'Every node is visited once; copying the paths adds up to O(n · h) in the worst case. The recursion is h deep.',
    highlight: ['Path', 'root-to-leaf', 'every path', 'pass down', 'bend at a node'],
  },
  'tree-bst': {
    icon: '🔎', label: 'BST',
    desc: 'The ordering of a binary search tree lets every step discard one subtree, and an in-order walk comes out sorted.',
    useNote: 'Comparing a node only with its children is a classic bug. Pass down a shrinking (low, high) interval instead.',
    complexityNote: 'One root-to-leaf walk per operation: O(log n) when balanced, O(n) for a degenerate chain.',
    highlight: ['BST', 'search, insert, delete', 'kth smallest', 'really is a BST', 'middle'],
  },
  'backtrack-subsets': {
    icon: '🧩', label: 'Subsets',
    desc: 'For each item decide: in or out. Recurse on both branches and undo the choice afterwards to enumerate every subset.',
    useNote: 'Choose, explore, unchoose. To avoid duplicates, sort first and skip an item equal to its predecessor at the same depth.',
    complexityNote: 'There are 2ⁿ subsets and copying each costs up to n. The recursion itself is n levels deep.',
    highlight: ['Subsets', 'every subset', 'in the answer or not', '20 or fewer', 'distinct subsets'],
  },
  'backtrack-perms': {
    icon: '🔀', label: 'Perms',
    desc: 'Build an arrangement one slot at a time, picking any unused item and releasing it again when you backtrack.',
    useNote: 'Keep a used[] array, clear it on the way back, and store a copy of the path when its length reaches n.',
    complexityNote: 'n! results, each copied in O(n). The recursion depth and the used array are both of size n.',
    highlight: ['Permutations', 'order of the chosen items matters', 'every arrangement', 'still available', 'n!'],
  },
  'backtrack-combos': {
    icon: '✂️', label: 'Prune',
    desc: 'Choose items in index order so each set appears once, and cut a branch the moment it can no longer succeed.',
    useNote: 'Pass a start index so you only look forward. Sorting lets you break out of the loop as soon as one candidate overshoots.',
    complexityNote: 'Exponential in the worst case, but pruning removes huge parts of the search. Space is the recursion depth.',
    highlight: ['Combinations', 'order does not matter', 'reused', 'cut a branch early', 'far too slow'],
  },
  'greedy-intervals': {
    icon: '📅', label: 'Intervals',
    desc: 'Sort the ranges first, then make one pass keeping a running boundary to merge, count or discard overlaps.',
    useNote: 'Choose the sort key by the question: by start to merge, by end to keep the most non-overlapping ranges.',
    complexityNote: 'Sorting dominates at O(n log n); the sweep after it is a single pass.',
    highlight: ['Intervals', 'merge, insert, count overlaps', 'Sorting', 'minimum number of resources', 'earliest finishing'],
  },
  'greedy-jump': {
    icon: '🦘', label: 'Reach',
    desc: 'At each position update the furthest point reachable. If the scan ever gets beyond that point, the end is out of reach.',
    useNote: 'reach = max(reach, i + nums[i]); fail when i > reach. For the fewest jumps, count one each time you finish the current window.',
    complexityNote: 'A single left-to-right pass with two integers, so no table of subproblems is needed.',
    highlight: ['Jump Game', 'how far you can move', 'maximum reach', 'O(n²)', 'single pass'],
  },
  'heap-topk': {
    icon: '🏔️', label: 'Top K',
    desc: 'Keep a heap of only k items. Every newcomer competes with the weakest member, which is evicted when the heap is too big.',
    useNote: 'For the k largest use a min-heap of size k; the top is the cheapest candidate to kick out.',
    complexityNote: 'n pushes into a heap of size k cost O(log k) each. Memory is just the k items held.',
    highlight: ['Top K', 'k largest', 'k is much smaller than n', 'stream', 'current maximum or minimum'],
  },
  'heap-two-heaps': {
    icon: '⚖️', label: 'Two heaps',
    desc: 'A max-heap holds the lower half and a min-heap the upper half, so the median always sits at one of the two tops.',
    useNote: 'Insert into the lower half, move its top over, then rebalance so the lower half is equal or one larger.',
    complexityNote: 'Insertion is O(log n) for the heap pushes; reading the median is a peek at the tops.',
    highlight: ['Two Heaps', 'running median', 'inserted continuously', 'smaller half and a larger half', 're-sorting'],
  },
  'heap-kway': {
    icon: '🔗', label: 'K-way',
    desc: 'Put the head of each sorted list into a heap, repeatedly take the smallest, and refill from the list it came from.',
    useNote: 'Store (value, which list, position) in the heap so you know where the successor lives. Skip empty lists.',
    complexityNote: 'n items each pass through a heap of at most k entries. Memory is O(k) beyond the output.',
    highlight: ['K-Way Merge', 'k sorted lists', 'smallest element across', 'too slow', 'too large to concatenate'],
  },
  'graph-union-find': {
    icon: '🤝', label: 'Union-Find',
    desc: 'Track which nodes belong together. Unions merge two groups; a find tells you a node\'s group leader almost instantly.',
    useNote: 'Use path compression and union by size. If find(a) equals find(b) before a union, that edge closes a cycle.',
    complexityNote: 'Each operation costs inverse-Ackermann time, practically constant. The parent array uses O(n).',
    highlight: ['Union-Find', 'already connected', 'closes a cycle', 'connected components', 'too slow'],
  },
  'graph-topo-sort': {
    icon: '📋', label: 'Topo sort',
    desc: 'Repeatedly take a task with no unmet prerequisites, emit it, and release the tasks that were waiting on it.',
    useNote: 'If you emit fewer nodes than exist, a cycle blocked the rest. Draw edges from prerequisite to dependent.',
    complexityNote: 'Each vertex is queued once and each edge is relaxed once. In-degree counts and the queue need O(V).',
    highlight: ['Topological Sort', 'dependencies', 'no cycle', 'directed', 'more than one valid order'],
  },
  'graph-dijkstra': {
    icon: '🚦', label: 'Dijkstra',
    desc: 'Always settle the closest unsettled node next using a priority queue, then try to shorten the routes through it.',
    useNote: 'Skip popped entries that are worse than the best known distance. Negative edges break the greedy guarantee.',
    complexityNote: 'Each edge may push one entry to the heap, so work is E log V. Distances and the heap need O(V + E).',
    highlight: ["Dijkstra's", 'non-negative weights', 'cheapest path', 'every other node', 'BFS fails'],
  },
  'graph-bellman-ford': {
    icon: '🔁', label: 'Bellman-Ford',
    desc: 'Relax every edge in rounds. After r rounds the distances are right for all paths using at most r edges.',
    useNote: 'For "at most k stops" run k+1 rounds and relax from a copy of the previous round, so one round never chains edges.',
    complexityNote: 'V rounds over E edges give V·E work; one or two distance arrays are all the memory needed.',
    highlight: ['Bellman-Ford', 'negative', 'at most k edges', 'negative cycle', 'V * E'],
  },
  'graph-prims': {
    icon: '🕸️', label: 'MST',
    desc: 'Grow a tree from one node, always attaching the cheapest edge that reaches a new node, until everything is joined.',
    useNote: 'A node\'s key is its cheapest single edge into the tree, not its distance from the start. Kruskal is the alternative.',
    complexityNote: 'A heap gives E log V; each node and edge is touched a bounded number of times, with O(V) extra memory.',
    highlight: ["Prim's", 'minimum total edge cost', 'n - 1 edges', 'dense or implicit', 'link things'],
  },
  'dp-1d': {
    icon: '🧱', label: '1D',
    desc: 'Let entry i answer the problem for the first i items and fill the table left to right from earlier entries.',
    useNote: 'State the recurrence in words, then fix the base cases, then decide the loop order. Often two variables replace the table.',
    complexityNote: 'One pass of O(1) work per entry. Keep only the last couple of values to get constant space.',
    highlight: ['Linear DP', 'smaller sizes', 'again and again', 'counting ways', 'minimising / maximising'],
  },
  'dp-2d-grid': {
    icon: '🗺️', label: 'Grid DP',
    desc: 'Each cell\'s answer comes from the cells above and to the left, so the table can be filled row by row.',
    useNote: 'Fill the first row and column as base cases. Because a row only needs the one before it, one row of memory is enough.',
    complexityNote: 'R×C cells with constant work each. A rolling row cuts memory from R×C to C.',
    highlight: ['Grid DP', 'right and down', 'neighbours already computed', 'exponentially often'],
  },
  'dp-two-sequence': {
    icon: '🧬', label: 'Two seq.',
    desc: 'Cell (i, j) compares the first i items of one sequence with the first j of the other, built from smaller prefixes.',
    useNote: 'Allocate (n+1) × (m+1) so row 0 and column 0 stand for the empty prefix. Edit distance adds 1 to the cheapest neighbour.',
    complexityNote: 'n×m cells, each filled in constant time. Keeping only two rows reduces memory to O(m).',
    highlight: ['Two-Sequence', 'Edit Distance', 'longest shared piece', 'fewest edits', 'prefixes'],
  },
  'dp-lis': {
    icon: '🪜', label: 'LIS',
    desc: 'Find the longest strictly rising subsequence, either by DP over earlier elements or with a tails array and binary search.',
    useNote: 'tails[k] is the smallest tail of any increasing run of length k+1. Its length is the answer, but its contents are not a valid run.',
    complexityNote: 'Binary search per element gives n log n; the tails array needs at most n slots.',
    highlight: ['Longest Increasing Subsequence', 'longest chain', 'strictly smaller', 'need not be contiguous', 'a length'],
  },
  'dp-minmax': {
    icon: '⚡', label: 'Min / Max',
    desc: 'Track both the largest and the smallest value ending here, because a negative multiplier can swap them.',
    useNote: 'Consider x, x·curMax and x·curMin; save the old curMax in a temp before updating it.',
    complexityNote: 'One scan with two running values, so constant memory.',
    highlight: ['Min / Max DP', 'negative', 'single running best', 'max and min', 'Zeroes'],
  },
  'bits-xor': {
    icon: '⚙️', label: 'XOR',
    desc: 'XOR cancels equal values, so a fold over the array leaves the odd one out without any extra storage.',
    useNote: 'For two singles, XOR everything, isolate one differing bit with x & -x, and split the numbers into two groups by that bit.',
    complexityNote: 'One pass over the data and a few integers of state.',
    highlight: ['XOR', 'appears twice', 'missing or duplicated', 'distinguishing bit', 'temporary'],
  },
  'bits-counting': {
    icon: '🔢', label: 'Bit count',
    desc: 'Clear the lowest set bit with n & (n - 1) to count ones, test powers of two, or reuse earlier counts.',
    useNote: 'Loop while n != 0 using n &= n - 1: it runs once per set bit. Use >>> in Java when negatives are possible.',
    complexityNote: 'At most one step per set bit, bounded by the word size (32 or 64), so effectively constant per number.',
    highlight: ['Bit Counting', 'population count', 'power-of-two', 'without arithmetic operators', 'smaller number'],
  },
  'bits-modulo': {
    icon: '🧮', label: 'Mod bits',
    desc: 'Count the ones in each of the 32 bit columns modulo k. The columns that remain set spell out the lone element.',
    useNote: 'Build the answer in a 32-bit int so a set high bit becomes a negative automatically in Java (Python needs a manual fix).',
    complexityNote: '32 columns times n numbers gives O(32·n) time with only a fixed number of counters.',
    highlight: ['Bit Modulo', 'appears k times', 'XOR alone is not enough', '32 bit columns', 'constant extra space'],
  },
};
