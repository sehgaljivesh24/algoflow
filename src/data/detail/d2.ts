import type { PracticeItem } from '../patterns.ts';
import type { DetailMap } from './types.ts';

// Batch d2 — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.
// Stacks (simple, monotonic dec / inc), linked lists (fast / slow, reversal, merge / remove nth), trees (DFS orders, BFS, paths, BST,
// Morris, construction) and cache design.

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id,
  title,
  difficulty,
  note,
  href: `https://leetcode.com/problems/${slug}/`,
});

export const d2: DetailMap = {
  /* ------------------------------------------------------------------ stacks */
  'stack-simple': {
    tags: ['Brackets', 'Expression eval', 'Min Stack', 'Undo'],
    content: {
      summary: 'A stack remembers unfinished work in last-in, first-out order. Whatever opened most recently must be resolved first, which makes it the natural tool for nesting, expression evaluation and undo.',
      whenToUse: [
        '**Brackets, tags or nested markup** must close in the right order: the most recent opener is always the first one to be closed, so every closer is checked against the top of the stack (Valid Parentheses, HTML tag matching, decoding nested strings like 3[a2[c]]).',
        '**Postfix or infix expressions** need operands held until an operator arrives: push numbers, and on an operator pop the two most recent values, apply it and push the result (Reverse Polish Notation, Basic Calculator saving the running total and sign at each bracket).',
        'You must answer **min, max or peek in O(1)** after every push and pop: a second stack, or a stack of pairs, remembers the best value at each depth, so the answer rolls back automatically when an element is popped (Min Stack, Max Stack).',
        'A task asks for **undo, backtrack or "go back one step"**: browser history, an editor undo list, simplifying a path with "..", or removing adjacent duplicates all keep the previous state on a stack and pop it when the latest action is reversed.',
        'You are **simulating recursion** or a depth-first walk without recursion: an explicit stack of nodes or frames avoids stack overflow on deep input and gives full control over when to resume (iterative in-order traversal, flood fill, nested decoding).',
      ],
      tip: 'Decide what goes on the stack (the item, its index, or a running value) and what a pop means before writing the loop. A closer that meets an empty stack is an immediate failure.',
      practice: [
        '20-valid-parentheses',
        '150-evaluate-reverse-polish-notation',
        '155-min-stack',
        '224-basic-calculator',
        lc('71', 'Simplify Path', 'Medium', 'simplify-path', '".." pops, a name pushes'),
        lc('394', 'Decode String', 'Medium', 'decode-string', 'push the count and the text so far at every "["'),
        lc('1047', 'Remove All Adjacent Duplicates In String', 'Easy', 'remove-all-adjacent-duplicates-in-string', 'pop when the top equals the new letter'),
        lc('735', 'Asteroid Collision', 'Medium', 'asteroid-collision', 'the top of the stack fights the newcomer'),
      ],
    },
    meta: {
      useNote: 'Decide what to store and what a pop means before writing the loop. An empty stack on a closer is always a failure; a non-empty one at the end is too.',
      complexityNote: 'Every element is pushed once and popped at most once, so the loop does O(n) work in total. Space is O(n) in the worst case, when nothing can be matched until the very end, such as a string of only openers.',
      highlight: ['nested markup', 'Postfix or infix expressions', 'min, max or peek in O(1)', 'undo, backtrack', 'simulating recursion'],
    },
  },

  'stack-monotonic-dec': {
    tags: ['Next greater', 'Temperatures', 'Stock span', 'Circular array'],
    content: {
      whenToUse: [
        'You need the **next greater (or next warmer) element for every position**: daily temperatures, next greater element in an array or a linked list, stock prices waiting for a higher day. One left-to-right scan answers all positions together.',
        'Each element needs the **nearest item to its right (or left) with a larger value**, and the answer is a distance or a value: days to wait, the stock span (how many consecutive days the price was not higher), or simply the first bigger neighbour.',
        'The array is **circular**, so the search wraps around: walk the indexes twice using i mod n and push only on the first lap. Next Greater Element II shows how the same stack gives every element a second chance.',
        'A naive double loop is **O(n²)** because every element rescans its right side. The stack removes the rescan: once a bigger value pops an item, that item is resolved forever, so each index is pushed once and popped at most once.',
        'A **pop is the moment of resolution**: when the current value beats the item on top, record its answer (the distance i − j or the value nums[i]) and keep popping while the new value still beats the next one. Items left at the end have no answer.',
      ],
      tip: 'Store indexes, not values, so distances come for free. The stack stays decreasing: a bigger value pops everything smaller, and each pop is exactly one resolved answer.',
      practice: [
        '739-daily-temperatures',
        '496-next-greater-element-i',
        { slug: '503-next-greater-element-ii', note: 'circular array: walk the indexes twice' },
        lc('901', 'Online Stock Span', 'Medium', 'online-stock-span', 'stack of (price, span) pairs'),
        lc('1019', 'Next Greater Node In Linked List', 'Medium', 'next-greater-node-in-linked-list', 'copy to an array, then the same scan'),
        lc('456', '132 Pattern', 'Medium', '132-pattern', 'scan from the right, keep the popped value as the "2"'),
        '84-largest-rectangle-in-histogram',
      ],
    },
    meta: {
      useNote: 'Push indexes rather than values so distances are free. Each pop resolves exactly one waiting item, and every item is pushed once and popped once.',
      complexityNote: 'Each index is pushed once and popped at most once, so the inner while loop never repeats work and the whole scan is O(n) even though it is nested. The stack holds every index when the input is already decreasing.',
      highlight: ['next greater', 'nearest item', 'circular', 'O(n²)', 'pop is the moment of resolution'],
    },
  },

  'stack-monotonic-inc': {
    tags: ['Histogram', 'Rectangle area', 'Nearest smaller', 'Remove digits'],
    content: {
      whenToUse: [
        'You need the **nearest smaller element on the left and on the right** of every position. The span between those two walls is how far an item can stretch, which is what histogram, rectangle and visible-range problems all ask.',
        'Each bar or value defines a **rectangle whose width depends on the first shorter neighbour** on each side. Largest Rectangle in Histogram pops a bar the moment a shorter one arrives and multiplies its height by the width between the two walls.',
        'A **maximal rectangle in a binary matrix** reduces to the histogram problem row by row: heights count the consecutive ones above, and one stack pass per row finds the best rectangle ending on that row in O(columns).',
        'You must build the **smallest result by removing items**: Remove K Digits, Remove Duplicate Letters, the smallest subsequence. A larger leading value is evicted while it is bigger than its successor and removals remain.',
        'You sum or count **over all subarrays by their minimum**, as in Sum of Subarray Minimums, or measure water between walls. The stack finds how far each element is the minimum on the left and on the right, which gives its contribution.',
      ],
      tip: 'Append a sentinel height of 0 so leftover bars are popped by the same code. After a pop, width = i − stack.top − 1, or simply i when the stack is empty.',
      practice: [
        '84-largest-rectangle-in-histogram',
        '85-maximal-rectangle',
        { slug: '402-remove-k-digits', note: 'pop a digit that is bigger than its successor' },
        '739-daily-temperatures',
        lc('907', 'Sum of Subarray Minimums', 'Medium', 'sum-of-subarray-minimums', 'left reach × right reach per element'),
        lc('316', 'Remove Duplicate Letters', 'Medium', 'remove-duplicate-letters', 'smallest result, each letter once'),
        lc('42', 'Trapping Rain Water', 'Hard', 'trapping-rain-water', 'a stack of walls computes water layer by layer'),
      ],
    },
    meta: {
      useNote: 'Add a sentinel 0 after the last bar so every leftover bar is flushed by the same code. The width of a popped bar is i − top − 1.',
      complexityNote: 'Every bar is pushed once and popped once, so the amortised work per element is constant and the scan is O(n). A sentinel of height 0 flushes the stack at the end; the stack holds every bar for strictly increasing input.',
      highlight: ['nearest smaller element', 'first shorter neighbour', 'maximal rectangle', 'smallest result', 'over all subarrays by their minimum'],
    },
  },

  /* ------------------------------------------------------------------ linked lists */
  'linkedlist-fastslow': {
    tags: ['Cycle detection', "Floyd's algorithm", 'Find the middle', 'Cycle start'],
    content: {
      whenToUse: [
        'You must **detect a cycle** in a linked list, or in any sequence produced by applying a function again and again (Happy Number, a circular array). If the walk never ends, fast eventually laps slow; if it ends, fast falls off the tail.',
        'You need the **middle node** or the start of the second half in one pass, without knowing the length: when fast has moved two steps for each slow step and reaches the end, slow sits exactly halfway. Palindrome checks and list reordering start here.',
        'The task or its follow-up asks for **O(1) extra memory**, which rules out a hash set of visited nodes. Two references moving at different speeds replace the set, so Floyd\'s tortoise and hare is the expected constant-space answer.',
        'You want the **node where the cycle begins**: after slow and fast meet, restart one pointer at the head and move both one step at a time; they meet again exactly at the entrance. Find the Duplicate Number uses this on the array i → nums[i].',
        'The input is **an array or number sequence read as a linked structure**: index i points to nums[i], or a number maps to the sum of its digit squares. Any such sequence with a repeated value contains a cycle that the two pointers expose.',
      ],
      tip: 'Why fast meets slow: inside a cycle of length L the gap shrinks by exactly 1 each round, so it reaches 0 within L rounds. Fast can never jump over slow.',
      practice: [
        '141-linked-list-cycle',
        '142-linked-list-cycle-ii',
        { slug: '876-middle-of-the-linked-list', note: 'on an even length slow lands on the second middle' },
        { slug: '202-happy-number', note: 'the digit-square sequence is a hidden linked list' },
        '287-find-the-duplicate-number',
        '234-palindrome-linked-list',
        '143-reorder-list',
        lc('457', 'Circular Array Loop', 'Medium', 'circular-array-loop', 'fast / slow on indexes, loops must keep one direction'),
      ],
    },
    meta: {
      useNote: 'Why they must meet: once both pointers are inside a cycle of length L, each round fast gains exactly one node on slow, so the gap reaches 0 within L rounds and fast cannot jump over slow.',
      complexityNote: 'Slow takes at most n steps before the pointers meet or fast hits the end, and finding the entrance adds at most n more, so time is O(n). Only two references are stored, so no visited set is needed.',
      highlight: ['detect a cycle', 'middle node', 'O(1) extra memory', 'node where the cycle begins', 'linked structure'],
    },
  },

  'linkedlist-reversal': {
    tags: ['Linked list', 'In-place', 'Pointer flip', 'k-group'],
    content: {
      summary: 'Walk the list once and flip every next pointer so it points backwards, holding on to the rest of the list so nothing is lost. The same three-pointer loop reverses whole lists, sub-lists and blocks of k.',
      whenToUse: [
        'You must **reverse a whole list in place**: flip every next pointer to point backwards with three references (prev, curr, next). Each node is touched once, no new nodes are allocated, and the old tail becomes the new head.',
        'Only **part of the list** must be reversed, for example positions left to right: walk to the node before the section, flip the segment, then reconnect both ends. A dummy head keeps the case left = 1 identical to every other.',
        'The task asks to process **nodes in groups of k**: reverse each block of k, attach it to the previous group\'s tail and to the next group\'s head, and leave a short final block alone. Reverse Nodes in k-Group is the template.',
        'A later step needs the **second half reversed**: palindrome check, reorder list (L0, Ln, L1, Ln−1), or comparing a list with its mirror. Find the middle with fast and slow pointers, reverse from there, then walk both halves inward.',
        'The statement demands **O(1) extra space** or allows changing the list: a stack or an array copy would work but costs O(n) memory, while pointer reversal rearranges the existing nodes and finishes in one pass.',
      ],
      tip: 'Always save curr.next before overwriting it. Sketch prev, curr and next on paper once: flip the arrow, then slide prev and curr one node forward.',
      template: `// Reverse a whole singly linked list in place: O(n) time, O(1) extra space.
static ListNode reverse(ListNode head) {
    // ── Phase 1: prev is the head of the reversed part (empty at first), curr the node being flipped ──
    ListNode prev = null;
    ListNode curr = head;

    while (curr != null) {
        // ── Phase 2: save next BEFORE overwriting curr.next, or the rest of the list is lost ──
        ListNode next = curr.next;

        // ── Phase 3: flip the arrow so curr points backwards ──
        curr.next = prev;

        // ── Phase 4: advance both pointers; the reversed part grows by one node ──
        prev = curr;
        curr = next;
    }
    return prev;                                      // prev is the new head (the old tail)
}

// Variant: reverse only positions left..right (LeetCode 92). A dummy head avoids special cases.
static ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(0, head), before = dummy;
    for (int i = 1; i < left; i++) before = before.next;    // stop just before the section
    ListNode curr = before.next;                            // curr stays put and becomes the tail
    for (int i = left; i < right; i++) {
        ListNode moved = curr.next;                         // pull the next node out ...
        curr.next = moved.next;
        moved.next = before.next;                           // ... and put it at the front of the section
        before.next = moved;
    }
    return dummy.next;
}`,
      practice: [
        '206-reverse-linked-list',
        '92-reverse-linked-list-ii',
        '25-reverse-nodes-in-k-group',
        { slug: '234-palindrome-linked-list', note: 'reverse the second half, then compare' },
        { slug: '143-reorder-list', note: 'middle + reverse + interleave' },
        lc('24', 'Swap Nodes in Pairs', 'Medium', 'swap-nodes-in-pairs', 'k-group with k = 2'),
        lc('61', 'Rotate List', 'Medium', 'rotate-list', 'close the ring, cut at the new tail'),
      ],
    },
    meta: {
      useNote: 'Save curr.next before you overwrite it. Draw prev, curr and next once and the loop writes itself: flip the arrow, then move prev and curr forward.',
      complexityNote: 'Each node is visited exactly once and only its own next pointer changes, so reversal is a single pass of O(n). Three references (prev, curr, next) are the only extra memory, so the space stays constant.',
      highlight: ['reverse a whole list in place', 'part of the list', 'groups of k', 'second half reversed', 'O(1) extra space'],
    },
  },

  'linkedlist-merge': {
    tags: ['Remove Nth', 'Merge sorted', 'Dummy node', 'Offset gap'],
    content: {
      whenToUse: [
        'You need the **n-th node from the end** in a single pass: send a fast pointer n nodes ahead, then move both together. When fast reaches null, slow stands just before the target (Remove Nth Node From End, the k-th node from the tail).',
        '**Two sorted lists** must become one sorted list by relinking nodes: compare the two heads, attach the smaller to a tail pointer and advance that list, then hook the leftover list on at the end (Merge Two Sorted Lists, the merge step of merge sort).',
        'Removing or inserting may change the head, so a **dummy node** in front of the list makes every case identical: you always hold a node before the target and return dummy.next, with no special code for an empty list or a head removal.',
        'The two lists have **different lengths** and you do not want to measure them first: keep a fixed offset between two pointers, or add digit by digit treating a finished list as zeros (Add Two Numbers, Intersection of Two Linked Lists).',
        'A **single pass with O(1) memory** is requested: the offset keeps the distance between two pointers fixed at n, so slow reaches the answer exactly when fast reaches the end, replacing a first pass that counted the length.',
      ],
      tip: 'With fast n nodes ahead, fast reaches null after L − n moves, so slow stands on node L − n: just before the n-th node from the end (L = list length).',
      practice: [
        '19-remove-nth-node-from-end',
        '21-merge-two-sorted-lists',
        '2-add-two-numbers',
        '23-merge-k-sorted-lists',
        lc('160', 'Intersection of Two Linked Lists', 'Easy', 'intersection-of-two-linked-lists', 'each pointer walks A then B, so both travel the same distance'),
        lc('82', 'Remove Duplicates from Sorted List II', 'Medium', 'remove-duplicates-from-sorted-list-ii', 'a dummy head handles removing the first node'),
        lc('86', 'Partition List', 'Medium', 'partition-list', 'two dummy lists, then join them'),
        lc('61', 'Rotate List', 'Medium', 'rotate-list', 'the new tail is n − k % n nodes from the start'),
      ],
    },
    meta: {
      useNote: 'The offset formula: with fast n nodes ahead, fast needs L − n more moves to hit null, so slow lands on node L − n, just before the n-th from the end. A dummy head covers deleting the first node.',
      complexityNote: 'The leading pointer walks the list once while the second trails n nodes behind it, so Remove Nth takes one pass of O(L). A merge visits every node of both lists once, O(m + n), relinking nodes instead of copying them.',
      highlight: ['n-th node from the end', 'Two sorted lists', 'dummy node', 'different lengths', 'single pass with O(1) memory'],
    },
  },

  /* ------------------------------------------------------------------ trees */
  'tree-dfs': {
    tags: ['Pre-order', 'In-order', 'Post-order', 'Call stack'],
    content: {
      animation: 'alg-preorder-traversal-recursive-dfs',
      summary: 'One recursive walk, three moments to record a node: before its subtrees (pre-order), between them (in-order) or after them (post-order). Pre-order copies, in-order sorts a BST, post-order builds answers bottom-up.',
      whenToUse: [
        '**Pre-order (node, left, right)** records a node before its subtrees, so use it to copy or serialize a tree, build a prefix expression or print a directory listing: the parent is always known before any of its children.',
        '**In-order (left, node, right)** visits a binary search tree in sorted order. Use it to validate a BST, find the k-th smallest value, compare neighbouring keys, or turn a BST into a sorted list for rebuilding a balanced tree.',
        '**Post-order (left, right, node)** finishes both children before the parent, so use it whenever a node\'s answer depends on its subtrees: height, diameter, balance, subtree sums, deleting a tree, or evaluating an expression tree bottom-up.',
        'The answer for a node **combines the answers of its children**: define what the function returns for a null node and for a single node, then trust the recursion. Max depth, diameter, balanced tree and invert tree share this one shape.',
        'You are **searching or checking a property across the whole tree**: does a path exist, who is the lowest common ancestor, is it symmetric, are two trees equal. The call stack remembers the way back; its depth is h, log n balanced and n skewed.',
      ],
      tip: 'Same skeleton, different line order: node first for pre-order, between the calls for in-order, last for post-order. Say what the function returns for null before writing anything else.',
      template: `// One recursive skeleton, three traversal orders: only the position of the "visit" line changes.
static void dfs(TreeNode node, List<Integer> pre, List<Integer> in, List<Integer> post) {
    // ── Phase 1: base case — an empty subtree has nothing to visit ──
    if (node == null) return;

    // ── Phase 2: PRE-order visit — node first (copy a tree, serialize, prefix expression) ──
    pre.add(node.val);

    dfs(node.left, pre, in, post);                    // the whole left subtree

    // ── Phase 3: IN-order visit — node between the subtrees (a BST comes out sorted) ──
    in.add(node.val);

    dfs(node.right, pre, in, post);                   // the whole right subtree

    // ── Phase 4: POST-order visit — node last (heights, sizes, delete, evaluate) ──
    post.add(node.val);
}

// Typical use: a value computed from the children and returned upward (post-order thinking)
static int height(TreeNode node) {
    if (node == null) return 0;                       // base case: an empty tree has height 0
    int left = height(node.left);                     // answer for the left subtree
    int right = height(node.right);                   // answer for the right subtree
    return 1 + Math.max(left, right);                 // combine on the way back up
}`,
      practice: [
        lc('144', 'Binary Tree Preorder Traversal', 'Easy', 'binary-tree-preorder-traversal', 'node first; also solvable with Morris threads'),
        '94-binary-tree-inorder-traversal',
        '145-binary-tree-postorder-traversal',
        '104-maximum-depth-of-binary-tree',
        '543-diameter-of-binary-tree',
        '110-balanced-binary-tree',
        '226-invert-binary-tree',
        '236-lowest-common-ancestor',
      ],
    },
    meta: {
      useNote: 'Same skeleton, different line order: record the node before the two calls (pre), between them (in) or after them (post). Define the return value for an empty tree first.',
      complexityNote: 'Every node is called, visited and returned from exactly once, so the walk is O(n). The call stack is as deep as the tree is tall: O(log n) when balanced and O(n) for a chain, which is the only extra space.',
      highlight: ['Pre-order', 'In-order', 'Post-order', 'combines the answers of its children', 'whole tree'],
    },
    examples: [
      { slug: 'alg-preorder-traversal-recursive-dfs', why: 'Pre-order records each node before its subtrees: watch the visit badges appear on the way DOWN, so the root is always first. It is the order for copying or serialising a tree.' },
      { slug: 'alg-inorder-traversal-recursive-dfs', why: 'In-order records a node after its left subtree and before its right one. On a binary search tree the badges come out in sorted order, which is why BST problems love it.' },
      { slug: '145-binary-tree-postorder-traversal', why: 'Post-order records a node only after both children are finished, so the root is last. It is the order for anything built from the children up: heights, sizes, deletion.' },
      { slug: '104-maximum-depth-of-binary-tree', why: 'The base shape of tree recursion: a null node returns 0, every other node combines its two children\'s answers on the way back up.' },
      { slug: '543-diameter-of-binary-tree', why: 'The value returned upward (height) differs from the value being optimised (the longest bend through a node), so a side variable collects the best answer during the same pass.' },
      { slug: '101-symmetric-tree', why: 'The recursion walks two nodes at once, one from each side of the mirror, so the base cases must handle the one-null and both-null combinations.' },
    ],
  },

  'tree-bfs': {
    tags: ['Level order', 'Queue', 'Right side view', 'Zigzag'],
    content: {
      whenToUse: [
        'The output is **organised by level**: a list of lists, the average of each level, the rightmost node per level, or the largest value in each row. One pass per level with a size snapshot builds each inner list directly.',
        'The answer is the **shallowest node that satisfies a condition**, such as the minimum depth of a tree, the closest leaf, or the first level that contains a value: BFS reaches nodes in order of depth, so the first hit is the nearest.',
        'A **zigzag or alternating-direction** traversal is requested: traverse in the normal left-to-right queue order and only reverse, or insert at the front of, each level\'s list before storing it, so the queue itself never has to change direction.',
        'You need **neighbours on the same level** (connect next-right pointers, find cousins, check level-wise symmetry): the queue holds one whole level in left-to-right order, so consecutive dequeues within one round are exactly the neighbours.',
        'The tree is **very deep or skewed**, so recursion risks a stack overflow, or the task spreads outward from a root (fewest steps, nearest target). The queue holds at most one level, which is O(width) instead of O(height).',
      ],
      practice: [
        '102-binary-tree-level-order-traversal',
        '199-binary-tree-right-side-view',
        '103-binary-tree-zigzag-level-order',
        '637-average-of-levels-in-binary-tree',
        lc('111', 'Minimum Depth of Binary Tree', 'Easy', 'minimum-depth-of-binary-tree', 'stop at the first leaf: BFS finds it level by level'),
        lc('116', 'Populating Next Right Pointers in Each Node', 'Medium', 'populating-next-right-pointers-in-each-node', 'link consecutive dequeues of one level'),
        lc('515', 'Find Largest Value in Each Tree Row', 'Medium', 'find-largest-value-in-each-tree-row', 'one maximum per level'),
        lc('993', 'Cousins in Binary Tree', 'Easy', 'cousins-in-binary-tree', 'same depth, different parent'),
      ],
    },
    meta: {
      complexityNote: 'Every node enters and leaves the queue exactly once, so time is O(n). The queue never holds more than the widest level, so extra space is O(w): about n / 2 for a complete tree and just 1 for a chain.',
      highlight: ['organised by level', 'shallowest node', 'zigzag', 'neighbours on the same level', 'very deep or skewed'],
    },
  },

  'tree-paths': {
    tags: ['Root-to-leaf', 'Path sum', 'Backtracking', 'Max path sum'],
    content: {
      whenToUse: [
        'The problem is about **root-to-leaf paths** and their sum or labels: does a path with the target sum exist, list every such path, build the number a path spells, or return all paths as strings. Pass the running state down as arguments.',
        'You must **list every path that meets a condition**, not just count them: share one path list, add the node when going down, copy the list at a leaf and remove the last node when returning (choose, explore, un-choose).',
        'The value you **pass down differs from the value you return**: a remaining target or a number built so far goes down, while a count, a boolean or a best gain comes back up. Keep the two roles apart in the code.',
        'A path may **bend at a node**, as in Binary Tree Maximum Path Sum: each node reports only its best one-sided gain to its parent, but updates a global best with left + node + right, treating negative gains as zero.',
        'The path may **start or end anywhere**, as in Path Sum III or the longest univalue path: count prefix sums on the way down with a hash map, or combine the two child lengths at each node while returning one branch to the parent.',
      ],
      tip: 'When you store paths, copy the current list at the leaf and remove the last node on the way back, or every saved answer will point at the same list.',
      practice: [
        '112-path-sum',
        '113-path-sum-ii',
        '129-sum-root-to-leaf-numbers',
        '124-binary-tree-maximum-path-sum',
        lc('257', 'Binary Tree Paths', 'Easy', 'binary-tree-paths', 'build the path string on the way down'),
        lc('437', 'Path Sum III', 'Medium', 'path-sum-iii', 'prefix sums in a hash map, undone on return'),
        lc('1448', 'Count Good Nodes in Binary Tree', 'Medium', 'count-good-nodes-in-binary-tree', 'pass the maximum seen so far down'),
        lc('988', 'Smallest String Starting From Leaf', 'Medium', 'smallest-string-starting-from-leaf', 'build the string leaf-first, compare at the leaves'),
      ],
    },
    meta: {
      useNote: 'Copy the current path when you store it at a leaf and pop the last node on the way back, or every stored answer shares one list.',
      complexityNote: 'Each node is visited once, so the walk is O(n); copying the stored paths at leaves can add up to O(n · h) in the worst case. The recursion stack and the shared path list are both O(h).',
      highlight: ['root-to-leaf paths', 'list every path', 'pass down differs', 'bend at a node', 'start or end anywhere'],
    },
  },

  'tree-bst': {
    tags: ['Search / insert', 'Validate', 'Kth smallest', 'Build from sorted'],
    content: {
      animation: '700-search-in-a-binary-search-tree',
      summary: 'A binary search tree keeps smaller values on the left and larger on the right, so every comparison discards a whole subtree, and an in-order walk lists the values in sorted order.',
      whenToUse: [
        'The tree is a **binary search tree** and you must search, insert or delete a value: compare with the current node and discard one whole subtree at each step, so the walk follows a single root-to-leaf path of length h.',
        'You must **verify that a tree is a BST**: comparing a node only with its children is the classic bug. Pass an open interval (low, high) down the recursion, or check that the in-order sequence is strictly increasing.',
        'You need the **k-th smallest value, a floor or ceiling, or the next larger key**: an in-order walk of a BST visits keys in sorted order, so stop at the k-th visit or remember the best candidate while walking down.',
        'A **sorted array or list must become a balanced tree**: take the middle element as the root and recurse on each half, so the two halves differ by at most one element and the height stays about log₂ n.',
        'Two values and a BST ask for their **lowest common ancestor** or a range sum: use the ordering at each node to decide whether both targets are smaller, both larger or split, and skip every subtree that cannot hold a key in range.',
      ],
      tip: 'Pass down an open interval (low, high) that tightens at every step, or check that the in-order sequence is strictly increasing. Comparing with direct children alone misses ancestor violations.',
      practice: [
        '700-search-in-a-binary-search-tree',
        '701-insert-into-a-binary-search-tree',
        '98-validate-binary-search-tree',
        '108-convert-sorted-array-to-bst',
        '230-kth-smallest-element-in-a-bst',
        '235-lowest-common-ancestor-of-a-binary-search-tree',
        lc('450', 'Delete Node in a BST', 'Medium', 'delete-node-in-a-bst', 'a node with two children is replaced by its in-order successor'),
        lc('938', 'Range Sum of BST', 'Easy', 'range-sum-of-bst', 'skip every subtree outside the range'),
      ],
    },
    meta: {
      useNote: 'Comparing a node only with its children is a classic bug. Pass a shrinking (low, high) interval, or check that the in-order sequence is strictly increasing.',
      complexityNote: 'Search, insert and delete follow one root-to-leaf path, so they cost O(h): about log n when the tree is balanced and n when it degenerates into a chain. Validation and in-order walks visit all n nodes with O(h) recursion.',
      highlight: ['binary search tree', 'verify that a tree is a BST', 'k-th smallest value', 'sorted array or list must become a balanced tree', 'lowest common ancestor'],
    },
    examples: [
      { slug: '700-search-in-a-binary-search-tree', why: 'The core BST move: compare the target with the current node, then discard the left or the right subtree entirely. The search is one root-to-node walk, or ends on null when the value is absent.' },
      { slug: '701-insert-into-a-binary-search-tree', why: 'Insertion is a failed search: walk down exactly as a search would, and hang the new value as a leaf on the first empty child slot. No existing node moves.' },
      { slug: '98-validate-binary-search-tree', why: 'Shows why comparing a node with its children is not enough: every node must lie inside an interval inherited from all of its ancestors. The first tree is the classic trap.' },
      { slug: '108-convert-sorted-array-to-bst', why: 'Build a balanced tree from sorted data: the middle element becomes the root and each half builds a subtree, so the heights of the two sides differ by at most one.' },
      { slug: '230-kth-smallest-element-in-a-bst', why: 'The in-order walk of a BST is sorted, so counting nodes as they are visited stops the traversal at the k-th smallest.' },
      { slug: '235-lowest-common-ancestor-of-a-binary-search-tree', why: 'Uses the ordering to discard a whole subtree at every step, so the answer is found with a single root-to-node walk and no recursion.' },
    ],
  },

  'morris-traversal': {
    tags: ['Threaded tree', 'In-order', 'Pre-order', 'O(1) space'],
    content: {
      whenToUse: [
        'The task demands a tree traversal in **O(1) extra space**: no recursion stack and no explicit stack. The follow-ups of Inorder Traversal and Recover BST ask for exactly this, and temporary threads take over the stack\'s job.',
        'The tree is **extremely deep or skewed**, so a recursive walk would overflow the call stack and an O(h) stack is not allowed or not wise. Morris walks a chain of a million nodes with a handful of pointers.',
        'You need the **in-order sequence of a BST on the fly**, for example to compare each key with the previous one, find the k-th smallest value or detect the two swapped nodes, without storing the sequence or a stack.',
        'The tree may be **modified temporarily as long as it is restored**: Morris writes a thread into an empty right pointer and removes it on the second visit, so every pointer is back to normal when the traversal ends.',
        'You want **pre-order or in-order from the same loop**: both share the thread logic and only the moment of recording differs. Pre-order records a node when its thread is created, in-order when the thread is cut.',
      ],
      tip: 'Two cases only. No left child: visit and go right. Otherwise find the predecessor; if its right pointer is empty, thread it and go left, else cut the thread, visit and go right.',
      practice: [
        '94-binary-tree-inorder-traversal',
        '144-binary-tree-preorder-traversal',
        '99-recover-binary-search-tree',
        '230-kth-smallest-element-in-a-bst',
        '114-flatten-binary-tree-to-linked-list',
        '98-validate-binary-search-tree',
        lc('501', 'Find Mode in Binary Search Tree', 'Easy', 'find-mode-in-binary-search-tree', 'follow-up: no extra space'),
      ],
    },
    meta: {
      useNote: 'The loop has two cases: no left child (visit, go right) or a left subtree (thread the predecessor, or cut the thread). Always cut every thread so the tree is restored.',
      complexityNote: 'Each edge on a predecessor path is walked at most twice, once to create the thread and once to find it again, so the total time is O(n). Only cur and pred are stored, so the extra space is O(1).',
      highlight: ['O(1) extra space', 'extremely deep or skewed', 'in-order sequence of a BST', 'modified temporarily', 'pre-order or in-order'],
    },
  },

  'tree-construction': {
    tags: ['Pre + in-order', 'Sorted array', 'Preorder BST', 'Serialize'],
    content: {
      whenToUse: [
        'You are given **two traversals** (pre-order + in-order, or in-order + post-order) and must rebuild the tree: the first pre-order value (or last post-order value) is the root, and its position in the in-order list splits the left and right subtrees.',
        'A **sorted array or list must become a balanced BST**: the middle element becomes the root and each half builds a subtree, which keeps the height near log₂ n (Convert Sorted Array to BST, Balance a BST from its in-order list).',
        'Only **one traversal of a BST is given**: a pre-order list plus the BST rule is enough, because an upper bound passed down tells each call when its subtree has ended, giving a one-pass O(n) build.',
        'The root is chosen by a **property of the values**, such as the maximum of a range (Maximum Binary Tree): scan the range for the root, then build the left and right parts from the two sides of it.',
        'A tree must be **encoded as a string and decoded back**: serialize in pre-order with a marker such as # for every null child, then rebuild with one shared read pointer. The markers make a single traversal order enough.',
      ],
      tip: 'Decide three things first: where the next root comes from, what splits the rest into left and right, and how an empty subtree is signalled. A value → index map makes each split O(1).',
    },
    meta: {
      useNote: 'Ask which data gives the root and which gives the split. A hash map from value to in-order index makes every split O(1).',
      complexityNote: 'Each value becomes exactly one node, so building takes O(n) when in-order positions sit in a hash map, and O(n²) if you search the array every time. The recursion is h deep and the map adds O(n) space.',
      highlight: ['two traversals', 'sorted array or list must become a balanced BST', 'one traversal of a BST', 'property of the values', 'encoded as a string'],
    },
  },

  /* ------------------------------------------------------------------ design */
  'lru-cache-design': {
    tags: ['HashMap', 'Doubly linked list', 'LRU / LFU', 'O(1) design'],
    content: {
      whenToUse: [
        'The interface needs **get, put, increment or decrement in O(1)** with a size limit: LRU Cache, LFU Cache, All O(1) Data Structure. A hash map alone has no order and a list alone has no fast lookup, so the two are combined.',
        'You must always know the **oldest, newest, least used or most used** entry without scanning: the end of a doubly linked list (or of a bucket list) holds exactly that entry, readable in constant time.',
        'An entry has to **jump to a new position when it is used**: move to the front on a read, or move to the neighbouring count bucket. Splicing a node out of or into a doubly linked list takes just a few pointer changes.',
        'The statement mentions a **capacity and an eviction policy** (least recently used, or least frequently used with ties broken by recency). When full, the victim sits at the tail or in the lowest bucket and leaves both structures.',
        'It is a design problem where **two structures must stay in sync**: the map points at list nodes, and every insert, move or evict updates both. Dummy head and tail nodes remove all the null checks at the ends.',
      ],
      tip: 'Say what each structure is responsible for: the map finds, the list orders. Use dummy head and tail nodes, and update both structures on every eviction.',
    },
    meta: {
      useNote: 'Whenever a design question says "O(1) for every operation" plus an eviction or ordering rule, pair a map with a linked structure and keep them in sync.',
      complexityNote: 'Every operation is one hash lookup plus a constant number of pointer edits, so get and put run in O(1). Memory grows with the number of stored entries, which the capacity bounds at O(capacity).',
      highlight: ['get, put, increment or decrement in O(1)', 'oldest, newest, least used or most used', 'jump to a new position', 'capacity and an eviction policy', 'two structures must stay in sync'],
    },
  },
};
