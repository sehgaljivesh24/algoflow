import type { PatternPack } from './types.ts';

const lc = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard', slug: string, note?: string) => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

const FAMILY = 'Advanced Data Structures';

/** Fragment d of pack p9: suffix structures + Aho-Corasick. Merged by p9.ts. */
export const frag: Pick<PatternPack, 'groups' | 'content' | 'meta' | 'examples' | 'problems'> = {
  groups: [
    {
      name: FAMILY,
      cards: [
        { slug: 'suffix-structures', group: FAMILY, title: 'Suffix Array & LCP', tags: ['Strings', 'Suffix array', 'LCP'], complexity: 'O(n log n) build, O(m log n) search / O(n)' },
        { slug: 'aho-corasick', group: FAMILY, title: 'Aho-Corasick Automaton', tags: ['Multi-pattern', 'Trie', 'Failure links'], complexity: 'O(L + text + matches) / O(L)' },
      ],
    },
  ],

  problems: [
    { id: 'CP', title: 'Suffix Array and LCP Array', difficulty: 'Hard', tag: 'suffix array', category: FAMILY, group: 'Suffix structures' },
    { id: 'CP', title: 'Count Distinct Substrings (Suffix Trie)', difficulty: 'Medium', tag: 'suffix trie', category: FAMILY, group: 'Suffix structures' },
    { id: 'CP', title: 'Pattern Search with a Suffix Array', difficulty: 'Medium', tag: 'suffix array + binary search', category: FAMILY, group: 'Suffix structures' },
    { id: 'CP', title: 'Aho-Corasick: Build Failure Links', difficulty: 'Hard', tag: 'trie + failure links (BFS)', category: FAMILY, group: 'Aho-Corasick' },
    { id: 'CP', title: 'Multi-Keyword Search (Aho-Corasick)', difficulty: 'Hard', tag: 'Aho-Corasick search', category: FAMILY, group: 'Aho-Corasick' },
    { id: '1032', title: 'Stream of Characters', difficulty: 'Hard', tag: 'Aho-Corasick automaton', category: 'Trie' },
  ],

  content: {
    'suffix-structures': {
      animation: 'cp-suffix-array-and-lcp-array',
      summary: 'List every suffix of a string, sort them, and keep only their start positions (the suffix array) plus the common-prefix length of neighbours (the LCP array). Almost every substring question becomes a question about this sorted table.',
      whenToUse: [
        'You must search many patterns in one fixed text, and a binary search over sorted suffixes beats rescanning the text',
        'The question is about repeated or distinct substrings: longest repeated substring, number of distinct substrings, longest common substring of two strings',
        'Substrings of one string must be compared lexicographically, such as the k-th smallest substring or the smallest rotation',
        'A suffix trie would have O(n²) nodes, but a sorted array of n start positions is enough',
      ],
      tip: 'Every substring is a prefix of some suffix, and equal substrings sit next to each other once the suffixes are sorted. The LCP array measures exactly how much two neighbours share, and the minimum over a range of it gives the LCP of any two suffixes in that range.',
      template: `// Suffix array by sorting (simple version) + LCP array by Kasai's algorithm.
static int[] buildSuffixArray(String s) {
    int n = s.length();
    Integer[] sa = new Integer[n];
    for (int i = 0; i < n; i++) sa[i] = i;                 // suffix i starts at index i
    Arrays.sort(sa, (a, b) -> s.substring(a).compareTo(s.substring(b)));
    int[] out = new int[n];
    for (int i = 0; i < n; i++) out[i] = sa[i];
    return out;                                            // O(n^2 log n) here; doubling gives O(n log n)
}

// lcp[r] = common prefix length of the suffixes at ranks r-1 and r
static int[] buildLcp(String s, int[] sa) {
    int n = s.length(), h = 0;
    int[] rank = new int[n], lcp = new int[n];
    for (int i = 0; i < n; i++) rank[sa[i]] = i;           // inverse permutation
    for (int i = 0; i < n; i++) {
        if (rank[i] > 0) {
            int j = sa[rank[i] - 1];                       // predecessor in sorted order
            while (i + h < n && j + h < n && s.charAt(i + h) == s.charAt(j + h)) h++;
            lcp[rank[i]] = h;
            if (h > 0) h--;                                // Kasai: dropping one letter loses at most one
        } else h = 0;
    }
    return lcp;
}
// distinct substrings = n(n+1)/2 - sum(lcp);  longest repeated substring = max(lcp)`,
      practice: [
        'cp-count-distinct-substrings-suffix-trie',
        { slug: 'cp-pattern-search-with-a-suffix-array', note: 'lower and upper bound over sorted suffixes' },
        lc('1044', 'Longest Duplicate Substring', 'Hard', 'longest-duplicate-substring', 'max LCP, or binary search + rolling hash'),
        lc('28', 'Find the Index of the First Occurrence in a String', 'Easy', 'find-the-index-of-the-first-occurrence-in-a-string', 'single pattern; compare with KMP'),
        lc('1923', 'Longest Common Subpath', 'Hard', 'longest-common-subpath', 'suffix array over several paths'),
      ],
    },
    'aho-corasick': {
      animation: 'cp-aho-corasick-build-failure-links',
      summary: 'Put all keywords into one trie and give every state a failure link: where to continue when the next letter does not fit. The text is then scanned once, with no backtracking, and every keyword occurrence is reported.',
      whenToUse: [
        'You must find many keywords at once in a text, and running KMP once per keyword would multiply the cost by the number of keywords',
        'Letters arrive as a stream and after each letter you must say whether some keyword just ended',
        'You need to censor, highlight or count occurrences of a dictionary of words, overlaps included',
        'A DP over text positions must be told, at every position, which dictionary words end there',
      ],
      tip: 'Compute failure links in BFS order: fail[v] comes from the parent\'s failure chain, which is always shallower and already finished. To report matches, walk a state\'s failure chain (or precompute a dictionary link to the next state that ends a word).',
      template: `// Aho-Corasick: trie + failure links (BFS) + one-pass search. Lowercase words.
static final class AhoCorasick {
    final int[][] next = new int[512][26];   // trie edges, 0 = none
    final int[] fail = new int[512];
    final int[] wordLen = new int[512];      // length of the word ending at this state
    int states = 1;

    AhoCorasick(String[] words) {
        for (String w : words) {
            int cur = 0;
            for (char ch : w.toCharArray()) {
                int c = ch - 'a';
                if (next[cur][c] == 0) next[cur][c] = states++;
                cur = next[cur][c];
            }
            wordLen[cur] = w.length();
        }
        Deque<Integer> queue = new ArrayDeque<>();
        for (int c = 0; c < 26; c++) if (next[0][c] != 0) queue.add(next[0][c]);   // depth 1: fail = root
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int c = 0; c < 26; c++) {
                int v = next[u][c];
                if (v == 0) continue;
                int f = fail[u];
                while (f != 0 && next[f][c] == 0) f = fail[f];   // climb the failure chain
                if (next[f][c] != 0) fail[v] = next[f][c];
                queue.add(v);
            }
        }
    }
}`,
      practice: [
        { slug: 'cp-multi-keyword-search-aho-corasick', note: 'scan a text for every keyword in one pass' },
        '1032-stream-of-characters',
        { slug: '212-word-search-ii', note: 'many words in a trie; Aho-Corasick adds the failure links' },
        lc('1408', 'String Matching in an Array', 'Easy', 'string-matching-in-an-array', 'small version: which words occur inside others'),
        lc('2781', 'Length of the Longest Valid Substring', 'Hard', 'length-of-the-longest-valid-substring', 'forbidden words ending at each position'),
      ],
    },
  },

  meta: {
    'suffix-structures': {
      icon: '🧬', label: 'Suffix array',
      desc: 'Sort all suffixes once, then answer substring questions with binary search and neighbour comparisons.',
      useNote: 'Think "every substring is a prefix of a suffix". Sorting the suffixes lines up equal substrings, and the LCP array tells you how long each shared run is.',
      complexityNote: 'The sorted order costs O(n log n) with prefix doubling (O(n² log n) for the naive sort shown here). Kasai builds the LCP array in O(n); a pattern of length m is found in O(m log n).',
      highlight: ['Suffix Array', 'repeated or distinct substrings', 'sorted suffixes', 'lexicographically', 'O(n²) nodes'],
    },
    'aho-corasick': {
      icon: '🕸️', label: 'Aho-Corasick',
      desc: 'A trie with fallback arrows: the whole text is scanned once, however many keywords you look for.',
      useNote: 'When the next letter does not fit, do not restart: jump along the failure link to the longest suffix that is still a keyword prefix.',
      complexityNote: 'Building costs O(total keyword letters); scanning costs O(text length + number of matches), because every fallback is paid for by an earlier step forward.',
      highlight: ['many keywords at once', 'stream', 'failure link', 'overlaps included', 'dictionary'],
    },
  },

  examples: {
    'suffix-structures': [
      { slug: 'cp-suffix-array-and-lcp-array', why: 'Builds both arrays from scratch: the sorted suffix table first, then Kasai\'s trick of reusing the previous match length for each neighbour comparison.' },
      { slug: 'cp-count-distinct-substrings-suffix-trie', why: 'Shows what the array replaces: a suffix trie whose non-root nodes are the distinct substrings, checked against n(n+1)/2 minus the LCP sum.' },
      { slug: 'cp-pattern-search-with-a-suffix-array', why: 'Uses the sorted table as a search index: two binary searches (lower and upper bound) isolate the block of suffixes that start with the pattern.' },
    ],
    'aho-corasick': [
      { slug: 'cp-aho-corasick-build-failure-links', why: 'Constructs the automaton: a trie of the words, then a BFS where each failure link is found by climbing the parent\'s failure chain.' },
      { slug: 'cp-multi-keyword-search-aho-corasick', why: 'Runs the finished automaton over a text, falling back along failure links on a mismatch and reporting every word on the failure chain at each position.' },
      { slug: '1032-stream-of-characters', why: 'The streaming variant: the same automaton with an inherited "a word ends here" flag, so every query is one transition plus one flag read.' },
    ],
  },
};
