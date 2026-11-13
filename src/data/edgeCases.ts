/**
 * Edge-case checklist: the bugs that fail interviews.
 * Every card has a BUGGY and a FIXED Java snippet (instance methods, only java.util needed;
 * ListNode / TreeNode are the usual LeetCode shapes). Snippets are checked by compiling and running
 * them against each other in an out-of-tree harness.
 */

export interface EdgeCard {
  id: string;
  title: string;
  /** What goes wrong, one or two sentences. */
  wrong: string;
  buggy: string;
  fixed: string;
  /** One-line rule of thumb. */
  rule: string;
}

export interface EdgeTopic {
  id: string;
  title: string;
  blurb: string;
  cards: EdgeCard[];
}

/** Template tag: raw text, no leading newline / trailing whitespace. Never use backticks or dollar-brace inside. */
const j = (s: TemplateStringsArray, ...v: unknown[]): string => String.raw(s, ...v).replace(/^\n|\s+$/g, '');

export const EDGE_TOPICS: EdgeTopic[] = [
  {
    id: 'overflow',
    title: 'Integer overflow',
    blurb: 'An int wraps around silently at about 2.1 billion. No exception, just a wrong answer.',
    cards: [
      {
        id: 'overflow-add',
        title: 'Summing many ints',
        wrong: 'An int accumulator wraps past 2,147,483,647 and goes negative. The loop looks fine; the total is garbage.',
        buggy: j`
long sum(int[] nums) {
    int total = 0;
    for (int x : nums) total += x;
    return total;   // widened too late
}`,
        fixed: j`
long sum(int[] nums) {
    long total = 0;
    for (int x : nums) total += x;
    return total;
}`,
        rule: 'If the true total can exceed about 2 billion, the accumulator must be a long from the start.',
      },
      {
        id: 'overflow-mul',
        title: 'Multiplying before widening',
        wrong: 'Assigning w * h to a long does not help: the multiplication is done in int first, then widened. The damage is already done.',
        buggy: j`
long area(int w, int h) {
    return w * h;           // int * int overflows
}`,
        fixed: j`
long area(int w, int h) {
    return (long) w * h;    // widen one operand first
}`,
        rule: 'Cast an operand before the operator runs; casting the result is too late.',
      },
      {
        id: 'overflow-mid',
        title: 'Binary-search midpoint',
        wrong: 'lo + hi can exceed Integer.MAX_VALUE when both indexes are large, so mid turns negative and the search indexes out of range.',
        buggy: j`
int mid(int lo, int hi) {
    return (lo + hi) / 2;
}`,
        fixed: j`
int mid(int lo, int hi) {
    return lo + (hi - lo) / 2;
}`,
        rule: 'Write the midpoint as lo + (hi - lo) / 2 every single time, even when arrays are small.',
      },
      {
        id: 'overflow-abs',
        title: 'Math.abs(Integer.MIN_VALUE)',
        wrong: 'The int range has one more negative value than positive, so abs and unary minus leave MIN_VALUE negative. A hash bucket computed with abs(h) % n can come out negative.',
        buggy: j`
int bucket(int hash, int n) {
    return Math.abs(hash) % n;
}`,
        fixed: j`
int bucket(int hash, int n) {
    return (hash & Integer.MAX_VALUE) % n;   // clear the sign bit
}`,
        rule: 'Never trust abs or negation on an arbitrary int; mask the sign bit or widen to long first.',
      },
      {
        id: 'overflow-inf',
        title: 'INF plus an edge cost',
        wrong: 'With INF = Integer.MAX_VALUE, dist[u] + w wraps to a negative number and looks like a brilliant shortcut from an unreachable node.',
        buggy: j`
boolean relax(int[] dist, int u, int v, int w) {
    if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        return true;
    }
    return false;
}`,
        fixed: j`
boolean relax(int[] dist, int u, int v, int w) {
    if (dist[u] == Integer.MAX_VALUE) return false;   // unreachable: skip
    long cand = (long) dist[u] + w;
    if (cand < dist[v]) {
        dist[v] = (int) cand;
        return true;
    }
    return false;
}`,
        rule: 'Skip INF sources explicitly, or use INF = MAX / 2, or compute in long before comparing.',
      },
    ],
  },
  {
    id: 'empty',
    title: 'Empty / null input',
    blurb: 'The first line of the body often indexes element 0. Decide what an empty input means before writing the loop.',
    cards: [
      {
        id: 'empty-array',
        title: 'Empty array',
        wrong: 'Seeding with prices[0] throws ArrayIndexOutOfBoundsException when the array is empty.',
        buggy: j`
int maxProfit(int[] prices) {
    int minSoFar = prices[0];
    int best = 0;
    for (int p : prices) {
        minSoFar = Math.min(minSoFar, p);
        best = Math.max(best, p - minSoFar);
    }
    return best;
}`,
        fixed: j`
int maxProfit(int[] prices) {
    if (prices == null || prices.length == 0) return 0;
    int minSoFar = prices[0];
    int best = 0;
    for (int p : prices) {
        minSoFar = Math.min(minSoFar, p);
        best = Math.max(best, p - minSoFar);
    }
    return best;
}`,
        rule: 'Put the null and empty guard on line one, and state aloud what the answer for nothing is.',
      },
      {
        id: 'empty-string',
        title: 'Empty string',
        wrong: 'charAt(0) on "" throws StringIndexOutOfBoundsException before the loop even starts.',
        buggy: j`
String compress(String s) {
    StringBuilder sb = new StringBuilder();
    char prev = s.charAt(0);
    int run = 1;
    for (int i = 1; i < s.length(); i++) {
        if (s.charAt(i) == prev) run++;
        else {
            sb.append(prev).append(run);
            prev = s.charAt(i);
            run = 1;
        }
    }
    sb.append(prev).append(run);
    return sb.toString();
}`,
        fixed: j`
String compress(String s) {
    if (s == null || s.isEmpty()) return "";
    StringBuilder sb = new StringBuilder();
    char prev = s.charAt(0);
    int run = 1;
    for (int i = 1; i < s.length(); i++) {
        if (s.charAt(i) == prev) run++;
        else {
            sb.append(prev).append(run);
            prev = s.charAt(i);
            run = 1;
        }
    }
    sb.append(prev).append(run);
    return sb.toString();
}`,
        rule: 'Any code that reads the first character must first prove the string has one.',
      },
      {
        id: 'empty-list',
        title: 'Null linked-list head',
        wrong: 'Dereferencing head.val without a null check crashes on an empty list, and also when every node is removed and head becomes null mid-loop.',
        buggy: j`
ListNode removeAll(ListNode head, int val) {
    while (head.val == val) head = head.next;
    ListNode cur = head;
    while (cur.next != null) {
        if (cur.next.val == val) cur.next = cur.next.next;
        else cur = cur.next;
    }
    return head;
}`,
        fixed: j`
ListNode removeAll(ListNode head, int val) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode cur = dummy;
    while (cur.next != null) {
        if (cur.next.val == val) cur.next = cur.next.next;
        else cur = cur.next;
    }
    return dummy.next;
}`,
        rule: 'A dummy node in front of the head removes every special case for head deletion and empty lists.',
      },
      {
        id: 'empty-tree',
        title: 'Null root and null child',
        wrong: 'Testing "is this a leaf" before testing "is this null" crashes on an empty tree, and on any node with only one child.',
        buggy: j`
int height(TreeNode root) {
    if (root.left == null && root.right == null) return 1;
    return 1 + Math.max(height(root.left), height(root.right));
}`,
        fixed: j`
int height(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(height(root.left), height(root.right));
}`,
        rule: 'Make the base case "node == null" first; leaf handling falls out of it for free.',
      },
    ],
  },
  {
    id: 'tiny',
    title: 'Single / two elements',
    blurb: 'Loops that start at index 1 or 2 quietly assume at least that many elements exist.',
    cards: [
      {
        id: 'tiny-rob',
        title: 'DP seeded with two base cases',
        wrong: 'Writing dp[1] unconditionally throws when there is only one house, and n = 0 breaks dp[0] as well.',
        buggy: j`
int rob(int[] nums) {
    int[] dp = new int[nums.length];
    dp[0] = nums[0];
    dp[1] = Math.max(nums[0], nums[1]);
    for (int i = 2; i < nums.length; i++) {
        dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);
    }
    return dp[nums.length - 1];
}`,
        fixed: j`
int rob(int[] nums) {
    int prev = 0, cur = 0;           // best for i-2, best for i-1
    for (int x : nums) {
        int next = Math.max(cur, prev + x);
        prev = cur;
        cur = next;
    }
    return cur;
}`,
        rule: 'Prefer rolling variables that start at "nothing taken yet" over hand-written base-case slots.',
      },
      {
        id: 'tiny-self-pair',
        title: 'An element paired with itself',
        wrong: 'Using lo <= hi lets both pointers land on the same index, so a single element can "add up" to the target by itself.',
        buggy: j`
int[] pairWithSum(int[] sorted, int target) {
    int lo = 0, hi = sorted.length - 1;
    while (lo <= hi) {
        int s = sorted[lo] + sorted[hi];
        if (s == target) return new int[]{lo, hi};
        if (s < target) lo++;
        else hi--;
    }
    return null;
}`,
        fixed: j`
int[] pairWithSum(int[] sorted, int target) {
    int lo = 0, hi = sorted.length - 1;
    while (lo < hi) {
        int s = sorted[lo] + sorted[hi];
        if (s == target) return new int[]{lo, hi};
        if (s < target) lo++;
        else hi--;
    }
    return null;
}`,
        rule: 'A pair needs two distinct positions: the pointers must stay strictly apart (lo < hi).',
      },
      {
        id: 'tiny-neighbours',
        title: 'Neighbour checks at the ends',
        wrong: 'Looping from 1 to n - 2 to dodge out-of-range neighbours silently skips the first and last element, so arrays of length 1 or 2 report nothing.',
        buggy: j`
int countPeaks(int[] a) {
    int c = 0;
    for (int i = 1; i < a.length - 1; i++) {
        if (a[i] > a[i - 1] && a[i] > a[i + 1]) c++;
    }
    return c;
}`,
        fixed: j`
int countPeaks(int[] a) {
    int c = 0;
    for (int i = 0; i < a.length; i++) {
        boolean leftOk = i == 0 || a[i] > a[i - 1];
        boolean rightOk = i == a.length - 1 || a[i] > a[i + 1];
        if (leftOk && rightOk) c++;
    }
    return c;
}`,
        rule: 'A missing neighbour should count as "no obstacle", not as a reason to skip the element.',
      },
    ],
  },
  {
    id: 'array',
    title: 'Array-specific',
    blurb: 'Inputs that are uniform, negative, zero-filled or already in the final order break "typical case" logic.',
    cards: [
      {
        id: 'array-equal',
        title: 'All elements equal',
        wrong: 'A second-largest tracker that only tests x > second also accepts a value equal to the maximum, so {5, 5, 5} reports 5 instead of "none".',
        buggy: j`
Integer secondLargest(int[] a) {
    long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
    for (int x : a) {
        if (x > first) { second = first; first = x; }
        else if (x > second) second = x;
    }
    return second == Long.MIN_VALUE ? null : (int) second;
}`,
        fixed: j`
Integer secondLargest(int[] a) {
    long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
    for (int x : a) {
        if (x > first) { second = first; first = x; }
        else if (x < first && x > second) second = x;   // strictly between
    }
    return second == Long.MIN_VALUE ? null : (int) second;
}`,
        rule: 'Ask whether "second" means second position or second distinct value, then test with all-equal input.',
      },
      {
        id: 'array-negative',
        title: 'All negative numbers',
        wrong: 'Starting the running maximum at 0 pretends an empty subarray is allowed, so an all-negative array returns 0 instead of its largest element.',
        buggy: j`
int maxSubarray(int[] nums) {
    int best = 0, cur = 0;
    for (int x : nums) {
        cur = Math.max(x, cur + x);
        best = Math.max(best, cur);
    }
    return best;
}`,
        fixed: j`
int maxSubarray(int[] nums) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        best = Math.max(best, cur);
    }
    return best;
}`,
        rule: 'Seed maximums from the first real element (or MIN_VALUE), never from 0.',
      },
      {
        id: 'array-zeros',
        title: 'Zeros in the input',
        wrong: 'Product-except-self by dividing the total by each element divides by zero, and a single zero makes the total useless anyway.',
        buggy: j`
int[] productExceptSelf(int[] nums) {
    int total = 1;
    for (int x : nums) total *= x;
    int[] out = new int[nums.length];
    for (int i = 0; i < nums.length; i++) out[i] = total / nums[i];
    return out;
}`,
        fixed: j`
int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] out = new int[n];
    int left = 1;
    for (int i = 0; i < n; i++) { out[i] = left; left *= nums[i]; }
    int right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= nums[i]; }
    return out;
}`,
        rule: 'Be suspicious of division in array tricks; prefix and suffix passes never divide.',
      },
      {
        id: 'array-sorted',
        title: 'Rotated array that was not rotated',
        wrong: 'Comparing a[mid] with a[lo] cannot tell a sorted-but-unrotated array from a rotated one, so the minimum is missed when the array is already ascending.',
        buggy: j`
int findMin(int[] a) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > a[lo]) lo = mid + 1;
        else hi = mid;
    }
    return a[lo];
}`,
        fixed: j`
int findMin(int[] a) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] > a[hi]) lo = mid + 1;   // the minimum is to the right
        else hi = mid;
    }
    return a[lo];
}`,
        rule: 'Compare against the right end: it is the one value that always reveals which half holds the pivot.',
      },
    ],
  },
  {
    id: 'window',
    title: 'Sliding window',
    blurb: 'Windows break at the extremes: too large to fit, never valid, and bookkeeping counters that drift.',
    cards: [
      {
        id: 'window-k',
        title: 'Window larger than the array',
        wrong: 'The first-window loop reads a[0..k-1] unconditionally and throws when k > n. The right answer is simply "no windows".',
        buggy: j`
int countWindows(int[] a, int k, int minSum) {
    int sum = 0, count = 0;
    for (int i = 0; i < k; i++) sum += a[i];
    if (sum >= minSum) count++;
    for (int i = k; i < a.length; i++) {
        sum += a[i] - a[i - k];
        if (sum >= minSum) count++;
    }
    return count;
}`,
        fixed: j`
int countWindows(int[] a, int k, int minSum) {
    if (k <= 0 || k > a.length) return 0;
    int sum = 0, count = 0;
    for (int i = 0; i < k; i++) sum += a[i];
    if (sum >= minSum) count++;
    for (int i = k; i < a.length; i++) {
        sum += a[i] - a[i - k];
        if (sum >= minSum) count++;
    }
    return count;
}`,
        rule: 'Guard k <= 0 and k > n before building the first window.',
      },
      {
        id: 'window-none',
        title: 'No window is ever valid',
        wrong: 'Tracking a minimum length from Integer.MAX_VALUE and returning it untouched hands the caller 2147483647 when no window qualified.',
        buggy: j`
int minSubarrayLen(int target, int[] nums) {
    int best = Integer.MAX_VALUE, sum = 0, left = 0;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best;
}`,
        fixed: j`
int minSubarrayLen(int target, int[] nums) {
    int best = Integer.MAX_VALUE, sum = 0, left = 0;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}`,
        rule: 'Whenever a result starts at a sentinel, translate "never updated" into the answer the problem wants.',
      },
      {
        id: 'window-matches',
        title: 'Matches counter at the boundary',
        wrong: 'A "letters currently satisfied" counter must go up when a count reaches the need and go down when it overshoots. Only handling one direction lets the counter drift.',
        buggy: j`
boolean checkInclusion(String p, String s) {
    if (p.length() > s.length()) return false;
    int[] need = new int[26], have = new int[26];
    for (char c : p.toCharArray()) need[c - 'a']++;
    int matches = 0;
    for (int i = 0; i < 26; i++) if (need[i] == 0) matches++;
    for (int i = 0; i < s.length(); i++) {
        int in = s.charAt(i) - 'a';
        have[in]++;
        if (have[in] == need[in]) matches++;
        if (i >= p.length()) {
            int out = s.charAt(i - p.length()) - 'a';
            have[out]--;
            if (have[out] == need[out]) matches++;
        }
        if (matches == 26) return true;
    }
    return false;
}`,
        fixed: j`
boolean checkInclusion(String p, String s) {
    if (p.length() > s.length()) return false;
    int[] need = new int[26], have = new int[26];
    for (char c : p.toCharArray()) need[c - 'a']++;
    int matches = 0;
    for (int i = 0; i < 26; i++) if (need[i] == 0) matches++;
    for (int i = 0; i < s.length(); i++) {
        int in = s.charAt(i) - 'a';
        have[in]++;
        if (have[in] == need[in]) matches++;
        else if (have[in] == need[in] + 1) matches--;     // just overshot
        if (i >= p.length()) {
            int out = s.charAt(i - p.length()) - 'a';
            have[out]--;
            if (have[out] == need[out]) matches++;
            else if (have[out] == need[out] - 1) matches--;   // just fell short
        }
        if (matches == 26) return true;
    }
    return false;
}`,
        rule: 'Each count change can enter or leave the "matched" state; handle both transitions on add and on remove.',
      },
    ],
  },
  {
    id: 'bsearch',
    title: 'Binary search',
    blurb: 'Most binary-search bugs are one of three: a loop that cannot shrink, a stop-too-early return, or a bad range.',
    cards: [
      {
        id: 'bsearch-loop',
        title: 'lo = mid never moves',
        wrong: 'With a lower-biased mid, lo = mid makes no progress once hi = lo + 1, so the loop spins forever.',
        buggy: j`
int lastAtMost(int[] a, int x) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= x) lo = mid;
        else hi = mid - 1;
    }
    return (a.length > 0 && a[lo] <= x) ? lo : -1;
}`,
        fixed: j`
int lastAtMost(int[] a, int x) {
    int lo = 0, hi = a.length - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo + 1) / 2;   // round up when lo = mid
        if (a[mid] <= x) lo = mid;
        else hi = mid - 1;
    }
    return (a.length > 0 && a[lo] <= x) ? lo : -1;
}`,
        rule: 'If a branch assigns lo = mid, round mid up; if it assigns hi = mid, round mid down.',
      },
      {
        id: 'bsearch-dups',
        title: 'First occurrence with duplicates',
        wrong: 'Returning as soon as a[mid] == target gives whichever duplicate the search happened to hit, not the first one.',
        buggy: j`
int firstIndex(int[] a, int t) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == t) return mid;
        if (a[mid] < t) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
        fixed: j`
int firstIndex(int[] a, int t) {
    int lo = 0, hi = a.length;           // lower bound: first index with a[i] >= t
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < t) lo = mid + 1;
        else hi = mid;
    }
    return (lo < a.length && a[lo] == t) ? lo : -1;
}`,
        rule: 'For first or last occurrence, search for a boundary (lower bound) instead of an exact hit.',
      },
      {
        id: 'bsearch-answer',
        title: 'Search-on-answer boundaries',
        wrong: 'Starting the speed range at 0 lets mid become 0 and divide by zero; the legal minimum speed is 1.',
        buggy: j`
int minSpeed(int[] piles, int h) {
    int lo = 0, hi = 0;
    for (int p : piles) hi = Math.max(hi, p);
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hoursNeeded(piles, mid) <= h) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
long hoursNeeded(int[] piles, int speed) {
    long hours = 0;
    for (int p : piles) hours += (p - 1) / speed + 1;
    return hours;
}`,
        fixed: j`
int minSpeed(int[] piles, int h) {
    int lo = 1, hi = 1;                   // smallest legal speed is 1
    for (int p : piles) hi = Math.max(hi, p);
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (hoursNeeded(piles, mid) <= h) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}
long hoursNeeded(int[] piles, int speed) {
    long hours = 0;
    for (int p : piles) hours += (p - 1) / speed + 1;
    return hours;
}`,
        rule: 'Derive lo and hi from what the answer can legally be, and confirm the check function accepts hi.',
      },
    ],
  },
  {
    id: 'list',
    title: 'Linked list',
    blurb: 'Pointer code fails on the shortest lists and on the order of your own statements.',
    cards: [
      {
        id: 'list-fastslow',
        title: 'Fast / slow null-check order',
        wrong: 'Checking fast.next before fast dereferences a null fast after an even-length hop. Two nodes are enough to crash it.',
        buggy: j`
ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast.next != null && fast != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}`,
        fixed: j`
ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}`,
        rule: 'In a && chain, test the outer pointer first, then the one you reach through it.',
      },
      {
        id: 'list-reverse',
        title: 'Save next before rewiring',
        wrong: 'Overwriting cur.next and then reading it to advance walks backwards into the node you just finished, losing the rest of the list.',
        buggy: j`
ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        cur.next = prev;
        prev = cur;
        cur = cur.next;     // already overwritten
    }
    return prev;
}`,
        fixed: j`
ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode next = cur.next;   // save first
        cur.next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}`,
        rule: 'Before changing any .next, stash the old one in a local variable.',
      },
      {
        id: 'list-removenth',
        title: 'Remove Nth from end when N equals length',
        wrong: 'Removing the head has no predecessor. Without a dummy node, the fast pointer runs off the end and the next line dereferences null.',
        buggy: j`
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode fast = head, slow = head;
    for (int i = 0; i < n; i++) fast = fast.next;
    while (fast.next != null) {
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;
    return head;
}`,
        fixed: j`
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode fast = dummy, slow = dummy;
    for (int i = 0; i < n; i++) fast = fast.next;
    while (fast.next != null) {
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;
    return dummy.next;
}`,
        rule: 'If the head can be deleted, start both pointers on a dummy node in front of it.',
      },
      {
        id: 'list-cycle',
        title: 'Cycle start, not meeting point',
        wrong: 'Floyd\'s first phase only proves a cycle exists; the node where slow and fast meet is generally inside the loop, not where it begins.',
        buggy: j`
