import type { DetailMap } from './types.ts';

// Batch d3 part d: heap-topk, heap-two-heaps, heap-kway, divide-and-conquer (text overrides, merged by d3.ts).
const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const d3d: DetailMap = {
  'heap-topk': {
    tags: ['Min-heap of size k', 'k-th largest', 'Evict the root', 'Stream friendly'],
    content: {
      whenToUse: [
        'You need the **k largest, k smallest, k most frequent or k closest** items rather than a full ordering: Kth Largest Element, Top K Frequent Elements, K Closest Points to Origin. A heap holding k items answers all of them without sorting all n.',
        '**k is much smaller than n**, so sorting everything in O(n log n) wastes work. A heap capped at k items costs O(n log k) time and only O(k) memory, which matters when n is huge and k is something like 10.',
        'Data arrives as a **stream or is too large to hold**, and the current top k must be ready at any moment (Kth Largest Element in a Stream). Each newcomer is compared with the root, then either evicts it or is dropped, in O(log k).',
        'The ranking key is **derived, not stored**: a frequency count, a squared distance, or a word count with an alphabetical tie-break. Compute the key once, push (key, item) pairs and let a comparator decide which candidate is weakest.',
        'You repeatedly need the **current maximum or minimum while removing it**: smash the two heaviest stones, run the longest task first, always expand the cheapest option. A priority queue gives each removal in O(log n) instead of a rescan.',
      ],
      tip: 'Invariant: the heap always holds the k best values seen so far, and its root is the weakest. One comparison with the root decides if a newcomer belongs; use a min-heap for the k largest.',
      practice: [
        { id: '703', title: 'Kth Largest Element in a Stream', difficulty: 'Easy', note: 'a permanent min-heap of size k', href: LC('kth-largest-element-in-a-stream') },
        { slug: '1046-last-stone-weight', note: 'max-heap, repeatedly take the two heaviest' },
        '215-kth-largest-element-in-an-array',
        { slug: '347-top-k-frequent-elements', note: 'heap ordered by count' },
        { slug: '973-k-closest-points-to-origin', note: 'max-heap on squared distance' },
        { slug: '658-find-k-closest-elements', note: 'the same eviction idea on a sorted array' },
        { id: '692', title: 'Top K Frequent Words', difficulty: 'Medium', note: 'tie-break alphabetically in the comparator', href: LC('top-k-frequent-words') },
        { id: '451', title: 'Sort Characters By Frequency', difficulty: 'Medium', note: 'count, then pop the most frequent first', href: LC('sort-characters-by-frequency') },
      ],
    },
    meta: {
      useNote: 'Invariant: the heap always holds the k best values so far and the root is the weakest. For the k largest use a min-heap; for the k smallest, a max-heap.',
      complexityNote: 'Each of the n items is compared with the root and causes at most one push and one pop on a heap of size k, so time is O(n log k). The heap never exceeds k items: space is O(k).',
      highlight: ['k largest, k smallest, k most frequent or k closest', 'k is much smaller than n', 'stream or is too large to hold', 'derived, not stored', 'current maximum or minimum while removing it'],
    },
  },

  'heap-two-heaps': {
    tags: ['Max-heap + min-heap', 'Balance invariant', 'O(1) median', 'Streaming data'],
    content: {
      whenToUse: [
        'You need a **running median** of a growing collection: Find Median from Data Stream, or the median of every window of k numbers. Keeping the lower half in a max-heap and the upper half in a min-heap puts the middle at the two roots.',
        'Values are **inserted continuously with queries in between**, so re-sorting, or inserting into a sorted array with O(n) shifting, is too slow. Two heaps cost O(log n) per insert and O(1) per median query, however long the stream gets.',
        'You must watch the **boundary between a smaller half and a larger half**: the largest of the cheap items and the smallest of the expensive ones. Split orders by price, tasks by cost or scores by rank and read the boundary from the roots.',
        'Two selection rules interact, as in **IPO (capital, then profit)**: a min-heap releases projects as you can afford them, and a max-heap picks the most profitable of the unlocked ones. The heaps hold different keys of the same items.',
        'Items also **leave the structure**, as in Sliding Window Median. Deleting from the middle of a heap is costly, so mark the entry stale, track the live sizes separately and discard stale entries lazily when they reach a root.',
      ],
      tip: 'Push into the lower max-heap, move its top to the upper min-heap, and if the upper side grows bigger move its top back. The lower half stays equal or one larger; the median is a peek.',
      practice: [
        '295-find-median-from-data-stream',
        { slug: '480-sliding-window-median', note: 'two heaps with lazy deletion' },
        { slug: '502-ipo', note: 'min-heap by capital, max-heap by profit' },
        { slug: '1046-last-stone-weight', note: 'warm-up: one max-heap, two pops per round' },
        { id: '1642', title: 'Furthest Building You Can Reach', difficulty: 'Medium', note: 'heap of the biggest climbs', href: LC('furthest-building-you-can-reach') },
        { id: '2542', title: 'Maximum Subsequence Score', difficulty: 'Medium', note: 'sort one key, heap the other', href: LC('maximum-subsequence-score') },
        { id: '2102', title: 'Sequentially Ordinal Rank Tracker', difficulty: 'Hard', note: 'a moving boundary between two heaps', href: LC('sequentially-ordinal-rank-tracker') },
      ],
    },
    meta: {
      useNote: 'Insert into the lower half, move its top over, then rebalance so the lower half is equal or one larger; the median is then at the roots.',
      complexityNote: 'Each insert makes a constant number of pushes and pops on heaps of about n/2 items, so addNum is O(log n). findMedian only peeks at the two roots, O(1). Together the heaps hold all n values, so space is O(n).',
      highlight: ['running median', 'inserted continuously with queries in between', 'boundary between a smaller half and a larger half', 'IPO (capital, then profit)', 'leave the structure'],
    },
  },

  'heap-kway': {
    tags: ['Min-heap of heads', 'k sorted sources', 'Pop and refill', 'O(N log k)'],
    content: {
      whenToUse: [
        'You must **merge k sorted lists, arrays or streams** into one sorted output: Merge K Sorted Lists, merging k log files by timestamp, or combining sorted shards. The heap holds one head per list, so the global minimum is always at the root.',
        'Comparing all k heads for every output item costs O(k) each, **O(Nk) overall**. A min-heap of size k brings each extraction down to O(log k), a large win when k is in the hundreds or thousands.',
        'Several sorted sources must be **explored in order without merging everything**: the k-th smallest in a sorted matrix, the k pairs with smallest sums, the n-th ugly number. Pop only k times and push each popped item\'s successor.',
        'The sources are **too large to concatenate and sort in memory**, or arrive as streams. Only one element per source is resident at a time, so memory is O(k) beyond the output while each source is read sequentially.',
        'A window must cover **at least one element from every list**, as in Smallest Range Covering Elements from K Lists. The heap yields the current minimum (the left edge), a running maximum gives the right edge, and each pop tries to shrink the range.',
      ],
      tip: 'Store (value, list index, position) in the heap, or the node itself with a comparator, so you know where the successor lives. Seed with every non-empty list, then pop the smallest and push its next.',
      practice: [
        '88-merge-sorted-array',
        '21-merge-two-sorted-lists',
        '23-merge-k-sorted-lists',
        { slug: '378-kth-smallest-element-in-a-sorted-matrix', note: 'each row is a sorted list' },
        { slug: '632-smallest-range-covering-elements-from-k-lists', note: 'heap min plus running max' },
        { id: '373', title: 'Find K Pairs with Smallest Sums', difficulty: 'Medium', note: 'heap of (i, j) frontiers', href: LC('find-k-pairs-with-smallest-sums') },
        { id: '264', title: 'Ugly Number II', difficulty: 'Medium', note: 'merge the streams x2, x3, x5', href: LC('ugly-number-ii') },
        { id: '313', title: 'Super Ugly Number', difficulty: 'Medium', note: 'k streams, one per prime', href: LC('super-ugly-number') },
      ],
    },
    meta: {
      useNote: 'Keep (value, which list, position) in the heap so the successor is easy to find, and skip empty lists when seeding it.',
      complexityNote: 'Each of the N total elements is pushed once and popped once on a heap of at most k entries, so time is O(N log k). The heap holds one head per list, so extra space is O(k).',
      highlight: ['merge k sorted lists, arrays or streams', 'O(Nk) overall', 'explored in order without merging everything', 'too large to concatenate and sort in memory', 'at least one element from every list'],
    },
  },

  'divide-and-conquer': {
    tags: ['Split and solve', 'Combine step', 'T(n) = 2T(n/2) + O(n)', 'Merge sort'],
    content: {
      whenToUse: [
        'The problem on n items can be written with the **same problem on smaller parts**, usually two halves: sort an array, find the maximum subarray, compute x to the n, count inversions. If you can state the recurrence, the recursion nearly writes itself.',
        'The answer is the **parts\' answers plus something that crosses the split**: a merge of two sorted runs, a subarray spanning the midpoint, or pairs with one item on each side. Design the combine step first, then decide what each half returns.',
        'A **quadratic brute force** can be beaten by counting during a merge: Reverse Pairs, Count of Smaller Numbers After Self and Count of Range Sum drop from O(n²) to O(n log n) once both halves are sorted and swept with two pointers.',
        'A structure can be **cut at every possible point**, each cut combining sub-results: Different Ways to Add Parentheses splits at each operator, Unique Binary Search Trees at each root. The combine step is a product of the two result lists.',
        'The pieces are **independent of each other**, so they could run in parallel. Disjoint halves point to plain divide and conquer; if the same sub-problems keep reappearing, memoise them and treat it as dynamic programming instead.',
      ],
      tip: 'Write the recurrence first: T(n) = 2T(n/2) + O(n) is O(n log n), and an O(1) combine makes it O(n). Decide what each half returns (sorted order, a sum, a count) so that combining stays cheap.',
      practice: [
        '912-merge-sort',
        '912-quick-sort',
        { slug: 'alg-maximum-subarray-divide-and-conquer', note: 'the best subarray may cross the middle' },
        { slug: '493-reverse-pairs', note: 'count across the halves, then merge' },
        { slug: '241-different-ways-to-add-parentheses', note: 'split at every operator' },
        { id: '315', title: 'Count of Smaller Numbers After Self', difficulty: 'Hard', note: 'merge sort carrying original indices', href: LC('count-of-smaller-numbers-after-self') },
        { id: '50', title: 'Pow(x, n)', difficulty: 'Medium', note: 'halve the exponent, square the result', href: LC('powx-n') },
        { id: '148', title: 'Sort List', difficulty: 'Medium', note: 'merge sort on a linked list', href: LC('sort-list') },
      ],
    },
    meta: {
      useNote: 'Write the recurrence T(n) = a·T(n/b) + f(n) before coding; it shows at once whether the idea beats the brute force.',
      complexityNote: 'Two half-size calls plus a linear combine give T(n) = 2T(n/2) + O(n), which is O(n log n): log n levels, each doing O(n) work. The stack is O(log n) deep and merging needs an O(n) buffer.',
      highlight: ['same problem on smaller parts', 'crosses the split', 'quadratic brute force', 'cut at every possible point', 'independent of each other'],
    },
  },
};
