import type { PatternPack } from './types.ts';
import type { PracticeItem } from '../patterns.ts';

/** Fragment a of pack p9: trie-prefix-tree and union-find-advanced (family "Advanced Data Structures"). Merged by p9.ts. */

const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: 'Advanced Data Structures',
      cards: [
        { slug: 'trie-prefix-tree', group: 'Advanced Data Structures', title: 'Trie (Prefix Tree)', tags: ['Prefix', 'Strings', 'Bit trie'], complexity: 'O(L) per word / O(total letters)' },
        { slug: 'union-find-advanced', group: 'Advanced Data Structures', title: 'Union-Find: Weighted & Rollback', tags: ['DSU', 'Ratios', 'Offline'], complexity: 'O(α(n)) or O(log n) / O(n)' },
      ],
    },
  ],
  content: {
    'trie-prefix-tree': {
      animation: '208-implement-trie',
      summary: 'Store many words in a tree where each edge is one letter, so words with a common beginning share a path. Every operation then costs the length of the word, not the number of stored words.',
      whenToUse: [
        'You need prefix questions: does any word start with this? what is the shortest or longest stored prefix of this word?',
        'A dictionary is queried many times, or characters are matched against many words at once (word search boards, auto-complete)',
        'Wildcards such as "." in a pattern force you to branch over children rather than hash a whole word',
        'The "letters" are bits: a trie of binary digits answers maximum-XOR and closest-number questions',
      ],
      tip: 'Decide what a node means ("the prefix spelled by the path from the root") and what the end flag means ("a word stops here"). search needs the flag; startsWith does not; shortest-root lookups stop at the first flag.',
      template: `// Trie (prefix tree): one node per prefix, one flag per stored word
class TrieNode {
    TrieNode[] next = new TrieNode[26];   // one child per letter (use a map for large alphabets)
    boolean end;                          // a stored word finishes at this node
}

static final TrieNode root = new TrieNode();

// ── Phase 1: insert — walk down, creating missing nodes, flag the last one ──
static void insert(String word) {
    TrieNode node = root;
    for (char ch : word.toCharArray()) {
        int i = ch - 'a';
        if (node.next[i] == null) node.next[i] = new TrieNode();
        node = node.next[i];
    }
    node.end = true;
}

// ── Phase 2: walk a prefix; null means "nothing stored starts with it" ──
static TrieNode walk(String s) {
    TrieNode node = root;
    for (char ch : s.toCharArray()) {
        node = node.next[ch - 'a'];
        if (node == null) return null;
    }
    return node;   // search(w): node != null && node.end    startsWith(p): node != null
}`,
      practice: [
        '208-implement-trie',
        '211-design-add-and-search-words-data-structure',
        '648-replace-words',
        '421-maximum-xor-of-two-numbers-in-an-array',
        '212-word-search-ii',
        lc('1032', 'Stream of Characters', 'Hard', 'stream-of-characters', 'trie of reversed words'),
        lc('1268', 'Search Suggestions System', 'Medium', 'search-suggestions-system', 'walk the trie as the user types'),
      ],
    },
    'union-find-advanced': {
      animation: 'cp-weighted-union-find-ratios',
      summary: 'Upgrade union-find so every link carries extra information (a ratio, a parity, a size) or can be undone. The group leader stays the anchor that everything is measured against.',
      whenToUse: [
        'Facts relate two items by a quantity (a / b = 2, "same team" / "different team") and you must answer how any two items relate',
        'Connections arrive online and you must report the component count or connectivity after every one',
        'You need to undo the latest merge, for example while searching over time or backtracking over a set of edges',
        'Equalities and inequalities must be checked together: merge on the equalities first, then test the rest',
      ],
      tip: 'Anything attached to a link must be updated whenever the link is rewritten: a path-compressing find multiplies the skipped weights, while a rollback structure skips compression so that each union changes exactly one pointer.',
      template: `// Union-find with ratios (weighted) and, below, the rollback flavour
int[] parent, size;
double[] w;                            // w[x] = value(x) / value(parent[x])
Deque<int[]> history = new ArrayDeque<>();

// ── Weighted find: compress the path and multiply the weights it skips ──
int find(int x) {
    if (parent[x] == x) return x;
    int p = parent[x];
    int root = find(p);
    w[x] *= w[p];                      // x/root = (x/p) * (p/root)
    parent[x] = root;
    return root;
}

// ── Weighted union for the fact a / b = k ──
boolean union(int a, int b, double k) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return false;        // already related
    parent[ra] = rb;
    w[ra] = k * w[b] / w[a];
    return true;
}

// ── Rollback flavour: no compression, union by size, one pop undoes one union ──
void rollback() {
    int[] h = history.pop();           // {child root, parent root}
    parent[h[0]] = h[0];
    size[h[1]] -= size[h[0]];
}`,
      practice: [
        'cp-weighted-union-find-ratios',
        '305-number-of-islands-ii',
        'cp-union-find-with-rollback',
        '399-evaluate-division',
        '684-redundant-connection',
        lc('990', 'Satisfiability of Equality Equations', 'Medium', 'satisfiability-of-equality-equations', 'merge on ==, then check !='),
        lc('721', 'Accounts Merge', 'Medium', 'accounts-merge', 'union accounts that share an email'),
        lc('947', 'Most Stones Removed with Same Row or Column', 'Medium', 'most-stones-removed-with-same-row-or-column', 'union rows with columns'),
      ],
    },
  },
  meta: {
    'trie-prefix-tree': {
      icon: '🔤', label: 'Trie',
      desc: 'A tree with one letter per edge: words sharing a beginning share a path, so lookups cost the word length and prefix questions are free.',
      useNote: 'Whenever the question is about prefixes, or many words are matched letter by letter at once, a trie replaces a hash set of whole words.',
      complexityNote: 'Each operation touches at most one node per letter. Space is bounded by the total number of letters stored, and shared prefixes are stored once.',
      highlight: ['Trie', 'prefix', 'wildcard', 'bits', 'many times'],
    },
    'union-find-advanced': {
      icon: '🧩', label: 'DSU+',
      desc: 'Union-find whose links remember something extra: a ratio to the parent, the size of a tree, or a stack entry that lets the merge be undone.',
      useNote: 'Ask what must stay true when a link is rewritten. Weights multiply during path compression; a rollback structure avoids compression altogether.',
      complexityNote: 'With path compression and union by size operations are near O(1) amortised; the rollback version is O(log n) per operation because it cannot compress. Space is O(n).',
      highlight: ['Union-Find', 'online', 'undo', 'a / b = 2', 'equalities'],
    },
  },
  examples: {
    'trie-prefix-tree': [
      { slug: '208-implement-trie', why: 'The foundation: insert with an end-of-word ring, then search versus startsWith, which differ only in whether the last node must be flagged.' },
      { slug: '648-replace-words', why: 'Prefix lookup that stops early: the first ringed node on the way down is the shortest stored root, so the walk ends before the word does.' },
      { slug: '211-design-add-and-search-words-data-structure', why: 'Patterns with "." turn the single walk into a depth-first search that fans out over every child at a wildcard and backs up from dead ends.' },
      { slug: '421-maximum-xor-of-two-numbers-in-an-array', why: 'The alphabet is just 0 and 1: a trie of bits lets each number greedily pick the opposite bit at every level to build the largest XOR.' },
      { slug: '212-word-search-ii', why: 'The trie guides a backtracking search on a board, pruning every path that is no longer a prefix of any wanted word.' },
    ],
    'union-find-advanced': [
      { slug: 'cp-weighted-union-find-ratios', why: 'Every link stores a ratio to its parent; path compression multiplies the skipped weights, so any two connected variables can be compared through their shared leader.' },
      { slug: '305-number-of-islands-ii', why: 'Connections arrive online: each new land cell adds one group and every successful union with a neighbour removes one, keeping the count current without recounting.' },
      { slug: 'cp-union-find-with-rollback', why: 'Dropping path compression and logging each union on a stack lets the latest merge be undone exactly, which offline connectivity and divide-and-conquer solutions rely on.' },
    ],
  },
  problems: [
    { id: '648', title: 'Replace Words', difficulty: 'Medium', tag: 'trie prefix lookup', category: 'Trie' },
    { id: '211', title: 'Design Add and Search Words Data Structure', difficulty: 'Medium', tag: 'trie + wildcard DFS', category: 'Trie' },
    { id: '421', title: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium', tag: 'bit trie', category: 'Trie' },
    { id: 'CP', title: 'Weighted Union-Find Ratios', difficulty: 'Medium', tag: 'weighted union-find', category: 'Graph' },
    { id: '305', title: 'Number of Islands II', difficulty: 'Hard', tag: 'online union-find', category: 'Graph' },
    { id: 'CP', title: 'Union-Find with Rollback', difficulty: 'Hard', tag: 'DSU rollback', category: 'Graph' },
  ],
};