ListNode cycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return slow;
    }
    return null;
}`,
        fixed: j`
ListNode cycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;          // phase two: restart one pointer
            while (p != slow) {
                p = p.next;
                slow = slow.next;
            }
            return p;
        }
    }
    return null;
}`,
        rule: 'After the meeting, walk one pointer from head and one from the meeting point at the same speed.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Tree',
    blurb: 'Trees can be deep, values can be extreme, and "root to leaf" is not the same as "any path".',
    cards: [
      {
        id: 'tree-skew',
        title: 'Skewed tree and the call stack',
        wrong: 'A chain of 100,000 nodes means 100,000 nested calls. Recursive height blows the stack even though the algorithm is O(n).',
        buggy: j`
int height(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(height(root.left), height(root.right));
}`,
        fixed: j`
int height(TreeNode root) {
    if (root == null) return 0;
    Deque<TreeNode> level = new ArrayDeque<>();
    level.add(root);
    int h = 0;
    while (!level.isEmpty()) {
        h++;
        for (int i = level.size(); i > 0; i--) {
            TreeNode node = level.poll();
            if (node.left != null) level.add(node.left);
            if (node.right != null) level.add(node.right);
        }
    }
    return h;
}`,
        rule: 'If depth can reach n, ask whether recursion is allowed; otherwise use an explicit queue or stack.',
      },
      {
        id: 'tree-bounds',
        title: 'BST bounds as int',
        wrong: 'Using Integer.MIN_VALUE and MAX_VALUE as the open bounds rejects a perfectly valid node whose value equals one of them.',
        buggy: j`
