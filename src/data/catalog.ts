/**
 * Problem catalog (metadata only). Which problems are actually animated is
 * decided by src/problems/registry.ts — everything else shows as "coming soon".
 *
 * Line format:  id|title|E/M/H|technique      ("## Name" starts a sub-group)
 * id is a LeetCode number, or a label (GFG / IB / CP / ALG) for other sources.
 */

import { PACKS } from './packs/index.ts';

export interface CatalogEntry {
  slug: string;
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tag: string;
  category: string;
  group?: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  entries: CatalogEntry[];
}

const RAW: Record<string, string> = {
  Arrays: `
## Basics
1929|Concatenation of Array|E|basics
1480|Running Sum of 1D Array|E|prefix sum
1672|Richest Customer Wealth|E|2D array
1470|Shuffle the Array|E|basics
832|Flipping an Image|E|basics
2239|Find Closest Number to Zero|E|basics
## Two Pointers
88|Merge Sorted Array|E|two pointers
26|Remove Duplicates from Sorted Array|E|two pointers
977|Squares of a Sorted Array|E|two pointers
15|3Sum|M|sort + two pointers
42|Trapping Rain Water|H|two pointers
167|Two Sum II|M|two pointers
11|Container With Most Water|M|two pointers
31|Next Permutation|M|pivot + swap + reverse
## Subarray / Sliding Window
53|Maximum Subarray|M|Kadane's algorithm
121|Best Time to Buy and Sell Stock|E|greedy / Kadane
643|Maximum Average Subarray I|E|fixed sliding window
1004|Max Consecutive Ones III|M|variable sliding window
209|Minimum Size Subarray Sum|M|variable sliding window
## Hashing
1|Two Sum|E|hash map
217|Contains Duplicate|E|hash set
41|First Missing Positive|H|index marking
238|Product of Array Except Self|M|prefix product
383|Ransom Note|E|frequency map
560|Subarray Sum Equals K|M|prefix sum + hash map
169|Majority Element|E|Boyer-Moore voting
128|Longest Consecutive Sequence|M|hash set
## Rotation / Sorting
189|Rotate Array|M|triple reverse
75|Sort Colors|M|Dutch national flag
`,
  Strings: `
## General
13|Roman to Integer|E|string parsing
14|Longest Common Prefix|E|string
271|Encode and Decode Strings|M|delimiter encoding
205|Isomorphic Strings|E|bijection map
344|Reverse String|E|two pointers
## Sliding Window
3|Longest Substring Without Repeating Characters|M|sliding window + set
424|Longest Repeating Character Replacement|M|sliding window
76|Minimum Window Substring|H|sliding window + map
567|Permutation in String|M|fixed window + matches
438|Find All Anagrams in a String|M|fixed window + matches
## Anagram
242|Valid Anagram|E|frequency count
49|Group Anagrams|M|sorted key / count key
1189|Maximum Number of Balloons|E|frequency map
## Palindrome
125|Valid Palindrome|E|two pointers
680|Valid Palindrome II|M|greedy skip
5|Longest Palindromic Substring|M|expand around center
647|Palindromic Substrings|M|expand around center
`,
  Matrix: `
54|Spiral Matrix|M|simulation
59|Spiral Matrix II|M|simulation
200|Number of Islands|M|DFS / BFS on grid
73|Set Matrix Zeroes|M|in-place marking
79|Word Search|M|DFS + backtrack
240|Search a 2D Matrix II|M|staircase search
48|Rotate Image|M|transpose + reverse
74|Search a 2D Matrix|M|binary search
36|Valid Sudoku|M|hash set per row/col/box
`,
  Stack: `
20|Valid Parentheses|E|stack
150|Evaluate Reverse Polish Notation|M|stack
739|Daily Temperatures|M|monotonic stack
155|Min Stack|M|design
496|Next Greater Element I|E|monotonic stack
84|Largest Rectangle in Histogram|H|monotonic stack
85|Maximal Rectangle|H|stack on histogram
224|Basic Calculator|H|stack + sign
`,
  Queue: `
GFG|Reverse First K Elements of Queue|M|queue + stack
239|Sliding Window Maximum|H|monotonic deque
`,
  'Binary Search': `
704|Binary Search|E|classic binary search
35|Search Insert Position|E|binary search
268|Missing Number|E|math / XOR
34|Find First and Last Position|M|binary search x2
162|Find Peak Element|M|binary search
153|Find Minimum in Rotated Sorted Array|M|binary search
33|Search in Rotated Sorted Array|M|binary search
81|Search in Rotated Sorted Array II|M|binary search + duplicates
875|Koko Eating Bananas|M|search on answer
1011|Capacity to Ship Packages|M|search on answer
410|Split Array Largest Sum|H|search on answer
GFG|Allocate Minimum Pages|H|search on answer
IB|Painter's Partition Problem|H|search on answer
4|Median of Two Sorted Arrays|H|binary search on partition
`,
  'Linked List': `
83|Remove Duplicates from Sorted List|E|traversal
206|Reverse Linked List|E|iterative / recursive
141|Linked List Cycle|E|Floyd's cycle
876|Middle of the Linked List|E|slow / fast pointer
19|Remove Nth Node From End|M|two pointers
138|Copy List with Random Pointer|M|hash map
2|Add Two Numbers|M|carry simulation
202|Happy Number|E|Floyd's cycle
92|Reverse Linked List II|M|in-place reversal
234|Palindrome Linked List|E|reverse second half
143|Reorder List|M|middle + reverse + merge
21|Merge Two Sorted Lists|E|two pointers
23|Merge K Sorted Lists|H|min-heap
25|Reverse Nodes in K-Group|H|group reversal
142|Linked List Cycle II|M|Floyd's cycle start
`,
  Greedy: `
55|Jump Game|M|greedy reach
45|Jump Game II|M|greedy BFS
135|Candy|H|two-pass greedy
134|Gas Station|M|greedy circular
GFG|Minimum Platforms|M|sort + two pointers
763|Partition Labels|M|last occurrence
`,
  Intervals: `
56|Merge Intervals|M|sort + merge
57|Insert Interval|M|merge insert
253|Meeting Rooms II|M|min-heap / sweep
435|Non-Overlapping Intervals|M|greedy sort
452|Minimum Arrows to Burst Balloons|M|greedy sort
`,
  Backtracking: `
78|Subsets|M|backtracking
90|Subsets II|M|backtrack + dedup
46|Permutations|M|backtracking
77|Combinations|M|backtracking
39|Combination Sum|M|backtrack with reuse
17|Letter Combinations of a Phone Number|M|backtracking
22|Generate Parentheses|M|backtracking
51|N-Queens|H|backtrack + constraints
37|Sudoku Solver|H|backtrack + constraints
`,
  Tree: `
102|Binary Tree Level Order Traversal|M|BFS
637|Average of Levels in Binary Tree|E|BFS
103|Binary Tree Zigzag Level Order|M|BFS + deque
199|Binary Tree Right Side View|M|BFS last node
101|Symmetric Tree|E|DFS mirror
543|Diameter of Binary Tree|E|DFS height
226|Invert Binary Tree|E|DFS
104|Maximum Depth of Binary Tree|E|DFS
110|Balanced Binary Tree|E|DFS height
108|Convert Sorted Array to BST|E|divide & conquer
114|Flatten Binary Tree to Linked List|M|DFS in place
98|Validate Binary Search Tree|M|inorder / bounds
236|Lowest Common Ancestor|M|DFS
230|Kth Smallest Element in a BST|M|inorder
105|Construct Tree from Preorder + Inorder|M|divide & conquer
297|Serialize and Deserialize Binary Tree|H|BFS / DFS encode
112|Path Sum|E|DFS
113|Path Sum II|M|DFS + backtrack
129|Sum Root to Leaf Numbers|M|DFS
124|Binary Tree Maximum Path Sum|H|DFS gain
94|Binary Tree Inorder Traversal|E|iterative stack
`,
  Heap: `
1046|Last Stone Weight|E|max-heap
215|Kth Largest Element in an Array|M|min-heap of size k
347|Top K Frequent Elements|M|heap + frequency map
973|K Closest Points to Origin|M|max-heap of size k
621|Task Scheduler|M|greedy formula
295|Find Median from Data Stream|H|two heaps
`,
  Graph: `
1971|Find if Path Exists in Graph|E|union-find / BFS
994|Rotting Oranges|M|multi-source BFS
133|Clone Graph|M|DFS + hash map
207|Course Schedule|M|cycle detection DFS
210|Course Schedule II|M|Kahn's topological sort
GFG|Is Graph a Tree?|M|DFS cycle + connected
417|Pacific Atlantic Water Flow|M|reverse BFS from coasts
743|Network Delay Time|M|Dijkstra
787|Cheapest Flights Within K Stops|M|Bellman-Ford
399|Evaluate Division|M|weighted BFS
1584|Min Cost to Connect All Points|M|Prim's MST
127|Word Ladder|H|BFS shortest path
684|Redundant Connection|M|union-find
`,
  'Dynamic Programming': `
509|Fibonacci Number|E|DP base
70|Climbing Stairs|E|1D DP
746|Min Cost Climbing Stairs|E|1D DP
62|Unique Paths|E|2D DP
63|Unique Paths II|M|2D DP + obstacles
120|Triangle|M|bottom-up DP
198|House Robber|M|1D DP
213|House Robber II|M|circular DP
152|Maximum Product Subarray|M|min/max DP
300|Longest Increasing Subsequence|M|patience sort O(n log n)
91|Decode Ways|M|1D DP
322|Coin Change|M|unbounded knapsack
1143|Longest Common Subsequence|M|2D DP
72|Edit Distance|H|2D DP
GFG|Longest Common Substring|M|2D DP
139|Word Break|M|1D DP on prefixes
416|Partition Equal Subset Sum|M|0/1 knapsack
`,
  'Bit Manipulation': `
389|Find the Difference|E|XOR
191|Number of 1 Bits|E|n & (n-1)
231|Power of Two|E|n & (n-1) == 0
338|Counting Bits|E|DP + shift
371|Sum of Two Integers|M|XOR + carry
260|Single Number III|M|XOR partition
137|Single Number II|M|bit count mod 3
287|Find the Duplicate Number|M|Floyd's cycle
136|Single Number|E|XOR cancels pairs
`,
  Sorting: `
912|Bubble Sort|E|adjacent swaps
912|Insertion Sort|E|shift and insert
912|Quick Sort|M|partition, divide & conquer
912|Merge Sort|M|merge, divide & conquer
912|Heap Sort|M|binary heap
`,
  Trie: `
208|Implement Trie|M|trie design
212|Word Search II|H|trie + backtrack
`,
  Design: `
146|LRU Cache|M|hash map + doubly linked list
`,
};

