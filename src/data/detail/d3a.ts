import type { DetailMap } from './types.ts';

// Batch d3 part a: backtrack-perms, backtrack-combos, backtrack-constraint (text overrides, keyed by pattern slug); merged by d3.ts.
const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const d3a: DetailMap = {
  'backtrack-perms': {
    tags: ['n! orderings', 'used[] array', 'skip equal twins', 'next permutation'],
    content: {
      whenToUse: [
        'The **order of the picks matters** and every element is used exactly once, so [1,2,3] and [3,2,1] are different answers. Typical prompts: "return all permutations", "all rearrangements of these digits" or "every ordering of the tasks".',
        'You need a **full enumeration of arrangements**, or only those that pass a test, for a small collection (n of about 8 to 10 at most). The n! results explode so fast that anything larger is a counting or DP question, not a listing one.',
        'The state is **which items are still available**: a boolean used[] array, a frequency map, or in-place swaps. Every level of the recursion fills one slot, and its loop may take any unused item, not only later ones as subsets do.',
        'The input has **repeated values** but the answers must be distinct (Permutations II, Letter Tile Possibilities). Sort first, then skip a value whose equal left neighbour is unused, so equal copies are always placed in sorted order.',
        'You only want the **next or the k-th arrangement**, not all of them. Next Permutation builds the successor in place with a pivot, a swap and a reverse, and Permutation Sequence uses factorial counting, so no recursion at all.',
      ],
      tip: 'One slot per level, any unused item per slot: mark it used, recurse, then unmark it. With duplicates, sort first and skip a value when its equal left twin is not currently used.',
      practice: [
        '46-permutations',
        { slug: '47-permutations-ii', note: 'sort + skip equal twins' },
        { slug: '31-next-permutation', note: 'in-place successor, no recursion' },
        { id: '526', title: 'Beautiful Arrangement', difficulty: 'Medium', note: 'prune while placing numbers', href: LC('beautiful-arrangement') },
        { id: '1079', title: 'Letter Tile Possibilities', difficulty: 'Medium', note: 'counts with repeated letters', href: LC('letter-tile-possibilities') },
        { id: '784', title: 'Letter Case Permutation', difficulty: 'Medium', note: 'two choices per letter', href: LC('letter-case-permutation') },
        { id: '60', title: 'Permutation Sequence', difficulty: 'Hard', note: 'factorial counting instead of enumerating', href: LC('permutation-sequence') },
      ],
    },
    meta: {
      useNote: 'One slot per level, any unused item per slot: mark it, recurse, unmark it. For duplicates, sort and skip a value whose equal left twin is unused.',
      complexityNote: 'A full ordering has n! leaves, and copying each finished path into the answer costs O(n), so time is O(n · n!). Beyond the output, only the path, the used[] array and the stack are kept, all of size n.',
      highlight: ['order of the picks matters', 'full enumeration of arrangements', 'which items are still available', 'repeated values', 'next or the k-th arrangement'],
    },
  },

  'backtrack-combos': {
    tags: ['start index', 'break vs continue', 'prune early', 'reuse or once'],
    content: {
      whenToUse: [
        'Order does not matter and you want **groups, not sequences**: choose k of n, split a number into parts, or pick items that hit a target sum. A start index that only moves forward guarantees [1,2] and [2,1] are never both built.',
        'A **running total or remaining count** exists (amount left, slots still to fill, open versus close brackets), so a branch can be judged hopeless early. Combination Sum cuts when a candidate overshoots; Combinations cuts when too few numbers remain.',
        'Elements may be **reused or used once**, and the only difference is the index you pass down: i to reuse an item (Combination Sum), i + 1 to use it once (Combination Sum II, Combinations). Spot that phrase in the statement and the template adapts.',
        'The input has **duplicates but the answers must be unique** (Combination Sum II). Sort, then skip a value equal to its left sibling at the same depth only. Skipping per level, not along the path, still allows [1,1,6].',
        'You must **list every valid structure** rather than count or optimise: balanced bracket strings, IP address splits, digit sums. Validity rules become guards that reject a bad prefix before it is ever built, as Generate Parentheses does.',
      ],
      tip: 'Sort the candidates, then BREAK (not continue) when one overshoots: every later value is bigger still. Use continue only when the next sibling could still fit, as with duplicate skipping.',
      practice: [
        '77-combinations',
        { slug: '39-combination-sum', note: 'reuse allowed, break on overshoot' },
        { slug: '22-generate-parentheses', note: 'guards instead of a sum' },
        { id: '40', title: 'Combination Sum II', difficulty: 'Medium', note: 'each item once, skip duplicates', href: LC('combination-sum-ii') },
        { id: '216', title: 'Combination Sum III', difficulty: 'Medium', note: 'fixed size k and digits 1-9', href: LC('combination-sum-iii') },
        { id: '93', title: 'Restore IP Addresses', difficulty: 'Medium', note: 'segment rules prune the cuts', href: LC('restore-ip-addresses') },
      ],
    },
    meta: {
      useNote: 'Sort, and BREAK when a candidate overshoots (everything later is bigger). A start index that only moves forward keeps each group in one order.',
      complexityNote: 'Without pruning the tree has up to 2ⁿ nodes. Sorting plus early cuts shrinks it to roughly N^(T/M) calls for target T and smallest candidate M. Space is the recursion depth T/M plus the current path, not the output.',
      highlight: ['groups, not sequences', 'running total or remaining count', 'reused or used once', 'duplicates but the answers must be unique', 'list every valid structure'],
    },
  },

  'backtrack-constraint': {
    tags: ['validate first', 'prune whole subtrees', 'O(1) conflict check', 'one or all solutions'],
    content: {
      whenToUse: [
        'Every choice must **satisfy rules against earlier choices**: queens that must not attack, digits that must not repeat in a row, column or box, letters that must sit on adjacent cells. A violation is caught at placement time, never afterwards.',
        'You need **one valid arrangement, all of them, or a count**. Existence questions stop at the first success and return true (Sudoku, Word Search); enumeration keeps going after every solution it records (N-Queens, Palindrome Partitioning).',
        'A partial assignment can be **proven hopeless early**: a row with no safe square, a cell with no candidate digit, a prefix that already mismatches the word. Detect it and cut the whole subtree instead of exploring it.',
        'The **search space is enormous but the constraints shrink it**: n^n boards for N-Queens, 9^E fills for Sudoku. With a good check only a thin slice is ever visited, which is why generate-everything-then-filter is not an option.',
        'You can make the check **O(1) with auxiliary state**: column and diagonal sets, row, column and box bitmasks, a visited matrix. When the fill order is free, take the most constrained position next (fewest candidates) to prune even earlier.',
      ],
      tip: 'Check validity before the choose step and make it O(1) with auxiliary sets or masks (columns, diagonals, row and box). When the fill order is free, take the most constrained position first.',
      practice: [
        { slug: '51-n-queens', note: 'column and diagonal sets' },
        { slug: '37-sudoku-solver', note: 'row, column and box candidates' },
        { slug: '79-word-search', note: 'prefix mismatch + visited mark' },
        { slug: '131-palindrome-partitioning', note: 'reject non-palindromic pieces' },
        { slug: '36-valid-sudoku', note: 'the same three rules, check only' },
        { id: '93', title: 'Restore IP Addresses', difficulty: 'Medium', note: 'each segment 0 to 255, no leading zeros', href: LC('restore-ip-addresses') },
        { id: '52', title: 'N-Queens II', difficulty: 'Hard', note: 'count only; bitmask version', href: LC('n-queens-ii') },
      ],
    },
    meta: {
      useNote: 'Check the rule before choosing, make the check O(1) with sets or masks, and fill the most constrained spot first.',
      complexityNote: 'The worst case is still exponential (up to n^n boards or 9^E fills), but each rejected placement removes a whole subtree, so real runs touch a tiny part. Space is the recursion depth plus the constraint sets: O(n) for N-Queens.',
      highlight: ['satisfy rules against earlier choices', 'one valid arrangement, all of them, or a count', 'proven hopeless early', 'search space is enormous', 'O(1) with auxiliary state'],
    },
  },
};