boolean isValidBST(TreeNode root) {
    return valid(root, Integer.MIN_VALUE, Integer.MAX_VALUE);
}
boolean valid(TreeNode n, int lo, int hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
}`,
        fixed: j`
boolean isValidBST(TreeNode root) {
    return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
}
boolean valid(TreeNode n, long lo, long hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
}`,
        rule: 'Keep bounds in a wider type than the values, or pass null for "no bound yet".',
      },
      {
        id: 'tree-negsum',
        title: 'Negative values in path sums',
        wrong: 'Pruning when the running sum goes past the target assumes values only grow. A negative node later can bring the sum back.',
        buggy: j`
boolean hasPathSum(TreeNode node, int remaining) {
    if (node == null || remaining < 0) return false;
    remaining -= node.val;
    if (node.left == null && node.right == null) return remaining == 0;
    return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}`,
        fixed: j`
boolean hasPathSum(TreeNode node, int remaining) {
    if (node == null) return false;
    remaining -= node.val;
    if (node.left == null && node.right == null) return remaining == 0;
    return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}`,
        rule: 'Only prune on a sum or product bound when every value is known to be non-negative.',
      },
      {
        id: 'tree-lca',
        title: 'LCA when one node is the ancestor',
        wrong: 'Declaring the LCA only where both targets sit in different subtrees misses the case where one target is an ancestor of the other.',
        buggy: j`