const DIFF = { E: 'Easy', M: 'Medium', H: 'Hard' } as const;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parse(): CatalogCategory[] {
  return Object.entries(RAW).map(([name, body]) => {
    let group: string | undefined;
    const entries: CatalogEntry[] = [];
    for (const line of body.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('## ')) {
        group = t.slice(3);
        continue;
      }
      const [id, title, d, tag] = t.split('|');
      entries.push({
        slug: `${id.toLowerCase()}-${slugify(title)}`,
        id,
        title,
        difficulty: DIFF[d as keyof typeof DIFF],
        tag,
        category: name,
        group,
      });
    }
    return { id: slugify(name), name, entries };
  });
}

/**
 * New problems contributed by the pattern packs (src/data/packs) are appended to their category; a category that
 * does not exist yet is created at the end of the list.
 */
function withPacks(base: CatalogCategory[]): CatalogCategory[] {
  const cats = base.map((c) => ({ ...c, entries: [...c.entries] }));
  for (const pack of PACKS) {
    for (const p of pack.problems ?? []) {
      let cat = cats.find((c) => c.name === p.category);
      if (!cat) {
        cat = { id: slugify(p.category), name: p.category, entries: [] };
        cats.push(cat);
      }
      cat.entries.push({
        slug: `${p.id.toLowerCase()}-${slugify(p.title)}`,
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        tag: p.tag,
        category: p.category,
        group: p.group,
      });
    }
  }
  return cats;
}

/** Ordered like the recommended learning sequence (pack categories last). */
export const CATALOG: CatalogCategory[] = withPacks(parse());
export const ALL_ENTRIES: CatalogEntry[] = CATALOG.flatMap((c) => c.entries);
