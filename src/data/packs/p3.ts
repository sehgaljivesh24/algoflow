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

/** Pack p3 — trees + backtracking: 3 examples for 7 existing patterns, 4 new patterns. */
export const pack: PatternPack = {
  id: 'p3',

  problems: [
    { id: 'ALG', title: 'Morris Inorder Traversal', difficulty: 'Medium', tag: 'Morris threads, O(1) space', category: 'Tree' },
    { id: '144', title: 'Binary Tree Preorder Traversal', difficulty: 'Easy', tag: 'Morris threads, O(1) space', category: 'Tree' },
    { id: '99', title: 'Recover Binary Search Tree', difficulty: 'Medium', tag: 'Morris in-order, O(1) space', category: 'Tree' },
    { id: '235', title: 'Lowest Common Ancestor of a Binary Search Tree', difficulty: 'Medium', tag: 'BST property, one root-to-node walk', category: 'Tree' },
    { id: '654', title: 'Maximum Binary Tree', difficulty: 'Medium', tag: 'split at the maximum', category: 'Tree' },
    { id: '1008', title: 'Construct Binary Search Tree from Preorder Traversal', difficulty: 'Medium', tag: 'preorder + upper bound', category: 'Tree' },
    { id: 'ALG', title: 'Maximum Subarray (Divide and Conquer)', difficulty: 'Medium', tag: 'split, solve halves, cross the middle', category: 'Divide and Conquer' },
    { id: '493', title: 'Reverse Pairs', difficulty: 'Hard', tag: 'merge sort + two pointers', category: 'Divide and Conquer' },
    { id: '241', title: 'Different Ways to Add Parentheses', difficulty: 'Medium', tag: 'split at each operator', category: 'Divide and Conquer' },
    { id: '131', title: 'Palindrome Partitioning', difficulty: 'Medium', tag: 'prune non-palindromic pieces', category: 'Backtracking' },
    { id: '47', title: 'Permutations II', difficulty: 'Medium', tag: 'backtrack + dedup (sort, skip)', category: 'Backtracking' },
  ],

  groups: [
    {
      name: 'Tree',
      cards: [
        { slug: 'morris-traversal', group: 'Tree', title: 'Morris Traversal (O(1) Space)', tags: ['Threaded tree', 'In-order', 'Pre-order'], complexity: 'O(n) / O(1)' },
        { slug: 'tree-construction', group: 'Tree', title: 'Tree Construction', tags: ['Traversals', 'Sorted array', 'Divide & conquer'], complexity: 'O(n) / O(h)' },
      ],
    },
    {
      name: 'Recursion',
      cards: [
        { slug: 'divide-and-conquer', group: 'Recursion', title: 'Divide and Conquer', tags: ['Split / Solve / Combine', 'Merge sort', 'Quickselect'], complexity: 'O(n log n) typical' },
      ],
    },
    {
      name: 'Backtracking',
      cards: [
        { slug: 'backtrack-constraint', group: 'Backtracking', title: 'Constraint Backtracking', tags: ['N-Queens', 'Sudoku', 'Word search', 'Pruning'], complexity: 'Exponential, pruned' },
      ],
    },
  ],

  content: {
    'morris-traversal': {
      animation: 'alg-morris-inorder-traversal',
      summary: 'Walk a binary tree in order (or pre-order) without recursion and without a stack, by temporarily pointing the in-order predecessor of each node back at that node. When the walk is done every pointer is restored.',
      whenToUse: [
        'The problem asks for a tree traversal in O(1) extra space (no recursion stack, no explicit stack)',
        'The tree is too deep for recursion, or you are told you may not allocate O(h) memory',
        'You need the in-order sequence of a BST on the fly, for example to compare neighbours or to find the k-th value',
        'The tree may be modified temporarily as long as it is restored before you return',
      ],
      tip: 'The loop has only two cases. No left child: visit and step right. Has a left child: find the rightmost node of the left subtree; if its right pointer is empty, thread it to cur and go left, otherwise cut the thread, visit cur and go right. Pre-order differs only in visiting at the moment the thread is created.',
      template: `// Morris in-order: O(n) time, O(1) extra space, tree restored afterwards
static List<Integer> inorderMorris(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    TreeNode cur = root;

    while (cur != null) {
        // ── Phase 1: no left subtree, so nothing has to be remembered ──
        if (cur.left == null) {
            out.add(cur.val);                        // visit
            cur = cur.right;                         // may be a thread leading back up
            continue;
        }

        // ── Phase 2: find the in-order predecessor (rightmost node of the left subtree) ──
        TreeNode pred = cur.left;
        while (pred.right != null && pred.right != cur) pred = pred.right;

        // ── Phase 3: first arrival threads it, second arrival cuts it ──
        if (pred.right == null) {
            pred.right = cur;                        // thread: remember the way back
            // for PRE-order, record cur.val here instead of below
            cur = cur.left;
        } else {
            pred.right = null;                       // left side is done: restore the tree
            out.add(cur.val);                        // in-order visit
            cur = cur.right;
        }
    }
    return out;
}`,
      practice: [
        '94-binary-tree-inorder-traversal',
        '144-binary-tree-preorder-traversal',
        '99-recover-binary-search-tree',
        '230-kth-smallest-element-in-a-bst',
        '114-flatten-binary-tree-to-linked-list',
        lc('501', 'Find Mode in Binary Search Tree', 'Easy', 'find-mode-in-binary-search-tree', 'follow-up: no extra space'),
      ],
    },
    'divide-and-conquer': {
      animation: '912-merge-sort',
      summary: 'Split the problem into smaller copies of itself, solve each piece recursively, then combine the answers. The interesting work is usually the combine step, or the answers that straddle the split.',
      whenToUse: [
        'The problem on n items can be expressed with the same problem on two (or a few) smaller parts',
        'The answer is a combination of the part answers plus something that crosses the split (a merge, a crossing subarray, a product of results)',
        'You need O(n log n) where the brute force is O(n²), for example counting pairs across two sorted halves',
        'The parts are independent, so they could in principle be solved in parallel',
      ],
      tip: 'Write the recurrence first. T(n) = 2T(n/2) + O(n) is O(n log n); if the combine step is O(1) the whole thing is O(n). Ask what the halves must return (sorted order, a sum, a list of values) so that combining stays cheap.',
      template: `// Template: count inversions (i < j, a[i] > a[j]) with merge sort
static long solve(int[] a, int lo, int hi, int[] tmp) {
    // ── Phase 1: base case ──
    if (lo >= hi) return 0;

    // ── Phase 2: divide and solve the halves ──
    int mid = lo + (hi - lo) / 2;
    long count = solve(a, lo, mid, tmp) + solve(a, mid + 1, hi, tmp);

    // ── Phase 3: combine, counting the pairs that cross the split ──
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else { count += mid - i + 1; tmp[k++] = a[j++]; }   // a[i..mid] are all larger than a[j]
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    System.arraycopy(tmp, lo, a, lo, hi - lo + 1);
    return count;                                    // T(n) = 2T(n/2) + O(n) = O(n log n)
}`,
      practice: [
        '912-merge-sort',
        '912-quick-sort',
        '23-merge-k-sorted-lists',
        '215-kth-largest-element-in-an-array',
        lc('315', 'Count of Smaller Numbers After Self', 'Hard', 'count-of-smaller-numbers-after-self', 'merge sort carrying original indices'),
        lc('50', 'Pow(x, n)', 'Medium', 'powx-n', 'halve the exponent, square the result'),
      ],
    },
    'backtrack-constraint': {
      animation: '51-n-queens',
      summary: 'Fill a board or a sequence one decision at a time and reject a partial choice the moment it breaks a rule, instead of generating complete candidates and filtering them. The quality of the check decides how much of the search tree you never visit.',
      whenToUse: [
        'Every choice must satisfy constraints with the earlier choices (queens that must not attack, digits that must not repeat, letters that must be adjacent)',
        'You need one valid arrangement, all valid arrangements, or a count of them',
        'A partial assignment can be proven hopeless long before it is complete',
        'The search space is huge but the constraints cut it down drastically',
      ],
      tip: 'Put the validity check before the choose step, and make it O(1) with auxiliary sets (columns, diagonals, row/box masks). When there is a choice of what to fill next, take the most constrained position first.',
      template: `// N-Queens: one queen per row, constraints checked before placing
static List<List<String>> solveNQueens(int n) {
    List<List<String>> out = new ArrayList<>();
    place(0, n, new int[n], new boolean[n], new boolean[2 * n], new boolean[2 * n], out);
    return out;
}

static void place(int row, int n, int[] colOf, boolean[] cols, boolean[] up, boolean[] down, List<List<String>> out) {
    // ── Phase 1: every row filled means a valid board ──
    if (row == n) { out.add(render(colOf, n)); return; }

    for (int c = 0; c < n; c++) {
        // ── Phase 2: prune BEFORE choosing: column and both diagonals must be free ──
        if (cols[c] || up[row + c] || down[row - c + n]) continue;

        // ── Phase 3: choose, explore, un-choose ──
        cols[c] = up[row + c] = down[row - c + n] = true;
        colOf[row] = c;
        place(row + 1, n, colOf, cols, up, down, out);
        cols[c] = up[row + c] = down[row - c + n] = false;
    }
}

static List<String> render(int[] colOf, int n) {
    List<String> board = new ArrayList<>();
    for (int r = 0; r < n; r++) {
        char[] line = new char[n];
        Arrays.fill(line, '.');
        line[colOf[r]] = 'Q';
        board.add(new String(line));
    }
    return board;
}`,
      practice: [
        '51-n-queens',
        '37-sudoku-solver',
        '79-word-search',
        '131-palindrome-partitioning',
        '36-valid-sudoku',
        lc('93', 'Restore IP Addresses', 'Medium', 'restore-ip-addresses', 'each segment must be 0 to 255 without leading zeros'),
        lc('52', 'N-Queens II', 'Hard', 'n-queens-ii', 'count only; bitmask version'),
      ],
    },
    'tree-construction': {
      animation: '105-construct-tree-from-preorder-inorder',
      summary: 'Rebuild a tree from a description of it: two traversals, a sorted array, a bounded preorder, or a serialised string. The root is chosen first and the remaining data is split between its left and right subtree.',
      whenToUse: [
        'You are given traversal orders (pre + in, in + post) or a sorted / preorder list and must produce the tree',
        'One piece of data tells you the root of a range and another tells you how big each side is',
        'You need a balanced BST from sorted data, or the unique BST that has a given preorder',
        'A tree must be encoded to a string and decoded back',
      ],
      tip: 'Decide three things before coding: where the next root comes from (preorder front, postorder back, range middle, range maximum), what splits the rest into left and right, and how the recursion signals an empty subtree. Index the inorder array in a hash map so every split is O(1).',
      template: `// Rebuild a tree from preorder + inorder (distinct values)
static Map<Integer, Integer> pos = new HashMap<>();
static int next = 0;                                  // next unread preorder index

static TreeNode buildTree(int[] preorder, int[] inorder) {
    for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);   // value -> inorder index
    next = 0;
    return build(preorder, 0, inorder.length - 1);
}

static TreeNode build(int[] preorder, int lo, int hi) {
    // ── Phase 1: an empty range means an empty subtree ──
    if (lo > hi) return null;

    // ── Phase 2: preorder names the root, inorder tells where it splits the range ──
    int rootVal = preorder[next++];
    TreeNode root = new TreeNode(rootVal);
    int mid = pos.get(rootVal);

    // ── Phase 3: build left first, because preorder lists the left subtree first ──
    root.left = build(preorder, lo, mid - 1);
    root.right = build(preorder, mid + 1, hi);
    return root;                                      // O(n) time, O(n) map + O(h) stack
}`,
      practice: [
        '105-construct-tree-from-preorder-inorder',
        '108-convert-sorted-array-to-bst',
        '654-maximum-binary-tree',
        '1008-construct-binary-search-tree-from-preorder-traversal',
        '297-serialize-and-deserialize-binary-tree',
        lc('106', 'Construct Binary Tree from Inorder and Postorder Traversal', 'Medium', 'construct-binary-tree-from-inorder-and-postorder-traversal', 'roots come from the END of postorder; build right first'),
        lc('1382', 'Balance a Binary Search Tree', 'Medium', 'balance-a-binary-search-tree', 'inorder list, then pick midpoints'),
      ],
    },
  },

  meta: {
    'morris-traversal': {
      icon: '🧵', label: 'Morris',
      desc: 'Traverse a tree with no stack and no recursion: temporary threads from each predecessor point back up, and are removed on the way.',
      useNote: 'If a follow-up says "O(1) extra space" for a tree walk, this is the technique. Remember to cut every thread so the tree is restored.',
      complexityNote: 'Each edge on a predecessor path is walked at most twice, so the time is O(n). Only a few pointers are stored, so the extra space is O(1).',
      highlight: ['Morris', 'O(1) extra space', 'no recursion stack', 'in-order sequence', 'restored'],
    },
    'divide-and-conquer': {
      icon: '✂️', label: 'D&C',
      desc: 'Split the input, solve the pieces recursively, and stitch the answers together. The combine step is where the cleverness lives.',
      useNote: 'Write the recurrence T(n) = a·T(n/b) + f(n) before coding; it tells you immediately whether the idea beats the brute force.',
      complexityNote: 'Two halves plus a linear combine give O(n log n). The recursion is about log n deep, so extra space is O(log n) plus any merge buffer.',
      highlight: ['Divide and Conquer', 'smaller copies', 'cross the split', 'combine step', 'O(n log n)'],
    },
    'backtrack-constraint': {
      icon: '♛', label: 'Constraint',
      desc: 'Place one piece at a time and reject any placement that already breaks a rule, so whole families of hopeless boards are never explored.',
      useNote: 'Check the rule before choosing, make the check O(1) with sets or masks, and fill the most constrained spot first.',
      complexityNote: 'Still exponential in the worst case, but good pruning shrinks the search enormously. Space is the recursion depth plus the constraint sets.',
      highlight: ['Constraint', 'break a rule', 'hopeless', 'valid arrangement', 'most constrained'],
    },
    'tree-construction': {
      icon: '🏗️', label: 'Build',
      desc: 'Turn traversals, a sorted array or a bounded preorder back into a tree: pick the root, split what is left, recurse on each side.',
      useNote: 'Always ask which data gives the root and which data gives the split. A hash map from value to inorder index makes each split O(1).',
      complexityNote: 'Each element becomes exactly one node, so the work is O(n) with a map (O(n²) if you search the inorder array each time). The recursion is h deep.',
      highlight: ['traversal orders', 'sorted', 'root of a range', 'balanced BST', 'encoded to a string'],
    },
  },

  examples: {
    // ---------------------------------------------------------------- existing: Tree
    'tree-dfs': [
      { slug: '104-maximum-depth-of-binary-tree', why: 'The base shape of tree recursion: a null node returns 0, every other node combines its two children’s answers on the way back up.' },
      { slug: '543-diameter-of-binary-tree', why: 'The value returned upward (height) differs from the value being optimised (the longest bend through a node), so a side variable collects the best answer during the same pass.' },
      { slug: '101-symmetric-tree', why: 'The recursion walks two nodes at once, one from each side of the mirror, so the base cases must handle the one-null and both-null combinations.' },
    ],
    'tree-bfs': [
      { slug: '102-binary-tree-level-order-traversal', why: 'The queue-size snapshot at the start of each round lets one loop process exactly one level at a time.' },
      { slug: '199-binary-tree-right-side-view', why: 'The same level loop, but only one node per level matters: the last one dequeued, which is what you see from the right.' },
      { slug: '103-binary-tree-zigzag-level-order', why: 'The traversal order is unchanged, yet the direction in which each level is written alternates, which shows how to post-process a level without disturbing the queue.' },
    ],
    'tree-paths': [
      { slug: '113-path-sum-ii', why: 'Collects every root-to-leaf path: the path list is shared, copied at a leaf, and the last node is popped on the way back.' },
      { slug: '129-sum-root-to-leaf-numbers', why: 'Instead of a list the path is a single number passed down (value × 10 + digit); nothing needs undoing and the leaves return the sums upward.' },
      { slug: '124-binary-tree-maximum-path-sum', why: 'The path may bend at any node, so each node returns only its best one-sided gain to the parent while the answer combines both sides locally.' },
    ],
    'tree-bst': [
      { slug: '98-validate-binary-search-tree', why: 'Shows why comparing a node with its children is not enough: every node must lie inside an interval inherited from all of its ancestors.' },
      { slug: '230-kth-smallest-element-in-a-bst', why: 'The in-order walk of a BST is sorted, so counting nodes as they are visited stops the traversal at the k-th smallest.' },
      { slug: '235-lowest-common-ancestor-of-a-binary-search-tree', why: 'Uses the ordering to discard a whole subtree at every step, so the answer is found with a single root-to-node walk and no recursion.' },
    ],
    // ---------------------------------------------------------------- existing: Backtracking
    'backtrack-subsets': [
      { slug: '78-subsets', why: 'The core choose, explore, un-choose loop where every node of the recursion is itself an answer.' },
      { slug: '90-subsets-ii', why: 'Duplicates in the input: sorting and skipping an equal value at the same depth keeps each distinct subset from being produced twice.' },
      { slug: '17-letter-combinations-of-a-phone-number', why: 'A fixed-depth variant: each position offers a different set of choices, and only complete-length paths count as answers.' },
    ],
    'backtrack-perms': [
      { slug: '46-permutations', why: 'The used[] array: every slot may take any unused element, so the choices are not restricted to later indices as in subsets.' },
      { slug: '47-permutations-ii', why: 'With repeated values the same arrangement would appear several times; sorting plus the rule "use a copy only after its left twin" produces each distinct permutation exactly once.' },
      { slug: '31-next-permutation', why: 'The non-recursive counterpart: generate the next arrangement in lexicographic order in place, instead of enumerating all of them.' },
    ],
    'backtrack-combos': [
      { slug: '39-combination-sum', why: 'Elements may be reused, so the recursion stays at the same index; sorting lets the loop stop as soon as a candidate exceeds the remaining target.' },
      { slug: '77-combinations', why: 'A fixed size k: pruning by counting, so a branch is cut when too few elements remain to fill the combination.' },
      { slug: '22-generate-parentheses', why: 'The pruning rules are invariants (never more closes than opens, never more than n opens), so invalid prefixes are never built at all.' },
    ],

    // ---------------------------------------------------------------- new patterns
    'morris-traversal': [
      { slug: 'alg-morris-inorder-traversal', why: 'The core mechanism: find the predecessor, thread it on the first arrival, cut it and visit on the second arrival. Dashed arrows show the threads.' },
      { slug: '144-binary-tree-preorder-traversal', why: 'The same threading loop, but the node is recorded when the thread is created, which turns the in-order walk into a pre-order one.' },
      { slug: '99-recover-binary-search-tree', why: 'Uses the constant-space in-order stream for something real: spot the one or two descents in a BST’s sorted order and swap the two culprits back.' },
    ],
    'divide-and-conquer': [
      { slug: '912-merge-sort', why: 'The textbook shape: split in the middle, solve both halves, and spend all the real work on merging two sorted runs.' },
      { slug: '912-quick-sort', why: 'The mirror image: the work (partitioning around a pivot) happens before the recursion, and there is nothing to combine afterwards.' },
      { slug: 'alg-maximum-subarray-divide-and-conquer', why: 'The best answer may cross the split, so the combine step is a pair of outward scans from the middle: best suffix plus best prefix.' },
      { slug: '493-reverse-pairs', why: 'Merge sort with a counting pass inserted before the merge: because both halves are sorted, pairs across the split are counted with two sweeping pointers.' },
      { slug: '241-different-ways-to-add-parentheses', why: 'Divides at every operator instead of at the middle, and the combine step is a Cartesian product of the two sub-result lists.' },
    ],
    'backtrack-constraint': [
      { slug: '51-n-queens', why: 'Pruning by conflict sets: one queen per row, and a column or diagonal already in use rejects a square before the queen is placed.' },
      { slug: '37-sudoku-solver', why: 'Pruning by candidate sets: a digit is tried only if the row, column and 3×3 box all allow it, and a cell with no candidate forces an immediate backtrack.' },
      { slug: '79-word-search', why: 'Pruning by prefix: a branch dies as soon as a letter differs from the word, and a visited mark stops a path from reusing a cell.' },
      { slug: '131-palindrome-partitioning', why: 'Pruning by piece validity: a non-palindromic prefix is rejected before recursing, which discards every partition of the rest of the string that would have followed it.' },
    ],
    'tree-construction': [
      { slug: '105-construct-tree-from-preorder-inorder', why: 'Preorder supplies each subtree’s root in order, inorder supplies the sizes of the left and right parts through a hash map.' },
      { slug: '108-convert-sorted-array-to-bst', why: 'No traversal is given at all: the middle of each range becomes the root, which makes the BST height-balanced.' },
      { slug: '654-maximum-binary-tree', why: 'The root rule is a property of the values (the maximum of the range), so the split comes from a scan rather than from a second traversal.' },
      { slug: '1008-construct-binary-search-tree-from-preorder-traversal', why: 'A single traversal is enough for a BST: an upper bound passed down tells each call when its subtree has ended, giving a linear one-pass build.' },
      { slug: '297-serialize-and-deserialize-binary-tree', why: 'Construction as a round trip: encode with null markers so that one traversal order alone is enough to decode the shape.' },
    ],
  },
};