TreeNode ans;
TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
    ans = null;
    found(root, p, q);
    return ans;
}
int found(TreeNode n, TreeNode p, TreeNode q) {
    if (n == null) return 0;
    int l = found(n.left, p, q), r = found(n.right, p, q);
    if (l > 0 && r > 0) ans = n;
    return l + r + ((n == p || n == q) ? 1 : 0);
}`,
        fixed: j`
TreeNode ans;
TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
    ans = null;
    found(root, p, q);
    return ans;
}
int found(TreeNode n, TreeNode p, TreeNode q) {
    if (n == null) return 0;
    int l = found(n.left, p, q), r = found(n.right, p, q);
    int self = (n == p || n == q) ? 1 : 0;
    if (ans == null && l + r + self == 2) ans = n;   // deepest node that sees both
    return l + r + self;
}`,
        rule: 'Count how many targets a subtree contains, counting the node itself; the first node to reach two is the LCA.',
      },
    ],
  },
  {
    id: 'graph',
    title: 'Graph',
    blurb: 'Graphs are rarely one connected blob, and undirected edges point both ways.',
    cards: [
      {
        id: 'graph-disconnected',
        title: 'Disconnected graphs',
        wrong: 'Starting a traversal only from node 0 never visits other components, so a cycle there goes unnoticed.',
        buggy: j`
