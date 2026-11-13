/** Presentation of the pattern families on the "Common Patterns" page: icon, one-line description, accent colour. */
export type Accent = 'cyan' | 'orange' | 'purple' | 'green' | 'pink' | 'yellow' | 'red' | 'blue';

export interface FamilyMeta {
  icon: string;
  sub: string;
  accent: Accent;
}

export const FAMILY_META: Record<string, FamilyMeta> = {
  'Sliding Window': { icon: '🪟', sub: 'Maintain a contiguous window over an array or string', accent: 'cyan' },
  'Two Pointers': { icon: '👉', sub: 'Two indices that scan, converge or chase each other', accent: 'orange' },
  'Prefix Sum & Hashing': { icon: '➕', sub: 'Precompute running totals and remember what you have seen', accent: 'purple' },
  'Binary Search': { icon: '🔍', sub: 'Cut the search space in half on every probe', accent: 'green' },
  Stack: { icon: '📚', sub: 'Remember the most recent unfinished work', accent: 'pink' },
  'BFS / Grid': { icon: '🌊', sub: 'Explore level by level and spread across 2D grids', accent: 'yellow' },
  'Linked List': { icon: '🔗', sub: 'Rewire pointers in place, one node at a time', accent: 'cyan' },
  Tree: { icon: '🌳', sub: 'Recurse on subtrees or walk the tree level by level', accent: 'green' },
  Backtracking: { icon: '🌿', sub: 'Try a choice, recurse, then undo it', accent: 'orange' },
  Greedy: { icon: '💡', sub: 'Commit to the best local choice and never look back', accent: 'yellow' },
  'Heap / Priority Queue': { icon: '⛏', sub: 'Always know the smallest or largest item in O(log n)', accent: 'red' },
  Graph: { icon: '🕸', sub: 'Connectivity, ordering and shortest paths', accent: 'blue' },
  'Dynamic Programming': { icon: '🎯', sub: 'Solve each overlapping subproblem exactly once', accent: 'purple' },
  'Bit Manipulation': { icon: '⚡', sub: 'Work directly on the binary representation', accent: 'pink' },
  // families introduced by the pattern packs
  'Array Techniques': { icon: '🧱', sub: 'In-place array tricks: cyclic placement, voting and counting', accent: 'orange' },
  Design: { icon: '🏗', sub: 'Combine data structures to meet O(1) operation targets', accent: 'cyan' },
  Recursion: { icon: '🔁', sub: 'Split, solve and combine: recursion as a design tool', accent: 'green' },
  'Randomized & Streaming': { icon: '🎲', sub: 'Sample and summarise data you can only see once', accent: 'yellow' },
  Math: { icon: '➗', sub: 'Number theory, fast powers and counting formulas', accent: 'purple' },
  Sorting: { icon: '📊', sub: 'Beat the comparison bound with counting, buckets and digits', accent: 'blue' },
  Strings: { icon: '🔤', sub: 'Match, hash and mirror text in linear time', accent: 'pink' },
  Techniques: { icon: '🧰', sub: 'General-purpose tricks that reshape the problem first', accent: 'red' },
  'Advanced Data Structures': { icon: '🧬', sub: 'Range queries, prefix structures and tree decompositions', accent: 'blue' },
  'Computational Geometry': { icon: '📐', sub: 'Points, polygons and orientation tests', accent: 'green' },
  'Dynamic Programming (advanced)': { icon: '🧠', sub: 'Masks, intervals, trees, digits and games as DP states', accent: 'purple' },
};

const ACCENTS: Accent[] = ['cyan', 'orange', 'purple', 'green', 'pink', 'yellow', 'red', 'blue'];

/** Presentation of a family; unknown families get a generic icon, no subtitle and a stable accent derived from the name. */
export function familyMeta(name: string): FamilyMeta {
  const known = FAMILY_META[name];
  if (known) return known;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { icon: '🧩', sub: '', accent: ACCENTS[h % ACCENTS.length] };
}

export const familyId = (name: string) => `pat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
