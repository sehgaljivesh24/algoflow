/** Presentation details of the catalog topics (icon, display name, subtitle when there are no sub-groups). */
export interface TopicMeta {
  icon: string;
  /** Overrides the catalog name where the reference product words it differently. */
  title?: string;
  subtitle: string;
}

const KNOWN_TOPICS: Record<string, TopicMeta> = {
  Arrays: { icon: '📦', subtitle: 'Indexing, scanning and in-place tricks on contiguous data' },
  Strings: { icon: '🔤', subtitle: 'Text processing, counting characters and windows over strings' },
  Matrix: { icon: '🔲', subtitle: '2D grids: traversal, simulation, search and flood fill' },
  Stack: { icon: '📚', subtitle: 'Last-in first-out: matching, expression evaluation and monotonic stacks' },
  Queue: { icon: '🚶', subtitle: 'First-in first-out processing and deque-based windows' },
  'Binary Search': { icon: '🔍', subtitle: 'Halve the search space: sorted data, rotations and searching on the answer' },
  'Linked List': { icon: '🔗', subtitle: 'Pointer surgery: reversal, fast and slow pointers, merging' },
  Greedy: { icon: '💰', subtitle: 'Take the locally best choice and prove it is globally safe' },
  Intervals: { icon: '📅', subtitle: 'Sort by start or end, then merge, insert or count overlaps' },
  Backtracking: { icon: '🔙', subtitle: 'Build candidates step by step and undo choices: subsets, permutations, boards' },
  Tree: { icon: '🌳', subtitle: 'Traversals, recursion on subtrees, BST rules and path problems' },
  Heap: { icon: '⛰', subtitle: 'Priority queues for top-k, scheduling and streaming medians' },
  Graph: { icon: '🕸', subtitle: 'BFS, DFS, topological order, shortest paths and union-find' },
  'Dynamic Programming': { icon: '🧮', subtitle: 'Overlapping subproblems: linear, grid, subsequence and knapsack style tables' },
  'Bit Manipulation': { icon: '⚡', subtitle: 'XOR tricks, masks and counting bits' },
  Sorting: { icon: '📊', title: 'Sorting Algorithms', subtitle: 'Watch the classic comparison sorts reorder an array' },
  Trie: { icon: '🔠', subtitle: 'Prefix trees for dictionary lookups and word search' },
  Design: { icon: '🏗', subtitle: 'Combine data structures to meet O(1) operation targets' },
  // categories that the pattern packs may add
  Math: { icon: '➗', subtitle: 'Number theory, fast exponentiation, sieves and counting' },
  'Advanced Data Structures': { icon: '🧬', subtitle: 'Segment and Fenwick trees, lowest common ancestors, union-find variants' },
  'Computational Geometry': { icon: '📐', subtitle: 'Points, polygons and convex hulls' },
  'Strings Advanced': { icon: '🧵', subtitle: 'Pattern matching, hashing and palindromes in linear time' },
  Recursion: { icon: '🔁', subtitle: 'Divide and conquer and recursive construction' },
  Techniques: { icon: '🧰', subtitle: 'General tricks: compression, meet in the middle, sampling' },
};

const DEFAULT_TOPIC: TopicMeta = { icon: '📁', subtitle: '' };

/**
 * Presentation of every catalog topic. Unknown categories (new packs add some) resolve to a default folder icon and no
 * subtitle, so `TOPIC_META[name]` is always defined and the topic header, sidebar and sequence banner just work.
 */
export const TOPIC_META: Record<string, TopicMeta> = new Proxy(KNOWN_TOPICS, {
  get: (t, k) => (typeof k === 'string' ? (Object.prototype.hasOwnProperty.call(t, k) ? t[k] : DEFAULT_TOPIC) : undefined),
});

export const topicTitle = (name: string) => KNOWN_TOPICS[name]?.title ?? name;