boolean hasCycle(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(e[1]);
    int[] state = new int[n];            // 0 new, 1 on path, 2 done
    return dfs(g, 0, state);
}
boolean dfs(List<List<Integer>> g, int u, int[] state) {
    state[u] = 1;
    for (int v : g.get(u)) {
        if (state[v] == 1) return true;
        if (state[v] == 0 && dfs(g, v, state)) return true;
    }
    state[u] = 2;
    return false;
}`,
        fixed: j`
boolean hasCycle(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(e[1]);
    int[] state = new int[n];            // 0 new, 1 on path, 2 done
    for (int s = 0; s < n; s++) {
        if (state[s] == 0 && dfs(g, s, state)) return true;
    }
    return false;
}
boolean dfs(List<List<Integer>> g, int u, int[] state) {
    state[u] = 1;
    for (int v : g.get(u)) {
        if (state[v] == 1) return true;
        if (state[v] == 0 && dfs(g, v, state)) return true;
    }
    state[u] = 2;
    return false;
}`,
        rule: 'Whole-graph questions need an outer loop over every unvisited node.',
      },
      {
        id: 'graph-dijkstra',
        title: 'Dijkstra: seen on push, stale entries, negative edges',
        wrong: 'Marking a node seen when it is first pushed locks in the first (not the shortest) distance. Correct Dijkstra relaxes freely and skips stale queue entries when popped. It also requires non-negative weights; use Bellman-Ford otherwise.',
        buggy: j`
