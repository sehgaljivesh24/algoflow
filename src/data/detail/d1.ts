import type { PracticeItem } from '../patterns.ts';
import type { DetailMap } from './types.ts';

// Batch d1 — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.
// Windows, two pointers, prefix / hashing / Kadane, voting, cyclic sort, binary search (4 patterns).

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id,
  title,
  difficulty,
  note,
  href: `https://leetcode.com/problems/${slug}/`,
});

export const d1: DetailMap = {
  /* ------------------------------------------------------------------ sliding windows */
  'sliding-window-fixed': {
    tags: ['Array', 'String', 'Window size k', 'Running sum'],
    content: {
      whenToUse: [
        'The **window size k is given** or implied by the statement: a subarray of length k, every k consecutive days, a block of k characters. When the size is fixed the window never grows or shrinks, so a running value can simply glide along the data.',
        'You must report a **max, min, average, sum or count over every block of k** consecutive items, such as the best seven-day total, the number of windows above a threshold, or the first window whose average clears a limit.',
        'The brute force **re-adds all k numbers for every start index** and costs O(n·k). Neighbouring windows share k − 1 elements, so one entry comes in and one goes out, and the whole scan drops to O(n) with a single running total.',
        '**Anagram and permutation checks** where the window length equals the pattern length: keep a table of letter counts, add the entering letter, remove the leaving one, and compare the table (or one matches counter) with the target after every slide.',
        'The window needs a richer state than a sum, such as a **set of recent values or a monotonic deque**: duplicate within k positions, distinct values in every window, maximum of every window. The size stays fixed; only the structure updated on enter and leave changes.',
      ],
      tip: 'Add the element that enters, subtract the one that leaves, and never loop over the whole window again. Build the first k elements once, then slide: one in, one out, compare with the best.',
      practice: [
        '643-maximum-average-subarray-i',
        '567-permutation-in-string',
        '438-find-all-anagrams-in-a-string',
        { slug: '239-sliding-window-maximum', note: 'fixed window + monotonic deque' },
        lc('219', 'Contains Duplicate II', 'Easy', 'contains-duplicate-ii', 'fixed window + HashSet'),
        lc('1456', 'Maximum Number of Vowels in a Substring of Given Length', 'Medium', 'maximum-number-of-vowels-in-a-substring-of-given-length', 'running count instead of a sum'),
        lc('1343', 'Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold', 'Medium', 'number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold'),
        lc('2461', 'Maximum Sum of Distinct Subarrays With Length K', 'Medium', 'maximum-sum-of-distinct-subarrays-with-length-k', 'running sum + count map'),
      ],
    },
    meta: {
      complexityNote: 'Each element enters the window once and leaves it once, so the scan is one pass of O(n) with O(1) work per slide. Only a running sum, the best value and two indexes are stored, which keeps extra space constant.',
      highlight: ['Sliding Window', 'window size k is given', 'max, min, average, sum or count over every block of k', 're-adds all k numbers', 'Anagram and permutation checks', 'monotonic deque'],
    },
  },

  'sliding-window-dynamic': {
    tags: ['Array', 'String', 'Expand / shrink', 'Count map'],
    content: {
      whenToUse: [
        'You want the **longest or shortest contiguous subarray or substring** that satisfies a condition: the longest substring without repeats, the shortest subarray whose sum reaches a target, the longest run with at most k flips or k distinct values.',
        'The **window size is not known in advance**, so you cannot slide a fixed block. The right edge grows the window, the left edge shrinks it, and both edges only ever move forward, never back.',
        'The condition is **monotone**: adding an element can only push the window toward violating (or satisfying) it, and removing one pulls it back. All-positive sums, no repeats and at most k distinct have this shape; arrays with negatives usually do not.',
        'The state is a **count map, a set or a running sum** updated on every enter and leave: letter frequencies for at most k distinct, a set for uniqueness, a sum for the shortest subarray at least target. The map tells you when the window turns invalid.',
        'Brute force tests **every start and end pair**, O(n²) or worse. When extending a failed window can never help, or dropping from the left keeps a valid window valid, two moving edges give O(n) because each index enters and leaves exactly once.',
      ],
      tip: 'Decide what the window owes the condition. The loop is always: expand with r, then shrink with l while the window is invalid (or still valid, when minimising), recording the answer at the right moment.',
      practice: [
        '3-longest-substring-without-repeating-characters',
        '209-minimum-size-subarray-sum',
        '424-longest-repeating-character-replacement',
        '76-minimum-window-substring',
        '1004-max-consecutive-ones-iii',
        lc('904', 'Fruit Into Baskets', 'Medium', 'fruit-into-baskets', 'at most 2 distinct values'),
        lc('713', 'Subarray Product Less Than K', 'Medium', 'subarray-product-less-than-k', 'count windows ending at r'),
        lc('1695', 'Maximum Erasure Value', 'Medium', 'maximum-erasure-value', 'unique window with the largest sum'),
      ],
      template: `// Longest window that satisfies a condition. The window s[l..r] is kept valid by shrinking from the left.
static int longestAtMostKDistinct(String s, int k) {
    Map<Character, Integer> count = new HashMap<>();   // what the window currently holds
    int l = 0, best = 0;

    for (int r = 0; r < s.length(); r++) {
        count.merge(s.charAt(r), 1, Integer::sum);     // EXPAND: s[r] enters

        while (count.size() > k) {                     // window broke the rule: SHRINK until valid again
            char out = s.charAt(l++);
            if (count.merge(out, -1, Integer::sum) == 0) count.remove(out);
        }
        best = Math.max(best, r - l + 1);              // UPDATE: the window is valid here
    }
    return best;                                       // O(n) time, O(k) space
}
// Shortest window (e.g. sum >= target): do the update INSIDE the while loop, while the window is still valid.`,
    },
    meta: {
      complexityNote: 'Both pointers only move forward: the right edge makes n moves, the left edge at most n more, so the loop is O(n). Extra space depends on the window state, such as a count map with up to k keys.',
      highlight: ['Sliding Window', 'longest or shortest contiguous subarray or substring', 'not known in advance', 'monotone', 'count map, a set or a running sum', 'every start and end pair'],
    },
  },

  'sliding-window-max': {
    tags: ['Deque', 'Monotonic', 'Window max', 'Expire + dominate'],
    content: {
      whenToUse: [
        'You need the **maximum (or minimum) of every window** of size k, such as the peak of each three-day span. A running sum can be fixed by subtracting the leaver, but a maximum cannot: removing it does not tell you the next largest.',
        'A condition on the window depends on its **extremes**: the longest subarray where max − min stays within a limit. Two deques, one decreasing and one increasing, supply both ends of the window in O(1) each.',
        'A **DP transition takes the best of the previous k states**, as in dp[i] = nums[i] + max(dp[i−k..i−1]) for Jump Game VI or constrained subsequence sums. That inner max is exactly a sliding-window maximum over the dp array.',
        'The brute force **rescans the window every step** (O(n·k)), or a heap is used and stale entries must be removed lazily at an extra log factor. A monotonic deque gives O(n) because every index is pushed once and popped once.',
        'Negative numbers break two-pointer windows, so shortest subarray with sum at least K needs a **deque of increasing prefix sums**: the front is popped when it already succeeds, the back when a smaller prefix makes it useless.',
      ],
      tip: 'Store indexes, not values, so you can tell when the front has expired. Pop the back while the newcomer beats it, push, then pop the front only once its index leaves the window.',
    },
    meta: {
      complexityNote: 'Each index is pushed once and popped once, from either end, so the scan is O(n) even when one step pops several entries. The deque never holds more than k indexes, which gives O(k) extra space.',
      highlight: ['maximum (or minimum) of every window', 'extremes', 'best of the previous k states', 'rescans the window every step', 'deque of increasing prefix sums', 'Sliding Window'],
    },
  },

  /* ------------------------------------------------------------------ two pointers */
  'two-pointers-opposite': {
    tags: ['Sorted array', 'String', 'Pair target', 'Squeeze'],
    content: {
      animation: '167-two-sum-ii',
      whenToUse: [
        'The input is **sorted**, or the answer depends on the two ends: pair sum on a sorted array, squares of a sorted array, anything built from the extremes. Sortedness tells you which pointer to move when the current pair is too small or too large.',
        'You are looking for a **pair that meets a target** (sum, difference, area): Two Sum II, Container With Most Water, boats that carry at most two people. Score the pair, compare with the goal, and drop the end that cannot be part of a better answer.',
        '**Palindrome checks** and squeeze from both sides problems: compare s[l] with s[r], skip non-alphanumerics, allow one deletion in Valid Palindrome II, or find how much water the lower wall can hold. The pointers meet in the middle, so one pass is enough.',
        'You can **prove that moving one pointer never loses the best answer**. For the area problem the shorter wall is the bottleneck: keeping it and moving the other pointer can only shrink the width without raising the height, so dropping it is safe.',
        'Brute force tries **all O(n²) pairs**. When each comparison eliminates one whole index from every future pair, only n − 1 comparisons are needed, and no hash map or extra memory is required, which matters when O(1) space is demanded.',
      ],
      tip: 'Ask which pointer is the bottleneck and move that one. Before every move, be able to prove that the discarded position cannot belong to a better answer.',
      template: `// Sorted two-sum (LeetCode 167): return the 1-based indices of the pair that adds up to target.
static int[] twoSumSorted(int[] a, int target) {
    int l = 0, r = a.length - 1;                          // one pointer at each end

    while (l < r) {
        int sum = a[l] + a[r];
        if (sum == target) return new int[]{l + 1, r + 1};   // found the pair
        if (sum < target) l++;                            // too small: a[l] cannot pair with anything left, drop it
        else r--;                                         // too big: a[r] cannot pair with anything left, drop it
    }
    return new int[]{};                                   // no pair exists
}

// Maximising instead of matching (area, boats): score the pair, then move the side that limits the score.
//   best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
//   if (h[l] < h[r]) l++; else r--;                      // the shorter wall can never do better, move it
// O(n) time, O(1) space`,
      practice: [
        '167-two-sum-ii',
        '11-container-with-most-water',
        '42-trapping-rain-water',
        '125-valid-palindrome',
        '680-valid-palindrome-ii',
        lc('977', 'Squares of a Sorted Array', 'Easy', 'squares-of-a-sorted-array', 'fill the result from the back'),
        lc('881', 'Boats to Save People', 'Medium', 'boats-to-save-people', 'pair the heaviest with the lightest'),
      ],
    },
    examples: [
      { slug: '167-two-sum-ii', why: 'A sorted array and an exact target: the running sum tells you which pointer is the bottleneck, so every move is justified and one index is discarded per step.' },
      { slug: '11-container-with-most-water', why: 'Maximise an area instead of matching a sum: move the shorter wall inward, because only a taller wall could beat the current area.' },
      { slug: '42-trapping-rain-water', why: 'Pointers carry state (the tallest wall from each side). The lower side is settled first because its water level is already known.' },
    ],
    meta: {
      complexityNote: 'Each iteration moves one pointer inward, so together they cross the array exactly once: at most n − 1 iterations, O(n) time. Only two indexes and a running best are stored, so extra space is O(1).',
      highlight: ['Opposite Ends', 'pair that meets a target', 'Palindrome checks', 'squeeze from both sides', 'two ends', 'prove that moving one pointer never loses the best answer', 'all O(n²) pairs'],
    },
  },

  'two-pointers-same': {
    tags: ['Array', 'In-place', 'Reader / writer', 'Sorted'],
    content: {
      whenToUse: [
        'You must **filter, compact or partition an array in place** with O(1) extra space: remove duplicates, remove a given value, move zeroes to the end, or split into regions. The result is a clean prefix of the input and the rest is ignored.',
        'The input is **sorted, so duplicates are neighbours**: comparing nums[fast] with nums[slow] is enough to know whether a value is new, and the unique values form a prefix of the array without any extra set.',
        'The output depends on a **reader and a writer**: fast scans every element while slow marks the next free slot. Keep at most two copies by comparing with nums[slow − 2], or write every non-zero value forward for Move Zeroes.',
        'You are merging or partitioning with regions: **Sort Colors with low, mid and high**, or Merge Sorted Array filled from the back so unread data is never overwritten. Regions separated by indexes each get their own invariant.',
        'A **hash set or a second array** would solve it, but the statement forbids extra memory. Two indexes moving in the same direction give O(n) time and O(1) space, and the invariant everything left of slow is final makes the correctness argument short.',
      ],
      tip: 'Invariant: everything before slow is already final. fast only reads, slow only writes. Say it out loud before coding and decide whether slow points at the last kept item or the next free slot.',
      template: `// Remove duplicates from a sorted array in place; returns how many unique values remain.
static int removeDuplicates(int[] nums) {
    if (nums.length == 0) return 0;
    int slow = 0;                                    // nums[0..slow] is the finished, duplicate-free prefix

    for (int fast = 1; fast < nums.length; fast++) { // fast only reads
        if (nums[fast] != nums[slow]) {              // a new value: keep it
            slow++;                                  // open the next slot
            nums[slow] = nums[fast];                 // slow only writes
        }
    }
    return slow + 1;                                 // O(n) time, O(1) space
}
// At most two copies: keep nums[fast] when slow < 2 || nums[fast] != nums[slow - 2] (slow = next free slot).
// Move zeroes / remove a value: write every element that passes the test to nums[slow++].`,
      practice: [
        '26-remove-duplicates-from-sorted-array',
        lc('283', 'Move Zeroes', 'Easy', 'move-zeroes', 'write every non-zero forward'),
        lc('27', 'Remove Element', 'Easy', 'remove-element', 'the same writer, a different test'),
        lc('80', 'Remove Duplicates from Sorted Array II', 'Medium', 'remove-duplicates-from-sorted-array-ii', 'compare with nums[slow - 2]'),
        '88-merge-sorted-array',
        '75-sort-colors',
        lc('844', 'Backspace String Compare', 'Easy', 'backspace-string-compare', 'two reader/writer pairs from the back'),
      ],
    },
    meta: {
      complexityNote: 'A single left-to-right scan: fast visits every element once and slow only moves forward behind it, so time is O(n). The result overwrites the input, so no second array is allocated and extra space is O(1).',
      highlight: ['Slow / Fast', 'filter, compact or partition an array in place', 'sorted, so duplicates are neighbours', 'reader and a writer', 'Sort Colors with low, mid and high', 'hash set or a second array'],
    },
  },

  'two-pointers-threesum': {
    tags: ['Array', 'k-Sum', 'Sort first', 'Skip duplicates'],
    content: {
      whenToUse: [
        'You need **all unique triplets (or quadruplets)** whose sum hits a target, such as three numbers adding to zero. Reporting values rather than original positions means the array can be sorted first without losing any information.',
        'A pair-sum on a sorted array takes O(n), so **fixing one number and squeezing the rest** gives O(n²) overall instead of O(n³). For 4Sum fix two numbers; in general k-Sum is k − 2 nested loops plus one two-pointer squeeze.',
        'The question asks for the **closest sum, a count of valid triples or a threshold**: 3Sum Closest tracks the best gap, while 3Sum Smaller and Valid Triangle Number count a whole block of pairs at once whenever one comparison succeeds.',
        '**Duplicates must not appear** in the output. Sorted order puts equal values next to each other, so skip a repeated anchor, and after recording a hit move both pointers past equal neighbours instead of reaching for a set.',
        'Sorted order also allows **early exits**: if the smallest remaining anchor is already positive and the target is zero, no later triple can reach it, so the outer loop can stop. Each anchor then costs one linear sweep of the rest.',
      ],
      practice: [
        '15-3sum',
        '16-3sum-closest',
        '611-valid-triangle-number',
        lc('18', '4Sum', 'Medium', '4sum', 'two fixed loops + squeeze'),
        lc('259', '3Sum Smaller', 'Medium', '3sum-smaller', 'count a block of pairs per success'),
        lc('923', '3Sum With Multiplicity', 'Medium', '3sum-with-multiplicity', 'squeeze, but count equal runs'),
        '167-two-sum-ii',
      ],
    },
    meta: {
      complexityNote: 'Sorting costs O(n log n), but the outer loop runs n times and each squeeze is a linear pass, so O(n²) dominates. Apart from the result list and the sort, only three indexes and a running sum are stored.',
      highlight: ['Two Pointers', 'all unique triplets', 'fixing one number and squeezing the rest', 'closest sum, a count of valid triples or a threshold', 'Duplicates must not appear', 'early exits'],
    },
  },

  /* ------------------------------------------------------------------ prefix sum, hashing, Kadane */
  'prefix-sum': {
    tags: ['Array', 'Range query', 'Hash map', 'Subarray count'],
    content: {
      whenToUse: [
        'You are asked about the **sum of many different ranges or subarrays**: range-sum queries, sums of submatrices, how much of the total lies left of an index. Spend O(n) once on running totals and every later query is two lookups and a subtraction.',
        'You must **count subarrays with a given sum** (or a sum divisible by k, or equal numbers of zeros and ones). Each question becomes: have I seen prefix − k before? A hash map of earlier prefixes answers it in one pass, even with negatives.',
        'A problem needs the **left total versus the right total** at every index, like Find Pivot Index or balanced splits. The right sum equals the total minus the left sum minus the element, so a single prefix pass is enough.',
        'You need the **product or everything except me** of an array without division. A left prefix product and a right suffix product, combined at each index, give the answer in two passes and O(1) extra space beyond the output.',
        'The array **does not change between queries**, and the brute force would re-add every range in O(n). If updates are interleaved with queries, move to a Fenwick tree; for many range additions, a difference array is the mirror image of a prefix sum.',
      ],
      practice: [
        '1480-running-sum-of-1d-array',
        lc('303', 'Range Sum Query - Immutable', 'Easy', 'range-sum-query-immutable', 'the textbook prefix array'),
        lc('724', 'Find Pivot Index', 'Easy', 'find-pivot-index', 'left sum vs total - left - x'),
        '560-subarray-sum-equals-k',
        lc('525', 'Contiguous Array', 'Medium', 'contiguous-array', 'map 0 to -1, then equal prefixes'),
        lc('974', 'Subarray Sums Divisible by K', 'Medium', 'subarray-sums-divisible-by-k', 'map of prefix remainders'),
        '238-product-of-array-except-self',
        lc('304', 'Range Sum Query 2D - Immutable', 'Medium', 'range-sum-query-2d-immutable', 'prefix sums over rows and columns'),
      ],
    },
    meta: {
      complexityNote: 'Building the table is one O(n) pass and O(n) memory. Afterwards every range sum is two lookups and a subtraction, O(1), so q queries cost O(n + q) instead of O(n·q).',
      highlight: ['Prefix Sum', 'sum of many different ranges or subarrays', 'count subarrays with a given sum', 'left total versus the right total', 'without division', 'does not change between queries'],
    },
  },

  'hashing-frequency': {
    tags: ['HashMap', 'HashSet', 'Complement lookup', 'Counting'],
    content: {
      whenToUse: [
        'You keep asking **whether a value, complement or key already exists**: Two Sum, Contains Duplicate, have I seen this prefix before. A hash map or set answers in O(1) instead of scanning everything seen so far.',
        'The brute force **compares every pair**, O(n²). If the pair condition can be turned into a lookup (target − x, x + 1, a sorted word, a prefix total), one pass with a map replaces the nested loop.',
        'You need **frequencies, counts or first occurrences**: top-k frequent items, valid anagram, first non-repeating character, majority checks. Count everything once into a map, then read the counts (or bucket them by size) in a second pass.',
        'The task is **grouping by a canonical form**: group anagrams by sorted letters or a 26-count key, group strings by shift pattern, detect isomorphic strings. The map key is a normalised description of the item, and the value is its list of members.',
        '**Order does not matter**, only membership or counts, and O(n) extra memory is acceptable. For consecutive-sequence problems put everything in a set and start counting only from values whose predecessor is missing, which keeps the total linear.',
      ],
      practice: [
        '1-two-sum',
        '217-contains-duplicate',
        '242-valid-anagram',
        '49-group-anagrams',
        '128-longest-consecutive-sequence',
        '347-top-k-frequent-elements',
        lc('387', 'First Unique Character in a String', 'Easy', 'first-unique-character-in-a-string', 'count, then find the first count of 1'),
        lc('454', '4Sum II', 'Medium', '4sum-ii', 'two pair-sum maps meet in the middle'),
      ],
    },
    meta: {
      complexityNote: 'One scan with constant-time average lookups and inserts, so O(n) overall. The price is a table that may hold every distinct element, O(n) space; with a fixed alphabet or a bounded range the map shrinks to O(1).',
      highlight: ['Frequency Hash Map', 'whether a value, complement or key already exists', 'compares every pair', 'frequencies, counts or first occurrences', 'grouping by a canonical form', 'Order does not matter'],
    },
  },

  kadane: {
    tags: ['Array', 'DP', 'Max subarray', 'Extend or restart'],
    content: {
      whenToUse: [
        'You want the **maximum (or minimum) sum of a contiguous subarray**: Maximum Subarray, the best profit from one buy and one sell, the strongest stretch of gains. The answer is a single number, so a one-variable running state is enough.',
        'The array **mixes positive and negative numbers**. With all positives the whole array wins, with all negatives the single largest element wins, and the extend-or-restart rule covers every mix in between without any special cases or sign checks.',
        'A running total that has gone **negative is worse than starting over**. At each index decide: extend the previous best run (cur + x) or restart at x. That local choice, cur = max(x, cur + x), is the entire algorithm.',
        'You need the best subarray ending at each index as a **DP state with O(1) memory**: the circular variant (total minus the smallest subarray), products (track both a max and a min), or deleting one element all keep two or three running numbers.',
        'The brute force tries **every start and end pair** (O(n²), or O(n³) if each sum is recomputed). Prefix sums alone still compare every pair, whereas Kadane reads each element exactly once, keeps two numbers, and never looks back at earlier elements.',
      ],
      practice: [
        '53-maximum-subarray',
        '121-best-time-to-buy-and-sell-stock',
        '152-maximum-product-subarray',
        '918-maximum-sum-circular-subarray',
        lc('1749', 'Maximum Absolute Sum of Any Subarray', 'Medium', 'maximum-absolute-sum-of-any-subarray', 'run Kadane for max and for min'),
        lc('1186', 'Maximum Subarray Sum with One Deletion', 'Medium', 'maximum-subarray-sum-with-one-deletion', 'two states: with and without a deletion'),
        lc('1567', 'Maximum Length of Subarray With Positive Product', 'Medium', 'maximum-length-of-subarray-with-positive-product', 'track the length of positive and negative runs'),
      ],
    },
    meta: {
      complexityNote: 'A single pass reads each element once and updates two numbers, the best sum ending here and the best seen so far, so time is O(n) and extra space O(1). Earlier elements are never revisited.',
      highlight: ["Kadane's Algorithm", 'maximum (or minimum) sum of a contiguous subarray', 'mixes positive and negative numbers', 'negative is worse than starting over', 'DP state with O(1) memory', 'every start and end pair'],
    },
  },

  /* ------------------------------------------------------------------ voting, cyclic sort */
  'boyer-moore-voting': {
    tags: ['Majority', 'Cancellation', 'Voting', 'O(1) space'],
    content: {
      whenToUse: [
        'The question asks for an element that appears **more than n/2 times** (Majority Element) or more than n/3 times (Majority Element II). The threshold is high enough that pairing off different numbers can never eliminate the true majority.',
        '**Extra memory must be O(1)**, so counting with a hash map is not allowed. A candidate and a counter (two of each for n/3) replace the map: an equal value adds a vote, a different value cancels one.',
        'The input is a **stream you can read only once**, or too large to store. One pass keeps the suspect in two variables, and a second pass, if the stream can be replayed, confirms it by counting.',
        'You need a **dominant element as a building block**: the minimum index of a valid split, whether a sorted array holds a value more than half the time, or any voting problem where one value must outnumber all others combined.',
        'There is **no guarantee that a majority exists**, so the survivor is only a suspect. Follow with a verification pass that counts the candidate(s) against the threshold; for the n/k version keep k − 1 candidates.',
      ],
      tip: 'The survivor is only a suspect unless a majority is guaranteed, so verify it with a counting pass. For n/3 keep two candidates; a mismatch cancels one vote from each.',
      practice: [
        '169-majority-element',
        '229-majority-element-ii',
        'cp-majority-element-with-verification',
        lc('2780', 'Minimum Index of a Valid Split', 'Medium', 'minimum-index-of-a-valid-split', 'find the dominant element, then prefix counts'),
        lc('1157', 'Online Majority Element In Subarray', 'Hard', 'online-majority-element-in-subarray', 'candidate voting inside a segment tree'),
        lc('1150', 'Check If a Number Is Majority Element in a Sorted Array', 'Easy', 'check-if-a-number-is-majority-element-in-a-sorted-array', 'in a sorted array, binary search also works'),
        { slug: '347-top-k-frequent-elements', note: 'contrast: for a large k, count with a map or buckets' },
      ],
    },
    meta: {
      complexityNote: 'Pass one reads each element once and updates a candidate and a counter; the optional verification pass is a second linear scan. Time is O(n), and only the candidates and counters are stored, so space is O(1).',
      highlight: ['Boyer-Moore', 'more than n/2 times', 'Extra memory must be O(1)', 'stream you can read only once', 'dominant element as a building block', 'no guarantee that a majority exists'],
    },
  },

  'cyclic-sort': {
    tags: ['Range 1..n', 'In-place', 'Missing / duplicate', 'Swap to home'],
    content: {
      whenToUse: [
        'The array holds numbers in the range **1..n (or 0..n)** and you may modify it in place. When every value is a valid index plus one, the array serves as its own lookup table: the value v belongs at index v − 1.',
        'You are asked for the **missing number, the duplicate, all duplicates or all disappeared numbers**. After placement, any slot whose value is not index + 1 names a missing number, and the value sitting there names a duplicate.',
        '**O(n) time and O(1) extra space** are required, so sorting (O(n log n)) or a hash set is ruled out. Each swap sends one value to its final slot, so the total number of swaps is at most n − 1.',
        'The problem asks for the **first missing positive** or similar: zeros, negatives and values above n are ignored during placement because they can never be the answer, and the first slot with the wrong value gives the result.',
        'The statement describes a **permutation with one or two defects**: a number that appears twice, one that never appears, or a mismatch like Set Mismatch. Repeats cannot find a free home slot, so they stay misplaced and are easy to read off in the final scan.',
      ],
      tip: 'After a swap, do not advance i: the value that just arrived in slot i is not placed yet. Advance only when it is home, duplicated or out of range.',
    },
    meta: {
      complexityNote: 'Every swap puts one value into its final slot, so at most n − 1 swaps happen on top of the n pointer steps and the final scan: O(n) time. The array is reused, so extra space is O(1).',
      highlight: ['range 1..n', 'missing number, the duplicate', 'O(n) time and O(1) extra space', 'first missing positive', 'permutation with one or two defects', 'in place'],
    },
  },

  /* ------------------------------------------------------------------ binary search */
  'binary-search-classic': {
    tags: ['Sorted array', 'Halving', 'Boundary search', 'O(log n)'],
    content: {
      whenToUse: [
        'The data is **sorted**, or can be treated as sorted: a plain array, a sorted string of letters, a sorted matrix flattened into one line. Comparing with the middle element rules out half of the remaining positions in a single step.',
        'A yes/no condition **flips exactly once** across the range, even when no array exists: First Bad Version, smallest letter greater than the target, integer square root. Search for the boundary where the answer changes from no to yes.',
        'You need a **value, insertion point or first / last position**: Search Insert Position returns where the value would go, Find First and Last Position runs two boundary searches, and duplicates mean the loop keeps going after a hit instead of returning.',
        'The statement demands **O(log n)**, or n is so large (10⁹ and beyond) that a linear scan is impossible. Even without an array in memory, probing a monotone function logarithmically finishes in about 30 iterations.',
        'A linear scan or a hash map would work, but the input is already ordered and **every comparison can discard half**. Pick the invariant first (is hi inclusive?), then write the loop so each update shrinks the range and the loop must end.',
      ],
      template: `// Classic search: index of target, or -1. Invariant: if target exists, it lies inside [lo, hi].
static int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;            // overflow-safe midpoint
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;    // target is right of mid: discard the left half
        else hi = mid - 1;                       // target is left of mid: discard the right half
    }
    return -1;
}

// Boundary version: first index with nums[i] >= target (the insert position). Invariant: answer in [lo, hi].
static int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;                // hi is exclusive: n means every element is smaller
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;    // mid is too small, the answer is to the right
        else hi = mid;                           // mid may be the answer, keep it
    }
    return lo;                                   // O(log n) time, O(1) space
}`,
      practice: [
        '704-binary-search',
        '35-search-insert-position',
        '34-find-first-and-last-position',
        lc('278', 'First Bad Version', 'Easy', 'first-bad-version', 'the yes/no flip, no array at all'),
        lc('744', 'Find Smallest Letter Greater Than Target', 'Easy', 'find-smallest-letter-greater-than-target', 'upper bound with wrap-around'),
        lc('69', 'Sqrt(x)', 'Easy', 'sqrtx', 'largest m with m*m <= x'),
        '33-search-in-rotated-sorted-array',
      ],
    },
    meta: {
      complexityNote: 'The range halves every round, so at most about log2(n) probes are needed: a million items take around 20 comparisons. Only lo, hi and mid are stored, so extra space is O(1) in the iterative version.',
      highlight: ['Binary Search', 'flips exactly once', 'value, insertion point or first / last position', 'O(log n)', 'every comparison can discard half'],
    },
  },

  'binary-search-on-answer': {
    tags: ['Optimization', 'Feasibility', 'Monotone check', 'Guess the answer'],
    content: {
      whenToUse: [
        'The question asks for the **minimum value that is enough** or the maximum that still works: eating speed, ship capacity, days, distance between balls, largest piece. The answer is a number in a range, not an index into the data.',
        'A **feasibility check** for a candidate x is easy to write in one O(n) pass: count the hours at speed x, simulate loading days at capacity x, or greedily cut an array into pieces whose sum is at most x.',
        'The answers form a **monotone yes/no line**: if x works then every larger (or every smaller) value also works. That single property is what lets you throw away half of the candidates after one test.',
        'The **answer range can be bounded** by something readable from the input: from 1 (or the largest single item) up to the maximum element or the total sum. Bounds that are too tight lose the answer; too loose only add a few iterations.',
        'Trying every candidate costs O(range × n), and the range can reach 10⁹. **Binary search on the range** needs only log(range) checks, so a problem that looks like greedy or DP often reduces to about thirty cheap feasibility tests.',
      ],
      tip: 'Write feasible(x) first and test it by hand on two guesses. Then loop: if feasible(mid), hi = mid, else lo = mid + 1, which converges on the first value that works.',
      practice: [
        '875-koko-eating-bananas',
        '1011-capacity-to-ship-packages',
        '410-split-array-largest-sum',
        'gfg-allocate-minimum-pages',
        lc('1283', 'Find the Smallest Divisor Given a Threshold', 'Medium', 'find-the-smallest-divisor-given-a-threshold', 'same ceil-sum check as Koko'),
        lc('1482', 'Minimum Number of Days to Make m Bouquets', 'Medium', 'minimum-number-of-days-to-make-m-bouquets', 'count bouquets that bloom by day x'),
        lc('1552', 'Magnetic Force Between Two Balls', 'Medium', 'magnetic-force-between-two-balls', 'maximise the minimum gap, greedy placement'),
        lc('69', 'Sqrt(x)', 'Easy', 'sqrtx', 'largest m with m*m <= x'),
      ],
    },
    meta: {
      complexityNote: 'A guess range of size R needs about log2(R) rounds, and each round runs one O(n) feasibility scan, so time is O(n log R). Only the bounds, the midpoint and a few counters are stored, so space is O(1).',
      highlight: ['on Answer', 'minimum value that is enough', 'feasibility check', 'monotone yes/no line', 'answer range can be bounded', 'Binary search on the range'],
    },
  },

  'binary-search-modified': {
    content: {
      whenToUse: [
        'A sorted array was **rotated** (or is only partly ordered: mountain, bitonic, sorted rows). One of the two halves around mid is always sorted, so check which one, test whether the target falls inside it, and discard the other half.',
        'You need a **peak, a minimum or a boundary** rather than a given value: Find Peak Element, the minimum of a rotated array, the top of a mountain. With no target, compare mid with a neighbour and move uphill, because a peak is guaranteed on the rising side.',
        'A **2-D matrix is sorted** row by row with each row starting above the previous end, so its cells flatten into one sorted line. Search the flat indexes and convert with row = m / cols and col = m % cols.',
        'At mid you can name a **local property that holds on one side and breaks on the other**: pair parity in Single Element in a Sorted Array, which neighbour is closer in K Closest Elements, whether the slope still rises.',
        'The statement asks for **O(log n)** but the input is only almost sorted, or has duplicates that sometimes blur the test (Search in Rotated Array II falls back to shrinking one end). Write the invariant first and let it choose the loop shape.',
      ],
      tip: 'Do not memorise variants. Write the invariant first (the answer is inside [lo, hi]), ask what one look at mid proves, then pick lo <= hi or lo < hi to keep it.',
      practice: [
        '33-search-in-rotated-sorted-array',
        '153-find-minimum-in-rotated-sorted-array',
        '81-search-in-rotated-sorted-array-ii',
        '162-find-peak-element',
        '74-search-a-2d-matrix',
        '540-single-element-in-a-sorted-array',
        '658-find-k-closest-elements',
        lc('852', 'Peak Index in a Mountain Array', 'Medium', 'peak-index-in-a-mountain-array', 'compare mid with mid + 1'),
      ],
    },
    meta: {
      complexityNote: 'Each round discards half of the window after looking at a fixed number of cells around mid, so time is O(log n). Only lo, hi and mid are stored, giving O(1) space; duplicates can degrade the rotated-array case to O(n).',
      highlight: ['Binary search', 'rotated', 'peak, a minimum or a boundary', '2-D matrix is sorted', 'local property', 'O(log n)'],
    },
  },
};
