/**
 * Java "code tricks" cheatsheet data: 16 topics, ~53 cards.
 *
 * Conventions for snippets (they are compiled by a scratch harness, so keep them honest):
 *  - assume `import java.util.*;` (and java.util.stream / java.util.function where used)
 *  - a snippet is either a run of statements (as if inside a method) or a run of members
 *    (classes / static methods) when its first line starts with `class`, `static`, `record` or `interface`
 */
export type CardTag = 'must know' | 'very common' | 'gotcha';

export interface CheatCard {
  id: string;
  title: string;
  tag?: CardTag;
  /** Short explanation shown above the code. */
  text: string;
  /** Java source, lines separated by \n. */
  code: string;
  /** Optional "watch out" note shown under the code. */
  pitfall?: string;
}

export interface CheatTopic {
  id: string;
  title: string;
  blurb: string;
  cards: CheatCard[];
}

/** Tagged template: keeps backslashes literally and trims the leading newline / trailing whitespace. */
const j = (s: TemplateStringsArray): string => s.raw[0].replace(/^\r?\n/, '').replace(/\s+$/, '');

export const CHEATSHEET: CheatTopic[] = [
  {
    id: 'conversions',
    title: 'Type conversions & parsing',
    blurb: 'Moving between numbers, chars, strings and arrays without surprises.',
    cards: [
      {
        id: 'parse-numbers',
        title: 'Numbers to strings and back',
        tag: 'must know',
        text: 'parseXxx turns text into a primitive; String.valueOf / Integer.toString go the other way. Pass a radix to work in binary or hex.',
        code: j`
int a = Integer.parseInt("-42");
long big = Long.parseLong("9876543210");
double d = Double.parseDouble("3.14");

String s1 = String.valueOf(a);             // "-42"
String s2 = Integer.toString(a);           // "-42"
String s3 = "" + a;                        // also works, slightly sloppy

String bin = Integer.toBinaryString(10);   // "1010"
int fromBin = Integer.parseInt("1010", 2); // 10
String hex = Integer.toHexString(255);     // "ff"
String base7 = Integer.toString(100, 7);   // "202"
`,
        pitfall: 'parseInt throws NumberFormatException on "", " 12" (spaces) or "12abc". Trim first, and catch the exception when input is untrusted.',
      },
      {
        id: 'char-int',
        title: 'char and int: digits, letters, indexes',
        tag: 'very common',
        text: 'A char is a 16-bit number, so subtracting a base character gives a digit value or an alphabet index, and adding to a base gives the character back.',
        code: j`
char c = '7';
int digit = c - '0';                    // 7
char letter = (char) ('a' + 3);         // 'd'
int slot = 'z' - 'a';                   // 25
char next = 'a';
next++;                                 // 'b'

System.out.println('a' + 1);            // 98 (int!)
System.out.println((char) ('a' + 1));   // b

int[] counts = new int[26];
counts["hello".charAt(1) - 'a']++;      // counts the 'e'
`,
        pitfall: 'Arithmetic on chars yields int. Cast back with (char) before printing or appending, otherwise you get a number.',
      },
      {
        id: 'char-array-string',
        title: 'String, char[] and List conversions',
        tag: 'very common',
        text: 'Strings are immutable, so swap into a char[] to edit in place, then build a new String from it. The same char[] sorted is a handy anagram key.',
        code: j`
String s = "hello";
char[] arr = s.toCharArray();
Arrays.sort(arr);
String sorted = new String(arr);            // "ehllo"
String part = String.valueOf(arr, 0, 3);    // "ehl"
char[] copy = Arrays.copyOf(arr, arr.length);

List<Character> list = new ArrayList<>();
for (char ch : arr) list.add(ch);           // autoboxing

String joined = String.join(",", List.of("a", "b", "c")); // "a,b,c"
String fromList = list.stream().map(String::valueOf).collect(Collectors.joining());
System.out.println(Arrays.toString(arr));   // [e, h, l, l, o]
`,
        pitfall: 'Concatenating a char[] with + prints its identity hash, not the letters. Use new String(arr), String.valueOf(arr) or Arrays.toString(arr).',
      },
      {
        id: 'sort-reverse-primitives',
        title: 'Sorting and reversing primitives',
        text: 'Arrays.sort works on int[] directly, but there is no built-in reverse for primitives. Either swap by hand or box into Integer[] for a comparator.',
        code: j`
int[] nums = {5, 2, 9, 1};
Arrays.sort(nums);                                   // [1, 2, 5, 9]

// reverse in place with two pointers
for (int i = 0, k = nums.length - 1; i < k; i++, k--) {
    int t = nums[i]; nums[i] = nums[k]; nums[k] = t;
}                                                    // [9, 5, 2, 1]

// descending sort via boxing
Integer[] boxed = Arrays.stream(nums).boxed().toArray(Integer[]::new);
Arrays.sort(boxed, Collections.reverseOrder());
int[] back = Arrays.stream(boxed).mapToInt(Integer::intValue).toArray();

// List<Integer> <-> int[]
List<Integer> list = new ArrayList<>();
for (int x : back) list.add(x);
int[] again = list.stream().mapToInt(Integer::intValue).toArray();
`,
        pitfall: 'Arrays.sort(int[], comparator) does not compile. Only object arrays accept a comparator.',
      },
    ],
  },
  {
    id: 'int-limits',
    title: 'Integer / Long limits & infinity',
    blurb: 'Bounds, overflow and sensible "infinity" values for min/max searches.',
    cards: [
      {
        id: 'bounds',
        title: 'Bounds and silent overflow',
        tag: 'must know',
        text: 'int spans about plus or minus 2.1 billion and wraps around silently on overflow. long spans about 9.2e18. Widen early when sums or products can get large.',
        code: j`
int hi = Integer.MAX_VALUE;                  // 2147483647
int lo = Integer.MIN_VALUE;                  // -2147483648
long LHI = Long.MAX_VALUE;                   // 9223372036854775807

System.out.println(hi + 1);                  // -2147483648 (wrapped)
System.out.println(Math.abs(lo));            // -2147483648 (still negative!)
System.out.println(-lo);                     // -2147483648

int a = 100_000, b = 100_000;
long wrong = a * b;                          // multiplied as int first
long right = (long) a * b;                   // 10000000000
`,
        pitfall: 'Math.abs(Integer.MIN_VALUE) is negative. Also the cast must happen before the multiplication: (long) (a * b) is already too late.',
      },
      {
        id: 'safe-mid',
        title: 'Overflow-safe midpoint and exact math',
        tag: 'gotcha',
        text: '(lo + hi) / 2 overflows when both are near the int limit. Subtract first, or use an unsigned shift. Math.xxxExact throws instead of wrapping.',
        code: j`
int lo = 2_000_000_000, hi = 2_100_000_000;
int bad = (lo + hi) / 2;               // negative garbage
int mid1 = lo + (hi - lo) / 2;         // 2050000000
int mid2 = (lo + hi) >>> 1;            // also safe (unsigned shift)

try {
    int sum = Math.addExact(Integer.MAX_VALUE, 1);
    System.out.println(sum);
} catch (ArithmeticException e) {
    System.out.println("overflow detected");
}
long prod = Math.multiplyExact(3_000_000L, 4_000_000L); // 12000000000000
int narrowed = Math.toIntExact(42L);   // throws if it does not fit
`,
        pitfall: 'In binary search, lo + (hi - lo) / 2 is the habit to build. It never overflows while lo <= hi.',
      },
      {
        id: 'fill-sentinels',
        title: 'Infinity sentinels and Arrays.fill',
        tag: 'very common',
        text: 'Fill distance or minimum tables with a big value, then relax with Math.min. Choose a sentinel that survives one addition.',
        code: j`
int n = 5;
int[] dist = new int[n];
Arrays.fill(dist, Integer.MAX_VALUE);
dist[0] = 0;

final int INF = Integer.MAX_VALUE / 2;       // safe to add two INFs
int[][] cost = new int[n][n];
for (int[] row : cost) Arrays.fill(row, INF);

long[] big = new long[n];
Arrays.fill(big, Long.MAX_VALUE / 2);

int best = Integer.MAX_VALUE;                // running minimum
for (int x : new int[]{7, 3, 9}) best = Math.min(best, x);
System.out.println(best);                    // 3
`,
        pitfall: 'dist[u] + w with dist[u] == Integer.MAX_VALUE wraps to a huge negative number. Guard with an "unreachable" check or use MAX_VALUE / 2.',
      },
    ],
  },
  {
    id: 'math',
    title: 'Math',
    blurb: 'The handful of Math methods that come up again and again.',
    cards: [
      {
        id: 'math-basics',
        title: 'Everyday Math methods',
        tag: 'very common',
        text: 'max/min/abs cover most needs. floorMod gives a non-negative remainder; integer ceiling division can be done without floating point.',
        code: j`
int m = Math.max(3, 8);                 // 8
int n = Math.min(3, 8);                 // 3
int d = Math.abs(-7);                   // 7

int r1 = -7 % 3;                        // -1 (sign follows the dividend)
int r2 = Math.floorMod(-7, 3);          // 2
int q  = Math.floorDiv(-7, 3);          // -3 (rounds toward -infinity)

int ceilDiv = (7 + 3 - 1) / 3;          // 3  (ceil(7/3) for positives)
int total = 10, perPage = 4;
int pages = (total + perPage - 1) / perPage;   // 3

double h = Math.hypot(3, 4);            // 5.0
`,
        pitfall: 'Plain % keeps the sign of the left side, so index wraparound needs floorMod or ((x % n) + n) % n.',
      },
      {
        id: 'math-powers-rounding',
        title: 'Powers, roots, logs and rounding',
        tag: 'gotcha',
        text: 'Most Math functions return double. Convert with care and prefer exact integer tricks when the answer must be exact.',
        code: j`
double p = Math.pow(2, 10);                  // 1024.0
int pi = (int) Math.pow(2, 10);              // 1024 (cast the double)
long exact = 1L << 40;                       // exact power of two

long n = 1_000_000_007L * 3;
long root = (long) Math.sqrt(n);
boolean square = root * root == n;           // perfect-square test

int log2 = 31 - Integer.numberOfLeadingZeros(1000);  // 9 = floor(log2(1000))

System.out.println(Math.round(2.5));         // 3
System.out.println(Math.round(-2.5));        // -2 (rounds half up)
System.out.println((int) 3.99);              // 3 (truncates toward zero)
System.out.println(Math.ceil(7 / 2));        // 3.0, integer division happened first!
System.out.println(Math.ceil(7 / 2.0));      // 4.0
`,
        pitfall: 'Math.pow loses precision above 2^53, and Math.log(n) / Math.log(2) can land just below an integer. Use shifts or bit helpers for exact work.',
      },
    ],
  },
  {
    id: 'character',
    title: 'Character',
    blurb: 'Classification and case helpers for string problems.',
    cards: [
      {
        id: 'char-tests',
        title: 'Classifying characters',
        tag: 'very common',
        text: 'Character.isXxx covers digits, letters and case. Combine them to filter noisy input, such as the classic alphanumeric palindrome.',
        code: j`
char c = 'G';
boolean dig = Character.isDigit('5');            // true
boolean let = Character.isLetter(c);             // true
boolean alnum = Character.isLetterOrDigit('_');  // false
boolean up = Character.isUpperCase(c);           // true
boolean sp = Character.isWhitespace(' ');        // true

char low = Character.toLowerCase(c);             // 'g'
char upp = Character.toUpperCase('x');           // 'X'

StringBuilder clean = new StringBuilder();
for (char ch : "A man, a plan!".toCharArray()) {
    if (Character.isLetterOrDigit(ch)) clean.append(Character.toLowerCase(ch));
}
System.out.println(clean);                       // amanaplan
`,
        pitfall: 'Character.isLetter also accepts non-English letters. If the problem says lowercase a-z, test the range directly: c >= \'a\' && c <= \'z\'.',
      },
      {
        id: 'char-convert',
        title: 'Case flips and digit conversions',
        text: 'Upper and lower case ASCII letters differ by exactly one bit (value 32), which gives cheap tricks. Character.getNumericValue and forDigit handle digits in any base.',
        code: j`
char a = 'a';
char upper = (char) (a - 32);                 // 'A'
char flipped = (char) ('B' ^ 32);             // 'b' (toggles case, letters only)
boolean sameLetter = ('a' | 32) == ('A' | 32);  // true

int v = Character.getNumericValue('7');       // 7
int hexVal = Character.getNumericValue('f');  // 15
char back = Character.forDigit(11, 16);       // 'b'
char digit = Character.forDigit(7, 10);       // '7'

Map<Character, Integer> seen = new HashMap<>();
seen.put('x', 1);                             // char autoboxes to Character
System.out.println(seen.get('x'));            // 1
`,
        pitfall: 'The XOR 32 trick is only valid for letters. Applied to digits or punctuation it corrupts them.',
      },
    ],
  },
  {
    id: 'strings',
    title: 'String & StringBuilder',
    blurb: 'The text methods you need under time pressure.',
    cards: [
      {
        id: 'string-core',
        title: 'Core String methods',
        tag: 'must know',
        text: 'Indexes are zero-based, substring excludes its end index, and strings compare by content only with equals.',
        code: j`
String s = "interview";
int n = s.length();                       // 9
char first = s.charAt(0);                 // 'i'
String mid = s.substring(2, 5);           // "ter" (end exclusive)
String tail = s.substring(5);             // "view"

int at = s.indexOf('e');                  // 3 (first), -1 when missing
int last = s.lastIndexOf("e");            // 7
boolean has = s.contains("view");         // true
boolean pre = s.startsWith("in");         // true

boolean eq = s.equals("interview");       // true, compares content
int cmp = "apple".compareTo("banana");    // negative: apple sorts first
boolean none = "  ".isBlank();            // true
String cut = "  hi \n".strip();           // "hi"
String line = "ab".repeat(3);             // "ababab"
`,
        pitfall: 'Use equals, never ==, to compare strings. == compares references and only seems to work for literals.',
      },
      {
        id: 'string-split-join',
        title: 'Split, join and replace',
        tag: 'gotcha',
        text: 'split takes a regular expression. That makes whitespace splitting easy and special characters tricky.',
        code: j`
String[] words = "a  b   c".split("\\s+");          // [a, b, c]
String[] parts = "2024-05-17".split("-");           // [2024, 05, 17]
String[] pipes = "x|y|z".split("\\|");              // escape regex chars
String[] keep = "a,b,,".split(",", -1);             // [a, b, "", ""] keeps trailing empties
String[] dropped = "a,b,,".split(",");              // [a, b]

String csv = String.join(",", words);               // "a,b,c"
String swapped = "banana".replace('a', 'o');        // "bonono"
String noDigits = "a1b22".replaceAll("[0-9]", "");  // "ab"
String padded = String.format("%03d|%5.2f|%s", 7, 3.14159, "ok"); // 007| 3.14|ok

for (String w : words) System.out.print(w.length() + " ");
`,
        pitfall: '"a|b".split("|") splits between every character because | is regex alternation. Escape it as "\\\\|". Leading delimiters produce an empty first element.',
      },
      {
        id: 'stringbuilder-core',
        title: 'StringBuilder operations',
        tag: 'very common',
        text: 'A mutable string buffer. Append, insert, delete and reverse are all available, and it is the right tool for building output in loops or backtracking.',
        code: j`
StringBuilder sb = new StringBuilder();
sb.append("ab").append('c').append(42);     // "abc42"
sb.insert(0, "X");                          // "Xabc42"
sb.setCharAt(1, 'A');                       // "XAbc42"
sb.deleteCharAt(sb.length() - 1);           // "XAbc4"  (undo the last char)
sb.setLength(sb.length() - 1);              // "XAbc"   (cheap trim of the tail)
sb.reverse();                               // "cbAX"
int len = sb.length();                      // 4
char ch = sb.charAt(0);                     // 'c'
String result = sb.toString();              // "cbAX"

boolean same = new StringBuilder("ab").toString().contentEquals("ab"); // true
`,
        pitfall: 'StringBuilder does not override equals, so sb1.equals(sb2) is false for identical text. Compare toString() values.',
      },
      {
        id: 'string-concat-reverse',
        title: 'Concatenation cost, reversing, comparing',
        text: 'Repeated += copies the whole string every time, which turns a loop into O(n squared). Collect in a StringBuilder instead.',
        code: j`
// slow: creates n intermediate strings
String slow = "";
for (int i = 0; i < 5; i++) slow += i;

// fast
StringBuilder fast = new StringBuilder();
for (int i = 0; i < 5; i++) fast.append(i);

String rev = new StringBuilder("stressed").reverse().toString();   // "desserts"
boolean pal = "level".contentEquals(new StringBuilder("level").reverse()); // true

String c = String.valueOf('x') + 'y';       // "xy": char + char alone would add numbers
boolean ci = "Java".equalsIgnoreCase("jAVA");   // true
int order = "b".compareToIgnoreCase("A");       // positive
System.out.println(slow.equals(fast.toString())); // true
`,
        pitfall: "'a' + 'b' is the int 195, not \"ab\". Start the expression from a String (\"\" + 'a' + 'b') or use a StringBuilder.",
      },
    ],
  },
  {
    id: 'arrays-class',
    title: 'Arrays class',
    blurb: 'java.util.Arrays: fill, copy, sort, search, print and compare.',
    cards: [
      {
        id: 'arrays-fill-copy',
        title: 'Create, fill and copy',
        tag: 'must know',
        text: 'New arrays are zero, false or null filled. Copy with copyOf / copyOfRange, and remember that 2-D arrays need a deep copy.',
        code: j`
int[] a = new int[5];                       // [0, 0, 0, 0, 0]
Arrays.fill(a, -1);                         // [-1, -1, -1, -1, -1]
Arrays.fill(a, 1, 3, 7);                    // fills indexes 1..2 -> [-1, 7, 7, -1, -1]

int[] grown = Arrays.copyOf(a, 8);          // pads with zeros
int[] slice = Arrays.copyOfRange(a, 1, 4);  // [7, 7, -1]  (end exclusive)
int[] clone = a.clone();                    // independent 1-D copy

int[][] grid = {{1, 2}, {3, 4}};
int[][] shallow = grid.clone();             // rows are SHARED
int[][] deep = new int[grid.length][];
for (int i = 0; i < grid.length; i++) deep[i] = grid[i].clone();
deep[0][0] = 99;
System.out.println(grid[0][0]);             // 1 (untouched)
`,
        pitfall: 'grid.clone() copies only the outer array. Mutating shallow[0][0] also changes grid[0][0].',
      },
      {
        id: 'arrays-sort-search',
        title: 'Sorting and binary search',
        tag: 'very common',
        text: 'sort is O(n log n). binarySearch needs a sorted array and returns a negative insertion hint when the key is absent.',
        code: j`
int[] a = {9, 4, 7, 1};
Arrays.sort(a);                              // [1, 4, 7, 9]
Arrays.sort(a, 1, 3);                        // sort only indexes 1..2

int idx = Arrays.binarySearch(a, 7);         // 2
int miss = Arrays.binarySearch(a, 5);        // -3  => -(insertionPoint) - 1
int insertAt = -miss - 1;                    // 2

String[] names = {"bob", "Al", "cy"};
Arrays.sort(names);                          // [Al, bob, cy] (uppercase first)
Arrays.sort(names, String.CASE_INSENSITIVE_ORDER); // [Al, bob, cy]

int[][] pairs = {{3, 1}, {1, 2}, {3, 0}};
Arrays.sort(pairs, (x, y) -> x[0] != y[0] ? Integer.compare(x[0], y[0]) : Integer.compare(x[1], y[1]));
`,
        pitfall: 'binarySearch on an unsorted array, or with duplicates, gives unspecified results. Which duplicate you land on is not guaranteed.',
      },
      {
        id: 'arrays-print-compare',
        title: 'Print, compare and stream',
        tag: 'gotcha',
        text: 'Printing an array directly shows a memory hash. Use toString / deepToString. equals compares contents, not references.',
        code: j`
int[] a = {3, 1, 2};
int[][] g = {{1, 2}, {3, 4}};
System.out.println(Arrays.toString(a));        // [3, 1, 2]
System.out.println(Arrays.deepToString(g));    // [[1, 2], [3, 4]]

boolean same = Arrays.equals(new int[]{1, 2}, new int[]{1, 2});          // true
boolean deep = Arrays.deepEquals(g, new int[][]{{1, 2}, {3, 4}});        // true
boolean ref = a == a.clone();                                            // false

int sum = Arrays.stream(a).sum();              // 6
int max = Arrays.stream(a).max().getAsInt();   // 3
double avg = Arrays.stream(a).average().orElse(0);  // 2.0

List<String> fixed = Arrays.asList("x", "y");  // fixed size, backed by the array
List<int[]> wrong = Arrays.asList(a);          // a list of ONE element: the array
System.out.println(wrong.size());              // 1
`,
        pitfall: 'Arrays.asList(int[]) gives a one-element list holding the array. Use Integer[] or the stream route to box. Also, asList(...).add(...) throws.',
      },
    ],
  },
  {
    id: 'collections-class',
    title: 'Collections class & lists',
    blurb: 'List helpers, immutable factories and ArrayList traps.',
    cards: [
      {
        id: 'collections-utils',
        title: 'Sort, reverse, min, max, frequency',
        tag: 'very common',
        text: 'The Collections class mirrors Arrays but works on lists. list.sort(null) is the same as natural-order sort.',
        code: j`
List<Integer> list = new ArrayList<>(List.of(4, 1, 3, 1));
Collections.sort(list);                          // [1, 1, 3, 4]
Collections.reverse(list);                       // [4, 3, 1, 1]
Collections.swap(list, 0, 3);                    // [1, 3, 1, 4]
Collections.sort(list, Collections.reverseOrder()); // [4, 3, 1, 1]

int mx = Collections.max(list);                  // 4
int mn = Collections.min(list);                  // 1
int ones = Collections.frequency(list, 1);       // 2

list.sort(Comparator.naturalOrder());            // ascending again
Collections.shuffle(list, new Random(7));        // reproducible shuffle
List<String> dashes = Collections.nCopies(3, "-");   // [-, -, -]
`,
        pitfall: 'Collections.sort on a List.of(...) result throws UnsupportedOperationException because that list is immutable. Copy it into a new ArrayList first.',
      },
      {
        id: 'collections-factories',
        title: 'Immutable factories and views',
        text: 'List.of, Set.of and Map.of give compact immutable literals. Wrap in a constructor when you need to modify them.',
        code: j`
List<Integer> fixed = List.of(1, 2, 3);          // immutable, no nulls
Set<String> tags = Set.of("a", "b");             // immutable, random order
Map<String, Integer> m = Map.of("one", 1, "two", 2);

List<Integer> mutable = new ArrayList<>(fixed);  // modifiable copy
mutable.add(4);

Map<Integer, String> big = Map.ofEntries(Map.entry(1, "x"), Map.entry(2, "y"));
List<Integer> view = Collections.unmodifiableList(mutable);  // read-only VIEW
mutable.add(5);
System.out.println(view.size());                 // 5, the view sees later changes

List<Integer> none = Collections.emptyList();
List<Integer> one = Collections.singletonList(9);
System.out.println(none.size() + one.size());    // 1
`,
        pitfall: 'Set.of and Map.of throw on duplicate elements/keys and on null. List.of(...).add(...) throws UnsupportedOperationException.',
      },
      {
        id: 'arraylist-essentials',
        title: 'ArrayList essentials and copy traps',
        tag: 'gotcha',
        text: 'add/get/set are O(1)-ish; add or remove in the middle is O(n). remove(int) and remove(Object) are different overloads.',
        code: j`
List<Integer> list = new ArrayList<>(List.of(10, 20, 30, 40));
list.add(1, 15);                         // [10, 15, 20, 30, 40]
list.remove(0);                          // removes INDEX 0 -> [15, 20, 30, 40]
list.remove(Integer.valueOf(30));        // removes VALUE 30 -> [15, 20, 40]
list.removeIf(x -> x > 30);              // [15, 20]
int where = list.indexOf(20);            // 1

List<Integer> window = list.subList(0, 1);   // a VIEW, end exclusive
int[] arr = list.stream().mapToInt(Integer::intValue).toArray();

// backtracking: store a COPY of the working list
List<List<Integer>> answers = new ArrayList<>();
List<Integer> path = new ArrayList<>(List.of(1, 2));
answers.add(new ArrayList<>(path));      // snapshot
path.clear();
System.out.println(answers);             // [[1, 2]]
`,
        pitfall: 'answers.add(path) stores a reference, so every later path.add / remove rewrites your saved results. Always add new ArrayList<>(path).',
      },
    ],
  },
  {
    id: 'hash',
    title: 'HashMap & HashSet',
    blurb: 'Constant-time lookups: core calls, counting idioms and set algebra.',
    cards: [
      {
        id: 'map-core',
        title: 'HashMap core operations',
        tag: 'must know',
        text: 'getOrDefault and computeIfAbsent remove most null checks. Iterate entries when you need both key and value.',
        code: j`
Map<String, Integer> m = new HashMap<>();
m.put("a", 1);
m.putIfAbsent("a", 99);                       // keeps 1
int v = m.getOrDefault("zzz", 0);             // 0
boolean has = m.containsKey("a");             // true
m.remove("a");

Map<Integer, List<String>> groups = new HashMap<>();
groups.computeIfAbsent(3, k -> new ArrayList<>()).add("cat");
groups.computeIfAbsent(3, k -> new ArrayList<>()).add("dog");

for (Map.Entry<Integer, List<String>> e : groups.entrySet()) {
    System.out.println(e.getKey() + " -> " + e.getValue());   // 3 -> [cat, dog]
}
for (int key : groups.keySet()) System.out.println(key);
int size = groups.size();
`,
        pitfall: 'int x = map.get(k) throws NullPointerException when k is missing (unboxing null). Use getOrDefault or check containsKey.',
      },
      {
        id: 'map-frequency',
        title: 'Frequency counting patterns',
        tag: 'very common',
        text: 'merge is the shortest counter. For lowercase letters an int[26] is faster. Grouping uses a canonical key.',
        code: j`
Map<Character, Integer> freq = new HashMap<>();
for (char c : "banana".toCharArray()) freq.merge(c, 1, Integer::sum);
System.out.println(freq);                      // {a=3, b=1, n=2}

// older style, same result
Map<Character, Integer> freq2 = new HashMap<>();
for (char c : "banana".toCharArray()) freq2.put(c, freq2.getOrDefault(c, 0) + 1);

// most frequent value
int bestCount = Collections.max(freq.values());

// group anagrams by sorted letters
Map<String, List<String>> groups = new HashMap<>();
for (String w : new String[]{"eat", "tea", "tan", "ate", "nat"}) {
    char[] k = w.toCharArray();
    Arrays.sort(k);
    groups.computeIfAbsent(new String(k), x -> new ArrayList<>()).add(w);
}
System.out.println(groups.size());             // 2

// two-sum with a value -> index map
int[] nums = {2, 7, 11, 15};
Map<Integer, Integer> idx = new HashMap<>();
for (int i = 0; i < nums.length; i++) {
    if (idx.containsKey(9 - nums[i])) System.out.println(idx.get(9 - nums[i]) + "," + i);
    idx.put(nums[i], i);
}
`,
        pitfall: 'HashMap does not preserve any order. If output order matters, use LinkedHashMap (insertion order) or TreeMap (sorted).',
      },
      {
        id: 'set-ops',
        title: 'HashSet and set algebra',
        text: 'add returns false for duplicates, which makes cycle and duplicate detection one line. Bulk methods mutate the receiver, so copy first.',
        code: j`
Set<Integer> seen = new HashSet<>();
boolean fresh = seen.add(5);                   // true
boolean dup = seen.add(5);                     // false -> duplicate

Set<Integer> a = new HashSet<>(Arrays.asList(1, 2, 3, 4));
Set<Integer> b = new HashSet<>(Arrays.asList(3, 4, 5));

Set<Integer> union = new HashSet<>(a);
union.addAll(b);                               // [1, 2, 3, 4, 5]
Set<Integer> inter = new HashSet<>(a);
inter.retainAll(b);                            // [3, 4]
Set<Integer> diff = new HashSet<>(a);
diff.removeAll(b);                             // [1, 2]

Set<Integer> fromArray = Arrays.stream(new int[]{1, 1, 2}).boxed().collect(Collectors.toSet());

Set<List<Integer>> pairs = new HashSet<>();
pairs.add(List.of(1, 2));
System.out.println(pairs.contains(List.of(1, 2)));  // true, lists hash by content
`,
        pitfall: 'A HashSet<int[]> never detects equal arrays because arrays hash by identity. Use List<Integer> or encode the key as a String or long.',
      },
    ],
  },
  {
    id: 'pq',
    title: 'PriorityQueue & Comparator',
    blurb: 'Heaps for top-k, scheduling and shortest paths.',
    cards: [
      {
        id: 'pq-min-max',
        title: 'Min-heap, max-heap, basics',
        tag: 'must know',
        text: 'PriorityQueue is a min-heap by default. offer and poll are O(log n), peek is O(1).',
        code: j`
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
PriorityQueue<Integer> alt = new PriorityQueue<>((a, b) -> Integer.compare(b, a));

for (int x : new int[]{5, 1, 8, 3}) { minHeap.offer(x); maxHeap.offer(x); }
System.out.println(minHeap.peek());        // 1
System.out.println(maxHeap.poll());        // 8
System.out.println(minHeap.size());        // 4

PriorityQueue<Integer> heapified = new PriorityQueue<>(List.of(9, 2, 6)); // O(n) build
while (!heapified.isEmpty()) System.out.print(heapified.poll() + " ");    // 2 6 9
`,
        pitfall: 'Printing or iterating a PriorityQueue does not give sorted order. Only poll() returns elements in priority order.',
      },
      {
        id: 'pq-pairs',
        title: 'Heaps of pairs and records',
        tag: 'very common',
        text: 'Store {priority, payload} as int[] or a record, and give the heap a comparator. Dijkstra uses exactly this shape.',
        code: j`
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
pq.offer(new int[]{7, 1});     // {distance, node}
pq.offer(new int[]{2, 4});
int[] top = pq.poll();         // {2, 4}

PriorityQueue<int[]> pq2 = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));

record Job(String name, int prio, int arrival) {}
PriorityQueue<Job> jobs = new PriorityQueue<>(
    Comparator.comparingInt(Job::prio).reversed().thenComparingInt(Job::arrival));
jobs.add(new Job("A", 1, 0));
jobs.add(new Job("B", 5, 1));
System.out.println(jobs.poll().name());        // B (highest prio first)

PriorityQueue<long[]> wide = new PriorityQueue<>(Comparator.comparingLong(a -> a[0]));
wide.add(new long[]{3_000_000_000L, 1});
`,
        pitfall: 'The comparator (a, b) -> a[0] - b[0] can overflow for large or negative values. Prefer Integer.compare or comparingInt.',
      },
      {
        id: 'pq-top-k',
        title: 'Top-k with a bounded heap',
        tag: 'very common',
        text: 'To keep the k largest values use a min-heap of size k: whenever it grows past k, evict the smallest. That is O(n log k).',
        code: j`
static int kthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int x : nums) {
        heap.offer(x);
        if (heap.size() > k) heap.poll();   // drop the smallest
    }
    return heap.peek();
}

static List<Integer> topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int x : nums) freq.merge(x, 1, Integer::sum);
    PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.comparingInt(freq::get));
    for (int key : freq.keySet()) {
        heap.offer(key);
        if (heap.size() > k) heap.poll();
    }
    return new ArrayList<>(heap);
}
`,
        pitfall: 'For the k largest keep a MIN-heap, and for the k smallest keep a MAX-heap. The "wrong" heap type feels odd but is what makes eviction work.',
      },
    ],
  },
  {
    id: 'deque',
    title: 'Deque (ArrayDeque)',
    blurb: 'One class for stacks, queues and sliding windows.',
    cards: [
      {
        id: 'deque-stack',
        title: 'ArrayDeque as a stack',
        tag: 'must know',
        text: 'Prefer ArrayDeque to the legacy Stack class. push, pop and peek all work on the front of the deque.',
        code: j`
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.push(3);
System.out.println(stack.peek());        // 3 (top, not removed)
System.out.println(stack.pop());         // 3
System.out.println(stack.size());        // 2

// matching brackets
boolean balanced = true;
Deque<Character> open = new ArrayDeque<>();
for (char c : "([]{})".toCharArray()) {
    if ("([{".indexOf(c) >= 0) open.push(c);
    else {
        if (open.isEmpty()) { balanced = false; break; }
        char o = open.pop();
        if ("([{".indexOf(o) != ")]}".indexOf(c)) { balanced = false; break; }
    }
}
System.out.println(balanced && open.isEmpty());   // true
`,
        pitfall: 'pop() on an empty deque throws NoSuchElementException, while peek() returns null. ArrayDeque also rejects null elements.',
      },
      {
        id: 'deque-queue',
        title: 'ArrayDeque as a queue (BFS)',
        tag: 'very common',
        text: 'offer adds at the tail and poll removes from the head. For BFS, freeze the queue size at the start of each level to count levels.',
        code: j`
int[][] graph = {{1, 2}, {3}, {3}, {}};     // adjacency by index
boolean[] seen = new boolean[graph.length];
Queue<Integer> q = new ArrayDeque<>();
q.offer(0);
seen[0] = true;
int level = 0;
while (!q.isEmpty()) {
    int width = q.size();                   // nodes in the current level
    for (int i = 0; i < width; i++) {
        int node = q.poll();
        for (int next : graph[node]) {
            if (!seen[next]) { seen[next] = true; q.offer(next); }
        }
    }
    level++;
}
System.out.println(level);                  // 3 levels: {0}, {1,2}, {3}
`,
        pitfall: 'Mark nodes as seen when you enqueue them, not when you dequeue. Otherwise the same node can be queued many times.',
      },
      {
        id: 'deque-monotonic',
        title: 'Both ends and the monotonic window',
        tag: 'very common',
        text: 'A Deque works at both ends. Keep indexes in decreasing value order and the front always holds the window maximum.',
        code: j`
static void bothEnds() {
    Deque<Integer> d = new ArrayDeque<>();
    d.offerFirst(2); d.offerLast(3); d.offerFirst(1);   // [1, 2, 3]
    int f = d.peekFirst();       // 1
    int l = d.pollLast();        // 3
    System.out.println(f + " " + l + " " + d);          // 1 3 [1, 2]
}

static int[] windowMax(int[] nums, int k) {
    int[] out = new int[nums.length - k + 1];
    Deque<Integer> idx = new ArrayDeque<>();        // indexes, values decreasing
    for (int i = 0; i < nums.length; i++) {
        if (!idx.isEmpty() && idx.peekFirst() <= i - k) idx.pollFirst();   // left the window
        while (!idx.isEmpty() && nums[idx.peekLast()] <= nums[i]) idx.pollLast();
        idx.offerLast(i);
        if (i >= k - 1) out[i - k + 1] = nums[idx.peekFirst()];
    }
    return out;
}
`,
        pitfall: 'Store indexes, not values, so you can tell when the front has slid out of the window.',
      },
    ],
  },
  {
    id: 'bits',
    title: 'Bit operations',
    blurb: 'Masks, tricks and the library helpers behind them.',
    cards: [
      {
        id: 'bit-basics',
        title: 'Operators and single-bit edits',
        tag: 'must know',
        text: 'Build a mask with 1 << i, then test, set, clear or toggle bit i of n using AND, OR, AND-NOT and XOR.',
        code: j`
int n = 0b1010;                       // 10
int i = 2;
boolean isSet = ((n >> i) & 1) == 1;  // false
int set = n | (1 << i);               // 14  (1110)
int clear = n & ~(1 << 1);            // 8   (1000)
int flip = n ^ (1 << 0);              // 11  (1011)

int shl = 3 << 4;                     // 48  (multiply by 16)
int shr = -16 >> 2;                   // -4  (sign extends)
int ushr = -16 >>> 28;                // 15  (zero fills)
int and = 12 & 10, or = 12 | 10, xor = 12 ^ 10;   // 8, 14, 6
int not = ~5;                         // -6

long wide = 1L << 40;                 // use L for shifts of 31 or more
`,
        pitfall: '1 << 31 is negative, and 1 << 32 is 1 (the shift count wraps modulo 32). Use 1L << i when i may reach 31 or more.',
      },
      {
        id: 'bit-tricks',
        title: 'Classic one-liners',
        tag: 'very common',
        text: 'n & (n - 1) drops the lowest set bit, n & -n isolates it, and XOR cancels equal values.',
        code: j`
int n = 40;                                   // 101000
int dropped = n & (n - 1);                    // 32  (100000)
int lowest = n & -n;                          // 8   (001000)
boolean pow2 = n > 0 && (n & (n - 1)) == 0;   // false

boolean odd = (-3 & 1) == 1;                  // true; -3 % 2 == -1 would fail a "== 1" test
int half = n >> 1;                            // 20

// the element that appears once while the rest appear twice
int[] nums = {4, 1, 2, 1, 2};
int single = 0;
for (int x : nums) single ^= x;               // 4

// swap without a temp
int a = 5, b = 9;
a ^= b; b ^= a; a ^= b;                       // a = 9, b = 5
`,
        pitfall: 'XOR swap breaks when both names refer to the same array slot (x[i] and x[j] with i == j zeroes it). Use a temp variable on arrays.',
      },
      {
        id: 'bit-library',
        title: 'Integer and Long bit helpers',
        text: 'The JDK already has hardware-backed helpers for counting and locating bits. Use them instead of loops.',
        code: j`
int n = 0b101100;                                  // 44
int ones = Integer.bitCount(n);                    // 3
int lead = Integer.numberOfLeadingZeros(n);        // 26
int trail = Integer.numberOfTrailingZeros(n);      // 2
int bitLength = 32 - lead;                         // 6
int top = Integer.highestOneBit(n);                // 32
int lowBit = Integer.lowestOneBit(n);              // 4
int rev = Integer.reverse(1);                      // -2147483648 (bit moved to the top)
int rotated = Integer.rotateLeft(1, 33);           // 2

long big = (1L << 40) | 1;
int bigOnes = Long.bitCount(big);                  // 2

// Kernighan: one iteration per set bit
int count = 0;
for (int x = n; x != 0; x &= x - 1) count++;       // 3
`,
        pitfall: 'numberOfLeadingZeros(0) is 32, so bitLength of 0 comes out as 0. Handle zero explicitly if it matters.',
      },
      {
        id: 'bit-subsets',
        title: 'Subset masks and mask DP',
        tag: 'very common',
        text: 'Each integer from 0 to 2^n - 1 describes one subset of n items. Bit i says whether item i is in the subset.',
        code: j`
int[] items = {10, 20, 30};
int n = items.length;
List<List<Integer>> subsets = new ArrayList<>();
for (int mask = 0; mask < (1 << n); mask++) {
    List<Integer> cur = new ArrayList<>();
    for (int i = 0; i < n; i++) {
        if ((mask & (1 << i)) != 0) cur.add(items[i]);
    }
    subsets.add(cur);
}
System.out.println(subsets.size());        // 8

// iterate the submasks of a mask
int full = 0b1011;
for (int sub = full; sub > 0; sub = (sub - 1) & full) {
    System.out.print(sub + " ");           // 11 10 9 8 3 2 1
}

// visited set of up to 31 items in one int
int visited = 0;
visited |= 1 << 5;
boolean was = (visited & (1 << 5)) != 0;   // true
`,
        pitfall: 'Mask enumeration is exponential, so it only fits n up to about 20. For 20 < n <= 31 use long masks with 1L <<.',
      },
    ],
  },
  {
    id: 'grid',
    title: 'Grid & matrix utilities',
    blurb: 'Neighbours, flat indexes and the standard traversals.',
    cards: [
      {
        id: 'grid-directions',
        title: 'Direction arrays and bounds checks',
        tag: 'must know',
        text: 'Keep the four (or eight) moves in a table and loop over it. Check bounds before touching the cell.',
        code: j`
int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
int[][] DIRS8 = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

int[][] grid = new int[3][4];
int rows = grid.length, cols = grid[0].length;
int r = 1, c = 1, open = 0;
for (int[] d : DIRS) {
    int nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (grid[nr][nc] == 0) open++;
}
System.out.println(open);                   // 4

// compact alternative for the 4-neighbour case
int[] dr = {1, -1, 0, 0}, dc = {0, 0, 1, -1};
for (int k = 0; k < 4; k++) { int nr = r + dr[k], nc = c + dc[k]; }
`,
        pitfall: 'grid.length is the number of rows and grid[0].length the number of columns. A non-square grid exposes any swap immediately.',
      },
      {
        id: 'grid-index',
        title: 'Cell index conversion',
        tag: 'very common',
        text: 'Flatten (row, col) into one id for union-find, visited sets or parent arrays, and convert back with / and %.',
        code: j`
int rows = 3, cols = 4;
int r = 2, c = 1;
int id = r * cols + c;                  // 9
int backR = id / cols;                  // 2
int backC = id % cols;                  // 1

int total = rows * cols;                // size of a flat parent / visited array
boolean[] seen = new boolean[total];
seen[id] = true;

// diagonals: cells on one diagonal share r - c, anti-diagonals share r + c
int diag = r - c + (cols - 1);          // shift to a non-negative index (0..rows+cols-2)
int anti = r + c;
int[] diagSum = new int[rows + cols - 1];
diagSum[anti] += 5;

// flatten and rebuild a matrix
int[][] m = {{1, 2, 3}, {4, 5, 6}};
int[] flat = Arrays.stream(m).flatMapToInt(Arrays::stream).toArray();  // [1..6]
`,
        pitfall: 'Always multiply by the number of COLUMNS: id = r * cols + c. Using rows only works for square grids and fails silently.',
      },
      {
        id: 'grid-traversal',
        title: 'Traversal patterns',
        text: 'Row-major and column-major are plain nested loops. Diagonals fix r + c, and rotation is transpose plus a row reverse.',
        code: j`
static void floodFill(int[][] g, int r, int c, int from, int to) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != from) return;
    g[r][c] = to;                       // overwriting doubles as the visited mark
    floodFill(g, r + 1, c, from, to);
    floodFill(g, r - 1, c, from, to);
    floodFill(g, r, c + 1, from, to);
    floodFill(g, r, c - 1, from, to);
}

static void rotateClockwise(int[][] m) {      // n x n only
    int n = m.length;
    for (int i = 0; i < n; i++)
        for (int k = i + 1; k < n; k++) { int t = m[i][k]; m[i][k] = m[k][i]; m[k][i] = t; }
    for (int[] row : m)
        for (int a = 0, b = n - 1; a < b; a++, b--) { int t = row[a]; row[a] = row[b]; row[b] = t; }
}

static List<Integer> antiDiagonal(int[][] g, int d) {   // all cells with r + c == d
    List<Integer> out = new ArrayList<>();
    for (int r = 0; r < g.length; r++) {
        int c = d - r;
        if (c >= 0 && c < g[0].length) out.add(g[r][c]);
    }
    return out;
}
`,
        pitfall: 'Recursive flood fill can overflow the stack on large grids (about 10^4 deep is risky). Switch to an explicit stack or BFS queue.',
      },
    ],
  },
  {
    id: 'building-blocks',
    title: 'DSA building blocks',
    blurb: 'Small routines you will rewrite from memory in interviews.',
    cards: [
      {
        id: 'gcd-lcm-prime',
        title: 'gcd, lcm and primes',
        tag: 'must know',
        text: 'Euclid gives gcd in O(log n). Divide before multiplying for lcm. Trial division only needs to reach the square root.',
        code: j`
static int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }

static long lcm(long a, long b) { return a / gcd((int) a, (int) b) * b; }

static boolean isPrime(int n) {
    if (n < 2) return false;
    for (long i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

static boolean[] sieve(int n) {            // composite[i] is true when i is not prime
    boolean[] composite = new boolean[n + 1];
    for (int i = 2; (long) i * i <= n; i++) {
        if (!composite[i]) {
            for (int k = i * i; k <= n; k += i) composite[k] = true;
        }
    }
    return composite;
}
`,
        pitfall: 'Compute lcm as a / gcd * b, not a * b / gcd. The product can overflow even when the answer fits. Use long for i * i in the prime loop.',
      },
      {
        id: 'rotated-pivot',
        title: 'Pivot of a rotated sorted array',
        tag: 'very common',
        text: 'The minimum of a rotated sorted array (distinct values) is where the order breaks. Compare mid with the right end to discard half each step.',
        code: j`
static int pivotIndex(int[] a) {            // index of the minimum
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > a[hi]) lo = mid + 1;   // minimum is strictly right of mid
        else hi = mid;                      // mid itself could be the minimum
    }
    return lo;
}

static int searchRotated(int[] a, int target) {
    int p = pivotIndex(a), n = a.length;
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        int real = (mid + p) % n;           // map the sorted view onto the rotated array
        if (a[real] == target) return real;
        if (a[real] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
`,
        pitfall: 'This loop assumes distinct values. With duplicates, a[mid] == a[hi] is ambiguous and the worst case degrades to O(n) (use hi-- in that case).',
      },
      {
        id: 'palindrome',
        title: 'Palindrome checks',
        text: 'Two pointers moving inward, skipping characters that do not count. For the longest palindromic substring, expand around each centre.',
        code: j`
static boolean isPalindrome(String s) {
    int i = 0, k = s.length() - 1;
    while (i < k) {
        while (i < k && !Character.isLetterOrDigit(s.charAt(i))) i++;
        while (i < k && !Character.isLetterOrDigit(s.charAt(k))) k--;
        if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(k))) return false;
        i++; k--;
    }
    return true;
}

static String longestPalindrome(String s) {
    int bestL = 0, bestR = 0;
    for (int c = 0; c < s.length(); c++) {
        for (int odd = 0; odd < 2; odd++) {          // odd: centre c, even: centre between c and c+1
            int l = c, r = c + odd;
            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
            if (r - l - 1 > bestR - bestL + 1) { bestL = l + 1; bestR = r - 1; }
        }
    }
    return s.substring(bestL, bestR + 1);
}
`,
        pitfall: 'After the expand loop ends, l and r are one step past the palindrome on each side. The real bounds are l + 1 and r - 1.',
      },
      {
        id: 'node-templates',
        title: 'Node class templates',
        tag: 'very common',
        text: 'Interviewers usually give these classes, but you should be able to write them. Constructors keep test setup short.',
        code: j`
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}

class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

class TrieNode {
    TrieNode[] kids = new TrieNode[26];
    boolean end;
}

class GraphNode {
    int val;
    List<GraphNode> neighbors = new ArrayList<>();
    GraphNode(int val) { this.val = val; }
}

static ListNode build(int... vals) {          // dummy head avoids a special case for the first node
    ListNode dummy = new ListNode(0), tail = dummy;
    for (int v : vals) { tail.next = new ListNode(v); tail = tail.next; }
    return dummy.next;
}
`,
        pitfall: 'For linked-list surgery start from a dummy head node. It removes the "what if the head changes" branch from insert and delete logic.',
      },
      {
        id: 'mod-power',
        title: 'Modular arithmetic and fast power',
        tag: 'gotcha',
        text: 'Answers "modulo 10^9 + 7" need a long multiply before each remainder. Exponentiation by squaring computes powers in O(log e).',
        code: j`
static final long MOD = 1_000_000_007L;

static long power(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

static long inverse(long a) { return power(a, MOD - 2, MOD); }   // MOD must be prime

static long norm(long x) { return ((x % MOD) + MOD) % MOD; }      // fix negatives

static long nCr(int n, int r) {
    long num = 1, den = 1;
    for (int i = 0; i < r; i++) { num = num * (n - i) % MOD; den = den * (i + 1) % MOD; }
    return num * inverse(den) % MOD;
}
`,
        pitfall: 'int * int overflows before % runs. Keep operands in long, and reduce after every multiplication, not once at the end.',
      },
      {
        id: 'union-find',
        title: 'Compact union-find',
        tag: 'very common',
        text: 'Path halving plus union by size gives near-constant time per operation. The component counter is a free bonus.',
        code: j`
class DSU {
    int[] parent, size;
    int components;

    DSU(int n) {
        parent = new int[n];
        size = new int[n];
        components = n;
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;            // already connected: this edge closes a cycle
        if (size[a] < size[b]) { int t = a; a = b; b = t; }
        parent[b] = a;
        size[a] += size[b];
        components--;
        return true;
    }
}
`,
        pitfall: 'Union the ROOTS (find(a), find(b)), never the raw elements, otherwise the structure silently stops merging whole groups.',
      },
    ],
  },
  {
    id: 'sorting',
    title: 'Sorting comparator patterns',
    blurb: 'Custom orders for arrays, objects, maps and index lists.',
    cards: [
      {
        id: 'sort-intervals',
        title: 'Sorting int[][] and multi-key order',
        tag: 'must know',
        text: 'Comparator.comparingInt plus thenComparingInt builds readable multi-key sorts. Interval problems almost always start with this.',
        code: j`
int[][] iv = {{3, 5}, {1, 4}, {1, 2}, {6, 7}};

Arrays.sort(iv, (a, b) -> Integer.compare(a[0], b[0]));                   // by start
Arrays.sort(iv, Comparator.comparingInt(a -> a[0]));                      // same
Arrays.sort(iv, Comparator.<int[]>comparingInt(a -> a[0]).thenComparingInt(a -> a[1]));
Arrays.sort(iv, (a, b) -> a[0] != b[0] ? b[0] - a[0] : a[1] - b[1]);      // start desc, end asc

System.out.println(Arrays.deepToString(iv));   // [[6, 7], [3, 5], [1, 2], [1, 4]]

Integer[] desc = {3, 1, 2};
Arrays.sort(desc, Comparator.reverseOrder());  // needs boxed Integer[]
`,
        pitfall: 'a[0] - b[0] overflows when values have opposite signs and large magnitude. Integer.compare is always safe.',
      },
      {
        id: 'sort-objects-strings',
        title: 'Sorting strings and records',
        tag: 'very common',
        text: 'Chain comparators with thenComparing, flip with reversed(), and write custom orders as a lambda when the rule is unusual.',
        code: j`
List<String> words = new ArrayList<>(List.of("pear", "fig", "apple", "kiwi", "date"));
words.sort(Comparator.comparingInt(String::length).thenComparing(Comparator.naturalOrder()));
System.out.println(words);   // [fig, date, kiwi, pear, apple]

words.sort(Comparator.comparing(String::length).reversed());

record Person(String name, int age) {}
List<Person> people = new ArrayList<>(List.of(new Person("Zed", 30), new Person("Amy", 30), new Person("Bo", 25)));
people.sort(Comparator.comparingInt(Person::age).reversed().thenComparing(Person::name));
System.out.println(people.get(0).name());   // Amy

// "largest number": order by which concatenation is bigger
String[] nums = {"3", "30", "34", "5", "9"};
Arrays.sort(nums, (a, b) -> (b + a).compareTo(a + b));
System.out.println(String.join("", nums));  // 9534330
`,
        pitfall: 'A comparator must be consistent (transitive, symmetric). Sloppy ones throw "Comparison method violates its general contract" on bigger inputs.',
      },
      {
        id: 'sort-entries-indices',
        title: 'Sorting map entries and index arrays',
        text: 'Sort entries by value to rank frequencies. To sort indexes by the values they point to, box them into an Integer[].',
        code: j`
Map<String, Integer> freq = new HashMap<>(Map.of("a", 3, "b", 5, "c", 3));
List<Map.Entry<String, Integer>> entries = new ArrayList<>(freq.entrySet());
entries.sort((x, y) -> y.getValue() != x.getValue().intValue()
        ? Integer.compare(y.getValue(), x.getValue())
        : x.getKey().compareTo(y.getKey()));                // value desc, then key asc
System.out.println(entries.get(0).getKey());               // b

List<String> top2 = freq.entrySet().stream()
    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
    .limit(2).map(Map.Entry::getKey).collect(Collectors.toList());   // [b, a]

int[] vals = {40, 10, 30, 20};
Integer[] order = new Integer[vals.length];
for (int i = 0; i < order.length; i++) order[i] = i;
Arrays.sort(order, (i, k) -> Integer.compare(vals[i], vals[k]));
System.out.println(Arrays.toString(order));                // [1, 3, 2, 0]
`,
        pitfall: 'Comparing boxed Integers with == or != only works for small cached values (-128..127). Use equals, intValue() or Integer.compare.',
      },
    ],
  },
  {
    id: 'tree-collections',
    title: 'TreeMap, TreeSet, LinkedHashMap',
    blurb: 'Ordered collections for range queries and caches.',
    cards: [
      {
        id: 'treemap-treeset',
        title: 'Sorted lookups with TreeMap and TreeSet',
        tag: 'very common',
        text: 'Both keep keys sorted in a balanced tree, so floor/ceiling-style queries cost O(log n). Great for "closest value" and calendar problems.',
        code: j`
TreeSet<Integer> set = new TreeSet<>(List.of(10, 20, 30, 40));
Integer fl = set.floor(25);          // 20  (greatest <= 25)
Integer ce = set.ceiling(25);        // 30  (smallest >= 25)
Integer lo = set.lower(20);          // 10  (strictly less)
Integer hi = set.higher(40);         // null
int first = set.first(), last = set.last();
set.pollFirst();                     // removes 10
SortedSet<Integer> range = set.subSet(20, 40);   // [20, 30], end exclusive

TreeMap<Integer, String> tm = new TreeMap<>();
tm.put(5, "five"); tm.put(1, "one"); tm.put(9, "nine");
System.out.println(tm.firstKey());                    // 1
System.out.println(tm.floorEntry(6).getValue());      // five
System.out.println(tm.headMap(5));                    // {1=one}
System.out.println(tm.tailMap(5, true));              // {5=five, 9=nine}
Map.Entry<Integer, String> e = tm.pollLastEntry();    // 9=nine

TreeMap<Integer, Integer> counts = new TreeMap<>(Comparator.reverseOrder());  // sorted multiset
counts.merge(4, 1, Integer::sum);
`,
        pitfall: 'floor, ceiling, lower and higher return null when nothing qualifies. Unboxing that null into an int throws NullPointerException.',
      },
      {
        id: 'linkedhashmap-lru',
        title: 'LinkedHashMap and an LRU cache',
        tag: 'gotcha',
        text: 'LinkedHashMap remembers insertion order. With accessOrder = true each read moves the key to the end, which is exactly an LRU policy.',
        code: j`
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;

    LRUCache(int capacity) {
        super(16, 0.75f, true);            // true = access order
        this.capacity = capacity;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;          // evict the least recently used
    }
}

static void demo() {
    LRUCache<Integer, String> cache = new LRUCache<>(2);
    cache.put(1, "a");
    cache.put(2, "b");
    cache.get(1);                          // 1 becomes most recent
    cache.put(3, "c");                     // evicts key 2
    System.out.println(cache.keySet());    // [1, 3]
}
`,
        pitfall: 'Without the true access-order flag the map evicts the OLDEST INSERTED key, which is FIFO rather than LRU. Interviewers may still want a hand-built hash map plus doubly linked list.',
      },
    ],
  },
  {
    id: 'init',
    title: 'Common initialization patterns',
    blurb: 'The first lines of the solution: tables, graphs and result holders.',
    cards: [
      {
        id: 'init-freq',
        title: 'Frequency and visited arrays',
        tag: 'very common',
        text: 'Size the array by the alphabet. Java zero-fills it, so counters start at 0 and boolean flags at false.',
        code: j`
int[] lower = new int[26];             // 'a'..'z'
int[] ascii = new int[128];            // any ASCII char, index by the char itself
boolean[] seen = new boolean[26];

for (char c : "leetcode".toCharArray()) lower[c - 'a']++;
for (char c : "Hi!".toCharArray()) ascii[c]++;

// anagram test: equal count arrays
int[] a = new int[26], b = new int[26];
for (char c : "listen".toCharArray()) a[c - 'a']++;
for (char c : "silent".toCharArray()) b[c - 'a']++;
System.out.println(Arrays.equals(a, b));   // true

// counts for values 1..n need n + 1 slots
int n = 6;
int[] cnt = new int[n + 1];
cnt[n]++;
`,
        pitfall: 'Uppercase letters, digits and spaces make c - \'a\' negative or too large and throw ArrayIndexOutOfBounds. Use 128 or 256 slots when the alphabet is not fixed.',
      },
      {
        id: 'init-adjacency',
        title: 'Adjacency lists',
        tag: 'must know',
        text: 'Create every inner list up front so graph[u].add(v) never meets a null. Add both directions for undirected edges.',
        code: j`
int n = 5;
int[][] edges = {{0, 1}, {0, 2}, {1, 3}, {3, 4}};

List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
for (int[] e : edges) {
    graph.get(e[0]).add(e[1]);
    graph.get(e[1]).add(e[0]);                // undirected
}

// weighted: store {neighbour, weight}
List<int[]>[] wg = new List[n];
for (int i = 0; i < n; i++) wg[i] = new ArrayList<>();
wg[0].add(new int[]{1, 7});

// sparse or non-numeric labels
Map<String, List<String>> byName = new HashMap<>();
byName.computeIfAbsent("A", k -> new ArrayList<>()).add("B");

int[] indegree = new int[n];
for (int[] e : edges) indegree[e[1]]++;       // for topological sort
`,
        pitfall: 'new List[n] leaves every slot null and triggers an unchecked warning. Fill the slots before use, or prefer List<List<Integer>>.',
      },
      {
        id: 'init-dp',
        title: 'DP table setup',
        tag: 'very common',
        text: 'Pick the table size and the base cases first. Use INF for "impossible" in minimisation and 0 or 1 for counting.',
        code: j`
int n = 10;
int[] ways = new int[n + 1];
ways[0] = 1;                                   // one way to make 0

int amount = 11;
int[] coinDp = new int[amount + 1];
Arrays.fill(coinDp, amount + 1);               // "impossible" marker
coinDp[0] = 0;

int m = 4;
int[][] grid = new int[m + 1][n + 1];          // extra row/col act as padding
boolean[][] reach = new boolean[m][n];
reach[0][0] = true;

int[][] memo = new int[m][n];
for (int[] row : memo) Arrays.fill(row, -1);   // -1 = not computed yet

long[] big = new long[n + 1];                  // use long if counts can be large
Integer[] lazy = new Integer[n];               // null = not computed yet
`,
        pitfall: 'Arrays.fill(memo, new int[n]) puts the SAME row object in every slot, so cells alias each other. Fill each row separately in a loop.',
      },
      {
        id: 'init-results',
        title: 'Result variables and return values',
        tag: 'gotcha',
        text: 'Choose the initial value so the first real candidate always wins, and pick a "not found" value that cannot be a real answer.',
        code: j`
static int maxSubarray(int[] nums) {
    int best = nums[0], cur = nums[0];           // not 0, or all-negative input returns 0
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        best = Math.max(best, cur);
    }
    return best;
}

static int[] nextGreater(int[] a) {
    int[] ans = new int[a.length];
    Arrays.fill(ans, -1);                        // -1 means "no greater element"
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < a.length; i++) {
        while (!st.isEmpty() && a[st.peek()] < a[i]) ans[st.pop()] = a[i];
        st.push(i);
    }
    return ans;
}

static int[] twoSum(int[] a, int t) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < a.length; i++) {
        Integer j = seen.get(t - a[i]);
        if (j != null) return new int[]{j, i};
        seen.put(a[i], i);
    }
    return new int[]{-1, -1};                    // explicit "no answer"
}

static long sumAll(int[] a) { long s = 0; for (int x : a) s += x; return s; }  // widen the accumulator
`,
        pitfall: 'Starting a maximum at 0 hides all-negative answers. Start from the first element or Integer.MIN_VALUE (and never add to MIN_VALUE).',
      },
      {
        id: 'init-parse-edge',
        title: 'Integer parsing edge cases',
        tag: 'gotcha',
        text: 'A hand-written atoi has to handle whitespace, an optional sign, stray characters and overflow. Check overflow before it happens.',
        code: j`
static int myAtoi(String s) {
    int i = 0, n = s.length();
    while (i < n && s.charAt(i) == ' ') i++;               // leading spaces
    int sign = 1;
    if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-')) {
        sign = s.charAt(i) == '-' ? -1 : 1;
        i++;
    }
    int result = 0;
    while (i < n && Character.isDigit(s.charAt(i))) {
        int digit = s.charAt(i) - '0';
        if (result > (Integer.MAX_VALUE - digit) / 10) {   // next step would overflow
            return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
        }
        result = result * 10 + digit;
        i++;
    }
    return sign * result;
}

static Integer tryParse(String s) {
    try { return Integer.parseInt(s.trim()); }
    catch (NumberFormatException e) { return null; }       // "", "abc", "99999999999"
}
`,
        pitfall: 'Integer.parseInt("2147483648") and parseInt("") both throw. For values that may exceed int, parse as long (or BigInteger) and compare to the bounds.',
      },
    ],
  },
];

export const TOTAL_CARDS = CHEATSHEET.reduce((n, t) => n + t.cards.length, 0);