int[] dijkstra(int n, int[][] edges, int src) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    boolean[] seen = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    dist[src] = 0;
    seen[src] = true;
    pq.add(new int[]{0, src});
    while (!pq.isEmpty()) {
        int u = pq.poll()[1];
        for (int[] e : g.get(u)) {
            int v = e[0];
            if (!seen[v]) {
                seen[v] = true;
                dist[v] = dist[u] + e[1];
                pq.add(new int[]{dist[v], v});
            }
        }
    }
    return dist;
}`,
        fixed: j`
int[] dijkstra(int n, int[][] edges, int src) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});   // weights must be >= 0
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
    dist[src] = 0;
    pq.add(new int[]{0, src});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;                  // stale entry
        for (int[] e : g.get(u)) {
            int v = e[0], nd = d + e[1];
            if (nd < dist[v]) {
                dist[v] = nd;
                pq.add(new int[]{nd, v});
            }
        }
    }
    return dist;
}`,
        rule: 'Finalise a node when it is popped with its best distance, never when it is pushed.',
      },
      {
        id: 'graph-parent',
        title: 'Undirected graph: the parent back-edge',
        wrong: 'Every undirected edge appears in both adjacency lists, so a DFS immediately sees its parent as "already visited" and reports a cycle on a plain path.',
        buggy: j`
boolean hasCycle(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
    boolean[] vis = new boolean[n];
    for (int s = 0; s < n; s++) {
        if (!vis[s] && dfs(g, s, vis)) return true;
    }
    return false;
}
boolean dfs(List<List<Integer>> g, int u, boolean[] vis) {
    vis[u] = true;
    for (int v : g.get(u)) {
        if (vis[v]) return true;
        if (dfs(g, v, vis)) return true;
    }
    return false;
}`,
        fixed: j`
boolean hasCycle(int n, int[][] edges) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }
    boolean[] vis = new boolean[n];
    for (int s = 0; s < n; s++) {
        if (!vis[s] && dfs(g, s, -1, vis)) return true;
    }
    return false;
}
boolean dfs(List<List<Integer>> g, int u, int parent, boolean[] vis) {
    vis[u] = true;
    for (int v : g.get(u)) {
        if (v == parent) continue;           // the edge we came in on
        if (vis[v]) return true;
        if (dfs(g, v, u, vis)) return true;
    }
    return false;
}`,
        rule: 'Pass the parent down and skip it. If parallel edges are possible, skip by edge id instead.',
      },
    ],
  },
  {
    id: 'stack',
    title: 'Stack / queue',
    blurb: 'Empty containers throw, and monotonic loops leave work behind.',
    cards: [
      {
        id: 'stack-empty',
        title: 'pop / peek on an empty stack',
        wrong: 'A closing bracket with nothing open makes pop() throw instead of the input being declared invalid.',
        buggy: j`
boolean isValid(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            char open = st.pop();
            if (!matches(open, c)) return false;
        }
    }
    return st.isEmpty();
}
boolean matches(char open, char close) {
    return (open == '(' && close == ')') || (open == '[' && close == ']') || (open == '{' && close == '}');
}`,
        fixed: j`
boolean isValid(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.isEmpty()) return false;       // nothing to close
            char open = st.pop();
            if (!matches(open, c)) return false;
        }
    }
    return st.isEmpty();
}
boolean matches(char open, char close) {
    return (open == '(' && close == ')') || (open == '[' && close == ']') || (open == '{' && close == '}');
}`,
        rule: 'Every pop or peek needs an isEmpty guard, or a proof that the stack cannot be empty there.',
      },
      {
        id: 'stack-leftover',
        title: 'Leftovers after a monotonic loop',
        wrong: 'Bars still on the stack when the loop ends never get their rectangle computed, so an increasing histogram scores zero.',
        buggy: j`
