import type { PatternPack } from './types.ts';
import type { PracticeItem } from '../patterns.ts';

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

/** Pack p8 — bits, math, linear sorts, string algorithms and counting techniques. */
export const pack: PatternPack = {
  id: 'p8',
  problems: [
    // bits
    { id: '1310', title: 'XOR Queries of a Subarray', difficulty: 'Medium', tag: 'prefix XOR', category: 'Bit Manipulation' },
    { id: '477', title: 'Total Hamming Distance', difficulty: 'Medium', tag: 'count ones per bit column', category: 'Bit Manipulation' },
    { id: '2275', title: 'Largest Combination With Bitwise AND Greater Than Zero', difficulty: 'Medium', tag: 'max ones per bit column', category: 'Bit Manipulation' },
    // math
    { id: '204', title: 'Count Primes', difficulty: 'Medium', tag: 'sieve of Eratosthenes', category: 'Math' },
    { id: '50', title: 'Pow(x, n)', difficulty: 'Medium', tag: 'fast exponentiation', category: 'Math' },
    { id: 'ALG', title: "Euclid's GCD and LCM", difficulty: 'Easy', tag: 'Euclid, remainders', category: 'Math' },
    // linear sorts
    { id: '912', title: 'Counting Sort', difficulty: 'Medium', tag: 'count, no comparisons', category: 'Sorting' },
    { id: '912', title: 'Radix Sort', difficulty: 'Medium', tag: 'digit buckets, LSD', category: 'Sorting' },
    { id: '164', title: 'Maximum Gap', difficulty: 'Medium', tag: 'bucket sort, pigeonhole', category: 'Sorting' },
    // KMP
    { id: '28', title: 'Find the Index of the First Occurrence in a String', difficulty: 'Easy', tag: 'KMP failure table', category: 'Strings', group: 'String matching' },
    { id: '1392', title: 'Longest Happy Prefix', difficulty: 'Hard', tag: 'KMP lps = longest border', category: 'Strings', group: 'String matching' },
    { id: '459', title: 'Repeated Substring Pattern', difficulty: 'Easy', tag: 'KMP period = n − lps', category: 'Strings', group: 'String matching' },
    // Z algorithm
    { id: 'ALG', title: 'Z-Algorithm Pattern Search', difficulty: 'Medium', tag: 'Z-array on pattern#text', category: 'Strings', group: 'String matching' },
    { id: '2223', title: 'Sum of Scores of Built Strings', difficulty: 'Hard', tag: 'Z-function sum', category: 'Strings', group: 'String matching' },
    { id: 'ALG', title: 'All Periods of a String', difficulty: 'Medium', tag: 'Z-array: z[p] = n − p', category: 'Strings', group: 'String matching' },
    // rolling hash
    { id: 'ALG', title: 'Rabin-Karp Substring Search', difficulty: 'Medium', tag: 'rolling hash + verify', category: 'Strings', group: 'String matching' },
    { id: '187', title: 'Repeated DNA Sequences', difficulty: 'Medium', tag: 'rolling hash (2 bits / base)', category: 'Strings', group: 'String matching' },
    { id: '1044', title: 'Longest Duplicate Substring', difficulty: 'Hard', tag: 'binary search + rolling hash', category: 'Strings', group: 'String matching' },
    // Manacher
    { id: 'ALG', title: "Manacher's Algorithm", difficulty: 'Hard', tag: 'palindrome radii in O(n)', category: 'Strings', group: 'Palindromes' },
    { id: 'CP', title: 'Palindromic Substrings via Manacher', difficulty: 'Medium', tag: 'Manacher radii, counting', category: 'Strings', group: 'Palindromes' },
    { id: '214', title: 'Shortest Palindrome', difficulty: 'Hard', tag: 'Manacher: longest palindromic prefix', category: 'Strings', group: 'Palindromes' },
    // coordinate compression
    { id: '1331', title: 'Rank Transform of an Array', difficulty: 'Easy', tag: 'coordinate compression (dense ranks)', category: 'Arrays', group: 'Coordinate compression' },
    { id: '506', title: 'Relative Ranks', difficulty: 'Easy', tag: 'rank by sorting indexes', category: 'Arrays', group: 'Coordinate compression' },
    { id: 'CP', title: 'Maximum Overlap of Wide Intervals', difficulty: 'Medium', tag: 'compress endpoints + difference sweep', category: 'Intervals' },
    // meet in the middle
    { id: '1755', title: 'Closest Subsequence Sum', difficulty: 'Hard', tag: 'meet in the middle + two pointers', category: 'Arrays', group: 'Meet in the middle' },
    { id: '2035', title: 'Partition Array Into Two Arrays to Minimize Sum Difference', difficulty: 'Hard', tag: 'meet in the middle by subset size', category: 'Arrays', group: 'Meet in the middle' },
    { id: '454', title: '4Sum II', difficulty: 'Medium', tag: 'meet in the middle + hash map', category: 'Arrays', group: 'Meet in the middle' },
  ],
  examples: {
    'bits-xor': [
      { slug: '260-single-number-iii', why: 'Two values survive the XOR, so a single differing bit is used to split the array into two groups, each of which cancels down to one answer.' },
      { slug: '136-single-number', why: 'The purest form: every pair cancels, so one XOR pass over the array leaves the lone value with no extra memory.' },
      { slug: '1310-xor-queries-of-a-subarray', why: 'XOR as a prefix operation: because x ^ x = 0, prefix[r+1] ^ prefix[l] isolates any range, exactly like prefix sums but with cancellation.' },
    ],
    'bits-counting': [
      { slug: '191-number-of-1-bits', why: 'n & (n - 1) removes the lowest set bit, so a loop runs once per set bit instead of once per bit position.' },
      { slug: '231-power-of-two', why: 'The same trick as a single test: a positive number is a power of two exactly when clearing its lowest set bit leaves zero.' },
      { slug: '338-counting-bits', why: 'Counting bits for every number up to n: each answer is built from an earlier one (bits of i = bits of i >> 1 plus the last bit), a small DP over bits.' },
    ],
    'bits-modulo': [
      { slug: '137-single-number-ii', why: 'Each of the 32 bit columns is counted modulo 3, so the triples vanish and the lone value\'s bits remain.' },
      { slug: '477-total-hamming-distance', why: 'Columns again, but the question changes: instead of a remainder, each column contributes ones × zeros differing pairs, turning an O(n²) pair loop into O(32·n).' },
      { slug: '2275-largest-combination-with-bitwise-and-greater-than-zero', why: 'The column count is used as a maximum: a subset has a non-zero AND exactly when it shares a column, so the busiest column is the answer.' },
    ],
    'math-number-theory': [
      { slug: '204-count-primes', why: 'The sieve: instead of testing each number for divisors, cross off the multiples of every prime up to the square root and keep whatever survives.' },
      { slug: '50-pow-x-n', why: 'Fast exponentiation: reading the exponent in binary lets repeated squaring replace n multiplications with about log n, the same idea that powers modular exponentiation.' },
      { slug: 'alg-euclids-gcd-and-lcm', why: 'Euclid\'s remainder rule shrinks a pair of numbers geometrically, and the lcm drops out of gcd × lcm = a × b: number theory as an invariant, not a search.' },
    ],
    'sorting-linear': [
      { slug: '912-counting-sort', why: 'The base case: when values come from a small range, count them in an array indexed by value and read the counts back in order, with no comparisons at all.' },
      { slug: '912-radix-sort', why: 'Large numbers are sorted digit by digit with a stable bucket pass for each digit, so the counting idea scales to wide ranges.' },
      { slug: '164-maximum-gap', why: 'Buckets used as a pigeonhole argument: only each bucket\'s min and max matter, because the biggest gap must cross a bucket boundary.' },
    ],
    'string-kmp': [
      { slug: '28-find-the-index-of-the-first-occurrence-in-a-string', why: 'The full algorithm: build the failure table, then scan the text without ever moving the text pointer backwards.' },
      { slug: '1392-longest-happy-prefix', why: 'The failure table by itself is the answer: its last entry is the longest border (prefix that is also a suffix).' },
      { slug: '459-repeated-substring-pattern', why: 'The border length turns into a period (n minus the border), which answers a structural question about the string, not a search.' },
    ],
    'string-z-algorithm': [
      { slug: 'alg-z-algorithm-pattern-search', why: 'Glue pattern + "#" + text and read matches straight from the Z array, while the Z-box lets every index reuse earlier comparisons.' },
      { slug: '2223-sum-of-scores-of-built-strings', why: 'The Z array itself is the quantity asked for: each suffix\'s longest common prefix with the string, summed.' },
      { slug: 'alg-all-periods-of-a-string', why: 'A structural property read off Z: p is a period exactly when z[p] reaches the end of the string.' },
    ],
    'string-rolling-hash': [
      { slug: 'alg-rabin-karp-substring-search', why: 'Plain Rabin-Karp: a window hash updated in O(1), with a character check on every hash hit so collisions (shown here) can never cause a wrong answer.' },
      { slug: '187-repeated-dna-sequences', why: 'A tiny alphabet packs into bits, so the window hash is exact (no collisions) and a set of integers replaces a set of substrings.' },
      { slug: '1044-longest-duplicate-substring', why: 'Hashing as the inner test of a binary search on the answer: each candidate length is checked in one linear pass, with verification on every hit.' },
    ],
    'string-manacher': [
      { slug: 'alg-manachers-algorithm', why: 'The core algorithm: radii for every centre in the "#"-interleaved string, mirrored inside the rightmost palindrome so nothing is compared twice.' },
      { slug: 'cp-palindromic-substrings-via-manacher', why: 'The radii read as counts: every centre holds ⌈p/2⌉ palindromes, so the total comes straight from the array.' },
      { slug: '214-shortest-palindrome', why: 'The radii answer a prefix question: a palindrome that touches the start of the string is a palindromic prefix, and the longest one decides what to prepend.' },
    ],
    'coordinate-compression': [
      { slug: '1331-rank-transform-of-an-array', why: 'The basic move: sort the distinct values and replace each by its position, keeping order and discarding magnitude.' },
      { slug: '506-relative-ranks', why: 'Compression with identity: sort indexes instead of values so each rank can be written back to the element it came from.' },
      { slug: 'cp-maximum-overlap-of-wide-intervals', why: 'Compression as a tool for sweeps: only endpoints matter, so a difference array over their ranks replaces an impossible array over raw coordinates up to 10⁹.' },
    ],
    'meet-in-the-middle': [
      { slug: '1755-closest-subsequence-sum', why: 'The classic split: enumerate each half\'s subset sums (2^(n/2) each), sort, and merge with two pointers.' },
      { slug: '2035-partition-array-into-two-arrays-to-minimize-sum-difference', why: 'The merge needs an extra constraint: subsets are grouped by size so that the two halves together contribute exactly n elements.' },
      { slug: '454-4sum-ii', why: 'Meeting in the middle with a hash map instead of sorting: count all a + b sums once and look up −(c + d) for each pair.' },
    ],
  },
  groups: [
    { name: 'Math', cards: [{ slug: 'math-number-theory', group: 'Math', title: 'Number Theory (Sieve, GCD, Fast Power)', tags: ['Sieve', 'GCD / LCM', 'Fast exponentiation'], complexity: 'O(n log log n), O(log n)' }] },
    { name: 'Sorting', cards: [{ slug: 'sorting-linear', group: 'Sorting', title: 'Linear-Time Sorting (Counting / Radix / Bucket)', tags: ['Counting sort', 'Radix sort', 'Buckets'], complexity: 'O(n + k), O(d·(n + b))' }] },
    {
      name: 'Strings',
      cards: [
        { slug: 'string-kmp', group: 'Strings', title: 'KMP (Failure Function)', tags: ['Pattern matching', 'Border / lps', 'Period'], complexity: 'O(n + m)' },
        { slug: 'string-z-algorithm', group: 'Strings', title: 'Z-Algorithm', tags: ['Z-array', 'Pattern search', 'Prefix match'], complexity: 'O(n + m)' },
        { slug: 'string-rolling-hash', group: 'Strings', title: 'Rolling Hash (Rabin-Karp)', tags: ['Hashing', 'Substring search', 'Duplicates'], complexity: 'O(n) expected' },
        { slug: 'string-manacher', group: 'Strings', title: "Manacher's Algorithm", tags: ['Palindromes', 'Radius array'], complexity: 'O(n)' },
      ],
    },
    {
      name: 'Techniques',
      cards: [
        { slug: 'coordinate-compression', group: 'Techniques', title: 'Coordinate Compression', tags: ['Ranks', 'Sweep', 'Offline'], complexity: 'O(n log n)' },
        { slug: 'meet-in-the-middle', group: 'Techniques', title: 'Meet in the Middle', tags: ['Subset sums', 'Two halves', 'Two pointers'], complexity: 'O(2^(n/2))' },
      ],
    },
  ],
  content: {
    'math-number-theory': {
      animation: '204-count-primes',
      summary: 'Replace brute-force divisibility tests by number-theoretic facts: cross off multiples to find primes, reduce pairs with the remainder rule, and square repeatedly to raise to huge powers.',
      whenToUse: [
        'You need all primes up to n, or a prime count, and n is up to a few million',
        'The task asks for a gcd, an lcm, or to simplify a fraction or a ratio',
        'A power x^n with a huge n (or a modulus, as in a^n mod m) must be computed quickly',
        'A brute force repeats a divisibility or multiplication test that a mathematical identity could short-cut',
      ],
      tip: 'Check the sizes first. A sieve needs O(n) memory so it suits n up to about 10^7; for a single big number use trial division up to its square root. For powers, multiply modulo m at every step so values never overflow.',
      template: `// ── Sieve of Eratosthenes: all primes below n ──
static boolean[] sieve(int n) {
    boolean[] composite = new boolean[n];                 // composite[0], composite[1] ignored
    for (long p = 2; p * p < n; p++) {
        if (composite[(int) p]) continue;                 // p was crossed off, so it is not prime
        for (long m = p * p; m < n; m += p)               // smaller multiples were crossed earlier
            composite[(int) m] = true;
    }
    return composite;                                     // i >= 2 is prime iff !composite[i]; O(n log log n)
}

// ── Euclid: gcd and lcm ──
static long gcd(long a, long b) {
    while (b != 0) { long r = a % b; a = b; b = r; }      // gcd(a, b) = gcd(b, a mod b)
    return a;
}
static long lcm(long a, long b) { return a / gcd(a, b) * b; }

// ── Fast exponentiation (square-and-multiply), optionally modulo m ──
static long power(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) result = result * base % mod; // this bit of the exponent is set
        base = base * base % mod;                          // base becomes x^(2^(i+1))
        exp >>= 1;
    }
    return result;                                         // O(log exp)
}`,
      practice: [
        '204-count-primes',
        '50-pow-x-n',
        'alg-euclids-gcd-and-lcm',
        lc('1071', 'Greatest Common Divisor of Strings', 'Easy', 'greatest-common-divisor-of-strings', 'gcd of the lengths'),
        lc('172', 'Factorial Trailing Zeroes', 'Medium', 'factorial-trailing-zeroes', 'count factors of 5'),
        lc('118', "Pascal's Triangle", 'Easy', 'pascals-triangle', 'binomial coefficients by addition'),
      ],
    },
    'sorting-linear': {
      animation: '912-counting-sort',
      summary: 'When keys are small integers (or can be split into small digits) you can sort by indexing instead of comparing. Counting, radix and bucket sorts beat the n log n comparison bound.',
      whenToUse: [
        'The values lie in a small known range such as 0..k with k about n, or are digits and characters',
        'The numbers are bounded but wide (up to 10^9): sort digit by digit with a stable pass per digit',
        'The question is about neighbouring values in sorted order (maximum gap, closest pair) and you want O(n) instead of O(n log n)',
        'A stable ordering is needed, so that equal keys keep their original order',
      ],
      tip: 'Stability is what makes radix sort work: every pass must keep equal digits in their previous order. Counting sort is stable if you place elements from right to left using prefix sums of the counts.',
      template: `// ── Counting sort for values in [0, k) ──
static int[] countingSort(int[] a, int k) {
    int[] count = new int[k];
    for (int x : a) count[x]++;                          // phase 1: histogram
    int[] out = new int[a.length];
    int pos = 0;
    for (int v = 0; v < k; v++)                          // phase 2: read the histogram in order
        while (count[v]-- > 0) out[pos++] = v;
    return out;                                          // O(n + k)
}

// ── Stable counting pass on one decimal digit (building block of radix sort) ──
static void passByDigit(int[] a, int exp) {
    int[] count = new int[10], out = new int[a.length];
    for (int x : a) count[(x / exp) % 10]++;
    for (int d = 1; d < 10; d++) count[d] += count[d - 1];   // prefix sums = end positions
    for (int i = a.length - 1; i >= 0; i--)                  // right to left keeps it stable
        out[--count[(a[i] / exp) % 10]] = a[i];
    System.arraycopy(out, 0, a, 0, a.length);
}
static void radixSort(int[] a, int max) {
    for (int exp = 1; max / exp > 0; exp *= 10) passByDigit(a, exp);   // O(d * (n + 10))
}`,
      practice: [
        '912-counting-sort',
        '912-radix-sort',
        '164-maximum-gap',
        '75-sort-colors',
        lc('1122', 'Relative Sort Array', 'Easy', 'relative-sort-array', 'counting sort over a bounded range'),
      ],
    },
    'string-kmp': {
      animation: '28-find-the-index-of-the-first-occurrence-in-a-string',
      summary: 'Precompute, for every prefix of the pattern, the length of its longest proper prefix that is also a suffix (the border). After a mismatch that table tells how much of the pattern is still valid, so the text is scanned exactly once.',
      whenToUse: [
        'You must find one or all occurrences of a pattern in a long text in linear time',
        'The question is about borders: a prefix that is also a suffix, or the shortest repeating block (period)',
        'Naive matching would restart from scratch after every mismatch and degrade to O(n·m)',
        'You can build a "pattern + separator + text" string and read a single array',
      ],
      tip: 'The two loops are the same shape: the table is built by matching the pattern against itself. Remember the fallback rule len = lps[len - 1] and never move the text pointer backwards.',
      template: `// lps[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it
static int[] buildLps(String p) {
    int m = p.length();
    int[] lps = new int[m];
    for (int i = 1, len = 0; i < m; ) {
        if (p.charAt(i) == p.charAt(len)) {
            lps[i++] = ++len;                            // the border grows by one
        } else if (len > 0) {
            len = lps[len - 1];                          // retry with the next shorter border
        } else {
            lps[i++] = 0;                                // no border ends here
        }
    }
    return lps;
}

// first occurrence of p in text, or -1
static int kmpSearch(String text, String p) {
    int[] lps = buildLps(p);
    for (int i = 0, j = 0; i < text.length(); ) {
        if (text.charAt(i) == p.charAt(j)) {
            i++; j++;
            if (j == p.length()) return i - j;           // full match
        } else if (j > 0) {
            j = lps[j - 1];                              // keep i, shorten the match
        } else {
            i++;
        }
    }
    return -1;                                           // O(n + m)
}`,
      practice: [
        '28-find-the-index-of-the-first-occurrence-in-a-string',
        '1392-longest-happy-prefix',
        '459-repeated-substring-pattern',
        lc('686', 'Repeated String Match', 'Medium', 'repeated-string-match', 'KMP on the repeated text'),
        lc('796', 'Rotate String', 'Easy', 'rotate-string', 'search goal inside s + s'),
      ],
    },
    'string-z-algorithm': {
      animation: 'alg-z-algorithm-pattern-search',
      summary: 'z[i] is the length of the longest common prefix between the string and its suffix starting at i. A window ("Z-box") that is known to copy the prefix lets every index start from an earlier answer.',
      whenToUse: [
        'You want, for every position, how much of the string\'s beginning matches there',
        'Pattern search where one array is easier to reason about than the KMP failure table',
        'Periods, borders and "prefix equals suffix" questions, answered with z[p] + p = n',
        'Counting or summing prefix matches over all suffixes',
      ],
      tip: 'To search, run Z on pattern + a separator that occurs nowhere else + text: z[i] equals the pattern length exactly at the occurrences. Always use a separator or the matches could run across the join.',
      template: `// z[i] = length of the longest common prefix of s and s.substring(i); z[0] = n
static int[] zFunction(String s) {
    int n = s.length();
    int[] z = new int[n];
    z[0] = n;
    for (int i = 1, l = 0, r = 0; i < n; i++) {          // [l, r) = rightmost window equal to a prefix
        if (i < r) z[i] = Math.min(r - i, z[i - l]);     // reuse the mirrored value inside the box
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;   // extend past the edge
        if (i + z[i] > r) { l = i; r = i + z[i]; }       // r only ever moves right
    }
    return z;                                            // O(n)
}

// all occurrences of pat in text
static List<Integer> search(String text, String pat) {
    String s = pat + "#" + text;                         // separator that appears in neither string
    int[] z = zFunction(s);
    List<Integer> hits = new ArrayList<>();
    for (int i = pat.length() + 1; i < s.length(); i++)
        if (z[i] == pat.length()) hits.add(i - pat.length() - 1);
    return hits;
}`,
      practice: [
        'alg-z-algorithm-pattern-search',
        '2223-sum-of-scores-of-built-strings',
        'alg-all-periods-of-a-string',
        { slug: '28-find-the-index-of-the-first-occurrence-in-a-string', note: 'solve it again with the Z array' },
        '459-repeated-substring-pattern',
      ],
    },
    'string-rolling-hash': {
      animation: 'alg-rabin-karp-substring-search',
      summary: 'Turn every window of a string into a number that can be updated in O(1) as the window slides. Equal numbers are candidates, equal strings always give equal numbers, so mismatches are rejected without reading characters.',
      whenToUse: [
        'You compare many substrings (windows) of the same length against a pattern or against each other',
        'Finding repeated substrings or duplicates where storing every substring would be too large',
        'A binary search on the length needs a fast "does a duplicate of length L exist?" test',
        'The alphabet is small enough to pack into bits, giving an exact hash with no collisions',
      ],
      tip: 'A hash hit is only a candidate: verify the characters (or use two moduli) unless the hash is exact. Remove the leading character with its weight base^(m-1) before shifting, and keep results non-negative after subtraction.',
      template: `// Rabin-Karp: all start indexes where pat occurs in text
static List<Integer> rabinKarp(String text, String pat) {
    final long B = 131, M = 1_000_000_007L;
    int n = text.length(), m = pat.length();
    List<Integer> hits = new ArrayList<>();
    if (m > n) return hits;
    long pow = 1, hp = 0, hw = 0;
    for (int i = 0; i < m - 1; i++) pow = pow * B % M;        // B^(m-1)
    for (int i = 0; i < m; i++) {
        hp = (hp * B + pat.charAt(i)) % M;                     // pattern hash
        hw = (hw * B + text.charAt(i)) % M;                    // first window hash
    }
    for (int i = 0; i + m <= n; i++) {
        if (hw == hp && text.startsWith(pat, i)) hits.add(i);  // verify: hashes can collide
        if (i + m < n) {
            hw = (hw - text.charAt(i) * pow % M + M) % M;      // drop the leading character
            hw = (hw * B + text.charAt(i + m)) % M;            // shift and add the new one
        }
    }
    return hits;                                               // O(n + m) expected
}`,
      practice: [
        'alg-rabin-karp-substring-search',
        '187-repeated-dna-sequences',
        '1044-longest-duplicate-substring',
        lc('686', 'Repeated String Match', 'Medium', 'repeated-string-match', 'compare window hashes of the repeated text'),
        lc('718', 'Maximum Length of Repeated Subarray', 'Medium', 'maximum-length-of-repeated-subarray', 'binary search on length + rolling hash'),
      ],
    },
    'string-manacher': {
      animation: 'alg-manachers-algorithm',
      summary: 'Compute the radius of the longest palindrome around every centre in linear time, reusing the radii of mirrored positions inside the palindrome that reaches furthest to the right.',
      whenToUse: [
        'You need the longest palindromic substring in O(n), or its length for every centre',
        'Counting palindromic substrings of a long string where O(n²) expansion is too slow',
        'A question is about palindromes touching a boundary, such as the longest palindromic prefix or suffix',
        'You want odd and even length palindromes handled by one piece of code',
      ],
      tip: 'Interleave a separator ("#") between characters so that every palindrome is odd and has a centre. A radius in the interleaved string equals the palindrome length in the original; its start is (centre - radius) / 2.',
      template: `// p[i] = radius of the longest palindrome centred at t[i]  (= its length in s)
static int[] manacher(String s) {
    String t = "#" + String.join("#", s.split("")) + "#";   // every palindrome gets a centre
    int N = t.length();
    int[] p = new int[N];
    int c = 0, r = 0;                                       // rightmost palindrome: centre c, edge r = c + p[c]
    for (int i = 0; i < N; i++) {
        if (i < r) p[i] = Math.min(r - i, p[2 * c - i]);    // mirror inside the box
        while (i - p[i] - 1 >= 0 && i + p[i] + 1 < N
                && t.charAt(i - p[i] - 1) == t.charAt(i + p[i] + 1)) p[i]++;   // extend by comparing
        if (i + p[i] > r) { c = i; r = i + p[i]; }          // r only moves right: O(n) in total
    }
    return p;
}
// longest palindrome: best = argmax p[i]; substring is s[(best - p[best]) / 2, (best + p[best]) / 2)
// count of palindromic substrings: sum over i of (p[i] + 1) / 2`,
      practice: [
        'alg-manachers-algorithm',
        'cp-palindromic-substrings-via-manacher',
        '214-shortest-palindrome',
        { slug: '5-longest-palindromic-substring', note: 'expand around centres first, then Manacher' },
        { slug: '647-palindromic-substrings', note: 'count with Manacher radii' },
        lc('132', 'Palindrome Partitioning II', 'Hard', 'palindrome-partitioning-ii', 'palindrome table in O(n²) or radii'),
      ],
    },
    'coordinate-compression': {
      animation: '1331-rank-transform-of-an-array',
      summary: 'Replace large or sparse values by their rank among the distinct values. Order survives, magnitude disappears, so arrays, counters and sweeps can be indexed by rank.',
      whenToUse: [
        'Values go up to 10^9 but there are only n of them, and you want an array or Fenwick tree indexed by value',
        'Only the relative order of the values matters, not how far apart they are',
        'A sweep line over intervals or events: only endpoints change the answer',
        'Offline queries where all inputs are known in advance and can be sorted first',
      ],
      tip: 'Sort the distinct values once, then use a map or binary search to turn a value into its index. Decide whether ranks start at 0 or 1 and whether equal values share a rank before you write the code.',
      template: `// Build the compressed coordinates of an array
static int[] compress(int[] a) {
    int[] sorted = Arrays.stream(a).distinct().sorted().toArray();   // the compressed axis
    int[] rank = new int[a.length];
    for (int i = 0; i < a.length; i++)
        rank[i] = Arrays.binarySearch(sorted, a[i]);                  // 0-based dense rank; O(log n)
    return rank;                                                      // O(n log n) overall
}

// Sweep over intervals [start, end] with huge coordinates: maximum overlap
static int maxOverlap(int[][] iv) {
    TreeSet<Long> pts = new TreeSet<>();
    for (int[] a : iv) { pts.add((long) a[0]); pts.add((long) a[1] + 1); }   // only these points matter
    Map<Long, Integer> idx = new HashMap<>();
    for (long x : pts) idx.put(x, idx.size());
    int[] delta = new int[pts.size()];
    for (int[] a : iv) { delta[idx.get((long) a[0])]++; delta[idx.get((long) a[1] + 1)]--; }
    int cur = 0, best = 0;
    for (int d : delta) best = Math.max(best, cur += d);                      // running sum over ranks
    return best;
}`,
      practice: [
        '1331-rank-transform-of-an-array',
        '506-relative-ranks',
        'cp-maximum-overlap-of-wide-intervals',
        lc('315', 'Count of Smaller Numbers After Self', 'Hard', 'count-of-smaller-numbers-after-self', 'compress, then count with a Fenwick tree'),
        { slug: '253-meeting-rooms-ii', note: 'sweep over start and end events' },
      ],
    },
    'meet-in-the-middle': {
      animation: '1755-closest-subsequence-sum',
      summary: 'Split the input into two halves, enumerate each half on its own (2^(n/2) instead of 2^n), and combine the two lists with sorting and two pointers or with a hash map.',
      whenToUse: [
        'n is about 30 to 40: 2^n is too large but 2^(n/2) is easy',
        'The problem asks for a subset or choice whose total hits (or gets close to) a target',
        'A solution is naturally the sum or concatenation of one choice from each half',
        'Dynamic programming over values fails because the values or the target are huge',
      ],
      tip: 'Decide how the halves are combined before enumerating: sort + two pointers for "closest to a target", a hash map for "exactly equal", and group by subset size when the total count of chosen items is fixed.',
      template: `// Closest subset sum to goal, n up to ~40
static int closest(int[] nums, int goal) {
    int h = nums.length / 2;
    int[] L = subsetSums(nums, 0, h), R = subsetSums(nums, h, nums.length);
    Arrays.sort(L);
    Arrays.sort(R);
    int best = Integer.MAX_VALUE;
    int i = 0, j = R.length - 1;                          // smallest left sum, largest right sum
    while (i < L.length && j >= 0) {
        int s = L[i] + R[j];
        best = Math.min(best, Math.abs(s - goal));
        if (s < goal) i++;                                // need more: larger left value
        else if (s > goal) j--;                           // need less: smaller right value
        else return 0;
    }
    return best;                                          // O(2^(n/2) * n)
}

static int[] subsetSums(int[] a, int lo, int hi) {
    int k = hi - lo;
    int[] out = new int[1 << k];
    for (int mask = 0; mask < (1 << k); mask++)
        for (int b = 0; b < k; b++)
            if ((mask >> b & 1) == 1) out[mask] += a[lo + b];   // every subset of the half
    return out;
}`,
      practice: [
        '1755-closest-subsequence-sum',
        '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
        '454-4sum-ii',
        lc('805', 'Split Array With Same Average', 'Hard', 'split-array-with-same-average', 'subset sums of two halves'),
        { slug: '416-partition-equal-subset-sum', note: 'DP when the sums are small; halves when they are huge' },
      ],
    },
  },
  meta: {
    'math-number-theory': {
      icon: '➗', label: 'Number theory',
      desc: 'Cross off multiples to find primes, shrink pairs with remainders, and square repeatedly to reach huge powers in logarithmic time.',
      useNote: 'Pick the tool by size: a sieve for many primes up to about 10^7, Euclid for gcd and lcm, square-and-multiply when the exponent is large.',
      complexityNote: 'The sieve touches each composite once per small prime (n log log n). Euclid and fast power need a logarithmic number of steps.',
      highlight: ['Sieve', 'gcd', 'lcm', 'x^n', 'prime', 'divisibility'],
    },
    'sorting-linear': {
      icon: '🧺', label: 'Linear sorts',
      desc: 'Count, bucket or distribute by digit instead of comparing. With small keys these sorts run in time proportional to the data.',
      useNote: 'Counting sort needs a small value range; radix sort handles wider numbers one stable digit pass at a time; buckets turn neighbour questions into min/max bookkeeping.',
      complexityNote: 'Counting: O(n + k) time and O(k) space. Radix: O(d·(n + base)) for d digits. Bucket tricks such as maximum gap are O(n).',
      highlight: ['small known range', 'digit by digit', 'stable', 'maximum gap', 'sorted order', 'bounded but wide'],
    },
    'string-kmp': {
      icon: '🔎', label: 'KMP',
      desc: 'A failure table records the longest border of every pattern prefix, so a mismatch never forces the text pointer back.',
      useNote: 'The table is built by matching the pattern against itself. A border is a prefix that is also a suffix; n minus the last border is the string\'s period.',
      complexityNote: 'Both the table and the scan only move forward with amortised constant fallbacks, so the total is O(n + m).',
      highlight: ['pattern', 'linear time', 'borders', 'prefix that is also a suffix', 'period', 'mismatch'],
    },
    'string-z-algorithm': {
      icon: '🅉', label: 'Z-array',
      desc: 'For every position, how long does the text starting here agree with the beginning of the string? A Z-box makes the whole array linear.',
      useNote: 'Search by running Z on pattern + separator + text. Periods, borders and prefix-match sums read directly from the array.',
      complexityNote: 'The right edge r of the Z-box only moves forward, so all character comparisons together are O(n).',
      highlight: ['Z-box', 'Z array', 'prefix', 'Pattern search', 'periods', 'separator'],
    },
    'string-rolling-hash': {
      icon: '#️⃣', label: 'Rolling hash',
      desc: 'Hash every window so that sliding it by one character is a constant-time update, then compare numbers instead of strings.',
      useNote: 'Equal strings always hash equally, so a mismatch is conclusive; a match must be verified unless the encoding is exact.',
      complexityNote: 'O(1) per window gives O(n + m) expected time; adversarial collisions can degrade it to O(n·m) without verification safeguards.',
      highlight: ['window', 'rolling hash', 'collisions', 'repeated substrings', 'binary search', 'pattern'],
    },
    'string-manacher': {
      icon: '🪞', label: 'Manacher',
      desc: 'Palindrome radii for every centre in one pass: inside the biggest palindrome so far, a position inherits the radius of its mirror image.',
      useNote: 'Insert "#" between letters so odd and even palindromes share one loop; radius in the new string equals length in the old one.',
      complexityNote: 'The rightmost edge r only increases, so total extension work is O(n); memory is the radius array of size 2n + 1.',
      highlight: ['longest palindromic substring', 'palindromic', 'radius', 'every centre', 'mirror', 'palindromic prefix'],
    },
    'coordinate-compression': {
      icon: '🗜️', label: 'Compression',
      desc: 'Keep only the order of the values: replace them by ranks 0…k−1 so huge or sparse coordinates fit in small arrays.',
      useNote: 'Sort the distinct values, map value → rank, and run the sweep, count or tree over ranks. Remember to include end + 1 for closed intervals.',
      complexityNote: 'Sorting dominates at O(n log n); afterwards every operation works on at most n distinct coordinates.',
      highlight: ['rank', 'relative order', 'sweep line', 'offline queries', 'only endpoints', 'values go up to 10^9'],
    },
    'meet-in-the-middle': {
      icon: '🤝', label: 'Meet in middle',
      desc: 'Split the input in half, enumerate each half independently, and join the two small lists instead of searching the huge product.',
      useNote: 'Combine with two pointers after sorting (closest to a target) or a hash map (exact match). Group by subset size when counts are fixed.',
      complexityNote: 'Each half has 2^(n/2) states. Sorting them adds a factor of n, and the merge is linear in the list sizes.',
      highlight: ['two halves', 'subset', '2^(n/2)', 'target', 'n is about 30 to 40', 'huge'],
    },
  },
};
