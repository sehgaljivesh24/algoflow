import type { DetailMap } from './types.ts';
import { d3a } from './d3a.ts';
import { d3b } from './d3b.ts';
import { d3c } from './d3c.ts';
import { d3d } from './d3d.ts';

// Batch d3 — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug. Parts a-d hold most patterns; backtrack-subsets lives here.
const LC = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export const d3: DetailMap = {
  ...d3a, ...d3b, ...d3c, ...d3d,

  'backtrack-subsets': {
    tags: ['2ⁿ subsets', 'Include or skip', 'Record every node', 'Dedup with sort'],
    content: {
      whenToUse: [
        'You must list **every subset (the power set)** of a collection, or every subset that passes a test: all subsets summing to a target, all with at most k items. Each of the 2ⁿ answers is a node of the recursion, so the walk records the path on entry.',
        'Every item is an **independent yes/no decision**: include it or skip it. Letter Case Permutation (upper or lower per letter) and "take or leave" enumerations share this binary decision tree, where each level settles one element.',
        'The input is **small, about 20 items or fewer**, because the output itself has 2ⁿ entries. If the question only asks for a count or a best value, use bitmasks or dynamic programming rather than enumerating every subset.',
        'The array has **duplicates but the answers must be distinct** (Subsets II, Combination Sum II). Sort first, then inside the loop skip nums[i] when it equals nums[i-1] and i > start, so one value is never the first pick twice at a level.',
        'You must produce **every split of a string or sequence**: Palindrome Partitioning and Restore IP Addresses. Each node asks where the next piece ends, and a start index that only moves forward keeps pieces in order without repeats.',
      ],
      tip: 'Record the path on entry to every call, then loop from start: choose nums[i], recurse with i + 1, un-choose. Moving start forward prevents [2,1] after [1,2]; sort and skip equal siblings for duplicates.',
      practice: [
        '78-subsets',
        { slug: '90-subsets-ii', note: 'sort + skip equal siblings' },
        { slug: '17-letter-combinations-of-a-phone-number', note: 'one fixed-depth level per digit' },
        { slug: '131-palindrome-partitioning', note: 'choose where to cut' },
        { id: '1863', title: 'Sum of All Subset XOR Totals', difficulty: 'Easy', note: 'enumerate, or spot the shortcut', href: LC('sum-of-all-subset-xor-totals') },
        { id: '784', title: 'Letter Case Permutation', difficulty: 'Medium', note: 'two choices per letter', href: LC('letter-case-permutation') },
        { id: '491', title: 'Non-decreasing Subsequences', difficulty: 'Medium', note: 'skip repeats with a per-level set', href: LC('non-decreasing-subsequences') },
        { id: '2044', title: 'Count Number of Maximum Bitwise-OR Subsets', difficulty: 'Medium', note: 'enumerate all 2ⁿ, track the best OR', href: LC('count-number-of-maximum-bitwise-or-subsets') },
      ],
    },
    meta: {
      useNote: 'Record the path on entry, then choose, explore, un-choose with start moving forward. For duplicates, sort and skip an equal sibling at the same depth.',
      complexityNote: 'There are 2ⁿ subsets and copying each into the answer costs up to O(n), so time is O(n · 2ⁿ). Beyond the output only the path and the recursion stack are kept, both at most n deep.',
      highlight: ['every subset (the power set)', 'independent yes/no decision', 'about 20 items or fewer', 'duplicates but the answers must be distinct', 'every split of a string or sequence'],
    },
  },
};