int largestRectangle(int[] h) {
    Deque<Integer> st = new ArrayDeque<>();
    int best = 0;
    for (int i = 0; i < h.length; i++) {
        while (!st.isEmpty() && h[st.peek()] > h[i]) {
            int height = h[st.pop()];
            int left = st.isEmpty() ? -1 : st.peek();
            best = Math.max(best, height * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}`,
        fixed: j`
int largestRectangle(int[] h) {
    Deque<Integer> st = new ArrayDeque<>();
    int best = 0;
    for (int i = 0; i <= h.length; i++) {
        int cur = (i == h.length) ? 0 : h[i];     // sentinel flushes the stack
        while (!st.isEmpty() && h[st.peek()] > cur) {
            int height = h[st.pop()];
            int left = st.isEmpty() ? -1 : st.peek();
            best = Math.max(best, height * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}`,
        rule: 'After a monotonic-stack loop, ask what the survivors mean, then flush them with a sentinel or a drain loop.',
      },
    ],
  },
  {
    id: 'dp',
    title: 'DP',
    blurb: 'Base cases, wrap-around, and loop direction decide whether a recurrence is even the problem you meant.',
    cards: [
      {
        id: 'dp-base',
        title: 'Base-case index crash',
        wrong: 'Writing dp[1] and dp[2] into an array of size n + 1 throws when n is 1 (and dp[1] fails for n = 0).',
        buggy: j`
int climbStairs(int n) {
    int[] dp = new int[n + 1];
    dp[1] = 1;
    dp[2] = 2;
    for (int i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}`,
        fixed: j`
int climbStairs(int n) {
    if (n <= 2) return Math.max(n, 1);   // n = 0 counts as one way: do nothing
    int[] dp = new int[n + 1];
    dp[1] = 1;
    dp[2] = 2;
    for (int i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}`,
        rule: 'Size the table for the largest base-case index, or return early for tiny n.',
      },
      {
        id: 'dp-circular',
        title: 'Circular array: run it twice',
        wrong: 'Reusing the linear solution lets the first and last items both be chosen even though they are neighbours on the circle.',
        buggy: j`
int robCircle(int[] nums) {
    return linear(nums, 0, nums.length - 1);
}
int linear(int[] nums, int lo, int hi) {
    int prev = 0, cur = 0;
    for (int i = lo; i <= hi; i++) {
        int next = Math.max(cur, prev + nums[i]);
        prev = cur;
        cur = next;
    }
    return cur;
}`,
        fixed: j`
int robCircle(int[] nums) {
    int n = nums.length;
    if (n == 0) return 0;
    if (n == 1) return nums[0];
    return Math.max(linear(nums, 0, n - 2), linear(nums, 1, n - 1));   // drop first or drop last
}
int linear(int[] nums, int lo, int hi) {
    int prev = 0, cur = 0;
    for (int i = lo; i <= hi; i++) {
        int next = Math.max(cur, prev + nums[i]);
        prev = cur;
        cur = next;
    }
    return cur;
}`,
        rule: 'A circle becomes a line by excluding one endpoint; try both exclusions and take the better.',
      },
      {
        id: 'dp-knapsack',
        title: '0/1 versus unbounded loop direction',
        wrong: 'With a single 1-D array, iterating capacity upward lets an item be reused within the same pass, which silently turns 0/1 into unbounded.',
        buggy: j`
int knapsack01(int[] w, int[] v, int cap) {
    int[] dp = new int[cap + 1];
    for (int i = 0; i < w.length; i++) {
        for (int c = w[i]; c <= cap; c++) {
            dp[c] = Math.max(dp[c], dp[c - w[i]] + v[i]);
        }
    }
    return dp[cap];
}`,
        fixed: j`
int knapsack01(int[] w, int[] v, int cap) {
    int[] dp = new int[cap + 1];
    for (int i = 0; i < w.length; i++) {
        for (int c = cap; c >= w[i]; c--) {     // downward: each item used at most once
            dp[c] = Math.max(dp[c], dp[c - w[i]] + v[i]);
        }
    }
    return dp[cap];
}`,
        rule: '0/1: capacity loop goes down. Unbounded: capacity loop goes up. Say which one the problem is.',
      },
    ],
  },
  {
    id: 'backtrack',
    title: 'Backtracking',
    blurb: 'Two classics: storing a live reference, and pruning duplicates at the wrong level.',
    cards: [
      {
        id: 'backtrack-snapshot',
        title: 'Snapshot the result list',
        wrong: 'Adding the working list itself stores a reference. As the recursion pops elements, every stored answer ends up empty.',
        buggy: j`
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    build(nums, 0, new ArrayList<>(), res);
    return res;
}
void build(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(path);
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        build(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}`,
        fixed: j`
List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> res = new ArrayList<>();
    build(nums, 0, new ArrayList<>(), res);
    return res;
}
void build(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));      // copy, do not alias
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        build(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}`,
        rule: 'Whenever a mutable list goes into the answer, put a copy in, not the list you keep editing.',
      },
      {
        id: 'backtrack-dups',
        title: 'Skip duplicates at the same depth',
        wrong: 'Skipping whenever nums[i] equals nums[i-1] also skips the legitimate second copy at deeper levels, so [1, 1] disappears.',
        buggy: j`
List<List<Integer>> subsetsWithDup(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    build(nums, 0, new ArrayList<>(), res);
    return res;
}
void build(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        path.add(nums[i]);
        build(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}`,
        fixed: j`
List<List<Integer>> subsetsWithDup(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> res = new ArrayList<>();
    build(nums, 0, new ArrayList<>(), res);
    return res;
}
void build(int[] nums, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        if (i > start && nums[i] == nums[i - 1]) continue;   // same level only
        path.add(nums[i]);
        build(nums, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}`,
        rule: 'Sort first, then skip a duplicate only when i > start: duplicates are banned among siblings, not down a path.',
      },
    ],
  },
  {
    id: 'string',
    title: 'String',
    blurb: 'Java strings have identity, a definition problem, and a surprising split.',
    cards: [
      {
        id: 'string-equals',
        title: '== versus equals',
        wrong: '== compares object identity. Two strings with the same characters are often different objects, so the comparison is false.',
        buggy: j`
boolean sameWord(String a, String b) {
    return a == b;
}`,
        fixed: j`
boolean sameWord(String a, String b) {
    return Objects.equals(a, b);     // null-safe content comparison
}`,
        rule: 'Compare String content with equals (or Objects.equals when null is possible); keep == for primitives.',
      },
      {
        id: 'string-palindrome',
        title: 'What counts as a palindrome',
        wrong: 'Comparing the raw characters rejects "A man, a plan, a canal: Panama". Most palindrome questions ignore case and non-alphanumerics.',
        buggy: j`
boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        if (s.charAt(i++) != s.charAt(j--)) return false;
    }
    return true;
}`,
        fixed: j`
boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        while (i < j && !Character.isLetterOrDigit(s.charAt(i))) i++;
        while (i < j && !Character.isLetterOrDigit(s.charAt(j))) j--;
        if (Character.toLowerCase(s.charAt(i)) != Character.toLowerCase(s.charAt(j))) return false;
        i++;
        j--;
    }
    return true;
}`,
        rule: 'Confirm the definition (case, punctuation, empty string) with the interviewer before coding.',
      },
      {
        id: 'string-split',
        title: '"".split returns length 1',
        wrong: 'Splitting an empty string gives one empty field, not zero. Meanwhile trailing empty fields are silently dropped unless you pass a negative limit.',
        buggy: j`
int countFields(String csv) {
    return csv.split(",").length;
}`,
        fixed: j`
int countFields(String csv) {
    if (csv.isEmpty()) return 0;
    return csv.split(",", -1).length;    // -1 keeps trailing empty fields
}`,
        rule: 'Special-case the empty string, and pass limit -1 when empty trailing pieces matter.',
      },
    ],
  },
  {
    id: 'bits',
    title: 'Bit manipulation',
    blurb: 'Signed shifts and the zero case are the two traps.',
    cards: [
      {
        id: 'bits-shift',
        title: '>> versus >>> for negatives',
        wrong: '>> copies the sign bit, so a negative number never shifts down to 0 and a "while (n != 0)" loop never ends.',
        buggy: j`
int countBits(int n) {
    int c = 0;
    while (n != 0) {
        c += n & 1;
        n >>= 1;
    }
    return c;
}`,
        fixed: j`
int countBits(int n) {
    int c = 0;
    while (n != 0) {
        c += n & 1;
        n >>>= 1;          // unsigned shift fills with zeros
    }
    return c;
}`,
        rule: 'Use >>> whenever the value may be negative and you are treating it as raw bits.',
      },
      {
        id: 'bits-pow2',
        title: 'Power of two: n = 0 and negatives',
        wrong: 'n & (n - 1) is zero for 0 as well, and for Integer.MIN_VALUE, so the one-line check calls both powers of two.',
        buggy: j`
boolean isPowerOfTwo(int n) {
    return (n & (n - 1)) == 0;
}`,
        fixed: j`
boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}`,
        rule: 'Clever bit tricks usually assume a positive input; add the n > 0 guard explicitly.',
      },
    ],
  },
  {
    id: 'universal',
    title: 'Universal',
    blurb: 'Checks that apply to nearly every problem. Run through them before you say you are done.',
    cards: [
      {
        id: 'universal-offbyone',
        title: 'Off-by-one at the loop bound',
        wrong: 'Reading a[i + 1] while i runs to the last index steps one past the end.',
        buggy: j`
boolean isSorted(int[] a) {
    for (int i = 0; i < a.length; i++) {
        if (a[i] > a[i + 1]) return false;
    }
    return true;
}`,
        fixed: j`
boolean isSorted(int[] a) {
    for (int i = 0; i + 1 < a.length; i++) {
        if (a[i] > a[i + 1]) return false;
    }
    return true;
}`,
        rule: 'Count what the body touches (i + 1 here) and bound the loop by that, not by the length.',
      },
      {
        id: 'universal-mod',
        title: 'Negative modulo',
        wrong: 'In Java, -1 % 5 is -1, not 4. Wrapping an index backwards produces a negative index.',
        buggy: j`
int wrap(int i, int n) {
    return i % n;
}`,
        fixed: j`
int wrap(int i, int n) {
    return Math.floorMod(i, n);
}`,
        rule: 'Use Math.floorMod (or ((i % n) + n) % n) whenever the left side can be negative.',
      },
      {
        id: 'universal-comparator',
        title: 'Comparator by subtraction',
        wrong: 'a - b overflows for values far apart, flipping the sign and corrupting the sort order.',
        buggy: j`
void sortAscending(Integer[] a) {
    Arrays.sort(a, (x, y) -> x - y);
}`,
        fixed: j`
void sortAscending(Integer[] a) {
    Arrays.sort(a, Integer::compare);
}`,
        rule: 'Never return a difference from a comparator; use Integer.compare or Long.compare.',
      },
      {
        id: 'universal-noanswer',
        title: 'When no answer exists',
        wrong: 'Initialising the result to 0 makes "not found" look exactly like "found at index 0".',
        buggy: j`
int lastIndexOf(int[] a, int x) {
    int idx = 0;
    for (int i = 0; i < a.length; i++) {
        if (a[i] == x) idx = i;
    }
    return idx;
}`,
        fixed: j`
int lastIndexOf(int[] a, int x) {
    int idx = -1;                // a value no real answer can take
    for (int i = 0; i < a.length; i++) {
        if (a[i] == x) idx = i;
    }
    return idx;
}`,
        rule: 'Pick a "nothing" return value that real answers can never equal, and decide it up front.',
      },
      {
        id: 'universal-earlyreturn',
        title: 'Returning from inside the loop too early',
        wrong: 'Returning true on the first element that passes answers "does any pass?" when the question was "do all pass?".',
        buggy: j`
boolean allPositive(int[] a) {
    for (int x : a) {
        if (x > 0) return true;
    }
    return false;
}`,
        fixed: j`
boolean allPositive(int[] a) {
    for (int x : a) {
        if (x <= 0) return false;    // first counter-example decides
    }
    return true;                     // vacuously true for an empty array
}`,
        rule: 'Before each return ask: have I looked at everything this answer depends on, and what does empty give?',
      },
      {
        id: 'universal-cme',
        title: 'ConcurrentModificationException',
        wrong: 'Removing from a list while a for-each loop iterates it invalidates the iterator, and the next step throws.',
        buggy: j`
void removeEvens(List<Integer> xs) {
    for (int x : xs) {
        if (x % 2 == 0) xs.remove(Integer.valueOf(x));
    }
}`,
        fixed: j`
void removeEvens(List<Integer> xs) {
    xs.removeIf(x -> x % 2 == 0);
}`,
        rule: 'Never structurally modify a collection you are iterating; use removeIf, an Iterator, or build a new list.',
      },
    ],
  },
];

export const EDGE_CARD_COUNT = EDGE_TOPICS.reduce((n, t) => n + t.cards.length, 0);
