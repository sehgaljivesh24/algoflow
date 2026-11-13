import type { DetailMap } from './types.ts';
import type { PracticeItem } from '../patterns.ts';

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

// Batch d7 — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.
export const d7: DetailMap = {
  /* ------------------------------------------------------------------ bits */
  'bits-xor': {
    tags: ['XOR cancels', 'Single number', 'Prefix XOR', 'O(1) space'],
    content: {
      summary: 'XOR cancels equal values (a ^ a = 0, a ^ 0 = a) and is its own inverse. Folding an array leaves whatever appears an odd number of times, and prefix XORs turn range queries into a single operation.',
      whenToUse: [
        'Every value appears **twice except one** (or two) and the statement forbids a hash map or sorting: fold the whole array with ^, the pairs cancel, and the odd one survives in **O(1) extra space**. This is Single Number and its relatives.',
        'You must find the **missing or duplicated number** in a range 0..n or 1..n: XOR all indices together with all values, so every number that is present cancels and the absent one remains, with none of the overflow risk of the sum trick.',
        'After folding, **two unknown values** a and b remain as a ^ b: isolate a set bit with x & -x, split the array into two groups by that bit, and each group folds down to one answer, exactly as in Single Number III.',
        'A question asks for the **XOR of a range** or subarray, many times over: build a prefix XOR array so any range is prefix[r+1] ^ prefix[l], the same cancellation that subtraction performs for prefix sums.',
        'You need to **toggle, flip or swap** without extra storage, or to spot the one changed element between two near-identical lists, such as the extra letter in a shuffled string, by XOR-ing both sides together; a ^ k ^ k = a also undoes any XOR mask.',
      ],
      tip: 'For two unknown singles, XOR everything to get a ^ b, isolate one set bit with x & -x, and split the array by that bit. Each group is then a plain Single Number problem.',
      practice: [
        lc('1486', 'XOR Operation in an Array', 'Easy', 'xor-operation-in-an-array', 'fold with ^'),
        '136-single-number',
        '268-missing-number',
        { slug: '389-find-the-difference', note: 'XOR both strings together' },
        lc('1720', 'Decode XORed Array', 'Easy', 'decode-xored-array', 'XOR undoes XOR'),
        '260-single-number-iii',
        '1310-xor-queries-of-a-subarray',
        { slug: '421-maximum-xor-of-two-numbers-in-an-array', note: 'decide the answer bit by bit' },
      ],
    },
    meta: {
      useNote: 'If the XOR leaves two values instead of one, they differ in at least one bit: split the numbers by that bit and fold each group separately.',
      complexityNote: 'One pass folds n numbers into a few integers, so time is O(n) and space O(1). A prefix XOR array costs O(n) memory but answers each range query in O(1), because x ^ x = 0 cancels the shared prefix.',
      highlight: ['twice except one', 'O(1) extra space', 'missing or duplicated number', 'two unknown values', 'XOR of a range', 'toggle, flip or swap'],
    },
  },

  'bits-counting': {
    tags: ['Popcount', 'n & (n - 1)', 'Power of two', 'Bit DP'],
    content: {
      summary: 'Treat integers as rows of bits and use shifts and masks to count them or test properties. n & (n - 1) clears the lowest set bit in one operation, so loops run once per 1 instead of once per bit position.',
      whenToUse: [
        'You need the **population count** (the number of 1 bits, or Hamming weight) of a number: loop with n &= n - 1 and count the iterations, so the work follows the number of set bits instead of all 32 positions.',
        'A question asks whether a number is a **power of two** (or of four): a positive n is a power of two exactly when n & (n - 1) == 0, because clearing its single set bit leaves zero, a one-line test with no loop.',
        'You need the bit count of **every number from 0 to n**: build each answer from a smaller one with bits[i] = bits[i >> 1] + (i & 1), a tiny dynamic program over bits that fills the array in O(n) with no popcount call per number.',
        'The statement compares numbers by **how many bits differ** (Hamming distance) or sorts by popcount: XOR the two numbers so differing bits become ones, then count them with the same n & (n - 1) loop.',
        'Arithmetic is **forbidden or must be emulated**: add two integers using XOR for the sum without carry and AND shifted left for the carry, repeating until the carry is zero. Shifts and masks also read, set, clear and toggle a single bit.',
      ],
      tip: 'Loop with n &= n - 1 and count iterations: it runs once per set bit. If you shift instead, use >>> in Java, because >> keeps the sign bit and never ends on negatives.',
      practice: [
        '191-number-of-1-bits',
        '231-power-of-two',
        '338-counting-bits',
        lc('461', 'Hamming Distance', 'Easy', 'hamming-distance', 'popcount of a ^ b'),
        lc('342', 'Power of Four', 'Easy', 'power-of-four', 'one set bit, at an even position'),
        lc('190', 'Reverse Bits', 'Easy', 'reverse-bits', 'shift one bit at a time'),
        lc('1356', 'Sort Integers by The Number of 1 Bits', 'Easy', 'sort-integers-by-the-number-of-1-bits', 'popcount as the sort key'),
        '371-sum-of-two-integers',
      ],
    },
    meta: {
      useNote: 'Loop with n &= n - 1 and count the iterations: one per set bit. When shifting, use >>> in Java so negatives terminate.',
      complexityNote: 'The n & (n - 1) loop runs once per set bit, at most 32 or 64 times, so one count is effectively constant time, O(1) space. Counting every number up to n by reuse is O(n) time and space.',
      highlight: ['population count', 'power of two', 'every number from 0 to n', 'how many bits differ', 'forbidden or must be emulated'],
    },
  },

  'bits-modulo': {
    tags: ['Bit columns', 'Count mod k', 'Hamming distance', 'O(1) space'],
    content: {
      summary: 'Count how many numbers have a 1 in each bit position. Values repeated k times add multiples of k to every column, so the column count mod k is the lone number\'s bit; the same columns also count differing pairs.',
      whenToUse: [
        'Every element appears **exactly k times except one**, and k is odd or larger than two so XOR alone cannot cancel the repeats: count the ones in each of the 32 bit columns, take the count modulo k, and the remainders rebuild the loner.',
        'You want **constant extra space** and a single linear pass where a frequency map is not allowed: 32 per-column counters (or the two-variable ones/twos state machine) replace a hash map holding up to n entries.',
        'A problem sums a quantity over **all pairs of numbers**, such as total Hamming distance: examine each bit column on its own, where it contributes ones × zeros differing pairs, turning an O(n²) pair loop into O(32n).',
        'You must pick the largest subset whose **bitwise AND is non-zero**: a subset survives only if all its members share a set bit, so the answer is the largest number of ones found in any single bit column.',
        'The structure is **bits are independent**: OR, AND or addition-without-carry over a whole array, or "how many numbers have bit b set". Count per column, derive each answer bit from its own counter, and combine the bits at the end.',
      ],
      tip: 'Build the answer in a 32-bit int: if bit 31 comes out set Java reads a negative automatically, while Python needs a manual conversion. The ones/twos state machine gives the same result in one pass.',
      practice: [
        '137-single-number-ii',
        '477-total-hamming-distance',
        '2275-largest-combination-with-bitwise-and-greater-than-zero',
        lc('2917', 'Find the K-or of an Array', 'Easy', 'find-the-k-or-of-an-array', 'a bit is set when at least k numbers have it'),
        '136-single-number',
        lc('201', 'Bitwise AND of Numbers Range', 'Medium', 'bitwise-and-of-numbers-range', 'the common prefix survives, the rest is zero'),
        { slug: '421-maximum-xor-of-two-numbers-in-an-array', note: 'decide the answer bit by bit' },
      ],
    },
    meta: {
      useNote: 'Count the ones in each of the 32 columns and use the count mod k (or ones × zeros for pairs) to decide that bit. Build the result in a 32-bit int so a set sign bit becomes negative.',
      complexityNote: 'There are 32 independent bit columns and each costs one scan of the n numbers, so time is O(32·n) = O(n) with a fixed handful of counters, hence O(1) space. A narrower value range shrinks the constant.',
      highlight: ['exactly k times except one', 'constant extra space', 'all pairs of numbers', 'bitwise AND is non-zero', 'bits are independent'],
    },
  },

  /* ------------------------------------------------------------------ randomized */
  'reservoir-sampling': {
    tags: ['Streaming', 'Uniform random', 'k / n probability', 'O(k) memory'],
    content: {
      whenToUse: [
        'Data arrives as a **stream or a linked list of unknown length** and you can afford neither a second pass nor storing everything: keep one candidate and replace it when a random draw hits, exactly the Linked List Random Node trick.',
        'You must choose **k items uniformly at random** using only O(k) memory: fill the reservoir with the first k items, then let the n-th item overwrite a random slot with probability k / n, which keeps every item equally likely.',
        'Only elements that satisfy a **condition or target** may be picked, as in Random Pick Index: count matches while scanning and ignore everything else, so non-matching elements never disturb the odds and the counter tracks matches only.',
        'The prompt asks for a **uniform random pick** and says that storing the data is impossible or wasteful, or that its length is unknown when the process starts. That phrasing is the signature of reservoir sampling.',
        'You are asked to **justify uniformity**: one induction does it. The i-th item is kept with probability 1/i and each earlier survivor stays with probability (i − 1)/i, so every item finishes with 1/n. Expect to give this argument.',
      ],
      tip: 'Only the arrival probability matters: the n-th item enters with k / n and each resident survives with (n − 1) / n, keeping all odds equal by induction. Seed the generator to reproduce tests.',
      practice: [
        '382-linked-list-random-node',
        '398-random-pick-index',
        'alg-reservoir-sampling-k-items',
        lc('384', 'Shuffle an Array', 'Medium', 'shuffle-an-array', 'Fisher-Yates: the in-memory cousin'),
        lc('528', 'Random Pick with Weight', 'Medium', 'random-pick-with-weight', 'prefix sums + binary search'),
        lc('497', 'Random Point in Non-overlapping Rectangles', 'Medium', 'random-point-in-non-overlapping-rectangles', 'weighted pick by area'),
        lc('470', 'Implement Rand10() Using Rand7()', 'Medium', 'implement-rand10-using-rand7', 'rejection sampling keeps it uniform'),
        lc('710', 'Random Pick with Blacklist', 'Hard', 'random-pick-with-blacklist', 'remap indexes instead of storing all'),
      ],
    },
    meta: {
      useNote: 'Think in probabilities, not positions: the n-th item enters with k / n and each resident survives with (n − 1) / n, which keeps the odds equal for every item.',
      complexityNote: 'One pass over the stream with a single random draw per item gives O(n) time. Only the reservoir of k items and a counter are stored, so memory is O(k), or O(1) for the one-item version.',
      highlight: ['stream or a linked list of unknown length', 'k items uniformly at random', 'condition or target', 'uniform random pick', 'justify uniformity'],
    },
  },

  /* ------------------------------------------------------------------ math & sorting */
  'math-number-theory': {
    tags: ['Sieve', 'GCD / LCM', 'Fast power', 'Modular arithmetic'],
    content: {
      whenToUse: [
        'You need **all primes up to n** or a prime count and n is at most a few million: the Sieve of Eratosthenes crosses off multiples of each prime from p² upward, replacing n trial divisions with about n log log n work.',
        'The task asks for a **gcd, lcm or fraction simplification**: Euclid\'s rule gcd(a, b) = gcd(b, a mod b) shrinks the pair geometrically, and lcm(a, b) = a / gcd × b, dividing before multiplying to avoid overflow.',
        'A power **x^n with a huge exponent**, possibly modulo m, is required: square-and-multiply reads the exponent in binary and needs only about log n multiplications, reducing modulo m at every step so values stay small.',
        'You must test or factor **a single big number**: trial division only needs divisors up to its square root, and counting the factors of 5 in n! gives trailing zeros without ever building the factorial.',
        'A brute force keeps repeating a **divisibility or remainder test** that an identity could short-cut: modular arithmetic for huge totals, counting factors instead of products, perfect-square or digit-cycle checks. Search for the underlying invariant before writing any loop.',
      ],
      tip: 'Check sizes first. A sieve needs O(n) memory, so it suits n up to about 10^7; for one number use trial division to its square root. For powers, reduce modulo m after every multiplication.',
      practice: [
        '204-count-primes',
        '50-pow-x-n',
        'alg-euclids-gcd-and-lcm',
        lc('1071', 'Greatest Common Divisor of Strings', 'Easy', 'greatest-common-divisor-of-strings', 'gcd of the lengths'),
        lc('172', 'Factorial Trailing Zeroes', 'Medium', 'factorial-trailing-zeroes', 'count factors of 5'),
        lc('365', 'Water and Jug Problem', 'Medium', 'water-and-jug-problem', 'reachable amounts are multiples of the gcd'),
        lc('1922', 'Count Good Numbers', 'Medium', 'count-good-numbers', 'fast power modulo 10^9 + 7'),
        lc('1979', 'Find Greatest Common Divisor of Array', 'Easy', 'find-greatest-common-divisor-of-array', 'gcd of min and max'),
      ],
    },
    meta: {
      useNote: 'Pick the tool by size: a sieve for many primes up to about 10^7, Euclid for gcd and lcm, square-and-multiply when the exponent is large, trial division for a single number.',
      complexityNote: 'The sieve crosses each composite once per small prime, about n log log n steps with O(n) memory. Euclid needs O(log min(a, b)) rounds because the pair at least halves every two rounds, and fast power needs O(log n).',
      highlight: ['all primes up to n', 'gcd, lcm or fraction simplification', 'x^n with a huge exponent', 'a single big number', 'divisibility or remainder test'],
    },
  },

  'sorting-linear': {
    tags: ['Counting sort', 'Radix sort', 'Buckets', 'Beats n log n'],
    content: {
      whenToUse: [
        'The values lie in a **small known range** 0..k with k about n (ages, grades, letters, digits): count them in an array indexed by value and read the counts back in order, with no comparison at all, in O(n + k).',
        'Numbers are **bounded but wide** (up to 10^9): sort digit by digit with a stable counting pass for each digit, least significant first, which costs O(d·(n + base)) for d digits and beats n log n when d is small.',
        'The question is about **neighbouring values in sorted order** (maximum gap, closest pair of values) and must run in O(n): bucket by the pigeonhole width and keep only each bucket\'s minimum and maximum, never sorting inside a bucket.',
        'You need **frequency order or grouping**, as in Sort Colors, sort by frequency or top-k frequent: a count array, or buckets indexed by frequency, orders everything in a single pass instead of paying for a comparison sort.',
        'A **stable ordering** is required so equal keys keep their original order, or a comparison sort is the measured bottleneck: write elements right to left using the prefix sums of the counts and stability comes for free.',
      ],
      tip: 'Stability makes radix sort work: every pass must keep equal digits in their previous order. Counting sort is stable when you place elements right to left using prefix sums of the counts.',
      practice: [
        '912-counting-sort',
        '912-radix-sort',
        '164-maximum-gap',
        '75-sort-colors',
        lc('1122', 'Relative Sort Array', 'Easy', 'relative-sort-array', 'counting sort over a bounded range'),
        lc('451', 'Sort Characters By Frequency', 'Medium', 'sort-characters-by-frequency', 'count, then bucket by frequency'),
        lc('274', 'H-Index', 'Medium', 'h-index', 'counting sort capped at n'),
        { slug: '347-top-k-frequent-elements', note: 'bucket sort by frequency' },
      ],
    },
    meta: {
      useNote: 'Counting sort needs a small value range, radix sort handles wider numbers one stable digit pass at a time, and buckets turn neighbour questions into min/max bookkeeping.',
      complexityNote: 'Counting sort touches the input twice and the count array once: O(n + k) time, O(k) space. Radix sort repeats one counting pass per digit, O(d·(n + base)); maximum gap stays linear by keeping only each bucket\'s min and max.',
      highlight: ['small known range', 'bounded but wide', 'neighbouring values in sorted order', 'frequency order or grouping', 'stable ordering'],
    },
  },

  /* ------------------------------------------------------------------ strings */
  'string-kmp': {
    tags: ['Failure table', 'Border / lps', 'Period', 'Pattern matching'],
    content: {
      whenToUse: [
        'You must find **one or all occurrences of a pattern** in a long text in linear time: build the failure (lps) table once, then scan the text without ever moving the text pointer backwards after a mismatch.',
        'The question is about **borders**: the longest prefix that is also a suffix (Longest Happy Prefix), or the border of every prefix at once. The lps array is the answer directly, with no extra search needed.',
        'You need the **shortest repeating period** of a string: n − lps[n − 1] is the candidate block length, and the string is a repetition exactly when the border is non-zero and the block length divides n (Repeated Substring Pattern).',
        'Naive matching **restarts from scratch after each mismatch** and degrades to O(n·m) in the worst case, for instance on aaaa…ab; the failure table keeps everything that already matched and shifts the pattern by exactly the right amount.',
        'You can reduce the task to **one string with a separator**, such as pattern + "#" + text or s + "#" + reverse(s): the lps values then show matches or palindromic prefixes directly, as in Shortest Palindrome.',
      ],
      tip: 'Both loops share one shape: the table is built by matching the pattern against itself. Remember the fallback len = lps[len - 1], and never move the text pointer backwards.',
      practice: [
        '28-find-the-index-of-the-first-occurrence-in-a-string',
        '1392-longest-happy-prefix',
        '459-repeated-substring-pattern',
        lc('686', 'Repeated String Match', 'Medium', 'repeated-string-match', 'KMP on the repeated text'),
        lc('796', 'Rotate String', 'Easy', 'rotate-string', 'search the goal inside s + s'),
        lc('1668', 'Maximum Repeating Substring', 'Easy', 'maximum-repeating-substring', 'repeat the word, search again'),
        { slug: '214-shortest-palindrome', note: 'lps of s + "#" + reverse(s)' },
      ],
    },
    meta: {
      useNote: 'The table is built by matching the pattern against itself. A border is a prefix that is also a suffix, and n minus the last border is the string\'s period.',
      complexityNote: 'Each step either advances the text pointer or shortens the matched length through a failure link, and a fallback can only undo earlier advances. The scan is O(n), the table O(m): O(n + m) time, O(m) space.',
      highlight: ['one or all occurrences of a pattern', 'borders', 'shortest repeating period', 'restarts from scratch after each mismatch', 'one string with a separator'],
    },
  },

  'string-z-algorithm': {
    tags: ['Z-array', 'Z-box', 'Pattern search', 'Periods'],
    content: {
      whenToUse: [
        'You want, for every position, **how much of the string\'s beginning matches** there: z[i] is the longest common prefix of s and its suffix starting at i, computed for all i in O(n) with the Z-box trick.',
        'You search for a pattern and prefer **one array to reason about**: run Z on pattern + "#" + text, and every index where z equals the pattern length is an occurrence, the separator preventing matches across the join.',
        'The task is about **periods and borders**: p is a period exactly when z[p] = n − p, so listing every period of a string, or testing for a repetition, is one scan over the Z array.',
        'You must **sum or count prefix matches** over all suffixes, as in Sum of Scores of Built Strings where each score is simply a Z value, or compare every suffix with the beginning of the whole string.',
        'A solution needs the **longest prefix that reappears** later in the string, for example at each cut of a string-editing or revert problem: z[i] gives the reusable overlap, and z[i] + i = n marks suffixes equal to a prefix.',
      ],
      tip: 'To search, run Z on pattern + a separator that occurs nowhere else + text; z[i] equals the pattern length exactly at the occurrences. Without the separator, matches could run across the join.',
      practice: [
        'alg-z-algorithm-pattern-search',
        '2223-sum-of-scores-of-built-strings',
        'alg-all-periods-of-a-string',
        { slug: '28-find-the-index-of-the-first-occurrence-in-a-string', note: 'solve it again with the Z array' },
        { slug: '459-repeated-substring-pattern', note: 'z[p] = n − p with p dividing n' },
        { slug: '1392-longest-happy-prefix', note: 'the largest z[i] with i + z[i] = n' },
        { slug: '214-shortest-palindrome', note: 'Z of s + "#" + reverse(s)' },
      ],
    },
    meta: {
      useNote: 'Search by running Z on pattern + separator + text. Periods, borders and prefix-match sums read straight off the array, and the separator keeps matches from crossing the join.',
      complexityNote: 'The Z-box [l, r) only moves right and every direct comparison extends r, while indices inside the box start from a mirrored value. All comparisons together are O(n), so Z takes O(n) time and O(n) space.',
      highlight: ['how much of the string\'s beginning matches', 'one array to reason about', 'periods and borders', 'sum or count prefix matches', 'longest prefix that reappears'],
    },
  },

  'string-rolling-hash': {
    tags: ['Rolling hash', 'Rabin-Karp', 'Duplicates', 'Binary search on length'],
    content: {
      whenToUse: [
        'You compare **many same-length windows** against a pattern or against each other: a polynomial rolling hash updates in O(1) as the window slides (drop the leading term, shift, add the new character), so n windows cost O(n).',
        'You look for **repeated or duplicate substrings**, as in Repeated DNA Sequences or Longest Duplicate Substring, where storing every substring would be too large: keep one integer hash per window in a set or map instead.',
        'A **binary search on the length** needs a fast "does a duplicate of length L exist?" test: hash every window of that length in one linear pass, so the whole search costs O(n log n) rather than O(n²).',
        'The alphabet is tiny (DNA, bits, digits) so a window packs into an integer: a **2-bit or 1-bit encoding is an exact hash** with no collisions, and one mask operation drops the oldest symbol, which makes the update trivial.',
        'Equal strings always hash equally but equal hashes can **collide**: verify the characters on every hit, or use a large prime modulus or two moduli, so a collision costs time and never produces a wrong answer.',
      ],
      tip: 'A hash hit is only a candidate: verify the characters or use two moduli unless the encoding is exact. Subtract the leading character times base^(m-1) before shifting, and keep the result non-negative.',
      practice: [
        'alg-rabin-karp-substring-search',
        '187-repeated-dna-sequences',
        '1044-longest-duplicate-substring',
        lc('686', 'Repeated String Match', 'Medium', 'repeated-string-match', 'compare window hashes of the repeated text'),
        lc('718', 'Maximum Length of Repeated Subarray', 'Medium', 'maximum-length-of-repeated-subarray', 'binary search on length + rolling hash'),
        { slug: '28-find-the-index-of-the-first-occurrence-in-a-string', note: 'Rabin-Karp as an alternative to KMP' },
        lc('1923', 'Longest Common Subpath', 'Hard', 'longest-common-subpath', 'hash subpaths, binary search the length'),
        lc('2156', 'Find Substring With Given Hash Value', 'Hard', 'find-substring-with-given-hash-value', 'roll the hash backwards'),
      ],
    },
    meta: {
      useNote: 'Equal strings always hash equally, so a mismatch is conclusive; a match must be verified unless the encoding is exact. Remove the leading character before shifting.',
      complexityNote: 'Hashing the first window costs O(m) and every slide is one subtract, multiply and add, so the total is O(n + m) expected. A poor modulus or adversarial input forces collisions and can degrade to O(n·m) without verification.',
      highlight: ['many same-length windows', 'repeated or duplicate substrings', 'binary search on the length', 'exact hash', 'collide'],
    },
  },

  'string-manacher': {
    tags: ['Palindromes', 'Radius array', 'Mirror', 'O(n)'],
    content: {
      whenToUse: [
        'You need the **longest palindromic substring in O(n)**, or the palindrome radius at every centre, when expanding around each centre costs O(n²) on long inputs: Manacher mirrors radii inside the rightmost palindrome so nothing is compared twice.',
        'The task is to **count palindromic substrings** of a long string, equal texts at different positions counted separately: every centre of the interleaved string contributes ⌈p/2⌉ palindromes, so the total is simply the sum over the radius array.',
        'A question concerns palindromes that **touch a boundary**: a palindrome starting at index 0 is a palindromic prefix (a centre with i − p[i] = 0), which decides exactly what to prepend in Shortest Palindrome and similar prefix problems.',
        'You want **odd and even palindromes handled by one loop**: insert "#" between all characters so every palindrome has a centre, and the radius in the new string equals the palindrome length in the original.',
        'The problem asks for **non-overlapping or best-two palindromes** across many positions: the radius array gives the longest palindrome at each centre in O(1), which feeds greedy choices, interval scheduling and prefix-best or suffix-best scans over the string.',
      ],
      tip: 'Interleave "#" so every palindrome is odd and has a centre. The radius in the interleaved string equals the palindrome length in the original, and its start is (centre − radius) / 2.',
      practice: [
        'alg-manachers-algorithm',
        'cp-palindromic-substrings-via-manacher',
        '214-shortest-palindrome',
        { slug: '5-longest-palindromic-substring', note: 'expand around centres first, then Manacher' },
        { slug: '647-palindromic-substrings', note: 'count with Manacher radii' },
        lc('1960', 'Maximum Product of the Length of Two Palindromic Substrings', 'Hard', 'maximum-product-of-the-length-of-two-palindromic-substrings', 'radii + prefix-best arrays'),
        lc('2472', 'Maximum Number of Non-overlapping Palindrome Substrings', 'Hard', 'maximum-number-of-non-overlapping-palindrome-substrings', 'greedy over palindrome checks'),
        { slug: '132-palindrome-partitioning-ii', note: 'palindrome table in O(n²) or from radii' },
      ],
    },
    meta: {
      useNote: 'Insert "#" between letters so odd and even palindromes share one loop; the radius in the new string equals the length in the old one.',
      complexityNote: 'The right edge r of the rightmost palindrome only moves forward and each direct comparison extends it, so all extensions total O(n). The radius array has 2n + 1 entries, giving O(n) time and O(n) space.',
      highlight: ['longest palindromic substring in O(n)', 'count palindromic substrings', 'touch a boundary', 'odd and even palindromes handled by one loop', 'non-overlapping or best-two palindromes'],
    },
  },

  /* ------------------------------------------------------------------ techniques */
  'coordinate-compression': {
    tags: ['Ranks', 'Sweep line', 'Offline queries', 'Fenwick tree'],
    content: {
      whenToUse: [
        'Values go up to **10^9 but only n of them exist**, and you want an array, counter or Fenwick tree indexed by value: sort the distinct values and replace each with its rank, so every structure has size n.',
        'Only the **relative order** matters, not the gaps between values: ranks, inversion counts, increasing subsequences and "how many elements are smaller" questions give identical answers on the compressed values, so the magnitudes can be thrown away.',
        'A **sweep line over intervals or events**: only the endpoints change the answer, so compress them (include end + 1 for closed intervals) and keep a difference array over ranks instead of one over raw coordinates.',
        'Queries are **offline**, all known in advance and free to be sorted first: compress the combined coordinates once, then answer every query with prefix sums or a Fenwick or segment tree over at most 2n ranks.',
        'You face a plane or timeline with **huge extents but few features** (rectangles, points, falling squares): compress only the x and y coordinates that actually occur, and the enormous plane collapses to a small grid you can sweep or scan.',
      ],
      tip: 'Sort the distinct values once, then map value to index with a map or binary search. Decide up front whether ranks start at 0 or 1 and whether equal values share a rank.',
      practice: [
        '1331-rank-transform-of-an-array',
        '506-relative-ranks',
        'cp-maximum-overlap-of-wide-intervals',
        '315-count-of-smaller-numbers-after-self',
        { slug: '493-reverse-pairs', note: 'compress, then count with a Fenwick tree' },
        lc('327', 'Count of Range Sum', 'Hard', 'count-of-range-sum', 'compress prefix sums + Fenwick tree'),
        lc('699', 'Falling Squares', 'Hard', 'falling-squares', 'compress x-coordinates + range maximum'),
        lc('850', 'Rectangle Area II', 'Hard', 'rectangle-area-ii', 'compress y and sweep across x'),
      ],
    },
    meta: {
      useNote: 'Sort the distinct values, map value → rank, and run the sweep, count or tree over ranks. Remember end + 1 for closed intervals and decide whether ties share a rank.',
      complexityNote: 'Sorting the distinct values dominates at O(n log n), and each lookup is O(1) with a map or O(log n) with binary search. Afterwards every array, counter or tree works on at most n coordinates, so memory is O(n).',
      highlight: ['10^9 but only n of them exist', 'relative order', 'sweep line over intervals or events', 'offline', 'huge extents but few features'],
    },
  },

  'meet-in-the-middle': {
    tags: ['Two halves', 'Subset sums', 'Two pointers', '2^(n/2)'],
    content: {
      whenToUse: [
        '**n is about 30 to 40**: 2^n is far too large but 2^(n/2) is only about a million. Split the input in two, enumerate each half on its own, and combine the two lists instead of searching the full product.',
        'The problem asks for a **subset whose total hits or is closest to a target**: sort both halves\' subset sums and walk two pointers (i up the left list, j down the right) to find the best pair in linear time.',
        'A solution is naturally **one choice from each half**, such as 4Sum II (a + b + c + d = 0): count all a + b sums in a hash map and look up −(c + d) for every pair, O(n²) instead of O(n⁴).',
        'A **fixed number of chosen items** constrains the split, for example partitioning into two arrays of equal size: group each half\'s sums by subset size so a k-element left subset pairs only with an (n − k)-element right one.',
        'Dynamic programming over sums fails because **values or the target are huge**, so a knapsack table is impossible, yet n stays small. That mismatch of small count and big values is the classic meet-in-the-middle signal.',
      ],
      tip: 'Decide how the halves combine before enumerating: sort plus two pointers for closest to a target, a hash map for exact equality, and grouping by subset size when the number of chosen items is fixed.',
      practice: [
        '1755-closest-subsequence-sum',
        '2035-partition-array-into-two-arrays-to-minimize-sum-difference',
        '454-4sum-ii',
        lc('805', 'Split Array With Same Average', 'Hard', 'split-array-with-same-average', 'subset sums of two halves, grouped by size'),
        { slug: '416-partition-equal-subset-sum', note: 'DP when sums are small; halves when they are huge' },
        lc('956', 'Tallest Billboard', 'Hard', 'tallest-billboard', 'difference-keyed DP, or two halves'),
        { slug: '494-target-sum', note: 'two halves with a hash map of sums' },
      ],
    },
    meta: {
      useNote: 'Combine with two pointers after sorting (closest to a target), a hash map (exact match), or grouping by subset size when the item count is fixed.',
      complexityNote: 'Each half has 2^(n/2) subset sums; sorting them adds a factor of n and the merge walks both lists once, so time is O(2^(n/2)·n) and space O(2^(n/2)). Brute force over all subsets would be O(2^n).',
      highlight: ['n is about 30 to 40', 'subset whose total hits or is closest to a target', 'one choice from each half', 'fixed number of chosen items', 'values or the target are huge'],
    },
  },
};
