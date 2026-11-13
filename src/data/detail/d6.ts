import type { PracticeItem } from '../patterns.ts';
import type { DetailMap } from './types.ts';

// Batch d6 — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const d6: DetailMap = {
  'trie-prefix-tree': {
    tags: ['Prefix', 'Strings', 'Bit trie', 'Autocomplete'],
    content: {
      whenToUse: [
        'Questions about **prefixes**: does any stored word start with this string, what is the shortest or longest stored prefix of a word, how many words share it. One walk down the tree answers each in the length of the query, however many words are stored.',
        'A **dictionary is queried many times**, or many words are matched letter by letter at once, as in autocomplete, search suggestions or a stream of characters. A hash set of whole words cannot share work between words that begin alike; a trie stores every common prefix once.',
        'The pattern contains **wildcards** such as ".", or a board search must stop as soon as the current path is no prefix of any wanted word. The trie lets you fan out over children, or prune a branch, at exactly the letter where it fails.',
        'The "letters" are **bits**: insert every number as a 32-step path of 0s and 1s, then walk each number against the opposite bit at every level to build the **maximum XOR** or to find the closest value without comparing all pairs.',
        'You need to **replace or compress by root**: swap each word for its shortest dictionary root, count distinct prefixes, or find the longest common prefix of many strings. The first node flagged as a word end on the walk is the answer, so the loop can stop early.',
      ],
      tip: 'Fix what a node means (the prefix spelled by its path) and what the end flag means (a word stops here). search needs the flag, startsWith does not; shortest-root lookups stop at the first flag.',
      practice: [
        '208-implement-trie',
        '648-replace-words',
        '211-design-add-and-search-words-data-structure',
        '421-maximum-xor-of-two-numbers-in-an-array',
        '212-word-search-ii',
        { slug: '1032-stream-of-characters', note: 'trie of reversed words' },
        lc('1268', 'Search Suggestions System', 'Medium', 'search-suggestions-system', 'walk the trie as the user types'),
        lc('677', 'Map Sum Pairs', 'Medium', 'map-sum-pairs', 'store a running sum per prefix node'),
      ],
    },
    meta: {
      useNote: 'Whenever the question is about prefixes, or many words are matched letter by letter at once, a trie replaces a hash set of whole words.',
      complexityNote: 'Insert, search and startsWith touch one node per letter, so the cost is O(L) for a word of length L, whatever the number of stored words. Space is at most the letters inserted, since shared prefixes are stored once.',
      highlight: ['Trie', 'prefixes', 'dictionary is queried many times', 'wildcards', 'bits', 'maximum XOR', 'replace or compress by root'],
    },
  },

  'segment-tree': {
    tags: ['Range sum / min', 'Lazy propagation', 'Point update', 'Range update'],
    content: {
      whenToUse: [
        'Many **range queries (sum, min, max, gcd) on an array that also changes** between queries. A prefix-sum array breaks, because one update would rebuild O(n) totals, while the tree repairs a single root-to-leaf path in O(log n).',
        'A whole range must change at once: **add v to every item, assign a value or flip a block**. Fully covered nodes keep a **lazy tag** and push it down only when a later operation has to look inside, so range updates stay logarithmic too.',
        'The combine step is **associative with a neutral element**: sum with 0, min with infinity, max with minus infinity, gcd with 0, xor with 0. If you cannot name both the merge and what a disjoint range returns, the tree will not fit the problem.',
        'You need the answer for an **arbitrary [left, right]** where subtraction is unavailable. A minimum cannot be undone, so prefix tricks and Fenwick trees fail, while the tree stitches together O(log n) ready-made pieces whatever the range.',
        'The range structure hides in **values or time**: heights of falling squares, overlapping calendar bookings, or a longest increasing subsequence limited to a value window. Index the tree by value or timestamp and let each node hold the best answer so far.',
      ],
      tip: 'Decide three things first: what a node stores, how two children combine, and what a disjoint range returns (0 for sum, infinity for min). Allocate 4n slots for an array-backed tree.',
      practice: [
        '307-range-sum-query-mutable',
        { slug: 'cp-range-minimum-query-segment-tree', note: 'same tree, min instead of sum' },
        { slug: 'cp-range-add-range-sum-lazy-propagation', note: 'range add needs lazy tags' },
        { slug: '315-count-of-smaller-numbers-after-self', note: 'tree over value ranks; Fenwick also works' },
        lc('699', 'Falling Squares', 'Hard', 'falling-squares', 'range max query + range assign'),
        lc('732', 'My Calendar III', 'Hard', 'my-calendar-iii', 'range add, global max'),
        lc('2407', 'Longest Increasing Subsequence II', 'Hard', 'longest-increasing-subsequence-ii', 'max over a value window'),
        lc('2569', 'Handling Sum Queries After Update', 'Hard', 'handling-sum-queries-after-update', 'range flip with a lazy tag'),
      ],
    },
    meta: {
      useNote: 'Think "node = range": the root is [0, n-1], children are the two halves. Ask what each node stores and what a disjoint range returns.',
      complexityNote: 'The tree has log n levels and a query leaves at most two partly overlapping nodes per level, so each query or update visits O(log n) nodes. Building is O(n); the array holds up to 4n numbers.',
      highlight: ['Segment tree', 'range queries', 'lazy tag', 'associative with a neutral element', 'arbitrary [left, right]', 'values or time'],
    },
  },

  'fenwick-tree': {
    tags: ['Prefix sums with updates', 'Counting inversions', 'Lowbit', 'Rank compression'],
    content: {
      whenToUse: [
        'You need **prefix sums while elements change**: add to one position, then ask for the sum of the first i items. A range sum is a difference of two prefixes, so both operations cost O(log n) with one extra array.',
        'A counting problem asks **how many earlier or later items are smaller or larger**: smaller numbers after self, inversions, reverse pairs, good triplets. Compress the values to ranks, then each item is one prefix count followed by one point insert.',
        'A segment tree would work, but you want **less code and a smaller constant**. The whole structure is one array and two short loops: i += i & -i walks up to update, and i -= i & -i walks down to query.',
        'The operation has an **inverse**: sum, count and xor allow a range as prefix(r) minus prefix(l-1). If the merge is min or max, old values cannot be subtracted out and the trick fails, so use a segment tree instead.',
        'Values are **large, negative or sparse**, or all positions are known offline: sort and compress them to ranks 1..m first, so the tree has exactly m slots. The same bit walk can also find the k-th smallest stored item by descending the tree.',
      ],
      tip: 'Keep the tree 1-indexed. A query moves down with i -= i & -i, an update moves up with i += i & -i. Compress large or negative values to ranks 1..m before building.',
      practice: [
        'alg-fenwick-tree-binary-indexed-tree',
        '315-count-of-smaller-numbers-after-self',
        { slug: 'cp-count-inversions-with-a-fenwick-tree', note: 'count earlier larger items' },
        { slug: '307-range-sum-query-mutable', note: 'same problem as a Fenwick tree' },
        lc('493', 'Reverse Pairs', 'Hard', 'reverse-pairs', 'count with a doubled threshold'),
        lc('327', 'Count of Range Sum', 'Hard', 'count-of-range-sum', 'prefix sums + rank counting'),
        lc('1649', 'Create Sorted Array through Instructions', 'Hard', 'create-sorted-array-through-instructions', 'min(smaller, larger) per insert'),
        lc('2179', 'Count Good Triplets in an Array', 'Hard', 'count-good-triplets-in-an-array', 'count smaller on the left, larger on the right'),
      ],
    },
    meta: {
      useNote: 'Query goes down by clearing the lowest bit, update goes up by adding it. Counting problems become prefix counts over ranks.',
      complexityNote: 'Each walk clears or carries one set bit of the index per step, so it takes at most log2(n)+1 steps. The build is O(n) by passing each slot to its parent, and the only extra storage is n numbers.',
      highlight: ['Fenwick', 'prefix sums while elements change', 'how many earlier or later items', 'less code', 'inverse', 'large, negative or sparse'],
    },
  },

  'sqrt-decomposition': {
    tags: ['Blocks', 'Range queries', 'Lazy tags', 'Offline'],
    content: {
      whenToUse: [
        'Range queries are mixed with **point or range updates**, so prefix sums break because the data changes, and a segment tree would be heavy to write or hard to adapt to the summary your problem needs.',
        'The block summary is easy to maintain but **hard to subtract**: a count table per block for "how many x in [l, r]", a mode, or a sorted copy of the block for "how many values below t". A prefix array cannot hold any of these.',
        '**O(√n) per operation is fast enough**, for example n and q around 10^5, and the plain three-loop structure (left ragged block, whole blocks, right ragged block) matters more than shaving the time to O(log n).',
        'Updates apply to **whole ranges** and each block can postpone them with a lazy tag: fully covered blocks only change a tag and a stored sum, while the two ragged ends are rewritten element by element.',
        'Queries are **offline or batched**, so they can be reordered (Mo\'s algorithm) or a block can be rebuilt now and then, for example every √q operations. Blocks give a natural boundary for rebuilding, with no pointer-heavy tree to maintain.',
      ],
      tip: 'Decide what a block remembers (sum, tag, counts) and what a ragged end must read. Then every operation is the same three loops: left partial block, whole blocks, right partial block.',
      practice: [
        'alg-sqrt-decomposition-range-sum-with-updates',
        '2080-range-frequency-queries',
        { slug: 'cp-range-add-and-range-sum-with-blocks', note: 'lazy tag per block' },
        { slug: '307-range-sum-query-mutable', note: 'blocks, Fenwick or segment tree' },
        lc('303', 'Range Sum Query - Immutable', 'Easy', 'range-sum-query-immutable', 'prefix sums: the static special case'),
        lc('1157', 'Online Majority Element In Subarray', 'Hard', 'online-majority-element-in-subarray', 'candidate lookup per block'),
        lc('2569', 'Handling Sum Queries After Update', 'Hard', 'handling-sum-queries-after-update', 'block with a flip tag'),
      ],
    },
    meta: {
      useNote: 'A block summary turns B elements into one number. Choose B ≈ √n so that scanning the ends and walking the blocks cost about the same.',
      complexityNote: 'A range covers at most two partial blocks of up to B-1 elements and at most n/B whole blocks, so a query reads about 2B + n/B values, smallest at B = √n. The summaries need only O(n/B) extra space.',
      highlight: ['Sqrt Decomposition', 'point or range updates', 'hard to subtract', 'O(√n) per operation', 'whole ranges', 'offline or batched'],
    },
  },

  'persistent-structures': {
    tags: ['Versions', 'Path copying', 'Time travel', 'Snapshots'],
    content: {
      whenToUse: [
        'You must **query an earlier state**: the value at version k, the array as of snapshot id s, the price at timestamp t. Each update keeps a new root, so any old version is read exactly like the latest one.',
        'A range question reduces to a **difference of two prefixes**: the k-th smallest in a range, or how many values in [x, y] lie within positions [l, r]. Build one version per prefix and subtract the two trees while walking down.',
        'You need **undo, branching histories or snapshots**: restore any earlier state in O(1) by keeping its root, or fork two different futures from one version without copying either of them, which makes rollback and what-if branches cheap.',
        '**Copying the whole structure** for each version would cost O(n) time and memory per update. Path copying creates only the O(log n) nodes on one root-to-leaf path and shares every other node between all the versions.',
        'The problem is **offline and sweeps over time or position** while asking about the past: process the items in order, store a root after each, and answer queries afterwards by choosing the right one or two roots.',
      ],
      tip: 'Path copying rule: a new node is the old node with exactly one child pointer replaced. Ask which pointers change, and reuse every other pointer as it is.',
      practice: [
        '1146-snapshot-array',
        'cp-persistent-segment-tree-version-array',
        { slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree', note: 'difference of two prefix versions' },
        lc('981', 'Time Based Key-Value Store', 'Medium', 'time-based-key-value-store', 'versions per key + binary search'),
        lc('2034', 'Stock Price Fluctuation', 'Medium', 'stock-price-fluctuation', 'timestamped history, latest and extremes'),
        lc('1472', 'Design Browser History', 'Medium', 'design-browser-history', 'a history you can walk back and forth'),
        lc('2276', 'Count Integers in Intervals', 'Hard', 'count-integers-in-intervals', 'dynamic tree; compare with persistence'),
      ],
    },
    meta: {
      useNote: 'Only the nodes on the path to the changed position are new. Everything else is shared, so old roots keep describing the old data.',
      complexityNote: 'Each update allocates one new node per level, O(log n), so q updates cost O(n + q log n) memory. Reading any version costs O(log n) like a normal tree, because its root is a normal tree.',
      highlight: ['Persistent', 'query an earlier state', 'difference of two prefixes', 'undo, branching histories or snapshots', 'Copying the whole structure', 'offline and sweeps'],
    },
  },

  'suffix-structures': {
    tags: ['Strings', 'Suffix array', 'LCP', 'Substrings'],
    content: {
      whenToUse: [
        'You must **search many patterns in one fixed text**: sort the suffixes once, then each pattern of length m is found with two binary searches (lower and upper bound) in O(m log n) instead of rescanning the whole text every time.',
        'The question is about **repeated or distinct substrings**: the longest repeated substring (largest LCP value), the number of distinct substrings (n(n+1)/2 minus the sum of LCP), or the longest common substring of two strings joined by a separator.',
        'Substrings must be compared **lexicographically**: the k-th smallest substring, the smallest rotation, or the best place to cut a string. The sorted suffix order already is that order, so the answer is a position in the array.',
        'A **suffix trie would have O(n²) nodes**. The suffix array keeps only n start positions plus an LCP array, and the minimum over a range of LCP values gives the common prefix length of any two suffixes in that range.',
        'Hashing with binary search almost works but needs a collision argument. The suffix array gives **exact, deterministic answers** for longest duplicate substring and similar tasks, and it extends to several strings at once by joining them with a separator character.',
      ],
      tip: 'Every substring is a prefix of some suffix, and equal substrings sit next to each other once suffixes are sorted. The LCP array measures what neighbours share; its range minimum gives any pair.',
      practice: [
        'cp-suffix-array-and-lcp-array',
        'cp-count-distinct-substrings-suffix-trie',
        { slug: 'cp-pattern-search-with-a-suffix-array', note: 'lower and upper bound over sorted suffixes' },
        lc('1044', 'Longest Duplicate Substring', 'Hard', 'longest-duplicate-substring', 'max LCP, or binary search + rolling hash'),
        lc('718', 'Maximum Length of Repeated Subarray', 'Medium', 'maximum-length-of-repeated-subarray', 'longest common substring of two arrays'),
        lc('1698', 'Number of Distinct Substrings in a String', 'Medium', 'number-of-distinct-substrings-in-a-string', 'n(n+1)/2 minus the sum of LCP'),
        lc('28', 'Find the Index of the First Occurrence in a String', 'Easy', 'find-the-index-of-the-first-occurrence-in-a-string', 'single pattern; compare with KMP'),
        lc('1923', 'Longest Common Subpath', 'Hard', 'longest-common-subpath', 'suffix array over several paths'),
      ],
    },
    meta: {
      useNote: 'Think "every substring is a prefix of a suffix". Sorting the suffixes lines up equal substrings, and the LCP array tells you how long each shared run is.',
      complexityNote: 'The sorted order costs O(n log n) with prefix doubling (O(n² log n) for the naive sort shown here). Kasai builds the LCP array in O(n), and a pattern of length m is then found in O(m log n).',
      highlight: ['Suffix Array', 'search many patterns in one fixed text', 'repeated or distinct substrings', 'lexicographically', 'suffix trie would have O(n²) nodes', 'exact, deterministic answers'],
    },
  },

  'aho-corasick': {
    tags: ['Multi-pattern', 'Trie', 'Failure links', 'Streaming'],
    content: {
      whenToUse: [
        'You must find **many keywords at once** in one text, and running KMP once per keyword would multiply the cost by the number of keywords. One scan with failure links finds them all in O(text length + matches).',
        'Letters arrive as a **stream** and after each letter you must say whether some keyword just ended. Keep a single automaton state, move it with one transition per letter, and read a precomputed "a word ends here" flag.',
        'You must **censor, highlight or count a dictionary of words**, overlaps included: bold-tag problems, banned-word filters, or counting the occurrences of every word in a document in a single pass over it, with each overlapping match reported separately.',
        'A **DP over text positions** has to know which dictionary words end at each position: forbidden substrings, strings that avoid every pattern, the shortest string containing all words. The automaton states become the DP states.',
        'The keywords **share prefixes and suffixes**, which is where a plain trie wastes work. After a mismatch the failure link jumps to the longest suffix that is still a keyword prefix, so the text pointer never moves backwards.',
      ],
      tip: 'Compute failure links in BFS order: fail[v] comes from the parent\'s failure chain, which is shallower and already finished. To report matches, walk the failure chain or precompute a link to the next word end.',
      practice: [
        'cp-aho-corasick-build-failure-links',
        { slug: 'cp-multi-keyword-search-aho-corasick', note: 'scan a text for every keyword in one pass' },
        '1032-stream-of-characters',
        { slug: '212-word-search-ii', note: 'many words in a trie; Aho-Corasick adds the failure links' },
        lc('1408', 'String Matching in an Array', 'Easy', 'string-matching-in-an-array', 'small version: which words occur inside others'),
        lc('616', 'Add Bold Tag in String', 'Medium', 'add-bold-tag-in-string', 'mark every dictionary occurrence, merge overlaps'),
        lc('2781', 'Length of the Longest Valid Substring', 'Hard', 'length-of-the-longest-valid-substring', 'forbidden words ending at each position'),
      ],
    },
    meta: {
      useNote: 'When the next letter does not fit, do not restart: jump along the failure link to the longest suffix that is still a keyword prefix.',
      complexityNote: 'Building costs O(total keyword letters). Scanning costs O(text length + number of matches), because every fallback along a failure link is paid for by an earlier step forward, so the text pointer never moves back.',
      highlight: ['many keywords at once', 'stream', 'censor, highlight or count a dictionary of words', 'DP over text positions', 'failure link', 'share prefixes and suffixes'],
    },
  },

  'convex-hull': {
    tags: ['Geometry', 'Cross product', 'Monotone chain', 'Rotating calipers'],
    content: {
      whenToUse: [
        'You need the **outer boundary of a set of points**: a fence around trees, a perimeter, or the smallest convex region that holds everything. Sort once, sweep with a stack, and every point inside the boundary is discarded along the way.',
        'The question asks for the **farthest pair, minimum bounding box or largest triangle**. The optimum always sits on hull corners, so build the hull first and search only its corners; rotating calipers walks them in linear time.',
        'Everything depends on **turn direction**: the sign of a cross product says left, right or straight. Reuse it for orientation, for collinearity (Max Points on a Line, straight-line checks) and for deciding whether two segments cross.',
        'You must decide what to do with **collinear boundary points**. Erect the Fence keeps points lying exactly on the fence (pop only when cross < 0), while strict hull problems drop them (pop when cross <= 0).',
        'The input has **many points but few hull corners**: Jarvis march wraps around in O(n·h) and beats sorting when h is small, while Graham scan and the monotone chain guarantee O(n log n) for any input.',
      ],
      tip: 'Everything is cross(o, a, b): positive is a left turn, negative a right turn, zero collinear. Decide first whether collinear boundary points stay (pop when < 0) or go (pop when <= 0).',
      practice: [
        '587-erect-the-fence',
        'cp-graham-scan-convex-hull',
        { slug: 'cp-jarvis-march-gift-wrapping', note: 'output-sensitive: O(n·h)' },
        { slug: 'cp-rotating-calipers-polygon-diameter', note: 'farthest pair from the hull' },
        lc('149', 'Max Points on a Line', 'Hard', 'max-points-on-a-line', 'cross product = 0 means collinear'),
        lc('812', 'Largest Triangle Area', 'Easy', 'largest-triangle-area', 'the best triangle uses hull corners'),
        lc('1232', 'Check If It Is a Straight Line', 'Easy', 'check-if-it-is-a-straight-line', 'one cross product per point'),
        lc('963', 'Minimum Area Rectangle II', 'Medium', 'minimum-area-rectangle-ii', 'orientation and right angles from vectors'),
      ],
    },
    meta: {
      useNote: 'Sorting once makes the hull a single sweep. Pop whenever the last three points do not turn left, and decide how to treat straight points before coding.',
      complexityNote: 'Sorting costs O(n log n) and dominates, because each point is pushed and popped at most once per sweep. Jarvis march skips sorting and costs O(n·h) for h hull corners, which wins when h is small. Space is O(n).',
      highlight: ['Convex Hull', 'outer boundary of a set of points', 'farthest pair, minimum bounding box or largest triangle', 'turn direction', 'collinear boundary points', 'many points but few hull corners'],
    },
  },
};
