import type { PatternPack } from './types.ts';

/**
 * Pack p1 "windows-pointers-hash".
 *  - three worked examples for eight existing patterns (sliding windows, two pointers, prefix sums, hashing, Kadane);
 *  - three new patterns: sliding-window-max (monotonic deque), boyer-moore-voting, cyclic-sort.
 */

const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const pack: PatternPack = {
  id: 'p1',

  problems: [
    { id: '1438', title: 'Longest Continuous Subarray With Abs Diff ≤ Limit', difficulty: 'Medium', tag: 'sliding window + two monotonic deques', category: 'Arrays', group: 'Window and pointer drills' },
    { id: '1696', title: 'Jump Game VI', difficulty: 'Medium', tag: 'DP + monotonic deque', category: 'Arrays', group: 'Window and pointer drills' },
    { id: '862', title: 'Shortest Subarray with Sum at Least K', difficulty: 'Hard', tag: 'prefix sums + monotonic deque', category: 'Arrays', group: 'Window and pointer drills' },
    { id: '16', title: '3Sum Closest', difficulty: 'Medium', tag: 'sort + two pointers, closest value', category: 'Arrays', group: 'Window and pointer drills' },
    { id: '611', title: 'Valid Triangle Number', difficulty: 'Medium', tag: 'sort + two pointers, counting', category: 'Arrays', group: 'Window and pointer drills' },
    { id: '229', title: 'Majority Element II', difficulty: 'Medium', tag: 'Boyer-Moore, two candidates', category: 'Arrays', group: 'Voting and cyclic placement' },
    { id: 'CP', title: 'Majority Element with Verification', difficulty: 'Medium', tag: 'Boyer-Moore: candidate then verify', category: 'Arrays', group: 'Voting and cyclic placement' },
    { id: '442', title: 'Find All Duplicates in an Array', difficulty: 'Medium', tag: 'cyclic sort, duplicates', category: 'Arrays', group: 'Voting and cyclic placement' },
    { id: 'CP', title: 'Cyclic Sort', difficulty: 'Easy', tag: 'cyclic sort (values 1..n)', category: 'Sorting', group: 'Cyclic sort' },
  ],

  groups: [
    {
      name: 'Sliding Window',
      cards: [
        { slug: 'sliding-window-max', group: 'Sliding Window', title: 'Sliding Window Maximum (Monotonic Deque)', tags: ['Deque', 'Monotonic', 'Window max'], complexity: 'O(n) / O(k)' },
      ],
    },
    {
      name: 'Array Techniques',
      cards: [
        { slug: 'boyer-moore-voting', group: 'Array Techniques', title: 'Boyer-Moore Voting', tags: ['Majority', 'Cancellation'], complexity: 'O(n) / O(1)' },
        { slug: 'cyclic-sort', group: 'Array Techniques', title: 'Cyclic Sort (Index = Value)', tags: ['Range 1..n', 'In-place', 'Missing / duplicate'], complexity: 'O(n) / O(1)' },
      ],
    },
  ],

  content: {
    'sliding-window-max': {
      animation: '239-sliding-window-maximum',
      summary: 'A window sum can be updated by adding the newcomer and subtracting the leaver, but a window maximum cannot be "subtracted". Keep a deque of candidate indexes whose values decrease from front to back: the front is always the maximum, and anything that a newer, bigger value has overtaken is discarded for good.',
      whenToUse: [
        'You need the max (or min) of every window of a fixed size, or of a window that grows and shrinks',
        'A condition on the window depends on its extremes, for example max − min ≤ limit',
        'A DP transition takes the best value among the previous k states (dp[i] = x + max(dp[i−k..i−1]))',
        'Brute force rescans the window each step (O(n·k)) or a heap leaves stale entries that you must clean lazily',
      ],
      tip: 'Store indexes, not values, so you can tell when the front has expired. Pop from the back while the new value is at least as good, then push; pop from the front only when the index leaves the window. Every index is pushed and popped once.',
      template: `// Maximum of every window of size k.
// dq holds indexes whose values DECREASE from front to back, so nums[dq.peekFirst()] is the window max.
static int[] windowMax(int[] nums, int k) {
    int n = nums.length;
    int[] out = new int[n - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();

    for (int i = 0; i < n; i++) {
        // ── 1. expire: the oldest candidate left the window [i-k+1, i]
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();

        // ── 2. dominate: older values that are not bigger than nums[i] can never win again
        while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();
        dq.addLast(i);

        // ── 3. report once the first window is full
        if (i >= k - 1) out[i - k + 1] = nums[dq.peekFirst()];
    }
    return out;   // O(n) time, O(k) space
}
// Min version: flip the comparison. Variable window: pop the front only when it equals nums[left].`,
      practice: [
        '239-sliding-window-maximum',
        { slug: '1438-longest-continuous-subarray-with-abs-diff-limit', note: 'two deques give window max and min' },
        { slug: '1696-jump-game-vi', note: 'DP whose best predecessor is the deque front' },
        { slug: '862-shortest-subarray-with-sum-at-least-k', note: 'deque over prefix sums, negatives allowed' },
        { id: '1425', title: 'Constrained Subsequence Sum', difficulty: 'Hard', note: 'same DP shape as Jump Game VI', href: LC('constrained-subsequence-sum') },
        { id: '2398', title: 'Maximum Number of Robots Within Budget', difficulty: 'Hard', note: 'window + deque for the max charge', href: LC('maximum-number-of-robots-within-budget') },
      ],
    },
    'boyer-moore-voting': {
      animation: '169-majority-element',
      summary: 'Find the value that occurs more than n/2 (or n/3, n/4, …) times in one pass and O(1) space. Keep a few candidates with vote counters; every number that is not a candidate cancels one vote from all of them. A true majority is too frequent to be cancelled out entirely.',
      whenToUse: [
        'The question asks for an element that appears more than n/k times (k = 2 or 3 in practice)',
        'Extra memory must be O(1), so counting with a hash map is not allowed',
        'The input is a stream you can read only once (then verify later if you can)',
        'You need a "dominant" element for a follow-up step, for example a valid split point',
      ],
      tip: 'The survivor is only a suspect unless the problem guarantees a majority. If it does not, run a second pass that counts the candidate(s) and compare with the threshold. For n/3 keep two candidates, in general k − 1.',
      template: `// Majority element (> n/2), no guarantee that one exists. Returns -1 if there is none.
static int majority(int[] nums) {
    // ── Pass 1: cancel pairs of different numbers ──
    int candidate = -1, votes = 0;
    for (int x : nums) {
        if (votes == 0) candidate = x;            // free slot: adopt x
        votes += (x == candidate) ? 1 : -1;       // match = +1, different = cancel one vote
    }
    // ── Pass 2: verify the suspect ──
    int count = 0;
    for (int x : nums) if (x == candidate) count++;
    return count > nums.length / 2 ? candidate : -1;
}
// "More than n/3": keep (c1, n1) and (c2, n2). A number matching a live candidate adds a vote,
// otherwise it takes a free slot, otherwise it removes one vote from BOTH. Verify both at the end.`,
      practice: [
        '169-majority-element',
        '229-majority-element-ii',
        'cp-majority-element-with-verification',
        { id: '2780', title: 'Minimum Index of a Valid Split', difficulty: 'Medium', note: 'find the dominant element, then prefix counts', href: LC('minimum-index-of-a-valid-split') },
      ],
    },
    'cyclic-sort': {
      animation: 'cp-cyclic-sort',
      summary: 'When an array holds values from a small known range (usually 1..n), the array can be its own index: the value v belongs in slot v − 1. Swap every number into its home slot; afterwards, a slot that holds the wrong value points straight at a missing or duplicated number.',
      whenToUse: [
        'The array contains numbers in the range 1..n (or 0..n) and you may modify it in place',
        'You are asked for the missing number, the duplicate, all duplicates or the first missing positive',
        'O(n) time and O(1) extra space are required, so sorting (O(n log n)) or a hash set is ruled out',
        'Values outside the range may appear and simply have to be ignored',
      ],
      tip: 'After a swap, do not advance i: the number that just arrived in slot i has not been placed yet. Advance only when the target slot already holds the same value, which also stops the loop from spinning on duplicates.',
      template: `// Put every value v in 1..n into slot v - 1, then read off the strays.
static void cyclicPlace(int[] nums) {
    int i = 0;
    while (i < nums.length) {
        int home = nums[i] - 1;                              // slot where nums[i] belongs
        boolean inRange = nums[i] >= 1 && nums[i] <= nums.length;
        if (inRange && nums[i] != nums[home]) {
            int t = nums[i]; nums[i] = nums[home]; nums[home] = t;   // send it home, re-check slot i
        } else {
            i++;                                             // home already, duplicate, or out of range
        }
    }
    // Scan: nums[k] != k + 1  ->  k + 1 is missing, and nums[k] is a surplus (duplicate) value.
    for (int k = 0; k < nums.length; k++) {
        if (nums[k] != k + 1) { /* missing = k + 1, duplicate = nums[k] */ }
    }
}                                                            // O(n) time: each swap finalises one value`,
      practice: [
        'cp-cyclic-sort',
        '442-find-all-duplicates-in-an-array',
        '41-first-missing-positive',
        { slug: '268-missing-number', note: 'also works by cyclic placement (values 0..n)' },
        { slug: '287-find-the-duplicate-number', note: 'a swap-into-place loop finds it; Floyd cycle detection avoids modifying the array' },
        { id: '645', title: 'Set Mismatch', difficulty: 'Easy', note: 'one duplicate and one missing at the same slot', href: LC('set-mismatch') },
        { id: '448', title: 'Find All Numbers Disappeared in an Array', difficulty: 'Easy', href: LC('find-all-numbers-disappeared-in-an-array') },
      ],
    },
  },

  meta: {
    'sliding-window-max': {
      icon: '🚇', label: 'Mono deque',
      desc: 'A deque of candidate indexes whose values fall from front to back. The front is the window maximum, and stale or beaten candidates are popped away.',
      useNote: 'Two pops, two reasons: pop the back when a newcomer beats it (it can never win again), pop the front when it slides out of the window.',
      complexityNote: 'Each index enters the deque once and leaves it once, so the scan is linear. The deque holds at most k indexes.',
      highlight: ['max (or min) of every window', 'max − min', 'best value among the previous k', 'rescans the window', 'Sliding Window'],
    },
    'boyer-moore-voting': {
      icon: '🗳️', label: 'Voting',
      desc: 'Pair off different numbers and cancel them. What is left over is the only value that could still hold a majority.',
      useNote: 'Without a guarantee, the survivor is just a suspect. Always follow with a counting pass before you trust it.',
      complexityNote: 'One pass with a candidate and a counter (two of each for n/3), plus an optional verification pass. No map needed.',
      highlight: ['more than n/2', 'O(1)', 'read only once', 'dominant element', 'Boyer-Moore'],
    },
    'cyclic-sort': {
      icon: '🔄', label: 'Cyclic',
      desc: 'Use the array as its own lookup table: value v goes to index v − 1. When the dust settles, misplaced slots reveal missing and repeated numbers.',
      useNote: 'Swap, then look at the same index again. Move on only when the right value is already at the target slot.',
      complexityNote: 'Every swap puts one value in its final place, so there are at most n swaps in addition to the n steps of the pointer: linear time, constant space.',
      highlight: ['range 1..n', 'in place', 'missing number', 'first missing positive', 'O(1) extra space'],
    },
  },

  examples: {
    'sliding-window-fixed': [
      { slug: '643-maximum-average-subarray-i', why: 'The simplest fixed window: the state is a single running sum, so one add and one subtract move the window one step.' },
      { slug: '567-permutation-in-string', why: 'The window state is richer, a table of letter counts, and the window length equals the pattern length. Matching means all counts agree.' },
      { slug: '239-sliding-window-maximum', why: 'The window size is still fixed, but a maximum cannot be undone by subtraction. A monotonic deque keeps the candidates instead.' },
    ],
    'sliding-window-dynamic': [
      { slug: '3-longest-substring-without-repeating-characters', why: 'Longest window with a uniqueness condition: the left edge jumps forward until the repeated character has left.' },
      { slug: '209-minimum-size-subarray-sum', why: 'Shortest window with a sum condition: positives make growing monotone, so shrink as long as the window is still valid.' },
      { slug: '424-longest-repeating-character-replacement', why: 'The validity test is relaxed (window length − most frequent letter ≤ k), and the window never shrinks, it just slides once it is full.' },
    ],
    'two-pointers-opposite': [
      { slug: '11-container-with-most-water', why: 'Maximise an area: move the shorter wall inward, because only a taller wall could beat the current area.' },
      { slug: '167-two-sum-ii', why: 'A sorted array and an exact target: the sum tells you which pointer is the bottleneck, so every move is justified.' },
      { slug: '42-trapping-rain-water', why: 'Pointers carry state (the tallest wall from each side). The lower side is settled first because its water level is already known.' },
    ],
    'two-pointers-same': [
      { slug: '26-remove-duplicates-from-sorted-array', why: 'The classic reader/writer pair: fast scans, slow marks the next free slot, and the kept items form a prefix.' },
      { slug: '88-merge-sorted-array', why: 'Both pointers walk the arrays from the back so the free space at the end of nums1 is filled without overwriting unread data.' },
      { slug: '75-sort-colors', why: 'Three regions with three indexes (low, mid, high): the same in-place partition idea, but one pointer must not advance after a swap from the right.' },
    ],
    'two-pointers-threesum': [
      { slug: '15-3sum', why: 'The template: sort, fix one number, squeeze the other two, and skip duplicates so every triplet is reported once.' },
      { slug: '16-3sum-closest', why: 'Same skeleton, different goal: instead of collecting exact hits, track the sum closest to the target and stop early on an exact match.' },
      { slug: '611-valid-triangle-number', why: 'Fix the largest element from the right. One successful comparison counts a whole block of pairs, so this variant counts instead of listing.' },
    ],
    'prefix-sum': [
      { slug: '1480-running-sum-of-1d-array', why: 'Build the prefix array itself: each entry is the previous entry plus the new number.' },
      { slug: '560-subarray-sum-equals-k', why: 'Prefix sums plus a hash map of earlier prefixes count subarrays with sum k in one pass, even with negatives.' },
      { slug: '238-product-of-array-except-self', why: 'The same idea with products: a left prefix and a right suffix combine to give "everything except me" without division.' },
    ],
    'hashing-frequency': [
      { slug: '1-two-sum', why: 'A map of value → index answers "have I seen the complement?" in O(1): look up before you insert.' },
      { slug: '49-group-anagrams', why: 'The map key is a canonical form (the sorted word), so a hash map groups equivalent items instead of counting them.' },
      { slug: '128-longest-consecutive-sequence', why: 'A set gives O(1) membership, and the trick is to start counting only from numbers whose predecessor is absent.' },
    ],
    kadane: [
      { slug: '53-maximum-subarray', why: 'The original: either extend the best subarray ending at the previous index or start fresh at the current one.' },
      { slug: '121-best-time-to-buy-and-sell-stock', why: 'The same running idea in disguise: the "start fresh" decision becomes tracking the lowest price seen so far.' },
      { slug: '152-maximum-product-subarray', why: 'Products break the one-number state: a negative can turn the smallest product into the largest, so track both a max and a min.' },
    ],
    'sliding-window-max': [
      { slug: '239-sliding-window-maximum', why: 'The base case: a fixed window and a deque of decreasing values; expire at the front, dominate at the back.' },
      { slug: '1438-longest-continuous-subarray-with-abs-diff-limit', why: 'A variable window that needs both extremes: two deques (decreasing and increasing) provide max and min in O(1).' },
      { slug: '1696-jump-game-vi', why: 'The deque is hidden inside a DP: dp[i] needs the best of the last k states, which is exactly a sliding maximum over dp.' },
      { slug: '862-shortest-subarray-with-sum-at-least-k', why: 'Negatives break plain windows. A deque of increasing prefix sums also pops its front on success, not just on expiry.' },
    ],
    'boyer-moore-voting': [
      { slug: '169-majority-element', why: 'One candidate and one counter: a guaranteed majority always survives the cancellations.' },
      { slug: '229-majority-element-ii', why: 'The n/3 threshold needs two candidates, and a mismatch cancels one vote from both. Two counting checks confirm the survivors.' },
      { slug: 'cp-majority-element-with-verification', why: 'With no guarantee, the survivor can be wrong. This example makes the second pass visible and shows inputs where it rejects the suspect.' },
    ],
    'cyclic-sort': [
      { slug: 'cp-cyclic-sort', why: 'The pure form: a permutation of 1..n is sorted in place with at most n − 1 swaps, no comparisons between values.' },
      { slug: '442-find-all-duplicates-in-an-array', why: 'Duplicates cannot find a free slot, so they stay misplaced. A scan afterwards reads each of them off.' },
      { slug: '41-first-missing-positive', why: 'Values outside 1..n are ignored during placement; the first slot with the wrong value tells you the answer.' },
    ],
  },
};
