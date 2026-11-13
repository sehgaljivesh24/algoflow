import type { PracticeItem } from '../patterns.ts';
import type { PatternPack } from './types.ts';

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id,
  title,
  difficulty,
  note,
  href: `https://leetcode.com/problems/${slug}/`,
});

/**
 * Pack p2: search, stack and linked-list patterns.
 * - worked examples for 8 existing patterns
 * - two new patterns: modified binary search and cache design (LRU / LFU / bucket lists)
 */
export const pack: PatternPack = {
  id: 'p2',

  groups: [
    {
      name: 'Binary Search',
      cards: [
        { slug: 'binary-search-modified', group: 'Binary Search', title: 'Modified Binary Search', tags: ['Rotated array', 'Peak', '2-D matrix', 'Pair parity'], complexity: 'O(log n) / O(1)' },
      ],
    },
    {
      name: 'Design',
      cards: [
        { slug: 'lru-cache-design', group: 'Design', title: 'Cache Design (LRU / LFU)', tags: ['HashMap', 'Doubly linked list', 'O(1) design'], complexity: 'O(1) per op / O(capacity)' },
      ],
    },
  ],

  content: {
    'binary-search-modified': {
      animation: '33-search-in-rotated-sorted-array',
      summary:
        'The array is not plainly sorted, or the question is not "where is this value". Binary search still works when a cheap local test at mid tells you which half can be thrown away: which side is sorted, which way the slope goes, whether a pair is intact.',
      whenToUse: [
        'A sorted array was rotated, or is only partly ordered (mountain, bitonic, sorted rows)',
        'You need a peak, a minimum, a single odd element out, or the best window rather than a given value',
        'A 2-D matrix is sorted so that its cells can be flattened into one sorted line',
        'At mid you can name a property that holds on one side and is guaranteed to break on the other',
        'The statement asks for O(log n) but the input is "almost" sorted',
      ],
      tip: 'Do not memorise variants. Write the invariant first ("the answer is inside [lo, hi]"), then ask what one look at mid proves, and pick the loop shape (lo <= hi with a return, or lo < hi with hi = mid) that keeps that invariant.',
      template: `// Idea: keep a window [lo, hi] that is guaranteed to contain the answer, and use a LOCAL test at mid
// (which half is sorted, which way the slope goes, is the pair intact) to discard one side.

// 1) Search a value in a rotated array of distinct numbers
static int searchRotated(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;                   // avoids int overflow
        if (a[mid] == target) return mid;

        if (a[lo] <= a[mid]) {                          // left half [lo..mid] is sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1;   // target lies inside the sorted half
            else lo = mid + 1;
        } else {                                        // right half [mid..hi] is sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}

// 2) Peak / boundary style: no target, compare mid with its neighbour
static int findPeak(int[] a) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {                                   // stop when one candidate is left
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < a[mid + 1]) lo = mid + 1;          // uphill: some peak lies to the right
        else hi = mid;                                  // downhill: mid itself may be the peak
    }
    return lo;
}

// 3) 2-D matrix sorted row by row: treat it as one array of rows * cols cells
//    value at flat index m  ->  matrix[m / cols][m % cols]`,
      practice: [
        '33-search-in-rotated-sorted-array',
        { slug: '153-find-minimum-in-rotated-sorted-array', note: 'compare mid with hi to find the pivot' },
        { slug: '81-search-in-rotated-sorted-array-ii', note: 'duplicates: shrink both ends when mid, lo and hi tie' },
        '162-find-peak-element',
        '74-search-a-2d-matrix',
        '540-single-element-in-a-sorted-array',
        '658-find-k-closest-elements',
        lc('852', 'Peak Index in a Mountain Array', 'Medium', 'peak-index-in-a-mountain-array', 'the same slope test as 162'),
        lc('1095', 'Find in Mountain Array', 'Hard', 'find-in-mountain-array', 'peak first, then two ordinary searches'),
      ],
    },
    'lru-cache-design': {
      animation: '146-lru-cache',
      summary:
        'Some design problems demand O(1) for every operation and an ordering rule (recency, frequency, count). A hash map gives instant lookup; a doubly linked list (or a list of lists) keeps the order and lets a node leave or join in constant time.',
      whenToUse: [
        'The interface needs get / put / inc / dec / evict, all in O(1)',
        'You must always know the oldest, newest, least used or most used entry without searching',
        'An entry has to jump to a new position when it is used (move to front, move to the next count)',
        'A single structure fails: a map has no order, a list has no fast lookup',
        'The statement mentions a capacity and an eviction policy',
      ],
      tip: 'Say aloud what each structure is responsible for: the map finds, the list orders. Use dummy head and tail nodes so insert and unlink never need null checks, and keep both structures in sync on every evict.',
      template: `// LRU cache: hash map (find a node) + doubly linked list (order by recency).
// Front of the list = most recently used, node before tail = least recently used.
class LRUCache {
    private static class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels: no null checks
    private final int cap;

    LRUCache(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }

    int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n); pushFront(n);                        // a read makes it the most recent
        return n.val;
    }

    void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; unlink(n); pushFront(n); return; }
        if (map.size() == cap) {                        // full: evict the oldest, in BOTH structures
            Node old = tail.prev;
            unlink(old); map.remove(old.key);
        }
        n = new Node(key, value);
        map.put(key, n); pushFront(n);
    }

    private void unlink(Node n)    { n.prev.next = n.next; n.next.prev = n.prev; }
    private void pushFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}
// LFU / "All O(1)": same idea, but the list nodes are BUCKETS (one per use count) and a touch moves a key to
// the neighbouring bucket instead of to the front.`,
      practice: [
        '146-lru-cache',
        '460-lfu-cache',
        '432-all-o-1-data-structure',
        { slug: '155-min-stack', note: 'design with an auxiliary structure kept in sync' },
        lc('706', 'Design HashMap', 'Easy', 'design-hashmap', 'buckets + chaining'),
        lc('380', 'Insert Delete GetRandom O(1)', 'Medium', 'insert-delete-getrandom-o1', 'map + array, swap with the last'),
        lc('1472', 'Design Browser History', 'Medium', 'design-browser-history', 'doubly linked list with a cursor'),
      ],
    },
  },

  meta: {
    'binary-search-modified': {
      icon: '🧭',
      label: 'Modified',
      desc: 'The data is rotated, peaked, paired up or two-dimensional, yet one local look at mid still tells you which half to discard.',
      useNote: 'If you can state what mid proves about the left and right sides, the rest is the ordinary halving loop. Choose between lo <= hi and lo < hi by what the invariant says.',
      complexityNote: 'Each round discards half of the window and looks at a fixed number of cells, so the cost is logarithmic. Only a few indexes are stored.',
      highlight: ['Binary search', 'rotated', 'peak', 'single odd element', '2-D matrix', 'O(log n)'],
    },
    'lru-cache-design': {
      icon: '🗃️',
      label: 'Cache',
      desc: 'A hash map finds entries instantly and a doubly linked list keeps them in order, so using, inserting and evicting are all constant-time pointer edits.',
      useNote: 'Whenever a design question says "O(1) for every operation" plus an eviction or ordering rule, pair a map with a linked structure and keep them in sync.',
      complexityNote: 'Every operation is one map lookup plus a constant number of pointer changes. Memory grows with the number of stored entries, which the capacity bounds.',
      highlight: ['O(1)', 'hash map', 'doubly linked list', 'eviction', 'capacity', 'move to front'],
    },
  },

  examples: {
    'binary-search-classic': [
      { slug: '704-binary-search', why: 'The textbook loop on a sorted array: compare the middle with the target and discard half. It fixes the vocabulary (lo, mid, hi) the rest build on.' },
      { slug: '35-search-insert-position', why: 'The value may be missing, so the loop must end with lo sitting at the first element that is not smaller than the target. This is the "find the boundary" reading of binary search.' },
      { slug: '34-find-first-and-last-position', why: 'Duplicates turn one search into two boundary searches (leftmost and rightmost). The loop must keep going after a hit instead of returning.' },
    ],
    'binary-search-on-answer': [
      { slug: '875-koko-eating-bananas', why: 'The simplest search on an answer: the speed is monotone, and a one-pass check counts the hours for a candidate speed.' },
      { slug: '1011-capacity-to-ship-packages', why: 'The feasibility check becomes a greedy simulation (fill each day up to the capacity), and the lower bound is the heaviest single package.' },
      { slug: '410-split-array-largest-sum', why: 'Minimise the maximum piece. The same pattern with a greedy "cut when full" check, searching between the biggest element and the total sum.' },
    ],
    'stack-simple': [
      { slug: '20-valid-parentheses', why: 'The classic: push openers, and every closer must match the most recent unmatched opener.' },
      { slug: '150-evaluate-reverse-polish-notation', why: 'The stack holds values rather than symbols; each operator pops two operands and pushes the result.' },
      { slug: '155-min-stack', why: 'A second stack rides along to remember the minimum at every depth, so push, pop and min all stay O(1).' },
      { slug: '224-basic-calculator', why: 'Parentheses make the stack store the running total and the sign to resume once the bracket closes.' },
    ],
    'stack-monotonic-dec': [
      { slug: '739-daily-temperatures', why: 'Stack of waiting days; each warmer day pops everything colder and the answer is the index distance.' },
      { slug: '496-next-greater-element-i', why: 'Run the scan on nums2 and store the answers in a map so the queries on nums1 become lookups.' },
      { slug: '503-next-greater-element-ii', why: 'A circular array: walk the indexes twice (i mod n) and push only on the first lap to give every element a second chance.' },
    ],
    'stack-monotonic-inc': [
      { slug: '84-largest-rectangle-in-histogram', why: 'Popping a taller bar fixes its rectangle: the new top is the left boundary and the current index is the right boundary.' },
      { slug: '85-maximal-rectangle', why: 'Turn each matrix row into a histogram of heights and reuse the same stack routine once per row.' },
      { slug: '402-remove-k-digits', why: 'The increasing stack builds the smallest number: a digit larger than its successor is popped while removals remain, then any left-overs are cut from the tail.' },
    ],
    'linkedlist-fastslow': [
      { slug: '141-linked-list-cycle', why: 'If the list loops, the fast pointer eventually laps the slow one inside the cycle; otherwise it falls off the end.' },
      { slug: '876-middle-of-the-linked-list', why: 'No cycle at all: when fast reaches the end, slow has walked exactly half the list.' },
      { slug: '142-linked-list-cycle-ii', why: 'After the pointers meet, restarting one from the head makes both meet again exactly at the cycle entry. This is the arithmetic of the meeting point.' },
      { slug: '287-find-the-duplicate-number', why: 'There is no list in the input: treat nums[i] as a next pointer and the duplicate becomes the cycle entrance.' },
    ],
    'linkedlist-reversal': [
      { slug: '206-reverse-linked-list', why: 'The base move: flip one next pointer at a time while prev, curr and next keep the rest reachable.' },
      { slug: '92-reverse-linked-list-ii', why: 'Reverse only the segment [left, right]: walk to the node before it, reverse in place, then reconnect both ends.' },
      { slug: '234-palindrome-linked-list', why: 'Reversal as a tool: find the middle, reverse the second half, then compare the two halves.' },
      { slug: '25-reverse-nodes-in-k-group', why: 'Repeat the reversal on every block of k nodes and stitch the blocks together, leaving a short tail untouched.' },
    ],
    'linkedlist-merge': [
      { slug: '19-remove-nth-node-from-end', why: 'Two pointers n nodes apart: when the front one reaches the end, the back one is just before the node to delete.' },
      { slug: '21-merge-two-sorted-lists', why: 'Two pointers on two lists: always append the smaller head, with a dummy node to avoid special-casing the start.' },
      { slug: '2-add-two-numbers', why: 'Walk two lists in step while carrying a digit, building a third list; unequal lengths are handled as zeros.' },
    ],
    'binary-search-modified': [
      { slug: '33-search-in-rotated-sorted-array', why: 'One half of the window is always sorted. Decide which, check whether the target lies inside it, and discard the other half.' },
      { slug: '162-find-peak-element', why: 'There is no target: compare mid with mid + 1 and walk uphill. A peak is guaranteed on the rising side.' },
      { slug: '74-search-a-2d-matrix', why: 'A fully sorted matrix is one sorted line in disguise: search flat indexes and convert with row = m / cols, col = m % cols.' },
      { slug: '540-single-element-in-a-sorted-array', why: 'The signal is the parity of pair positions: before the odd one out pairs start on even indexes, afterwards on odd ones.' },
      { slug: '658-find-k-closest-elements', why: 'Binary search the start of the answer window by comparing the two values that would leave and enter it.' },
    ],
    'lru-cache-design': [
      { slug: '146-lru-cache', why: 'The foundation: a map to the node and a doubly linked list ordered by recency. Reads and writes move a node to the front; overflow drops the node before the tail.' },
      { slug: '460-lfu-cache', why: 'Order by use count first: one ordered bucket per count, a touch moves a key to the next bucket, and a tracked minimum count finds the victim in O(1).' },
      { slug: '432-all-o-1-data-structure', why: 'The list itself is made of count buckets kept sorted, and inc / dec shift a key to the neighbouring bucket so min and max sit at the two ends.' },
    ],
  },

  problems: [
    { id: '503', title: 'Next Greater Element II', difficulty: 'Medium', tag: 'monotonic stack + circular', category: 'Stack' },
    { id: '402', title: 'Remove K Digits', difficulty: 'Medium', tag: 'monotonic stack (increasing)', category: 'Stack' },
    { id: '540', title: 'Single Element in a Sorted Array', difficulty: 'Medium', tag: 'binary search on pair parity', category: 'Binary Search' },
    { id: '658', title: 'Find K Closest Elements', difficulty: 'Medium', tag: 'binary search on window start', category: 'Binary Search' },
    { id: '460', title: 'LFU Cache', difficulty: 'Hard', tag: 'hash map + frequency buckets of ordered lists', category: 'Design' },
    { id: '432', title: 'All O(1) Data Structure', difficulty: 'Hard', tag: 'hash map + linked list of count buckets', category: 'Design' },
  ],
};
