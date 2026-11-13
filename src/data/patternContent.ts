import type { PatternContent, PracticeItem } from './patterns.ts';

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id,
  title,
  difficulty,
  note,
  href: `https://leetcode.com/problems/${slug}/`,
});

/**
 * Pattern pages added after the first 13 (those live in patterns.ts).
 * Keyed by pattern slug (see PATTERN_GROUPS in patterns.ts). Owned by the patterns agent.
 */
export const EXTRA_CONTENT: Record<string, PatternContent> = {
  'two-pointers-threesum': {
    animation: '15-3sum',
    summary: 'Sort the array, fix one number, then run a two-pointer squeeze on the rest to find the pair that completes the target. k-Sum becomes (k-2) nested loops plus one squeeze.',
    whenToUse: [
      'You need all unique tuples (triplets, quadruplets) whose sum hits a target',
      'Sorting the input is allowed, because the answer is a set of values, not original positions',
      'A pair-sum on a sorted array would be O(n), so fixing one element gives O(n²) overall instead of O(n³)',
      'Duplicates must not appear in the output, which sorted order makes easy to skip',
    ],
    tip: 'Skip duplicates in two places: the fixed element (compare with the previous one) and, after recording a hit, both pointers. Break early when the fixed value is already positive and the target is zero.',
    template: `static List<List<Integer>> threeSum(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    Arrays.sort(nums);                                  // sorted order enables the squeeze

    // ── Phase 1: fix the first number ──
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;  // skip duplicate anchors

        // ── Phase 2: squeeze the rest ──
        int lo = i + 1, hi = nums.length - 1;
        while (lo < hi) {
            int sum = nums[i] + nums[lo] + nums[hi];
            if (sum < 0) lo++;                          // need a bigger sum
            else if (sum > 0) hi--;                     // need a smaller sum
            else {
                out.add(List.of(nums[i], nums[lo], nums[hi]));
                lo++; hi--;                             // move both after a hit
                while (lo < hi && nums[lo] == nums[lo - 1]) lo++;  // skip duplicates
            }
        }
    }
    return out;                                         // O(n²) time, O(1) extra space
}`,
    practice: [
      '167-two-sum-ii',
      '15-3sum',
      lc('16', '3Sum Closest', 'Medium', '3sum-closest', 'same squeeze, track the closest sum'),
      lc('18', '4Sum', 'Medium', '4sum', 'two fixed loops + squeeze'),
      '42-trapping-rain-water',
    ],
  },
  'prefix-sum': {
    animation: '1480-running-sum-of-1d-array',
    summary: 'Precompute running totals once so that the sum of any range is a single subtraction. Pay O(n) up front, answer every query in O(1).',
    whenToUse: [
      'You are asked about the sum of many different subarrays or ranges',
      'You want to count subarrays with a given sum, which becomes "have I seen total - k before?" with a hash map',
      'The product or "everything except me" of an array is needed without division',
      'The array does not change between queries (otherwise think of a Fenwick tree)',
    ],
    tip: 'Use a prefix array one slot longer than the input, with prefix[0] = 0, so that sum(l..r) = prefix[r+1] - prefix[l] needs no special case for l = 0.',
    template: `static int countSubarraysWithSum(int[] nums, int k) {
    // ── Phase 1: prefix totals are built on the fly ──
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);                       // the empty prefix has total 0
    int total = 0, count = 0;

    // ── Phase 2: one pass, ask "who ends a window at i?" ──
    for (int x : nums) {
        total += x;                       // prefix[i + 1]
        count += seen.getOrDefault(total - k, 0);  // earlier prefixes that leave sum k
        seen.merge(total, 1, Integer::sum);        // remember this prefix
    }
    return count;                         // O(n) time, O(n) space
}

// Static range queries: build once, then answer in O(1)
static int[] buildPrefix(int[] a) {
    int[] prefix = new int[a.length + 1];
    for (int i = 0; i < a.length; i++) prefix[i + 1] = prefix[i] + a[i];
    return prefix;                        // sum(l..r) = prefix[r + 1] - prefix[l]
}`,
    practice: [
      lc('303', 'Range Sum Query - Immutable', 'Easy', 'range-sum-query-immutable', 'the textbook prefix array'),
      '1480-running-sum-of-1d-array',
      lc('724', 'Find Pivot Index', 'Easy', 'find-pivot-index', 'left sum vs total - left - x'),
      '560-subarray-sum-equals-k',
      lc('525', 'Contiguous Array', 'Medium', 'contiguous-array', 'map 0 to -1, then equal prefixes'),
    ],
  },
  'binary-search-on-answer': {
    animation: '875-koko-eating-bananas',
    summary: 'When you cannot search the data but can test a guess for the answer, binary search the answer space: find the smallest (or largest) value for which a feasibility check passes.',
    whenToUse: [
      'The question asks for the minimum value that is enough, or the maximum value that still works (speed, capacity, days, distance)',
      'A feasibility check for a guess is easy to write in O(n)',
      'If a guess x works then every larger (or smaller) guess also works, so the answers form a monotone yes/no line',
      'The answer lives in a numeric range you can bound, such as 1 up to the largest element or the total sum',
    ],
    tip: 'Write feasible(x) first and test it by hand on two guesses. Then shape the loop as "if feasible(mid), hi = mid else lo = mid + 1" so that it converges on the first value that works.',
    template: `static int smallestFeasible(int[] data, int limit) {
    // ── Phase 1: bound the answer space ──
    int lo = 1;                                  // smallest value that could possibly work
    int hi = Arrays.stream(data).max().getAsInt();  // a value that surely works

    // ── Phase 2: binary search on the guess ──
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;            // avoids overflow
        if (feasible(data, mid, limit)) hi = mid;      // mid works, try smaller
        else lo = mid + 1;                             // mid fails, need more
    }
    return lo;                                   // O(n log range) time, O(1) space
}

// ── Phase 3: the monotone yes/no test ──
static boolean feasible(int[] data, int guess, int limit) {
    long used = 0;
    for (int x : data) used += (x + guess - 1) / guess;   // cost of x at this guess
    return used <= limit;
}`,
    practice: [
      lc('69', 'Sqrt(x)', 'Easy', 'sqrtx', 'largest m with m*m <= x'),
      lc('1283', 'Find the Smallest Divisor Given a Threshold', 'Medium', 'find-the-smallest-divisor-given-a-threshold', 'same ceil-sum check as Koko'),
      '875-koko-eating-bananas',
      '1011-capacity-to-ship-packages',
      '410-split-array-largest-sum',
    ],
  },
  'stack-monotonic-inc': {
    animation: '84-largest-rectangle-in-histogram',
    summary: 'Keep a stack whose values only go up. A smaller value arriving forces taller bars off the stack, and at that moment you learn exactly how far each popped bar could stretch.',
    whenToUse: [
      'You need the nearest smaller element on the left and the right of each position',
      'Each item defines a rectangle, span or range whose width depends on the first shorter neighbour on each side',
      'Maximal rectangle problems, which reduce to a histogram row by row',
      'Removing digits or characters to get the smallest result, where larger leading values get evicted',
    ],
    tip: 'Append a sentinel value of 0 at the end of the input so everything left on the stack is flushed and popped by the same code path. The width of a popped bar is i - stack.top - 1 after the pop.',
    template: `static int largestRectangle(int[] h) {
    Deque<Integer> stack = new ArrayDeque<>();    // indexes with increasing heights
    int best = 0;

    // ── Phase 1: scan, with a sentinel 0 bar at the end ──
    for (int i = 0; i <= h.length; i++) {
        int cur = (i == h.length) ? 0 : h[i];

        // ── Phase 2: a lower bar ends every taller bar's reach ──
        while (!stack.isEmpty() && h[stack.peek()] > cur) {
            int height = h[stack.pop()];                       // bar being resolved
            int left = stack.isEmpty() ? -1 : stack.peek();    // first smaller on the left
            best = Math.max(best, height * (i - left - 1));    // width between the two smaller bars
        }
        stack.push(i);                            // heights on the stack never decrease
    }
    return best;                                  // O(n) time, O(n) space
}`,
    practice: [
      '496-next-greater-element-i',
      lc('901', 'Online Stock Span', 'Medium', 'online-stock-span', 'previous greater, width from the stack'),
      lc('402', 'Remove K Digits', 'Medium', 'remove-k-digits', 'pop larger digits while k > 0'),
      '84-largest-rectangle-in-histogram',
      '85-maximal-rectangle',
    ],
  },
  'bfs-standard': {
    animation: '102-binary-tree-level-order-traversal',
    summary: 'Explore a graph or tree in rings around the start: a FIFO queue guarantees nodes are visited in order of distance, so the first time you reach a node is by a shortest route.',
    whenToUse: [
      'You need the minimum number of steps, moves or edges between two states in an unweighted graph',
      'Results must be grouped by level or depth',
      'The state space is a graph that is implicit (words that differ by one letter, board positions)',
      'DFS would find a path but you need the shortest one',
    ],
    tip: 'Record the queue size at the start of each round and process exactly that many nodes; the loop count is then your distance. Mark nodes visited when you enqueue them, not when you dequeue, or the queue fills with duplicates.',
    template: `static int shortestDistance(Map<Integer, List<Integer>> graph, int start, int target) {
    // ── Phase 1: seed the queue ──
    Queue<Integer> queue = new ArrayDeque<>();
    Set<Integer> visited = new HashSet<>();
    queue.add(start);
    visited.add(start);                           // mark on enqueue
    int dist = 0;

    // ── Phase 2: expand ring by ring ──
    while (!queue.isEmpty()) {
        for (int size = queue.size(); size > 0; size--) {   // one full level
            int node = queue.poll();
            if (node == target) return dist;
            for (int next : graph.getOrDefault(node, List.of())) {
                if (visited.add(next)) queue.add(next);     // first visit is the shortest
            }
        }
        dist++;                                   // finished a level
    }
    return -1;                                    // O(V + E) time, O(V) space
}`,
    practice: [
      lc('111', 'Minimum Depth of Binary Tree', 'Easy', 'minimum-depth-of-binary-tree', 'first leaf found is the answer'),
      '102-binary-tree-level-order-traversal',
      '1971-find-if-path-exists-in-graph',
      lc('752', 'Open the Lock', 'Medium', 'open-the-lock', 'implicit graph of 4-digit states'),
      '127-word-ladder',
    ],
  },
  'bfs-multisource': {
    animation: '994-rotting-oranges',
    summary: 'Seed the queue with every starting cell at once. The wavefronts expand together, so each cell is labelled with its distance to the nearest source in a single pass.',
    whenToUse: [
      'Many sources spread simultaneously (fire, rot, infection, water) and you need the time until everything is reached',
      'Every cell needs its distance to the closest special cell',
      'Running one BFS per source would cost O(sources * cells)',
      'The answer is the number of rounds until nothing new can be reached, or -1 if something stays unreachable',
    ],
    tip: 'Count the targets you still need to reach before the loop and decrement as the wave touches them. If the counter is non-zero when the queue empties, report impossible instead of the time.',
    template: `static int spreadTime(int[][] grid) {
    int rows = grid.length, cols = grid[0].length, fresh = 0;
    Queue<int[]> queue = new ArrayDeque<>();

    // ── Phase 1: every source enters the queue together ──
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) queue.add(new int[]{r, c});
            else if (grid[r][c] == 1) fresh++;           // cells still to reach
        }

    // ── Phase 2: all wavefronts advance one step per round ──
    int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    int minutes = 0;
    while (!queue.isEmpty() && fresh > 0) {
        for (int size = queue.size(); size > 0; size--) {
            int[] cell = queue.poll();
            for (int[] d : dirs) {
                int nr = cell[0] + d[0], nc = cell[1] + d[1];
                if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] != 1) continue;
                grid[nr][nc] = 2;                        // infect and mark visited
                fresh--;
                queue.add(new int[]{nr, nc});
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;                    // O(R*C) time and space
}`,
    practice: [
      '200-number-of-islands',
      lc('542', '01 Matrix', 'Medium', '01-matrix', 'all zeros are the sources'),
      '994-rotting-oranges',
      lc('1162', 'As Far from Land as Possible', 'Medium', 'as-far-from-land-as-possible', 'all land cells are the sources'),
      '417-pacific-atlantic-water-flow',
    ],
  },
  'linkedlist-fastslow': {
    animation: '141-linked-list-cycle',
    summary: 'Move one pointer one step at a time and another two steps at a time. Their relative speed reveals cycles and finds the middle without knowing the length.',
    whenToUse: [
      'You must detect a cycle in a linked list, or in a sequence generated by repeatedly applying a function',
      'You need the middle node, or the start of the second half, in one pass',
      'The problem forbids extra memory, ruling out a visited set',
      'You want the node where a cycle begins (a second phase restarts one pointer at the head)',
    ],
    tip: 'Check fast and fast.next for null before stepping twice. For the middle of an even-length list this loop leaves slow on the second of the two middle nodes, so adjust if you need the first.',
    template: `static ListNode cycleStart(ListNode head) {
    ListNode slow = head, fast = head;

    // ── Phase 1: tortoise and hare ──
    while (fast != null && fast.next != null) {
        slow = slow.next;                 // one step
        fast = fast.next.next;            // two steps
        if (slow == fast) break;          // they met inside the cycle
    }
    if (fast == null || fast.next == null) return null;   // no cycle

    // ── Phase 2: find where the cycle begins ──
    slow = head;                          // restart one pointer at the head
    while (slow != fast) {
        slow = slow.next;                 // both move one step now
        fast = fast.next;
    }
    return slow;                          // O(n) time, O(1) space
}`,
    practice: [
      lc('876', 'Middle of the Linked List', 'Easy', 'middle-of-the-linked-list', 'slow ends at the middle'),
      '141-linked-list-cycle',
      '234-palindrome-linked-list',
      '142-linked-list-cycle-ii',
      '287-find-the-duplicate-number',
    ],
  },
  'linkedlist-merge': {
    animation: '19-remove-nth-node-from-end',
    summary: 'Use two pointers with a deliberate offset or a comparison rule: keep one pointer n nodes ahead, or advance whichever of two lists has the smaller head.',
    whenToUse: [
      'You need the nth node from the end of a list in a single pass',
      'Two sorted lists must be merged into one sorted list by relinking nodes',
      'Node removal may affect the head, which a dummy node handles uniformly',
      'Lists can have different lengths and you want to avoid computing them first',
    ],
    tip: 'Put a dummy node in front of the head. Then deleting the real head, or merging when the first list is empty, needs no special case. Return dummy.next at the end.',
    template: `// Remove the n-th node from the end with a fixed gap between two pointers
static ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);   // makes deleting the head uniform
    ListNode lead = dummy, trail = dummy;

    // ── Phase 1: open a gap of n nodes ──
    for (int i = 0; i < n; i++) lead = lead.next;

    // ── Phase 2: move together until lead hits the tail ──
    while (lead.next != null) {
        lead = lead.next;
        trail = trail.next;               // trail stays n behind
    }
    trail.next = trail.next.next;         // unlink the target
    return dummy.next;                    // O(n) time, O(1) space
}

// Merge two sorted lists by always taking the smaller head
static ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;      // append whichever list remains
    return dummy.next;
}`,
    practice: [
      lc('160', 'Intersection of Two Linked Lists', 'Easy', 'intersection-of-two-linked-lists', 'equalise lengths by switching heads'),
      '21-merge-two-sorted-lists',
      '19-remove-nth-node-from-end',
      lc('61', 'Rotate List', 'Medium', 'rotate-list', 'gap of k from the tail'),
      '143-reorder-list',
    ],
  },
  'tree-bfs': {
    animation: '102-binary-tree-level-order-traversal',
    summary: 'Process a tree one level at a time with a queue. Each pass handles exactly the nodes currently in the queue and enqueues their children for the next pass.',
    whenToUse: [
      'The output is organised by level (a list of lists, per-level average, rightmost node of each level)',
      'The answer depends on the shallowest node that satisfies a condition',
      'A zigzag or alternate-direction traversal is requested',
      'You want to avoid deep recursion on a very skewed tree',
    ],
    tip: 'Snapshot len(queue) before the inner loop; that is the width of the current level. Everything you enqueue inside the loop belongs to the next level.',
    template: `static List<List<Integer>> levels(TreeNode root) {
    List<List<Integer>> out = new ArrayList<>();
    if (root == null) return out;
    Queue<TreeNode> queue = new ArrayDeque<>();
    queue.add(root);                              // ── Phase 1: start with the root ──

    // ── Phase 2: one iteration per level ──
    while (!queue.isEmpty()) {
        int width = queue.size();                 // nodes in this level
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < width; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);                  // visit
            if (node.left != null) queue.add(node.left);     // children go to the next level
            if (node.right != null) queue.add(node.right);
        }
        out.add(level);
    }
    return out;                                   // O(n) time, O(width) space
}`,
    practice: [
      lc('111', 'Minimum Depth of Binary Tree', 'Easy', 'minimum-depth-of-binary-tree', 'stop at the first leaf'),
      '102-binary-tree-level-order-traversal',
      '199-binary-tree-right-side-view',
      '103-binary-tree-zigzag-level-order',
      lc('116', 'Populating Next Right Pointers in Each Node', 'Medium', 'populating-next-right-pointers-in-each-node', 'link nodes within a level'),
    ],
  },
  'tree-paths': {
    animation: '113-path-sum-ii',
    summary: 'Walk from the root downwards carrying the state of the path so far (remaining sum, the nodes chosen), record it at the leaves, and undo the choice when returning.',
    whenToUse: [
      'The problem is about root-to-leaf or node-to-node paths and their sums or labels',
      'You must list every path that meets a condition, not just count them',
      'The value you pass down (remaining target, number built so far) differs from the value you return up',
      'A path may bend at a node, so you combine the best left and right branches there (maximum path sum)',
    ],
    tip: 'When you collect paths, copy the current path list at the leaf (path[:] or new ArrayList) and pop the last node on the way back, otherwise every stored answer ends up pointing at the same list.',
    template: `static List<List<Integer>> pathsWithSum(TreeNode root, int target) {
    List<List<Integer>> out = new ArrayList<>();
    walk(root, target, new ArrayList<>(), out);
    return out;                                   // O(n) time (plus copying), O(h) stack
}

static void walk(TreeNode node, int remaining, List<Integer> path, List<List<Integer>> out) {
    if (node == null) return;

    // ── Phase 1: choose this node ──
    path.add(node.val);
    remaining -= node.val;

    // ── Phase 2: record at a leaf, otherwise explore children ──
    if (node.left == null && node.right == null) {
        if (remaining == 0) out.add(new ArrayList<>(path));   // copy, not the live list
    } else {
        walk(node.left, remaining, path, out);
        walk(node.right, remaining, path, out);
    }

    // ── Phase 3: un-choose on the way back ──
    path.remove(path.size() - 1);
}`,
    practice: [
      lc('257', 'Binary Tree Paths', 'Easy', 'binary-tree-paths', 'build the path string on the way down'),
      '112-path-sum',
      '113-path-sum-ii',
      lc('437', 'Path Sum III', 'Medium', 'path-sum-iii', 'prefix sums along the current path'),
      '124-binary-tree-maximum-path-sum',
    ],
  },
  'tree-bst': {
    animation: '98-validate-binary-search-tree',
    summary: 'A binary search tree keeps smaller values left and larger values right, so you can discard half the tree at every node, and an in-order walk yields sorted values.',
    whenToUse: [
      'The tree is a BST and you need to search, insert, delete, or find a floor or ceiling',
      'You need the kth smallest value, which in-order traversal produces in sorted order',
      'You must verify that a tree really is a BST',
      'A sorted array should become a balanced tree by repeatedly picking the middle',
    ],
    tip: 'Checking only each node against its direct children is a classic bug. Pass down an open interval (low, high) that tightens as you go, or verify that the in-order sequence is strictly increasing.',
    template: `// Validate: every node must sit strictly inside the bounds its ancestors impose
static boolean isValidBST(TreeNode node, long low, long high) {
    if (node == null) return true;                       // empty subtree is fine
    if (node.val <= low || node.val >= high) return false;
    return isValidBST(node.left, low, node.val)          // left side: values below node
        && isValidBST(node.right, node.val, high);       // right side: values above node
}

// Search / insert walk a single root-to-leaf path
static TreeNode insert(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);          // found the empty slot
    if (val < root.val) root.left = insert(root.left, val);    // discard the right half
    else root.right = insert(root.right, val);                 // discard the left half
    return root;                                         // O(h) time, O(h) stack
}

// kth smallest: in-order traversal visits values in sorted order
static int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> stack = new ArrayDeque<>();
    for (TreeNode cur = root; cur != null || !stack.isEmpty(); cur = cur.right) {
        while (cur != null) { stack.push(cur); cur = cur.left; }
        cur = stack.pop();
        if (--k == 0) return cur.val;
    }
    return -1;
}`,
    practice: [
      lc('700', 'Search in a Binary Search Tree', 'Easy', 'search-in-a-binary-search-tree', 'discard one side per step'),
      '108-convert-sorted-array-to-bst',
      '98-validate-binary-search-tree',
      '230-kth-smallest-element-in-a-bst',
      lc('450', 'Delete Node in a BST', 'Medium', 'delete-node-in-a-bst', 'replace with in-order successor'),
    ],
  },
  'backtrack-subsets': {
    animation: '78-subsets',
    summary: 'For each element make two choices, include it or skip it, and recurse. Every path through that decision tree is one subset.',
    whenToUse: [
      'You must enumerate every subset, or every subset meeting a property',
      'Each item is independent: it is either in the answer or not',
      'The input size is small (about 20 or fewer), since the output has 2^n entries',
      'There are duplicates and you need distinct subsets, which sort-and-skip handles',
    ],
    tip: 'Choose, explore, unchoose: append the item, recurse from the next index, then pop it. To skip duplicate values, sort first and ignore an item equal to its predecessor at the same depth.',
    template: `static List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    Arrays.sort(nums);                                   // only needed when duplicates exist
    explore(nums, 0, new ArrayList<>(), out);
    return out;                                          // O(n * 2^n) time, O(n) stack
}

static void explore(int[] nums, int start, List<Integer> cur, List<List<Integer>> out) {
    out.add(new ArrayList<>(cur));                       // every node of the tree is a subset

    for (int i = start; i < nums.length; i++) {
        if (i > start && nums[i] == nums[i - 1]) continue;   // skip duplicate siblings

        cur.add(nums[i]);                                // ── choose ──
        explore(nums, i + 1, cur, out);                  // ── explore: only look forward ──
        cur.remove(cur.size() - 1);                      // ── un-choose ──
    }
}`,
    practice: [
      lc('1863', 'Sum of All Subset XOR Totals', 'Easy', 'sum-of-all-subset-xor-totals', 'enumerate, or spot the shortcut'),
      '78-subsets',
      '90-subsets-ii',
      lc('784', 'Letter Case Permutation', 'Medium', 'letter-case-permutation', 'two choices per letter'),
      lc('131', 'Palindrome Partitioning', 'Medium', 'palindrome-partitioning', 'choose where to cut'),
    ],
  },
  'backtrack-perms': {
    animation: '46-permutations',
    summary: 'Build an ordering one position at a time, trying every unused element for the current slot, and backtrack to try the next candidate.',
    whenToUse: [
      'The order of the chosen items matters and all of them must be used',
      'You must generate every arrangement (or find the next one) of a small collection',
      'The state is "which elements are still available", tracked by a used array or by swapping',
      'The size of the answer is n! so n is at most about 8 to 10',
    ],
    tip: 'Track availability with a boolean used[] array, unset it when you backtrack, and add a copy of the path once its length equals n. For inputs with duplicates, sort and skip a value when its twin is unused.',
    template: `static List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    Arrays.sort(nums);                                   // needed only for duplicate handling
    build(nums, new boolean[nums.length], new ArrayList<>(), out);
    return out;                                          // O(n * n!) time, O(n) extra space
}

static void build(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
    // ── Phase 1: a full ordering is an answer ──
    if (path.size() == nums.length) { out.add(new ArrayList<>(path)); return; }

    // ── Phase 2: try every unused element in this slot ──
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;   // skip equal twin

        used[i] = true; path.add(nums[i]);               // choose
        build(nums, used, path, out);                    // explore
        path.remove(path.size() - 1); used[i] = false;   // un-choose
    }
}`,
    practice: [
      '46-permutations',
      '31-next-permutation',
      lc('47', 'Permutations II', 'Medium', 'permutations-ii', 'sort + skip equal twins'),
      '17-letter-combinations-of-a-phone-number',
      lc('60', 'Permutation Sequence', 'Hard', 'permutation-sequence', 'factorial counting instead of enumerating'),
    ],
  },
  'backtrack-combos': {
    animation: '39-combination-sum',
    summary: 'Pick items in increasing index order so that no combination repeats, and prune a branch as soon as it cannot reach the target.',
    whenToUse: [
      'You need groups where order does not matter (combinations, partitions, sums that hit a target)',
      'Elements can be reused, or each can be used once, and you must list the results',
      'A running total or size lets you cut a branch early (the sum already exceeds the target)',
      'Brute-forcing every subset would be correct but far too slow',
    ],
    tip: 'Pass a start index so that you only look forward and never produce the same set in a different order. Sorting the candidates lets you break out of the loop the first time one overshoots.',
    template: `static List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> out = new ArrayList<>();
    Arrays.sort(candidates);                             // enables early break
    search(candidates, target, 0, new ArrayList<>(), out);
    return out;                                          // exponential in target / min(candidate)
}

static void search(int[] c, int remaining, int start, List<Integer> cur, List<List<Integer>> out) {
    // ── Phase 1: base cases ──
    if (remaining == 0) { out.add(new ArrayList<>(cur)); return; }

    // ── Phase 2: only look forward, so each set appears once ──
    for (int i = start; i < c.length; i++) {
        if (c[i] > remaining) break;                     // prune: sorted, so the rest overshoot

        cur.add(c[i]);                                   // choose
        search(c, remaining - c[i], i, cur, out);        // pass i to reuse, i + 1 to use once
        cur.remove(cur.size() - 1);                      // un-choose
    }
}`,
    practice: [
      '77-combinations',
      lc('216', 'Combination Sum III', 'Medium', 'combination-sum-iii', 'fixed size k and digits 1-9'),
      '39-combination-sum',
      lc('40', 'Combination Sum II', 'Medium', 'combination-sum-ii', 'each item once, skip duplicates'),
      '22-generate-parentheses',
    ],
  },
  'greedy-intervals': {
    animation: '56-merge-intervals',
    summary: 'Sort intervals by start (or end) so overlaps become neighbours, then sweep once, deciding locally whether to merge, skip or count.',
    whenToUse: [
      'Input is a list of ranges and you must merge, insert, count overlaps or remove the fewest',
      'Sorting turns "does anything overlap?" into a comparison with only the previous item',
      'You want the minimum number of resources (rooms, arrows, platforms) to cover all ranges',
      'A scheduling problem where picking the earliest finishing option is provably best',
    ],
    tip: 'Decide the sort key by the question: sort by start to merge, sort by end to keep the maximum number of non-overlapping intervals. Be explicit whether touching endpoints count as overlap.',
    template: `static int[][] mergeIntervals(int[][] intervals) {
    // ── Phase 1: sort by start so overlaps are neighbours ──
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> merged = new ArrayList<>();

    // ── Phase 2: sweep once ──
    for (int[] cur : intervals) {
        if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < cur[0]) {
            merged.add(cur);                             // gap: start a new group
        } else {
            int[] last = merged.get(merged.size() - 1);
            last[1] = Math.max(last[1], cur[1]);         // overlap: extend the end
        }
    }
    return merged.toArray(new int[0][]);                 // O(n log n) time, O(n) output
}

// Variant: keep the most intervals by sorting on END time and taking what fits
static int maxNonOverlapping(int[][] iv) {
    Arrays.sort(iv, (a, b) -> Integer.compare(a[1], b[1]));
    int count = 0, end = Integer.MIN_VALUE;
    for (int[] cur : iv) if (cur[0] >= end) { count++; end = cur[1]; }
    return count;
}`,
    practice: [
      lc('455', 'Assign Cookies', 'Easy', 'assign-cookies', 'sort both sides, match greedily'),
      '56-merge-intervals',
      '57-insert-interval',
      '435-non-overlapping-intervals',
      '253-meeting-rooms-ii',
    ],
  },
  'greedy-jump': {
    animation: '55-jump-game',
    summary: 'Keep track of the farthest index you can reach so far. If you ever stand beyond it, you are stuck; if it reaches the end, you win. No search is needed.',
    whenToUse: [
      'Each position tells you how far you can move, and you ask if (or in how few moves) the end is reachable',
      'A local best choice, such as the maximum reach, can be shown to never hurt later decisions',
      'A DP over positions would work but costs O(n²)',
      'You want a single pass with constant extra memory',
    ],
    tip: 'Update reach = max(reach, i + nums[i]) at every i, and stop with failure if i > reach. For the minimum number of jumps, count a jump each time you cross the end of the current window.',
    template: `static boolean canReachEnd(int[] nums) {
    int reach = 0;                                       // farthest index known to be reachable

    // ── Phase 1: sweep left to right ──
    for (int i = 0; i < nums.length; i++) {
        if (i > reach) return false;                     // stranded before index i
        reach = Math.max(reach, i + nums[i]);            // best jump from here
        if (reach >= nums.length - 1) return true;       // already covers the end
    }
    return true;                                         // O(n) time, O(1) space
}

// Variant: fewest jumps, counted by window of reach
static int minJumps(int[] nums) {
    int jumps = 0, windowEnd = 0, farthest = 0;
    for (int i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i == windowEnd) { jumps++; windowEnd = farthest; }   // must jump at the window edge
    }
    return jumps;
}`,
    practice: [
      lc('860', 'Lemonade Change', 'Easy', 'lemonade-change', 'greedy choice of which bills to give back'),
      '55-jump-game',
      '45-jump-game-ii',
      '134-gas-station',
      '135-candy',
    ],
  },
  'heap-topk': {
    animation: '215-kth-largest-element-in-an-array',
    summary: 'Keep a min-heap of size k. Each new value either replaces the smallest of the k best or is ignored, so the heap root is always the kth largest seen.',
    whenToUse: [
      'You need the k largest, k smallest, k most frequent or k closest items',
      'k is much smaller than n, so sorting everything is wasteful',
      'Data arrives as a stream and the top k must stay available at any moment',
      'You repeatedly need the current maximum or minimum while removing it (last stone weight)',
    ],
    tip: 'For the k largest, use a MIN-heap of size k so you can evict the weakest candidate cheaply. For the k smallest, flip it and use a max-heap. Push first, then pop when the size exceeds k.',
    template: `static int kthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();   // min-heap holding the k best so far

    // ── Phase 1: stream every value through the heap ──
    for (int x : nums) {
        heap.offer(x);                                     // O(log k)
        if (heap.size() > k) heap.poll();                  // evict the weakest candidate
    }

    // ── Phase 2: the root is the kth largest ──
    return heap.peek();                                    // O(n log k) time, O(k) space
}

// Top-k by frequency: same idea with a comparator on the counts
static List<Integer> topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int x : nums) freq.merge(x, 1, Integer::sum);
    PriorityQueue<Integer> heap = new PriorityQueue<>((a, b) -> freq.get(a) - freq.get(b));
    for (int key : freq.keySet()) { heap.offer(key); if (heap.size() > k) heap.poll(); }
    return new ArrayList<>(heap);
}`,
    practice: [
      lc('703', 'Kth Largest Element in a Stream', 'Easy', 'kth-largest-element-in-a-stream', 'permanent min-heap of size k'),
      '1046-last-stone-weight',
      '215-kth-largest-element-in-an-array',
      '347-top-k-frequent-elements',
      '973-k-closest-points-to-origin',
    ],
  },
  'heap-two-heaps': {
    animation: '295-find-median-from-data-stream',
    summary: 'Split the data into a max-heap for the lower half and a min-heap for the upper half, kept within one element of each other. The median is read from the heap tops.',
    whenToUse: [
      'You need a running median, or the middle value of a changing collection',
      'Values are inserted continuously and queries come between insertions',
      'You must split data into a smaller half and a larger half and watch the boundary',
      'Re-sorting after each insert would cost O(n log n) each time',
    ],
    tip: 'Insert into the lower half, move its top to the upper half, then rebalance so the lower half is the same size or one bigger. Insert costs O(log n); the median is just a peek, O(1).',
    template: `class MedianFinder {
    private final PriorityQueue<Integer> low  = new PriorityQueue<>(Comparator.reverseOrder()); // max-heap, smaller half
    private final PriorityQueue<Integer> high = new PriorityQueue<>();                          // min-heap, larger half

    void addNum(int x) {                       // O(log n)
        // ── Phase 1: route through the lower half so ordering stays valid ──
        low.offer(x);
        high.offer(low.poll());                // the largest of the low half moves up

        // ── Phase 2: rebalance so low has the same size or one extra ──
        if (high.size() > low.size()) low.offer(high.poll());
    }

    double findMedian() {                      // O(1)
        if (low.size() > high.size()) return low.peek();         // odd count
        return (low.peek() + high.peek()) / 2.0;                 // even count
    }
}`,
    practice: [
      '1046-last-stone-weight',
      '215-kth-largest-element-in-an-array',
      '295-find-median-from-data-stream',
      lc('480', 'Sliding Window Median', 'Hard', 'sliding-window-median', 'two heaps with lazy deletion'),
      lc('502', 'IPO', 'Hard', 'ipo', 'min-heap by capital, max-heap by profit'),
    ],
  },
  'heap-kway': {
    animation: '23-merge-k-sorted-lists',
    summary: 'Put the head of each of the k sorted inputs into a min-heap. Repeatedly pop the smallest and push its successor, so the heap always holds the next candidate from every list.',
    whenToUse: [
      'You must merge k sorted lists, arrays or streams into one sorted output',
      'You want the smallest element across several sorted sources, one at a time',
      'k is large enough that comparing all heads each time (O(k) per step) is too slow',
      'The sources are too large to concatenate and sort in memory',
    ],
    tip: 'Store (value, list index, position) in the heap, or the node itself with a comparator, so you know where to take the successor from. Skip empty lists when seeding the heap.',
    template: `static ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));

    // ── Phase 1: seed with the head of every non-empty list ──
    for (ListNode head : lists) if (head != null) heap.offer(head);

    // ── Phase 2: repeatedly take the global minimum ──
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!heap.isEmpty()) {
        ListNode smallest = heap.poll();                 // O(log k)
        tail.next = smallest;
        tail = smallest;
        if (smallest.next != null) heap.offer(smallest.next);   // push its successor
    }
    return dummy.next;                                   // O(N log k) time, O(k) space
}`,
    practice: [
      '88-merge-sorted-array',
      '21-merge-two-sorted-lists',
      '23-merge-k-sorted-lists',
      lc('378', 'Kth Smallest Element in a Sorted Matrix', 'Medium', 'kth-smallest-element-in-a-sorted-matrix', 'each row is a sorted list'),
      lc('373', 'Find K Pairs with Smallest Sums', 'Medium', 'find-k-pairs-with-smallest-sums', 'heap of (i, j) frontiers'),
    ],
  },
  'graph-union-find': {
    animation: '684-redundant-connection',
    summary: 'Maintain groups of connected nodes in a forest of parent pointers. find returns a group leader and union merges two groups, both in nearly constant time.',
    whenToUse: [
      'You add edges one at a time and ask whether two nodes are already connected',
      'You need to detect the edge that closes a cycle in an undirected graph',
      'The question is about the number or size of connected components as they merge',
      'A full DFS after each change would be too slow',
    ],
    tip: 'Use path compression in find and union by size or rank. If find(a) == find(b) before you union them, that edge would create a cycle, which is exactly the answer for redundant-edge problems.',
    template: `class DisjointSet {
    private final int[] parent, size;
    int components;

    DisjointSet(int n) {
        parent = new int[n]; size = new int[n]; components = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }   // every node is its own group
    }

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];       // path compression (halving)
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;              // already connected: this edge closes a cycle
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                         // attach the smaller tree under the larger
        size[ra] += size[rb];
        components--;
        return true;                             // near O(1) amortised, O(n) space
    }
}`,
    practice: [
      lc('1971', 'Find if Path Exists in Graph', 'Easy', 'find-if-path-exists-in-graph', 'find(a) == find(b)'),
      lc('547', 'Number of Provinces', 'Medium', 'number-of-provinces', 'count remaining components'),
      '684-redundant-connection',
      lc('721', 'Accounts Merge', 'Medium', 'accounts-merge', 'union accounts sharing an email'),
      lc('990', 'Satisfiability of Equality Equations', 'Medium', 'satisfiability-of-equality-equations', 'union equalities, then check not-equals'),
    ],
  },
  'graph-topo-sort': {
    animation: '210-course-schedule-ii',
    summary: 'Repeatedly take nodes that have no unmet prerequisites. Kahn\'s algorithm tracks in-degrees with a queue, and if some nodes are never taken, the graph has a cycle.',
    whenToUse: [
      'Tasks have dependencies and you need a valid order to perform them',
      'You must decide whether a set of prerequisites is feasible (no cycle)',
      'The graph is directed and should be acyclic',
      'More than one valid order may exist and any of them is accepted',
    ],
    tip: 'Compare the number of nodes you output with the total: if it is smaller, a cycle blocked the rest. Build the adjacency list from prerequisite to dependent so that edges point in the order of work.',
    template: `static int[] topoOrder(int n, int[][] prereqs) {   // prereqs[i] = {course, mustTakeFirst}
    List<List<Integer>> next = new ArrayList<>();
    int[] indegree = new int[n];
    for (int i = 0; i < n; i++) next.add(new ArrayList<>());

    // ── Phase 1: build edges prerequisite -> dependent ──
    for (int[] p : prereqs) { next.get(p[1]).add(p[0]); indegree[p[0]]++; }

    // ── Phase 2: start with everything that has no prerequisites ──
    Queue<Integer> ready = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) ready.add(i);

    // ── Phase 3: peel off nodes, unlocking their dependents ──
    int[] order = new int[n];
    int taken = 0;
    while (!ready.isEmpty()) {
        int node = ready.poll();
        order[taken++] = node;
        for (int dep : next.get(node)) if (--indegree[dep] == 0) ready.add(dep);
    }
    return taken == n ? order : new int[0];       // fewer than n means a cycle; O(V + E)
}`,
    practice: [
      '207-course-schedule',
      '210-course-schedule-ii',
      lc('802', 'Find Eventual Safe States', 'Medium', 'find-eventual-safe-states', 'topo sort on the reversed graph'),
      lc('310', 'Minimum Height Trees', 'Medium', 'minimum-height-trees', 'peel leaves like a topo sort'),
      lc('1203', 'Sort Items by Groups Respecting Dependencies', 'Hard', 'sort-items-by-groups-respecting-dependencies', 'two layered topological sorts'),
    ],
  },
  'graph-dijkstra': {
    animation: '743-network-delay-time',
    summary: 'Always expand the unfinished node with the smallest known distance, using a min-heap, and relax its outgoing edges. It finds shortest paths when no edge weight is negative.',
    whenToUse: [
      'Edges have different non-negative weights (time, cost, distance) and you want the cheapest path',
      'You need the shortest distance from one source to every other node',
      'BFS fails because edges are not all the same length',
      'No edge is negative; with negative edges the greedy choice is no longer safe',
    ],
    tip: 'When you pop a (distance, node) pair that is larger than the stored best, skip it: it is stale. Once a node is popped with its final distance it never improves, which is why negative edges break the method.',
    template: `static int[] dijkstra(List<List<int[]>> graph, int source) {   // graph.get(u) = list of {v, weight}
    int n = graph.size();
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[source] = 0;

    // ── Phase 1: min-heap ordered by distance so far ──
    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    heap.offer(new int[]{0, source});

    // ── Phase 2: finalise the closest unfinished node, relax its edges ──
    while (!heap.isEmpty()) {
        int[] top = heap.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;                       // stale entry, skip
        for (int[] edge : graph.get(u)) {
            int v = edge[0], nd = d + edge[1];
            if (nd < dist[v]) {                          // found a shorter route to v
                dist[v] = nd;
                heap.offer(new int[]{nd, v});
            }
        }
    }
    return dist;                                         // O((V + E) log V) time, O(V) space
}`,
    practice: [
      '1971-find-if-path-exists-in-graph',
      '743-network-delay-time',
      lc('1631', 'Path With Minimum Effort', 'Medium', 'path-with-minimum-effort', 'edge cost is the max difference on the route'),
      lc('1514', 'Path with Maximum Probability', 'Medium', 'path-with-maximum-probability', 'max-heap on a product of probabilities'),
      lc('778', 'Swim in Rising Water', 'Hard', 'swim-in-rising-water', 'minimise the highest cell on the path'),
    ],
  },
  'graph-bellman-ford': {
    animation: '787-cheapest-flights-within-k-stops',
    summary: 'Relax every edge, over and over. After i rounds, distances are correct for all paths of at most i edges, so it handles negative weights and limits on the number of stops.',
    whenToUse: [
      'Edge weights can be negative, where Dijkstra gives wrong answers',
      'The path may use at most k edges (stops, hops, transfers)',
      'You need to detect a negative cycle (a further round still improves something)',
      'The graph is small enough that V * E work is acceptable',
    ],
    tip: 'For "at most k stops" do k + 1 rounds and relax from a copy of the previous round\'s distances. Otherwise an update in the same round could chain two edges and exceed the limit.',
    template: `static int cheapestWithinHops(int n, int[][] edges, int src, int dst, int maxEdges) {
    final int INF = Integer.MAX_VALUE / 2;
    int[] dist = new int[n];
    Arrays.fill(dist, INF);
    dist[src] = 0;                                       // ── Phase 1: only the source is known ──

    // ── Phase 2: round i allows paths of at most i edges ──
    for (int round = 0; round < maxEdges; round++) {
        int[] next = dist.clone();                       // read old values, write new ones
        for (int[] e : edges) {                          // e = {from, to, weight}
            if (dist[e[0]] < INF && dist[e[0]] + e[2] < next[e[1]]) {
                next[e[1]] = dist[e[0]] + e[2];          // relax, negative weights are fine
            }
        }
        dist = next;
    }
    return dist[dst] >= INF ? -1 : dist[dst];            // O(rounds * E) time, O(V) space
}
// With maxEdges = n - 1 this is classic Bellman-Ford; if round n still improves
// any distance, a negative cycle is reachable.`,
    practice: [
      '1971-find-if-path-exists-in-graph',
      '743-network-delay-time',
      '787-cheapest-flights-within-k-stops',
      '399-evaluate-division',
      lc('1334', 'Find the City With the Smallest Number of Neighbors at a Threshold Distance', 'Medium', 'find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance', 'all-pairs variant (Floyd-Warshall)'),
    ],
  },
  'graph-prims': {
    animation: '1584-min-cost-to-connect-all-points',
    summary: 'Grow a spanning tree from one node. At each step add the cheapest edge that connects a node already in the tree to one that is not, until everything is joined.',
    whenToUse: [
      'You must connect all nodes with the minimum total edge cost (cables, roads, pipes)',
      'The graph is undirected and weighted, and the answer is a tree with n - 1 edges',
      'The graph is dense or implicit (edges are distances between all pairs of points), which suits an array-based Prim',
      'You want the cheapest way to link things, not the cheapest path between two of them',
    ],
    tip: 'Minimum spanning tree is not shortest path: the key of a node is the cost of its single cheapest edge into the tree, not its distance from the start. Kruskal with union-find is an equally good alternative.',
    template: `static int primCost(int[][] points) {                  // complete graph, Manhattan distance
    int n = points.length;
    boolean[] inTree = new boolean[n];
    int[] best = new int[n];                             // cheapest edge cost into the tree
    Arrays.fill(best, Integer.MAX_VALUE);
    best[0] = 0;
    int total = 0;

    // ── Phase 1: add one node per round ──
    for (int round = 0; round < n; round++) {
        int pick = -1;
        for (int i = 0; i < n; i++)                      // cheapest node still outside
            if (!inTree[i] && (pick == -1 || best[i] < best[pick])) pick = i;
        inTree[pick] = true;
        total += best[pick];

        // ── Phase 2: the new node may offer cheaper links ──
        for (int i = 0; i < n; i++) {
            if (inTree[i]) continue;
            int w = Math.abs(points[pick][0] - points[i][0]) + Math.abs(points[pick][1] - points[i][1]);
            best[i] = Math.min(best[i], w);
        }
    }
    return total;                                        // O(n²) time, O(n) space
}`,
    practice: [
      lc('1971', 'Find if Path Exists in Graph', 'Easy', 'find-if-path-exists-in-graph', 'connectivity warm-up'),
      '684-redundant-connection',
      '1584-min-cost-to-connect-all-points',
      lc('1631', 'Path With Minimum Effort', 'Medium', 'path-with-minimum-effort', 'bottleneck path, MST-like'),
      lc('1489', 'Find Critical and Pseudo-Critical Edges in Minimum Spanning Tree', 'Hard', 'find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree', 'MST with forced or banned edges'),
    ],
  },
  'dp-2d-grid': {
    animation: '62-unique-paths',
    summary: 'Each cell\'s answer depends only on the cell above and the cell to the left, so fill the table row by row and read the answer in the far corner.',
    whenToUse: [
      'You move through a grid (usually right and down) and count paths or find the cheapest or best route',
      'The value at a cell is a function of its neighbours already computed',
      'Obstacles or costs on cells change the transition but not the shape of the table',
      'Plain recursion repeats the same (row, column) subproblems exponentially often',
    ],
    tip: 'Initialise the first row and column explicitly as base cases. Since each row only needs the previous one, you can shrink the table to a single row of length C.',
    template: `static int minPathSum(int[][] grid) {
    int rows = grid.length, cols = grid[0].length;
    int[][] dp = new int[rows][cols];                    // dp[r][c] = best cost to reach (r, c)

    // ── Phase 1: base cases (first row and first column) ──
    dp[0][0] = grid[0][0];
    for (int c = 1; c < cols; c++) dp[0][c] = dp[0][c - 1] + grid[0][c];
    for (int r = 1; r < rows; r++) dp[r][0] = dp[r - 1][0] + grid[r][0];

    // ── Phase 2: fill row by row from the cells above and to the left ──
    for (int r = 1; r < rows; r++)
        for (int c = 1; c < cols; c++)
            dp[r][c] = grid[r][c] + Math.min(dp[r - 1][c], dp[r][c - 1]);

    return dp[rows - 1][cols - 1];                       // O(R*C) time, O(R*C) space (O(C) with a rolling row)
}`,
    practice: [
      '62-unique-paths',
      '63-unique-paths-ii',
      lc('64', 'Minimum Path Sum', 'Medium', 'minimum-path-sum', 'min of top and left plus the cell'),
      lc('221', 'Maximal Square', 'Medium', 'maximal-square', 'min of three neighbours plus one'),
      lc('174', 'Dungeon Game', 'Hard', 'dungeon-game', 'fill backwards from the goal'),
    ],
  },
  'dp-two-sequence': {
    animation: '1143-longest-common-subsequence',
    summary: 'Use a table whose cell (i, j) answers the problem for the first i characters of one string and the first j of the other. Matching characters extend a diagonal, mismatches inherit from a neighbour.',
    whenToUse: [
      'Two strings or arrays are compared or transformed into each other (common subsequence, edit distance)',
      'The question asks for the longest shared piece, or the fewest edits',
      'A decision at the end of both prefixes depends on the end of smaller prefixes',
      'A brute-force recursion branches on "take it or drop it" for both sequences',
    ],
    tip: 'Allocate (n + 1) x (m + 1) so the first row and column represent the empty prefix and need no special-casing. For edit distance, mismatches take 1 + min of insert, delete and replace.',
    template: `static int longestCommonSubsequence(String a, String b) {
    int n = a.length(), m = b.length();
    int[][] dp = new int[n + 1][m + 1];                  // dp[i][j]: answer for a[0..i) and b[0..j)
                                                         // row 0 and column 0 stay 0 (empty prefix)
    // ── Phase 1: fill the table prefix by prefix ──
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1] + 1;         // match: extend the diagonal
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);   // skip a char from either side
            }
        }
    }

    // ── Phase 2: the full strings are in the corner ──
    return dp[n][m];                                     // O(n*m) time, O(n*m) space
}`,
    practice: [
      '1143-longest-common-subsequence',
      lc('1035', 'Uncrossed Lines', 'Medium', 'uncrossed-lines', 'LCS in disguise'),
      '72-edit-distance',
      lc('97', 'Interleaving String', 'Medium', 'interleaving-string', 'dp over how much of each string is used'),
      lc('115', 'Distinct Subsequences', 'Hard', 'distinct-subsequences', 'count matches instead of taking a max'),
    ],
  },
  'dp-lis': {
    animation: '300-longest-increasing-subsequence',
    summary: 'Find the longest strictly increasing subsequence. The simple DP checks every earlier smaller value in O(n²); a tails array with binary search lowers it to O(n log n).',
    whenToUse: [
      'You need the longest chain that keeps a strict ordering while skipping elements',
      'Items can be stacked or nested if one is strictly smaller in every dimension (after sorting by one dimension)',
      'The subsequence need not be contiguous, so sliding window does not apply',
      'The answer is a length, not necessarily the sequence itself',
    ],
    tip: 'In the O(n log n) version, tails[k] holds the smallest possible tail of an increasing subsequence of length k + 1. Use lower bound to replace; its length is the answer, but the tails array itself is not a valid subsequence.',
    template: `static int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];                  // tails[k] = smallest tail of an increasing run of length k + 1
    int size = 0;

    // ── Phase 1: place each value with binary search ──
    for (int x : nums) {
        int lo = 0, hi = size;
        while (lo < hi) {                                // first tail that is >= x
            int mid = (lo + hi) >>> 1;
            if (tails[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        tails[lo] = x;                                   // extend, or replace with a smaller tail
        if (lo == size) size++;                          // x is larger than every tail: longer run
    }

    // ── Phase 2: the number of tails is the length ──
    return size;                                         // O(n log n) time, O(n) space
}`,
    practice: [
      '300-longest-increasing-subsequence',
      lc('646', 'Maximum Length of Pair Chain', 'Medium', 'maximum-length-of-pair-chain', 'sort, then LIS or greedy'),
      lc('673', 'Number of Longest Increasing Subsequence', 'Medium', 'number-of-longest-increasing-subsequence', 'carry a count with each length'),
      lc('354', 'Russian Doll Envelopes', 'Hard', 'russian-doll-envelopes', 'sort width asc, height desc, then LIS'),
    ],
  },
  'dp-minmax': {
    animation: '152-maximum-product-subarray',
    summary: 'When signs can flip the result, carry both the best and the worst value ending at each position. A big negative can become the new maximum after one more negative.',
    whenToUse: [
      'Multiplying by a negative turns your worst value into your best (product subarrays)',
      'A single running best loses information that a later element would reverse',
      'A DP state needs a pair of values (max and min) rather than one',
      'Zeroes reset the running product and should start a new subarray',
    ],
    tip: 'At each element compute the candidates x, x * curMax and x * curMin, then take the max and min among them. Save the old curMax in a temporary before overwriting it.',
    template: `static int maxProduct(int[] nums) {
    int curMax = nums[0], curMin = nums[0];              // best and worst product ending here
    int best = nums[0];

    // ── Phase 1: carry both extremes through every element ──
    for (int i = 1; i < nums.length; i++) {
        int x = nums[i];
        int a = curMax * x, b = curMin * x;              // a negative x swaps their roles
        curMax = Math.max(x, Math.max(a, b));            // extend or start fresh
        curMin = Math.min(x, Math.min(a, b));
        best = Math.max(best, curMax);                   // best subarray may end anywhere
    }
    return best;                                         // O(n) time, O(1) space
}`,
    practice: [
      '121-best-time-to-buy-and-sell-stock',
      '53-maximum-subarray',
      '152-maximum-product-subarray',
      lc('918', 'Maximum Sum Circular Subarray', 'Medium', 'maximum-sum-circular-subarray', 'track both max and min subarray'),
      lc('1567', 'Maximum Length of Subarray With Positive Product', 'Medium', 'maximum-length-of-subarray-with-positive-product', 'track lengths for positive and negative'),
    ],
  },
  'bits-xor': {
    animation: '260-single-number-iii',
    summary: 'XOR cancels equal values: a ^ a = 0 and a ^ 0 = a. Folding an array with XOR leaves exactly the values that appear an odd number of times.',
    whenToUse: [
      'Every value but one (or two) appears twice, and extra memory is not allowed',
      'You need to find a missing or duplicated number in a known range',
      'Two numbers are left after cancellation and must be separated by a distinguishing bit',
      'You want to swap or compare values without a temporary or a hash set',
    ],
    tip: 'For two unique numbers, XOR everything to get a ^ b, isolate a set bit with x & -x, and split the array into two groups by that bit. Each group XORs down to one of the answers.',
    template: `static int[] twoSingles(int[] nums) {
    // ── Phase 1: pairs cancel, leaving a ^ b ──
    int xor = 0;
    for (int x : nums) xor ^= x;

    // ── Phase 2: pick one bit where a and b differ ──
    int bit = xor & -xor;                                // lowest set bit of a ^ b

    // ── Phase 3: split by that bit, each group cancels down to one answer ──
    int a = 0, b = 0;
    for (int x : nums) {
        if ((x & bit) != 0) a ^= x;                      // group with the bit set
        else b ^= x;                                     // group with the bit clear
    }
    return new int[]{a, b};                              // O(n) time, O(1) space
}`,
    practice: [
      lc('1486', 'XOR Operation in an Array', 'Easy', 'xor-operation-in-an-array', 'fold with ^'),
      '136-single-number',
      '268-missing-number',
      '287-find-the-duplicate-number',
      '260-single-number-iii',
    ],
  },
  'bits-counting': {
    animation: '191-number-of-1-bits',
    summary: 'Treat integers as rows of bits and use shifts and masks to count them or test properties. n & (n - 1) clears the lowest set bit in one operation.',
    whenToUse: [
      'You need the population count (number of 1 bits) of a number or of every number up to n',
      'A power-of-two check is required, which is n > 0 and n & (n - 1) == 0',
      'Addition or counting must be done without arithmetic operators',
      'Each answer can be built from the answer for a smaller number (bits of i from bits of i >> 1)',
    ],
    tip: 'Loop while n != 0 with n &= n - 1 and count iterations: it runs once per set bit instead of once per bit position. Use unsigned shifts (>>> in Java) when negatives are possible.',
    template: `static int popCount(int n) {
    int count = 0;
    while (n != 0) {
        n &= n - 1;                                      // drop the lowest set bit
        count++;                                         // one iteration per set bit
    }
    return count;                                        // O(number of set bits), O(1) space
}

static boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;                  // exactly one bit set
}

// ── Count bits for every number 0..n, reusing smaller answers ──
static int[] countBits(int n) {
    int[] bits = new int[n + 1];
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);   // drop last bit, add it back
    return bits;                                         // O(n) time, O(n) space
}`,
    practice: [
      lc('461', 'Hamming Distance', 'Easy', 'hamming-distance', 'popcount of a ^ b'),
      '191-number-of-1-bits',
      '231-power-of-two',
      '338-counting-bits',
      '371-sum-of-two-integers',
    ],
  },
  'bits-modulo': {
    animation: '137-single-number-ii',
    summary: 'Count how many numbers have a 1 in each bit position. Every value that appears three times contributes a multiple of 3, so the column count mod 3 is the lone number\'s bit.',
    whenToUse: [
      'Every element appears k times except one that appears a different number of times',
      'XOR alone is not enough because the repetition count is odd and not 2',
      'You can process the 32 bit columns independently of each other',
      'You want constant extra space and a linear pass, without a frequency map',
    ],
    tip: 'Handle sign by building the answer in a 32-bit int: if the high bit comes out set the value is negative automatically in Java, while Python needs a manual conversion. The two-counter state machine gives the same result in one pass.',
    template: `static int singleNumberAppearingOnceAmongTriples(int[] nums) {
    int result = 0;

    // ── Phase 1: examine each of the 32 bit columns on its own ──
    for (int bit = 0; bit < 32; bit++) {
        int ones = 0;
        for (int x : nums) ones += (x >> bit) & 1;       // how many numbers have this bit set

        // ── Phase 2: triples contribute multiples of 3, the remainder is the loner ──
        if (ones % 3 != 0) result |= (1 << bit);
    }
    return result;                                       // O(32 * n) time, O(1) space
}`,
    practice: [
      '136-single-number',
      '191-number-of-1-bits',
      '137-single-number-ii',
      lc('477', 'Total Hamming Distance', 'Medium', 'total-hamming-distance', 'count ones per bit column'),
      lc('421', 'Maximum XOR of Two Numbers in an Array', 'Medium', 'maximum-xor-of-two-numbers-in-an-array', 'decide the answer bit by bit'),
    ],
  },
};
